const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const iriFormats = require('./iri');
const path = require('path');

const SUPPORTED_PROTOCOLS = ['http:', 'https:'];

function isObject(obj) {
	return (typeof obj === 'object' && obj === Object(obj) && !Array.isArray(obj));
}

function isHttpUrl(url) {
	const parsed = URL.parse(url);
	if (parsed && SUPPORTED_PROTOCOLS.includes(parsed.protocol)) {
		return true;
	}
	return false;
}

function createAjv(config) {
	let instance = new Ajv({
		formats: iriFormats,
		allErrors: config.verbose,
		strict: false,
		logger: config.verbose ? console : false,
		loadSchema: async (uri) => await loadSchemaFromUri(uri, config)
	});
	addFormats(instance);
	if (config.strict) {
		instance.opts.strictSchema = true;
		instance.opts.strictNumbers = true;
		instance.opts.strictTuples = true;
	}
	return instance;
}

async function loadSchemaFromUri(uri, config) {
	if (isObject(config.schemaMap)) {
		const patterns = Object.entries(config.schemaMap);
		const match = patterns.find(map => uri.startsWith(map[0]));
		if (match) {
			const [pattern, target] = match;
			uri = path.join(target, uri.substring(pattern.length));
		}
	}
	if (config.schemas) {
		uri = uri.replace(/^https:\/\/schemas\.stacspec\.org\/v[^\/]+/, config.schemas);
	}
	return await config.loader(uri);
}

function normalizePath(path) {
	return path.replace(/\\/g, '/').replace(/\/$/, "");
}

function getSummary(result, config) {
	let summary = {
		total: 0,
		valid: 0,
		invalid: 0,
		malformed: null,
		skipped: 0
	};
	if (result.children.length > 0) {
		// todo: speed this up by computing in one iteration
		summary.total = result.children.length;
		summary.valid = result.children.filter(c => c.valid === true).length;
		summary.invalid = result.children.filter(c => c.valid === false).length;
		if (config.lint || config.format) {
			summary.malformed = result.children.filter(c => c.lint && !c.lint.valid).length;
		}
		summary.skipped = result.children.filter(c => c.skipped).length;
	}
	else {
		summary.total = 1;
		summary.valid = result.valid === true ? 1 : 0;
		summary.invalid = result.valid === false ? 1 : 0;
		if (result.lint) {
			summary.malformed = result.lint.valid ? 0 : 1;
		}
		summary.skipped = result.skipped ? 1 : 0;
	}
	return summary;
}

function makeAjvErrorMessage(error) {
	let message = error.message;
	if (isObject(error.params) && Object.keys(error.params).length > 0) {
		let params = Object.entries(error.params)
			.map(([key, value]) => {
				let label = key.replace(/([^A-Z]+)([A-Z])/g, "$1 $2").toLowerCase();
				return `${label}: ${value}`;
			})
			.join(', ')
		message += ` (${params})`;
	}
	if (error.instancePath) {
		return `${error.instancePath} ${message}`;
	}
	else if (error.schemaPath) {
		return `${message}, for schema ${error.schemaPath}`;
	}
	else if (message) {
		return message;
	}
	else {
		return String(error);
	}
}

module.exports = {
	createAjv,
	getSummary,
	isObject,
	isHttpUrl,
	loadSchemaFromUri,
	makeAjvErrorMessage,
	normalizePath,
	SUPPORTED_PROTOCOLS
};
