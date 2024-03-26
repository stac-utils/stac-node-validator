const fs = require('fs-extra');
const { diffStringsUnified } = require('jest-diff');
const { isUrl, isObject } = require('./utils');

/**
 * @typedef LintResult
 * @type {Object}
 * @property {boolean} valid
 * @property {boolean} fixed
 * @property {Error|null} error
 * @property {string|null} diff
 */

/**
 * @param {string} file 
 * @param {Object} config 
 * @returns {LintResult}
 */
async function lint(file, config) {
	if (isObject(file)) {
		return null;
	}
	else if (isUrl(file)) {
		return null;
	}

	let result = {
		valid: false,
		fixed: false,
		error: null,
		diff: null
	};
	try {
		const fileContent = await fs.readFile(file, "utf8");
		const expectedContent = JSON.stringify(JSON.parse(fileContent), null, 2);
		result.valid = normalizeNewline(fileContent) === normalizeNewline(expectedContent);

		if (!result.valid) {
			if (config.verbose) {
				result.diff = diffStringsUnified(fileContent, expectedContent);
			}
			if (config.format) {
				await fs.writeFile(file, expectedContent);
				result.fixed = true;
			}
		}
	} catch (error) {
		result.error = error;
	}
	return result;
}

function normalizeNewline(str) {
	// 2 spaces, *nix newlines, newline at end of file
	return str.trimRight().replace(/(\r\n|\r)/g, "\n") + "\n";
}

module.exports = lint;
