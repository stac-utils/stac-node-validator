const BaseValidator = require('./src/baseValidator.js');

class CustomValidator extends BaseValidator {

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
		if (data.id === 'solid-earth') {
			test.deepEqual(data.example, [1,2,3]);
		}
	}

}

module.exports = CustomValidator;
