// const { STAC } = require('stac-js');

class BaseValidator {

	/**
	 * 
	 */
	constructor() {
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
