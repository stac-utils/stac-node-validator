const $RefParser = require("@apidevtools/json-schema-ref-parser");
const Ajv = require('ajv');
const formats = require('ajv-formats-draft2019/formats');
const iriFormats = require('./iri.js');
const fs = require('fs-extra');
const klaw = require('klaw');
const path = require('path')
const minimist = require('minimist');
const versions = require('compare-versions');
const {diffStringsUnified} = require('jest-diff');
const package = require('./package.json');

let DEBUG = false;
let COMPILED = {};
let SHORTCUTS = [
	'card4l-eo',
	'card4l-sar',
	'checksum', // legacy
	'collection-assets',
	'datacube',
	'eo',
	'file',
	'item-assets',
	'label',
	'pointcloud',
	'processing',
	'projection',
	'sar',
	'sat',
	'scientific',
	'single-file-stac',
	'tiled-assets',
	'timestamps',
	'version',
	'view'
];
let ajv = new Ajv({
	formats: Object.assign(formats, iriFormats),
	allErrors: true,
	missingRefs: "ignore",
	addUsedSchema: false,
	logger: DEBUG ? console : false
});
let verbose = false;
let schemaMap = {};

async function run() {
	console.log(`STAC Node Validator v${package.version}\n`);
	try {
		let args = minimist(process.argv.slice(2));

		verbose = (typeof args.verbose !== 'undefined');

		let files = args._;
		if (files.length === 0) {
			throw new Error('No path or URL specified.');
		}
		else if (files.length === 1 && !isUrl(files[0])) {
			// Special handling for reading directories
			let stat = await fs.lstat(files[0]);
			if (stat.isDirectory()) {
				files = await readExamples(files[0]);
			}
		}

		if (typeof args.ignoreCerts !== 'undefined') {
			process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
		}

		let schemaFolder = null;
		if (typeof args.schemas === 'string') {
			let stat = await fs.lstat(args.schemas);
			if (stat.isDirectory()) {
				schemaFolder = args.schemas;
			}
			else {
				throw new Error('Schema folder is not a valid directory');
			}
		}

		if (typeof args.schemaMap === 'string') {
			let map = args.schemaMap.split(';');
			for(let row of map) {
				let parts = row.split("=");
				let stat = await fs.lstat(parts[1]);
				if (stat.isFile()) {
					schemaMap[parts[0]] =  parts[1];
				}
				else {
					console.error(`Schema mapping for ${parts[0]} is not a valid file: ${parts[1]}`);
				}
			}
		}

		const doLint = (typeof args.lint !== 'undefined');
		const doFormat = (typeof args.format !== 'undefined');
	
		let stats = {
			files: files.length,
			invalid: 0,
			valid: 0,
			malformed: 0
		}
		for(let file of files) {
			// Read STAC file
			let json;
			console.log(`- ${file}`);
			try {
				if (isUrl(file)) {
					// For simplicity, we just load the URLs with $RefParser, so we don't need another dependency.
					json = await $RefParser.parse(file);
					if (doLint) {
						console.warn("-- Linting not supported for remote files");
					}
					if (doFormat) {
						console.warn("-- Formatting not supported for remote files");
					}
				}
				else {
					let fileContent = await fs.readFile(file, "utf8");
					json = JSON.parse(fileContent);
					if (doLint || doFormat) {
						const expectedContent = JSON.stringify(json, null, 2);
						if (!matchFile(fileContent, expectedContent)) {
							stats.malformed++;
							if (doLint) {
								console.warn("-- Lint: File is malformed -> use `--format` to fix the issue");
								if (verbose) {
									console.log(diffStringsUnified(fileContent, expectedContent));
								}
							}
							if (doFormat) {
								console.warn("-- Format: File was malformed -> fixed the issue");
								await fs.writeFile(file, expectedContent);
							}
						}
						else if (doLint && verbose) {
							console.warn("-- Lint: File is well-formed");
						}
					}
				}
			}
			catch(error) {
				stats.invalid++;
				stats.malformed++;
				console.error("-- " + error.message + "\n");
				continue;
			}
		
			let isApiList = false;
			let entries;
			if (Array.isArray(json.collections)) {
				entries = json.collections;
				isApiList = true;
				if (verbose) {
					console.log(`-- The file is a /collections endpoint. Validating all ${entries.length} collections, but ignoring the other parts of the response.`);
					if (entries.length > 1) {
						console.log('');
					}
				}
			}
			else if (Array.isArray(json.features)) {
				entries = json.features;
				isApiList = true;
				if (verbose) {
					console.log(`-- The file is a /collections/:id/items endpoint. Validating all ${entries.length} items, but ignoring the other parts of the response.`);
					if (entries.length > 1) {
						console.log('');
					}
				}
			}
			else {
				entries = [json];
			}

			let fileValid = true;
			for(let data of entries) {
				let id = '';
				if (isApiList) {
					id = `${data.id}: `;
				}
				if (typeof data.stac_version !== 'string') {
					console.error(`-- ${id}Skipping; No STAC version found\n`);
					fileValid = false;
					continue;
				}
				else if (versions.compare(data.stac_version, '1.0.0-beta.2', '<')) {
					console.error(`-- ${id}Skipping; Can only validate STAC version >= 1.0.0-beta.2\n`);
					continue;
				}
				else if (verbose) {
					console.log(`-- ${id}STAC Version: ${data.stac_version}`);
				}

				let type;
				if (data.type === 'Feature') {
					type = 'item';
				}
				else if (data.type === 'FeatureCollection') {
					// type = 'itemcollection';
					console.warn(`-- ${id}Skipping; STAC ItemCollections not supported yet\n`);
					continue;
				}
				else if (data.type === "Collection" || typeof data.extent !== 'undefined' || typeof data.license !== 'undefined') {
					type = 'collection';

				}
				else if (data.type === "Catalog" || typeof data.description !== 'undefined') {
					type = 'catalog';
				}
				else {
					console.error(`-- ${id}Invalid; Can't detect which schema to use.\n`);
					fileValid = false;
					continue;
				}
				
				// Get all schema to validate against
				let schemas = [type];
				if (Array.isArray(data.stac_extensions)) {
					schemas = schemas.concat(data.stac_extensions);
				}

				for(let schema of schemas) {
					try {
						let loadArgs = isUrl(schema) ? [schema] : [schemaFolder, data.stac_version, schema];
						let validate = await loadSchema(...loadArgs);
						let valid = validate(data);
						if (!valid) {
							console.log(`--- ${schema}: invalid`);
							console.warn(validate.errors);
							console.log("\n");
							fileValid = false;
							if (schema === 'core' && !DEBUG) {
								if (verbose) {
									console.info("-- Validation error in core, skipping extension validation");
								}
								break;
							}
						}
						else if (verbose) {
							console.log(`--- ${schema}: valid`);
						}
					} catch (error) {
						fileValid = false;
						console.error(`--- ${schema}: ${error.message}`);
						if (DEBUG) {
							console.trace(error);
						}
					}
				}
				if (!fileValid || verbose) {
					console.log('');
				}
			}
			fileValid ? stats.valid++ : stats.invalid++;
		}
		console.info("Files: " + stats.files);
		console.info("Valid: " + stats.valid);
		console.info("Invalid: " + stats.invalid);
		if (doLint || doFormat) {
			console.info("Malformed: " + stats.malformed);
		}
		let errored = (stats.invalid > 0 || (doLint && !doFormat && stats.malformed > 0)) ? 1 : 0;
		process.exit(errored);
	}
	catch(error) {
		console.error(error);
		process.exit(1);
	}
}

