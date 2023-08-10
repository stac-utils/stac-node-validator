const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs-extra');

const { strArrayToObject } = require('./nodeUtils');

function fromCLI() {
	let config = yargs(hideBin(process.argv))
	.parserConfiguration({
		'camel-case-expansion': false,
		'boolean-negation': false,
		'strip-aliased': true
	})
	.option('lint', {
		alias: 'l',
		type: 'boolean',
		default: false,
		description: 'Check whether the JSON files are well-formatted, based on the JavaScript implementation with a 2-space indentation.'
	})
	.option('format', {
		alias: 'f',
		type: 'boolean',
		default: false,
		description: 'Writes the JSON files according to the linting rules.\nATTENTION: Overrides the source files!'
	})
  .option('schemas', {
		alias: 's',
    type: 'string',
		default: null,
		requiresArg: true,
    description: 'Validate against schemas in a local or remote STAC folder.'
  })
  .option('schemaMap', {
    type: 'array',
		default: [],
		requiresArg: true,
    description: 'Validate against a specific local schema (e.g. an external extension). Provide the schema URI and the local path separated by an equal sign.\nExample: https://stac-extensions.github.io/foobar/v1.0.0/schema.json=./json-schema/schema.json',
		coerce: strArrayToObject
  })
  .option('ignoreCerts', {
    type: 'boolean',
		default: false,
    description: 'Disable verification of SSL/TLS certificates.'
  })
  .option('depth', {
    type: 'integer',
		default: -1,
    description: 'The number of levels to recurse into when looking for files in folders. 0 = no subfolders, -1 = unlimited'
  })
  .option('strict', {
    type: 'boolean',
		default: false,
    description: 'Enable strict mode in validation for schemas and numbers (as defined by ajv for options `strictSchema`, `strictNumbers` and `strictTuples`.'
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
		default: false,
    description: 'Run with verbose logging and a diff for linting.'
  })
	.option('config', {
    alias: 'c',
    type: 'string',
		default: null,
    description: 'Load the options from a config file. CLI Options override config options.'
	})
	.version()
  .parse()

	delete config.$0;
	config.files = config._;
	delete config._;

	return config;
}

async function fromFile(path) {
	let configFile;
	try {
		configFile = await fs.readFile(path, "utf8");
	} catch (error) {
		throw new Error('Config file does not exist.');
	}
	try {
		return JSON.parse(configFile);
	} catch (error) {
		throw new Error('Config file is invalid JSON.');
	}
}

module.exports = {
	fromCLI,
	fromFile
};
