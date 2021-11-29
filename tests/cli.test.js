const app = require('../index');

let mockExit;
let consoleLogSpy;
let consoleErrSpy;

beforeEach(() => {
	mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
	consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
	consoleErrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

it('Should return exit code 1 and an error when run without parameters', async () => {
	await app({});

	expect(consoleLogSpy.mock.calls[0][0]).toContain('STAC Node Validator v1.1.0');
	expect(consoleErrSpy.mock.calls[0][0] instanceof Error).toBeTruthy();
	expect(consoleErrSpy.mock.calls[0][0].message).toContain('No path or URL specified.');
	expect(mockExit).toHaveBeenCalledWith(1);
});

afterEach(() => {
	mockExit.mockClear();
	consoleLogSpy.mockClear();
	consoleErrSpy.mockClear();
});

afterAll(() => {
	mockExit.mockRestore();
	consoleLogSpy.mockRestore();
	consoleErrSpy.mockRestore();
});