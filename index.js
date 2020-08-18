const $RefParser = require("@apidevtools/json-schema-ref-parser");
const Ajv = require('ajv');
const fs = require('fs-extra');
const klaw = require('klaw');
const path = require('path')
const minimist = require('minimist');
const compareVersions = require('compare-versions');

let COMPILED = {};
let ajv = new Ajv({
	allErrors: true,
	missingRefs: "ignore"
});

async function run() {
	try {
		let args = minimist(process.argv.slice(2));

		let files = args._;
		if (files.length === 0) {
			throw new Error('No file specified, validating all examples in STAC spec repository');
		}
		else if (files.length === 1) {
			let stat = await fs.lstat(files[0]);
			if (stat.isDirectory()) {
				files = await readExamples(files[0]);
			}
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
	
		let stats = {
			files: files.length,
			invalid: 0,
			valid: 0
		}
		for(let file of files) {
			// Read STAC file
			let data = await fs.readJson(file);
		
			let version = data.stac_version;
			console.log("-- " + file + " (" + version + ")");

			if (compareVersions(version, '1.0.0-beta.2', '>=')) {
				console.error("Can only validate STAC version >= 1.0.0-beta.2\n");
				continue;
			}
			
			// Get all schema to validate against
			let schemas = ['core'];
			if (Array.isArray(data.stac_extensions)) {
				schemas = schemas.concat(data.stac_extensions);
			}

			let fileValid = true;
			for(let schema of schemas) {
				try {
					let loadArgs = schema.includes('://') ? [schema] : [schemaFolder, version, schema];
					let validate = await loadSchema(...loadArgs);
					let valid = validate(data);
					if (!valid) {
						console.log('---- ' + schema + ": invalid");
						console.warn(validate.errors);
						console.log("\n");
						fileValid = false;
						if (schema === 'core') {
							console.info("--- Validation error in core, skipping extension validation");
							break;
						}
					}
					else {
						console.info('---- ' + schema + ": valid");
					}
				} catch (error) {
					fileValid = false;
					console.error('---- ' + schema + ": " + error.message);
				}
			}
			fileValid ? stats.valid++ : stats.invalid++;
			console.log("\n");
		}
		console.info("Files: " + stats.files);
		console.info("Valid: " + stats.valid);
		console.info("Invalid: " + stats.invalid);
		process.exit(stats.invalid);
	}
	catch(error) {
		console.error(error);
		process.exit(1);
	}
}

async function readExamples(folder) {
	var files = [];
	for await (let file of klaw(folder)) {
		let relPath = path.relative(folder, file.path);
		if (relPath.includes(path.sep + 'examples' + path.sep) && path.extname(relPath) === '.json') {
			files.push(file.path);
		}
	}
	return files;
}

async function loadSchema(baseUrl = null, version = null, shortcut = null) {
	version = (typeof version === 'string') ? "v" + version : "unversioned";

	if (typeof baseUrl !== 'string') {
		baseUrl = "https://schemas.stacspec.org/" + version;
	}

	let url;
	if (shortcut === 'core') {
		url = baseUrl + "/core.json";
	}
	else if (typeof shortcut === 'string') {
		url = baseUrl + "/extensions/" + shortcut + "/json-schema/schema.json";
	}
	else {
		url = baseUrl;
	}

	if (typeof COMPILED[url] !== 'undefined') {
		return COMPILED[url];
	}
	else {
		let schema;
		if (shortcut === 'core') {
			schema = {
				"$schema": "http://json-schema.org/draft-07/schema#",
				"$id": shortcut + version + ".json#",
				"oneOf": [
					{
						"$ref": baseUrl + "/item-spec/json-schema/item.json"
					},
					{
						"anyOf": [
							{
								"$ref": baseUrl + "/catalog-spec/json-schema/catalog.json"
							},
							{
								"$ref": baseUrl + "/collection-spec/json-schema/collection.json"
							}
						]
					}
				]
			};
		}
		else {
			schema = url;
		}
		let fullSchema = await $RefParser.dereference(schema, {
			dereference: {
			  circular: "ignore"
			}
		});
		COMPILED[url] = ajv.compile(fullSchema);
		return COMPILED[url];
	}
}

module.exports = async () => {
	await run();
};