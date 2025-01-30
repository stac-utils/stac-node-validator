const versions = require('compare-versions');

const { createAjv, isHttpUrl, loadSchemaFromUri, normalizePath, isObject } = require('./utils');
const defaultLoader = require('./loader/default');
const BaseValidator = require('./baseValidator');
const Test = require('./test');

/**
 * @typedef Config
 * @type {Object}
 * @property {function|null} [loader=null] A function that loads the JSON from the given files.
 * @property {string|null} [schemas=null] Validate against schemas in a local or remote STAC folder.
 * @property {Object.<string, string>} [schemaMap={}] Validate against a specific local schema (e.g. an external extension). Provide the schema URI as key and the local path as value.
 * @property {boolean} [strict=false] Enable strict mode in validation for schemas and numbers (as defined by ajv for options `strictSchema`, `strictNumbers` and `strictTuples
 * @property {BaseValidator} [customValidator=null] A validator with custom rules.
 */

/**
 * @typedef Report
 * @type {Object}
 * @property {string} id
 * @property {string} type
 * @property {string} version
 * @property {boolean} valid
 * @property {Array.<string>} messages
 * @property {Array.<Report>} children
 * @property {Results} results
 * @property {boolean} apiList
 */

/**
 * @typedef Results
 * @type {Object}
 * @property {OArray.<Error>} core
 * @property {Object.<string, Array.<Error>>} extensions
 * @property {Array.<Error>} custom
 */

/**
 * @returns {Report}
 */
function createReport() {
	let result = {
		id: null,
		type: null,
		version: null,
		valid: null,
		skipped: false,
		messages: [],
		children: [],
		results: {
			core: [],
			extensions: {},
			custom: []
		},
		apiList: false
	};
	return result;
}

/**
 * @param {Array.<Object>|Array.<string>|Object|string} data The data to validate
 * @param {Config} config The configuration object
 * @returns {Report|null}
 */
async function validate(data, config) {
	const defaultConfig = {
		loader: defaultLoader,
		schemas: null,
		schemaMap: {},
		strict: false
	};
	config = Object.assign({}, defaultConfig, config);
	config.ajv = createAjv(config);
	if (config.customValidator) {
		config.ajv = await config.customValidator.createAjv(config.ajv);
	}

	let report = createReport();
	if (typeof data === 'string') {
		report.id = normalizePath(data);
		data = await config.loader(data);
	}

	if (isObject(data)) {
		report.id = report.id || data.id;
		report.version = data.stac_version;
		report.type = data.type;

		if (Array.isArray(data.collections)) {
			data = data.collections;
			report.apiList = true;
			if (config.verbose) {
				report.messages.push(`The file is a CollectionCollection. Validating all ${entries.length} collections, but ignoring the other parts of the response.`);
			}
		}
		else if (Array.isArray(data.features)) {
			data = data.features;
			report.apiList = true;
			if (config.verbose) {
				report.messages.push(`The file is a ItemCollection. Validating all ${entries.length} items, but ignoring the other parts of the response.`);
			}
		}
		else {
			return validateOne(data, config, report);
		}
	}

	if (Array.isArray(data) && data.length > 0) {
		for(const obj of data) {
			const subreport = await validateOne(obj, config);
			report.children.push(subreport);
		}
		return summarizeResults(report);
	}
	else {
		return null;
	}
}


/**
 * @param {Object|string} source The data to validate
 * @param {Config} config The configuration object
 * @param {Report} report Parent report
 * @returns {Report}
 */
