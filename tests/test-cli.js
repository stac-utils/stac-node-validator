const o = require('ospec');

const app = require('..');

o.before(() => {
	originalConsoleError = console.error;
	originalExit = process.exit;
});

o('Should return exit code 1 when run without parameters', () => {
	process.exit = o.spy();
	app();
	o(process.exit.args).deepEquals([1]);
});

o('Should print error message when run without parameters', () => {
	console.error = o.spy();
	app();
	o(console.error.calls[0].args[0].message).equals('No path or URL specified.');
});

o.after(() => {
	console.error = originalConsoleError
	process.exit = originalExit;
});
