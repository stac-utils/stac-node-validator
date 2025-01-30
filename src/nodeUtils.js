const klaw = require('klaw');
const fs = require('fs-extra');
const path = require('path');

const { makeAjvErrorMessage, isHttpUrl, SUPPORTED_PROTOCOLS } = require('./utils');

const SCHEMA_CHOICE = ['anyOf', 'oneOf'];

function abort(message) {
	console.error(message);
	process.exit(1);
}

function printConfig(config) {
	console.group("Config");
	console.dir(config);
	console.groupEnd();
}

function printSummary(summary) {
	console.group(`Summary (${summary.total})`);
	console.log("Valid: " + summary.valid);
	console.log("Invalid: " + summary.invalid);
	if (summary.malformed !== null) {
		console.log("Malformed: " + summary.malformed);
	}
	console.log("Skipped: " + summary.skipped);
	console.groupEnd();
}

function printLint(lint, config) {
	const what = [];
	config.lint && what.push('Linting');
	config.format && what.push('Formatting');
	const title = what.join(' and ');

	if (!lint) {
		if (config.lint || config.format) {
			console.group(title);
			console.log('Not supported for remote files');
			console.groupEnd();
		}
		return;
	}

	if (config.verbose) {
		console.group(title);
		if (lint.valid) {
			console.log('File is well-formed');
		}
		else {
			if (lint.fixed) {
				console.log('File was malformed -> fixed the issue');
			}
			else {
				console.log('File is malformed -> use `--format` to fix the issue');
			}
		}
		if (lint.error) {
			console.log(lint.error);
		}
		if (lint.diff) {
			console.groupCollapsed("File Diff");
			console.log(lint.diff);
			console.groupEnd();
		}
		console.groupEnd();
	}
	else if (!lint.valid && !lint.fixed) {
		console.group(title);
		console.log('File is malformed -> use `--format` to fix the issue');
		if (lint.error) {
			console.log(lint.error);
		}
		console.groupEnd();
	}
}

function printReport(report, config) {
	if (report.valid && !config.verbose) {
		return;
	}

	console.group(report.id || "Report");

	if (config.verbose && report.version) {
		console.log(`STAC Version: ${report.version}`);
	}

	if (report.messages) {
		report.messages.forEach(str => console.log(str));
	}

	if (!report.apiList) {
		printLint(report.lint, config);
	}

	if (!report.valid || config.verbose) {
		printAjvValidationResult(report.results.core, report.type, report.valid, config);
		if (report.type) {
			const count = Object.keys(report.results.extensions).length;
			if (count > 0) {
				console.group("Extensions");
				Object.entries(report.results.extensions)
					.forEach(([ext, result]) => printAjvValidationResult(result, ext, report.valid, config));
				console.groupEnd();
			}
			else {
				console.log("Extensions: None");
			}
		}
		if (config.custom) {
			printAjvValidationResult(report.results.custom, 'Custom', report.valid, config);
		}
	}

	report.children.forEach(child => printReport(child, config));

	console.groupEnd();
}

function printAjvValidationResult(result, category, reportValid, config) {
	if (!category) {
		return;
	}
	if (!config.verbose && isHttpUrl(category)) {
		const match = category.match(/^https?:\/\/stac-extensions\.github\.io\/([^/]+)\/v?([^/]+)(?:\/([^/.]+))?\/schema/);
		if (match) {
			let title = match[1];
			if (match[3]) {
				title += ' - ' + formatKey(match[3]);
			}
			category = `${title} (${match[2]})`;
		}
	}
	if (result.length > 0) {
		console.group(category);
		if (config.verbose) {
			console.dir(result);
		}
		else {
			result
				.filter(error => result.length === 1 || !SCHEMA_CHOICE.includes(error.keyword)) // Remove messages that are usually not so important (anyOf/oneOf)
				.sort((a,b) => {
					// Sort so that anyOf/oneOf related messages come last, these are usually not so important
					let aa = isSchemaChoice(a.schemaPath);
					let bb = isSchemaChoice(b.schemaPath);
					if (aa && bb) {
						return 0;
					}
					else if (aa) {
						return 1;
					}
					else if (bb) {
						return -1;
					}
					else {
						return 0;
					}
				})
				.map(error => makeAjvErrorMessage(error)) // Convert to string
				.filter((value, i, array) => array.indexOf(value) === i) // Remove duplicates
				.forEach((msg, i) => console.log(`${i+1}. ${msg}`)); // Print it as list
		}
		console.groupEnd();
	}
	else if (!reportValid || config.verbose) {
		console.log(`${category}: valid`);
	}
}

function isSchemaChoice(schemaPath) {
	return typeof schemaPath === 'string' && schemaPath.match(/\/(one|any)Of\/\d+\//);
}

async function resolveFiles(files, depth = -1) {
	const result = {
		files: [],
		error: {}
	};
	const extensions = [".geojson", ".json"];
	const klawOptions = {
		depthLimit: depth
	}
	for (const file of files) {
		const url = URL.parse(file);
		if (url && url.protocol && url.protocol.length > 1 && url.protocol !== 'file:') {
			if (SUPPORTED_PROTOCOLS.includes(url.protocol)) {
				result.files.push(file);
				continue;
			}
			else {
				result.error[file] = new Error(`Protocol "${url.protocol}" is not supported.`);
			}
		} else {
			try {
				const stat = await fs.lstat(file);
				if (stat.isDirectory()) {
					// Special handling for reading directories
					for await (const child of klaw(file, klawOptions)) {
						const ext = path.extname(child.path).toLowerCase();
						if (extensions.includes(ext)) {
							result.files.push(child.path);
						}
					}
				}
				else {
					result.files.push(file);
				}
			} catch (error) {
				result.error[file] = error;
			}
		}
	}
	return result;
}

function strArrayToObject(list, sep = "=") {
	let map = {};
	for (let str of list) {
		let [key, value] = str.split(sep, 2);
		map[key] = value;
	}
	return map;
}

module.exports = {
	abort,
	printConfig,
	printReport,
	printSummary,
	resolveFiles,
	strArrayToObject
};
