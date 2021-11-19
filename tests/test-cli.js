const o = require('ospec');

const app = require('..');

o.before(() => originalExit = process.exit);

o('Should return exit code 1 when run without parameters', () => {
	process.exit = o.spy();
	app();
	o(process.exit.args).deepEquals([1]);
});

o.after(() => process.exit = originalExit);
