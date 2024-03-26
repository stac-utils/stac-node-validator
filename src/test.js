const assert = require('assert');

class Test {

	constructor() {
		this.errors = [];
	}

	truthy(...args) {
		try {
			assert(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	deepEqual(...args) {
		try {
			assert.deepEqual(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	deepStrictEqual(...args) {
		try {
			assert.deepStrictEqual(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	doesNotMatch(...args) {
		try {
			assert.doesNotMatch(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	async doesNotReject(...args) {
		try {
			await assert.doesNotReject(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	doesNotThrow(...args) {
		try {
			assert.doesNotThrow(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	equal(...args) {
		try {
			assert.equal(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	fail(...args) {
		try {
			assert.fail(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	ifError(...args) {
		try {
			assert.ifError(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	match(...args) {
		try {
			assert.match(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	notDeepEqual(...args) {
		try {
			assert.notDeepEqual(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	notDeepStrictEqual(...args) {
		try {
			assert.notDeepStrictEqual(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	notEqual(...args) {
		try {
			assert.notEqual(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	notStrictEqual(...args) {
		try {
			assert.notStrictEqual(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	ok(...args) {
		try {
			assert.ok(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	async rejects(...args) {
		try {
			await assert.rejects(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	strictEqual(...args) {
		try {
			assert.strictEqual(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

	throws(...args) {
		try {
			assert.throws(...args);
		} catch (error) {
			this.errors.push(error);
		}
	}

}

module.exports = Test;
