const $RefParser = require("@apidevtools/json-schema-ref-parser");
const Ajv = require('ajv');
const fs = require('fs-extra');

const FILES = process.argv.slice(2);

const ALL_SCHEMAS = {
	"$schema": "http://json-schema.org/draft-07/schema#",
	"oneOf": [
		{
		"$ref": "./stac-spec/item-spec/json-schema/item.json"
		},
		{
			"anyOf": [
				{
					"$ref": "./stac-spec/catalog-spec/json-schema/catalog.json"
				},
				{
					"$ref": "./stac-spec/collection-spec/json-schema/collection.json"
				}
			]
		}
	]
};

async function run() {
	try {
		let schema = await $RefParser.dereference(ALL_SCHEMAS);
		let ajv = new Ajv({
			allErrors: true
		});
		let validate = ajv.compile(schema);
		for(let file of FILES) {
			let data = await fs.readJson(file);
			var valid = validate(data);
			if (!valid) console.log(file, validate.errors);
			else console.info(file, "VALID");
		}
	}
	catch(err) {
		console.error(err);
	}
}

run();