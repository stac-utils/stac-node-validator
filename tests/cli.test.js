const app = require('../index');

let mockExit;
let consoleInfSpy;
let consoleLogSpy;
let consoleErrSpy;
let initString = 'STAC Node Validator v1.1.0';

beforeEach(() => {
	mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
	consoleInfSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
	consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
	consoleErrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

it('Should return exit code 1 and an error when run without parameters', async () => {
	await app({});

	expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
	expect(consoleErrSpy.mock.calls[0][0] instanceof Error).toBeTruthy();
	expect(consoleErrSpy.mock.calls[0][0].message).toContain('No path or URL specified.');
	expect(mockExit).toHaveBeenCalledWith(1);
});

it('Should return exit code 0 and no error when run against simple catalog', async () => {
	await app({
		files: ['tests/catalog.json']
	});

	expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
	expect(consoleLogSpy.mock.calls[1][0]).toContain('tests/catalog.json');
	expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 1');
	expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 1');
	expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 0');
	expect(consoleErrSpy).not.toHaveBeenCalled();
	expect(mockExit).toHaveBeenCalledWith(0);
});

afterEach(() => {
	mockExit.mockClear();
	consoleInfSpy.mockClear();
	consoleLogSpy.mockClear();
	consoleErrSpy.mockClear();
});

afterAll(() => {
	mockExit.mockRestore();
	consoleInfSpy.mockRestore();
	consoleLogSpy.mockRestore();
	consoleErrSpy.mockRestore();
});