const fs = require('fs-extra');
const { version } = require('../package.json');
const ConfigSource = require('./config.js');
const validate = require('../src/index.js');
const { printConfig, printSummary, resolveFiles, printReport } = require('./nodeUtils');
const nodeLoader = require('./loader/node');
const { getSummary } = require('./utils');
const lint = require('./lint');


async function run() {
	console.log(`STAC Node Validator v${version}`);
	console.log();

	// Read config from CLI and config file (if any)
	const cliConfig = ConfigSource.fromCLI();
	let config = {};
	if (typeof cliConfig.config === 'string') {
		config = ConfigSource.fromFile(config.config);
	}
	Object.assign(config, cliConfig);
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
	let data = await resolveFiles(config.files, config.depth);
	delete config.files;
	if (data.length === 1) {
		data = data[0];
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

	// Finally run validation
	const result = await validate(data, config);

	// Print not supported error once for API lists
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
