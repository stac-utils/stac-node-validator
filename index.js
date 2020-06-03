const $RefParser = require("@apidevtools/json-schema-ref-parser");
const Ajv = require('ajv');
const fs = require('fs-extra');
const klaw = require('klaw');
const path = require('path')

let COMPILED = {};
let ajv = new Ajv({
	allErrors: true
});

async function run() {
	try {
		let files = process.argv.slice(2);
		if (files.length === 0) {
			console.log('No file specified, validating all examples in STAC spec repository');
			files = await readExamples();
		}
	
		for(let file of files) {
			console.log("-- " + file);

			// Read STAC file
			let data = await fs.readJson(file);

			if (data.stac_version !== '1.0.0-beta.1') {
				console.error("Can only validate STAC version 1.0.0-beta.1\n");
				continue;
			}
			
			// Get all schema names to validate against
			let names = ['core'];
			if (Array.isArray(data.stac_extensions)) {
				// Filter out all references to external extension schemas (not supported yet)
				names = names.concat(data.stac_extensions.filter(e => !e.includes('://')));
			}

			for(let name of names) {
				try {
					console.log('---- ' + name);
					let validate = await loadSchema(name);
					var valid = validate(data);
					if (!valid) console.warn(validate.errors);
					else console.info("Valid");
				} catch (error) {
					console.error(error);
				}
				console.log("\n");
			}
		}
	}
	catch(error) {
		console.error(error);
	}
}

async function readExamples() {
	var files = [];
	for await (let file of klaw('./stac-spec/')) {
		let relPath = path.relative('./stac-spec/', file.path);
		if (relPath.includes(path.sep + 'examples' + path.sep) && path.extname(relPath) === '.json') {
			files.push(file.path);
		}
	}
	return files;
}

async function loadSchema(name) {
	if (typeof COMPILED[name] !== 'undefined') {
		return COMPILED[name];
	}
	else {
		let file;
		switch(name) {
			case 'core':
				file = './core.json';
				break;
			case 'projection':
				throw "can\'t validate projection extension; schema has an issue in an external dependency";
			default:
				file = './stac-spec/extensions/' + name + '/json-schema/schema.json';
		}
		if (!await fs.exists(file)) {
			throw "No schema file for " + name;
		}
		let fullSchema = await $RefParser.dereference(file);
		// Make $id unique, otherwise AjV will complain
		if (!path.isAbsolute(fullSchema.$id)) {
			fullSchema.$id = file + '#';
		}
		// Cache compiled schemas by name
		COMPILED[name] = ajv.compile(fullSchema);
		return COMPILED[name];
	}
}

run();