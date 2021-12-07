const app = require('../index');
const { version } = require('../package.json');

let consoleErrSpy, consoleInfSpy, consoleLogSpy, mockExit;
const initString = `STAC Node Validator v${version}`;

beforeEach(() => {
	mockExit = jest.spyOn(process, 'exit').mockImplementation();
	consoleInfSpy = jest.spyOn(console, 'info').mockImplementation();
	consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
	consoleErrSpy = jest.spyOn(console, 'error').mockImplementation();
});

it('Should print init string', async () => {
	await app();

	expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
});

it('Should print version number', async () => {
	await app({version: true});

	expect(consoleLogSpy.mock.calls[0][0]).toBe(version);
	expect(mockExit).toHaveBeenCalledWith(0);
});

describe('Running without parameters or configuration', () => {
	it('Should return exit code 1', async () => {
		await app();
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it('Should print an error message', async () => {
		await app();
		expect(consoleErrSpy.mock.calls[0][0] instanceof Error).toBeTruthy();
		expect(consoleErrSpy.mock.calls[0][0].message).toContain('No path or URL specified.');
	});
});

describe('Running with a configured simple catalog', () => {
	it('Should return exit code 0', async () => {
		await app({files: ['tests/catalog.json']});

		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it('Should print informational messages', async () => {
		await app({files: ['tests/catalog.json']});

		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleLogSpy.mock.calls[1][0]).toContain('tests/catalog.json');
		expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 1');
		expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 1');
		expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 0');
	});

	it('Should not print an error message', async () => {
		await app({files: ['tests/catalog.json']});

		expect(consoleErrSpy).not.toHaveBeenCalled();
	});
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
