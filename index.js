const Ajv = require('ajv');
const axios = require('axios');
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
let ajv = new Ajv({
	formats: Object.assign(formats, iriFormats),
	allErrors: true,
	logger: DEBUG ? console : false,
	loadSchema: loadJsonFromUri
});
let verbose = false;
let schemaMap = {};
let schemaFolder = null;

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

		if (typeof args.schemas === 'string') {
			let stat = await fs.lstat(args.schemas);
			if (stat.isDirectory()) {
				schemaFolder = normalizePath(args.schemas);
			}
			else {
				throw new Error('Schema folder is not a valid STAC directory');
			}
		}

		let schemaMapArgs = [];
		if (Array.isArray(args.schemaMap)) {
			// Recommended way
			schemaMapArgs = args.schemaMap;
		}
		else if (typeof args.schemaMap === 'string') {
			// Backward compliance
			schemaMapArgs = args.schemaMap.split(';');
		}
		for(let arg of schemaMapArgs) {
			let parts = arg.split("=");
			let stat = await fs.lstat(parts[1]);
			if (stat.isFile()) {
				schemaMap[parts[0]] =  parts[1];
			}
			else {
				console.error(`Schema mapping for ${parts[0]} is not a valid file: ${parts[1]}`);
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
				let fileIsUrl = isUrl(file);
				if (!fileIsUrl && (doLint || doFormat)) {
					let fileContent = await fs.readFile(file, "utf8");
					json = JSON.parse(fileContent);
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
				else {
					json = await loadJsonFromUri(file);
					if (fileIsUrl && (doLint || doFormat)) {
						let what = [];
						doLint && what.push('Linting');
						doLint && what.push('Formatting');
						console.warn(`-- ${what.join(' and ')} not supported for remote files`);
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
				else if (versions.compare(data.stac_version, '1.0.0-rc.1', '<')) {
					console.error(`-- ${id}Skipping; Can only validate STAC version >= 1.0.0-rc.1\n`);
					continue;
				}
				else if (verbose) {
					console.log(`-- ${id}STAC Version: ${data.stac_version}`);
				}

				switch(data.type) {
					case 'FeatureCollection':
						console.warn(`-- ${id}Skipping; STAC ItemCollections not supported yet\n`);
						continue;
					case 'Catalog':
					case 'Collection':
					case 'Feature':
						break;
					default:
						console.error(`-- ${id}Invalid; Can't detect type of the STAC object. Is the 'type' field missing or invalid?\n`);
						fileValid = false;
						continue;
				}
				
				// Get all schema to validate against
				let schemas = [data.type];
				if (Array.isArray(data.stac_extensions)) {
					schemas = schemas.concat(data.stac_extensions);
					// Convert shortcuts supported in 1.0.0 RC1 into schema URLs
					if (versions.compare(data.stac_version, '1.0.0-rc.1', '=')) {
						schemas = schemas.map(ext => ext.replace(/^(eo|projection|scientific|view)$/, 'https://schemas.stacspec.org/v1.0.0-rc.1/extensions/$1/json-schema/schema.json'));
					}
				}

				for(let schema of schemas) {
					try {
						let schemaId;
						let core = false;
						switch(schema) {
							case 'Feature':
								schema = 'Item';
							case 'Catalog':
							case 'Collection':
								let type = schema.toLowerCase();
								schemaId = `https://schemas.stacspec.org/v${data.stac_version}/${type}-spec/json-schema/${type}.json`;
								core = true;
								break;
							default: // extension
								if (isUrl(schema)) {
									schemaId = schema;
								}
								else {
									throw new Error("'stac_extensions' must contain a valid schema URL, not a shortcut.");
								}
						}
						let validate = await loadSchema(schemaId);
						let valid = validate(data);
						if (!valid) {
							console.log(`--- ${schema}: invalid`);
							console.warn(validate.errors);
							console.log("\n");
							fileValid = false;
							if (core && !DEBUG) {
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

function normalizePath(path) {
	return path.replace(/\\/g, '/').replace(/\/$/, "");
}

function normalizeNewline(str) {
	// 2 spaces, *nix newlines, newline at end of file
	return str.trimRight().replace(/(\r\n|\r)/g, "\n") + "\n";
}

function isUrl(uri) {
	if (typeof uri === 'string') {
		let part = uri.match(/^(\w+):\/\//i);
		if(part) {
			if (!SUPPORTED_PROTOCOLS.includes(part[1].toLowerCase())) {
				throw new Error(`Given protocol "${part[1]}" is not supported.`);
			}
			return true;
		}
	}
	return false;
}

async function readExamples(folder) {
	var files = [];
	for await (let file of klaw(folder, {depthLimit: -1})) {
		let relPath = path.relative(folder, file.path);
		if (relPath.match(/(^|\/|\\)examples(\/|\\).+\.json$/i)) {
			files.push(file.path);
		}
	}
	return files;
}

async function loadJsonFromUri(uri) {
	if (schemaMap[uri]) {
		uri = schemaMap[uri];
	}
	else if (schemaFolder) {
		uri = uri.replace(/^https:\/\/schemas\.stacspec\.org\/v[^\/]+/, schemaFolder);
	}
	if (isUrl(uri)) {
		let response = await axios.get(uri);
		return response.data;
	}
	else {
		return JSON.parse(await fs.readFile(uri, "utf8"));
	}
}

async function loadSchema(schemaId) {
	let schema = ajv.getSchema(schemaId);
	if (schema) {
		return schema;
	}

	try {
		json = await loadJsonFromUri(schemaId);
	} catch (error) {
		if (DEBUG) {
			console.trace(error);
		}
		throw new Error(`-- Schema at '${schemaId}' not found. Please ensure all entries in 'stac_extensions' are valid.`);
	}

	schema = ajv.getSchema(json.$id);
	if (schema) {
		return schema;
	}

	return await ajv.compileAsync(json);
}

module.exports = async () => {
	await run();
};