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

		let dev = Boolean(typeof args.dev !== 'undefined');
		if (dev) {
			console.info("Validating against the dev branch!");
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

			if (!dev && compareVersions(version, '1.0.0-beta.2', '>=')) {
				console.error("Can only validate STAC version >= 1.0.0-beta.2\n");
				continue;
			}
			
			// Get all schema names to validate against
			let names = ['core'];
			if (Array.isArray(data.stac_extensions)) {
				// Filter out all references to external extension schemas (not supported yet)
				for(let ext of data.stac_extensions) {
					if (ext.includes('://')) {
						console.log("Skipping schema " + ext + ": External schemas not supported yet");
					}
					else {
						names.push(ext);
					}
				}
			}

			let fileValid = true;
			for(let name of names) {
				try {
					let validate = await loadSchema(dev ? 'dev' : version, name, schemaFolder);
					var valid = validate(data);
					if (!valid) {
						console.log('---- ' + name + ": invalid");
						console.warn(validate.errors);
						console.log("\n");
						fileValid = false;
						if (name === 'core') {
							console.info("--- Validation error in core, skipping extension validation");
							break;
						}
					}
					else {
						console.info('---- ' + name + ": valid");
					}
				} catch (error) {
					console.exception(error);
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
		console.exception(error);
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

async function loadSchema(version, name, schemaLocation) {
	if (typeof COMPILED[version] === 'undefined') {
		COMPILED[version] = {};
	}
	if (typeof COMPILED[version][name] !== 'undefined') {
		return COMPILED[version][name];
	}
	else {
		if (!schemaLocation) {
			schemaLocation = "https://schemas.stacspec.org/" + version;
		}
		let schema;
		switch(name) {
			case 'core':
				schema = {
					"$schema": "http://json-schema.org/draft-07/schema#",
					"$id":"core-" + version + ".json#",
					"oneOf": [
						{
							"$ref": schemaLocation + "/item-spec/json-schema/item.json"
						},
						{
							"anyOf": [
								{
									"$ref": schemaLocation + "/catalog-spec/json-schema/catalog.json"
								},
								{
									"$ref": schemaLocation + "/collection-spec/json-schema/collection.json"
								}
							]
						}
					]
				};
				break;
			default:
				schema = schemaLocation + "/extensions/" + name + "/json-schema/schema.json";
		}
		let fullSchema = await $RefParser.dereference(schema, {
			dereference: {
			  circular: "ignore"
			}
		});
		// Cache compiled schemas by name
		COMPILED[version][name] = ajv.compile(fullSchema);
		return COMPILED[version][name];
	}
}

module.exports = async () => {
	await run();
};