async function validateOne(source, config, report = null) {
	if (!report) {
		report = createReport();
	}

	let data = source;
	if (!report.id) {
		if (typeof data === 'string') {
			report.id = normalizePath(data);
			try {
				data = await config.loader(data);
			} catch (error) {
				report.valid = false;
				report.results.core.push({
					instancePath: "",
					message: error.message
				});
				return report;
			}
		}
		else {
			report.id = data.id;
		}
	}
	report.version = data.stac_version;
	report.type = data.type;

	if (config.customValidator) {
		data = await config.customValidator.afterLoading(data, report, config);
	}

	if (typeof config.lintFn === 'function') {
		report = await config.lintFn(source, report, config);
	}

	if (config.customValidator) {
		const bypass = await config.customValidator.bypassValidation(data, report, config);
		if (bypass) {
			return bypass;
		}
	}

	// Check stac_version
	if (typeof data.stac_version !== 'string') {
		report.skipped = true;
		report.messages.push('No STAC version found');
		return report;
	}
	else if (versions.compare(data.stac_version, '1.0.0-rc.1', '<')) {
		report.skipped = true;
		report.messages.push('Can only validate STAC version >= 1.0.0-rc.1');
		return report;
	}

	// Check type field
	switch(data.type) {
		case 'FeatureCollection':
			report.skipped = true;
			report.messages.push('STAC ItemCollections not supported yet');
			return report;
		case 'Catalog':
		case 'Collection':
		case 'Feature':
			// pass
			break;
		default:
			report.valid = false;
			report.results.core.push({
				instancePath: "/type",
				message: "Can't detect type of the STAC object. Is the 'type' field missing or invalid?"
			});
			return report;
	}
		
	// Validate against the core schemas
	await validateSchema('core', data.type, data, report, config);

	// Get all extension schemas to validate against
	let schemas = [];
	if (Array.isArray(data.stac_extensions)) {
		schemas = schemas.concat(data.stac_extensions);
		// Convert shortcuts supported in 1.0.0 RC1 into schema URLs
		if (versions.compare(data.stac_version, '1.0.0-rc.1', '=')) {
			schemas = schemas.map(ext => ext.replace(/^(eo|projection|scientific|view)$/, 'https://schemas.stacspec.org/v1.0.0-rc.1/extensions/$1/json-schema/schema.json'));
		}
	}
	for(const schema of schemas) {
		await validateSchema('extensions', schema, data, report, config);
	}

	if (config.customValidator) {
		const { default: create } = await import('stac-js');
		const stac = create(data, false, false);
		try {
			const test = new Test();
			await config.customValidator.afterValidation(stac, test, report, config);
			report.results.custom = test.errors;
		} catch (error) {
			report.results.custom = [
				error
			];
		} finally {
			if (report.results.custom.length > 0) {
				report.valid = false;
			}
		}
	}

	return report;
}

async function validateSchema(key, schema, data, report, config) {
	// Get schema identifier/uri
	let schemaId;
	switch(schema) {
		case 'Feature':
			schema = 'Item';
		case 'Catalog':
		case 'Collection':
			let type = schema.toLowerCase();
			schemaId = `https://schemas.stacspec.org/v${report.version}/${type}-spec/json-schema/${type}.json`;
			break;
		default: // extension
			if (isHttpUrl(schema)) {
				schemaId = schema;
			}
	}

	// Validate
	const setValidity = (errors = []) => {
		if (report.valid !== false) {
			report.valid = errors.length === 0;
		}
		if (key === 'core') {
			report.results.core = errors;
		}
		else {
			report.results.extensions[schema] = errors;
		}
	};
	try {
		if (key !== 'core' && !schemaId) {
			throw new Error("'stac_extensions' must contain a valid HTTP(S) URL to a schema.");
		}
		const validate = await loadSchema(config, schemaId);
		const valid = validate(data);
		if (valid) {
			setValidity();
		}
		else {
			setValidity(validate.errors);
		}
	} catch (error) {
		setValidity([{
			message: error.message
		}]);
	}
}

function summarizeResults(report) {
	if (report.children.length > 0) {
		report.valid = Boolean(report.children.every(result => result.valid));
	}
	return report;
}

async function loadSchema(config, schemaId) {
	let schema = config.ajv.getSchema(schemaId);
	if (schema) {
		return schema;
	}

	try {
		json = await loadSchemaFromUri(schemaId, config);
	} catch (error) {
		throw new Error(`Schema at '${schemaId}' not found. Please ensure all entries in 'stac_extensions' are valid.`);
	}
	if (!json.$id) {
		json.$id = schemaId;
	}

	schema = config.ajv.getSchema(json.$id);
	if (schema) {
		return schema;
	}

	return await config.ajv.compileAsync(json);
}

module.exports = validate;
