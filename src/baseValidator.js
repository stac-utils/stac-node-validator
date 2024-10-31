// const { STAC } = require('stac-js');

class BaseValidator {

	/**
	 * 
	 */
	constructor() {
	}

	async createAjv(ajv) {
		return ajv;
	}

	/**
	 * Any preprocessing work you want to do on the data.
	 * 
	 * @param {Object} data
	 * @param {import('.').Report} report
	 * @param {import('.').Config} config
	 * @returns {Object}
	 */
	async afterLoading(data, report, config) {
		return data;
	}

	/**
	 * Bypass the STAC validation, do something different but still return a report.
	 * 
	 * Could be used to validate against a different schema, e.g. OGC API - Records.
	 * 
	 * Return a Report to bypass validation, or null to continue with STAC validation.
	 * 
	 * @param {Object} data
	 * @param {import('.').Report} report
	 * @param {import('.').Config} config
	 * @returns {import('.').Report|null}
	 */
	async bypassValidation(data, report, config) {
		return null;
	}

	/**
	 * Any custom validation routines you want to run.
	 * 
	 * You can either create a list of errors using the test interface
	 * or just throw on the first error.
	 * 
	 * @param {STAC} data
	 * @param {Test} test
	 * @param {import('.').Report} report
	 * @param {import('.').Config} config
	 * @throws {Error}
	 */
	async afterValidation(data, test, report, config) {

	}

}

module.exports = BaseValidator;