const SUPPORTED_PROTOCOLS = ['http', 'https'];

function matchFile(given, expected) {
	return normalizeNewline(given) === normalizeNewline(expected);
}

function normalizeNewline(str) {
	// 2 spaces, *nix newlines, newline at end of file
	return str.trimRight().replace(/(\r\n|\r)/g, "\n") + "\n";
}

function isUrl(uri) {
	let part = uri.match(/^(\w+):\/\//i);
	if(part) {
		if (!SUPPORTED_PROTOCOLS.includes(part[1].toLowerCase())) {
			throw new Error(`Given protocol "${part[1]}" is not supported.`);
		}
		return true;
	}
	return false;
}

async function readExamples(folder) {
	var files = [];
	for await (let file of klaw(folder)) {
		let relPath = path.relative(folder, file.path);
		if (relPath.match(/(^|\/|\\)examples(\/|\\)[^\/\\]+\.json$/i)) {
			files.push(file.path);
		}
	}
	return files;
}

async function loadSchema(baseUrl = null, version = null, shortcut = null) {
	version = (typeof version === 'string') ? "v" + version : "unversioned";

	if (typeof baseUrl !== 'string') {
		baseUrl = `https://schemas.stacspec.org/${version}`;
	}
	else {
		baseUrl = baseUrl.replace(/\\/g, '/').replace(/\/$/, "");
	}

	let url;
	let isExtension = false;
	if (shortcut === 'item' || shortcut === 'catalog' || shortcut === 'collection') {
		url = `${baseUrl}/${shortcut}-spec/json-schema/${shortcut}.json`;
	}
	else if (typeof shortcut === 'string') {
		if (shortcut === 'proj') {
			// Capture a very common mistake and give a better explanation (see #4)
			throw new Error("'stac_extensions' must contain 'projection instead of 'proj'.");
		}
		url = `${baseUrl}/extensions/${shortcut}/json-schema/schema.json`;
		isExtension = true;
	}
	else {
		url = baseUrl;
	}

	if (schemaMap[url]) {
		url = schemaMap[url];
	}

	if (typeof COMPILED[url] !== 'undefined') {
		return COMPILED[url];
	}
	else {
		try {
			let parser = new $RefParser();
			let fullSchema = await parser.dereference(url, {
				dereference: {
					circular: 'ignore'
				}
			});
			COMPILED[url] = ajv.compile(fullSchema);
			if (parser.$refs.circular && verbose) {
				console.log(`--- Schema ${url} is circular, which is not supported by the library. Some properties may not get validated.`);
			}
			return COMPILED[url];
		} catch (error) {
			// Convert error to string, both for Error objects and strings
			let msg = "" + error;
			// Give better error message for (likely) invalid shortcuts
			if (isExtension && !SHORTCUTS.includes(shortcut) && (msg.includes("Error downloading") || msg.includes("Error opening file"))) {
				if (DEBUG) {
					console.trace(error);
				}
				throw new Error(`-- Schema at '${url}' not found. Please ensure all entries in 'stac_extensions' are valid.`);
			}
			else {
				throw error;
			}
		}
	}
}

module.exports = async () => {
	await run();
};