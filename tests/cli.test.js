const app = require('..');

let consoleError, processExit;

beforeEach(() => {
	consoleError = jest.spyOn(console, 'error').mockImplementation();
	processExit = jest.spyOn(process, 'exit').mockImplementation();
});

test('Should return exit code 1 when run without parameters', () => {
	app();
	expect(processExit).toHaveBeenCalledWith(1);
});

test('Should print error message when run without parameters', () => {
	app();
	expect(consoleError).toHaveBeenCalledWith(Error('No path or URL specified.'));
});

afterEach(() => {
	consoleError.mockRestore();
	processExit.mockRestore();
});
