const fs = require('fs-extra');
const path = require('path');
const { version } = require('../package.json');
const ConfigSource = require('./config.js');
const validate = require('../src/index.js');
const { printConfig, printSummary, resolveFiles, printReport, abort } = require('./nodeUtils');
const nodeLoader = require('./loader/node');
const { getSummary, normalizePath } = require('./utils');
const lint = require('./lint');


async function run() {
	console.log(`STAC Node Validator v${version}`);
	console.log();

	// Read config from CLI and config file (if any)
	let config = ConfigSource.fromCLI();
	if (typeof config.config === 'string') {
		Object.assign(config, await ConfigSource.fromFile(config.config));
	}
	if (!config.loader) {
		config.loader = nodeLoader;
	}

	// Handle ignoreCerts option in Node
	if (config.ignoreCerts) {
		process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
	}

	// Abort if no files have been provided
	if (config.files.length === 0) {
		abort('No path or URL specified.');
	}

	config.depth = config.depth >= 0 ? config.depth : -1;

	// Verify files exist / read folders
	const files = await resolveFiles(config.files, config.depth);
	delete config.files;
	for (let file in files.error) {
		const error = files.error[file];
		console.warn(`${file}: Can't be validated for the following reason: ${error}`);
	}
	if (files.files.length === 0) {
		abort('No files found that are suitable for validation.');
	}
	else if (files.files.length === 1) {
		data = files.files[0];
	}
	else {
		data = files.files;
	}

	// Resolve schema folder
	if (config.schemas) {
		let stat = await fs.lstat(config.schemas);
		if (stat.isDirectory()) {
			config.schemas = normalizePath(config.schemas);
		}
		else {
			abort('Schema folder is not a directory');
		}
	}

	// Print config
	if (config.verbose) {
		printConfig(config);
		console.log();
	}

	if (config.lint || config.format) {
		config.lintFn = async (data, report, config) => {
			if (!report.apiList) {
				report.lint = await lint(data, config);
				if (report.lint && !report.lint.valid) {
					report.valid = false;
				}
			}
			return report;
		}
	}

	if (config.custom) {
		const absPath = path.resolve(process.cwd(), config.custom);
		const validator = require(absPath);
		config.customValidator = new validator();
	}

	// Finally run validation
	const result = await validate(data, config);

	// Print not a "supported error" once for API lists
	if (result.apiList) {
		printLint(null, config);
	}

	// Print report and summary
	printReport(result, config);
	if (config.verbose || !result.valid) {
		console.log();
	}

	const summary = getSummary(result, config);
	printSummary(summary);

	// Exit with error code or report success
	let errored = (summary.invalid > 0 || (config.lint && !config.format && summary.malformed > 0)) ? 1 : 0;
	process.exit(errored);
}

module.exports = run;
