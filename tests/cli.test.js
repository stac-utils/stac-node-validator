const app = require('../index');
const { version } = require('../package.json');
const fs = require('fs/promises');

let consoleErrSpy, consoleWarnSpy, consoleInfSpy, consoleLogSpy, mockExit;
const initString = `STAC Node Validator v${version}`;

const validCatalogPath = 'tests/examples/catalog.json';
const invalidCatalogPath = 'tests/examples/invalid-catalog.json';
const invalidSchemaPath = 'tests/invalid-schema.json';
const invalidSchemaCatalogPath = 'tests/examples/catalog-with-invalid-schema.json';
const apiItemsPath = 'tests/api/items.json';
const apiCollectionsPath = 'tests/api/collections.json';

beforeEach(() => {
	mockExit = jest.spyOn(process, 'exit').mockImplementation();
	consoleInfSpy = jest.spyOn(console, 'info').mockImplementation();
	consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
	consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
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

it('Should print help', async () => {
	await app({help: true});

	expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
	expect(consoleLogSpy.mock.calls[1][0]).toContain("For more information on using this command line tool, please visit");
	expect(consoleLogSpy.mock.calls[2][0]).toContain("https://github.com/stac-utils/stac-node-validator/blob/master/README.md#usage");
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

describe('Validate a valid catalog', () => {
	let files = [validCatalogPath];

	it('Should return exit code 0', async () => {
		await app({files});

		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it('Should print informational messages', async () => {
		await app({files});
		
		expect(consoleErrSpy.mock.calls).toEqual([]);

		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleLogSpy.mock.calls[1][0]).toContain(validCatalogPath);
		expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 1');
		expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 1');
		expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 0');
	});
});

describe('Validate a whole folder', () => {
	let files = ['tests/'];

	it('Should return exit code 1', async () => {
		await app({files});

		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it('Should print informational messages', async () => {
		await app({files});

		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 3');
		expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 1');
		expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 2');
	});
});

describe('Validate an partially invalid API Items (Item Collection)', () => {
	let config = {
		files: [apiItemsPath],
		verbose: true
	};

	it('Should return exit code 1', async () => {
		await app(config);

		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it('Should print informational messages', async () => {
		await app(config);

		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleLogSpy.mock.calls[1][0]).toContain(apiItemsPath);
		expect(consoleLogSpy.mock.calls[2][0]).toContain('The file is a /collections/:id/items endpoint. Validating all 2 items, but ignoring the other parts of the response.');
		expect(consoleLogSpy.mock.calls[4][0]).toContain('20201211_223832_CS2: STAC Version: 1.0.0');
		expect(consoleLogSpy.mock.calls[5][0]).toContain('Item: valid');
		expect(consoleLogSpy.mock.calls[7][0]).toContain('invalid: STAC Version: 1.0.0');
		expect(consoleLogSpy.mock.calls[8][0]).toContain('Item: invalid');

		expect(Array.isArray(consoleWarnSpy.mock.calls[0][0])).toBeTruthy();
		expect(consoleWarnSpy.mock.calls[1][0]).toContain('Validation error in core, skipping extension validation');

		expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 1');
		expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 0');
		expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 1');
	});
});

describe('Validate valid API Collections', () => {
	let files = [apiCollectionsPath];

	it('Should return exit code 0', async () => {
		await app({files});

		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it('Should print informational messages', async () => {
		await app({files});
		
		expect(consoleErrSpy.mock.calls).toEqual([]);

		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleLogSpy.mock.calls[1][0]).toContain(apiCollectionsPath);
		expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 1');
		expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 1');
		expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 0');
	});
});

describe('Validate an invalid catalog', () => {
	let files = [invalidCatalogPath];

	it('Should return exit code 1', async () => {
		await app({files});

		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it('Should print informational messages', async () => {
		await app({files});
		
		expect(consoleErrSpy.mock.calls).toEqual([]);

		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleLogSpy.mock.calls[1][0]).toContain(invalidCatalogPath);
		expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 1');
		expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 0');
		expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 1');
	});

	it('Should print validation warnings', async () => {
		await app({files});
		
		expect(consoleErrSpy.mock.calls).toEqual([]);

		expect(consoleWarnSpy.mock.calls[0][0]).toEqual([{
			"instancePath": "",
			"keyword": "required",
			"message": "must have required property 'links'",
			"params": {"missingProperty": "links"},
			"schemaPath": "#/required"
		}]);
	});
});

describe('Validate a catalog passed as config file via CLI (verbose)', () => {
	let argv = ['node_executable', 'app_script', '--config', 'tests/example-config.json'];

	it('Should return exit code 0', async () => {
		process.argv = argv;
		await app();
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it('Should print informational messages', async () => {
		process.argv = argv;
		await app();
		
		expect(consoleErrSpy.mock.calls).toEqual([]);

		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleLogSpy.mock.calls[1][0]).toContain(validCatalogPath);
		expect(consoleLogSpy.mock.calls[2][0]).toContain('STAC Version: 1.0.0');
		expect(consoleLogSpy.mock.calls[3][0]).toContain('Catalog: valid');

		expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 1');
		expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 1');
		expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 0');
	});
});

describe('Run with a non-existing config file', () => {
	let argv = ['node_executable', 'app_script', '--config', 'does-not-exist.json'];

	it('Should return exit code 1', async () => {
		process.argv = argv;
		await app();
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it('Should print informational messages', async () => {
		process.argv = argv;
		await app();
		
		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleErrSpy.mock.calls[0][0] instanceof Error).toBeTruthy();
		expect(consoleErrSpy.mock.calls[0][0].message).toContain('Config file does not exist.');
	});
});

describe('Validate a catalog passed via CLI', () => {
	let argv = ['node_executable', 'app_script', validCatalogPath];

	it('Should return exit code 0', async () => {
		process.argv = argv;
		await app();
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it('Should print informational messages', async () => {
		process.argv = argv;
		await app();
		
		expect(consoleErrSpy.mock.calls).toEqual([]);

		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleLogSpy.mock.calls[1][0]).toContain(validCatalogPath);
		expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 1');
		expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 1');
		expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 0');
	});
});

describe('Validate an invalid schema via config', () => {
	let config = {
		schemaMap: `https://example.org/invalid-schema.json=${invalidSchemaPath}`,
		files: [invalidSchemaCatalogPath]
	};

	it('Should return exit code 1', async () => {
		await app(config);

		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it('Should print informational messages', async () => {
		await app(config);
		
		expect(consoleErrSpy).toHaveBeenCalled();
		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleLogSpy.mock.calls[1][0]).toContain(invalidSchemaCatalogPath);
		expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 1');
		expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 0');
		expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 1');
	});
});

describe('Validate an invalid schema via CLI', () => {
	let argv = ['node_executable', 'app_script', invalidSchemaCatalogPath, '--schemaMap', `https://example.org/invalid-schema.json=${invalidSchemaPath}`];

	it('Should return exit code 1', async () => {
		process.argv = argv;
		await app();

		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it('Should print informational messages', async () => {
		process.argv = argv;
		await app();
		
		expect(consoleErrSpy).toHaveBeenCalled();
		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleLogSpy.mock.calls[1][0]).toContain(invalidSchemaCatalogPath);
		expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 1');
		expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 0');
		expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 1');
	});
});

describe('Linting a valid catalog with invalid formatting', () => {
	let config = {
		files: [validCatalogPath],
		lint: true
	};

	it('Should return exit code 1', async () => {
		await app(config);

		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it('Should print informational messages', async () => {
		await app(config);

		expect(consoleErrSpy.mock.calls).toEqual([]);

		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleLogSpy.mock.calls[1][0]).toContain(validCatalogPath);

		expect(consoleWarnSpy.mock.calls[0][0]).toContain('Lint: File is malformed');

		expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 1');
		expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 1');
		expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 0');
		expect(consoleInfSpy.mock.calls[3][0]).toContain('Malformed: 1');
	});
});

describe('Formatting a valid catalog with invalid formatting (verbose)', () => {
	let formatCatalogPath = 'tests/catalog-to-format.ignore';
	let config = {
		files: [formatCatalogPath],
		format: true,
		verbose: true
	};

	beforeEach(async () => await fs.writeFile(formatCatalogPath, await fs.readFile(validCatalogPath)));
	afterEach(async () => await fs.rm(formatCatalogPath));

	it('Should return exit code 0', async () => {
		await app(config);

		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it('Should print informational messages', async () => {
		await app(config);

		expect(consoleErrSpy.mock.calls).toEqual([]);

		expect(consoleLogSpy.mock.calls[0][0]).toContain(initString);
		expect(consoleLogSpy.mock.calls[1][0]).toContain(formatCatalogPath);
		expect(consoleLogSpy.mock.calls[2][0]).toContain('STAC Version: 1.0.0');
		expect(consoleLogSpy.mock.calls[3][0]).toContain('Catalog: valid');

		expect(consoleWarnSpy.mock.calls[0][0]).toContain('Format: File was malformed -> fixed the issue');

		expect(consoleInfSpy.mock.calls[0][0]).toContain('Files: 1');
		expect(consoleInfSpy.mock.calls[1][0]).toContain('Valid: 1');
		expect(consoleInfSpy.mock.calls[2][0]).toContain('Invalid: 0');
		expect(consoleInfSpy.mock.calls[3][0]).toContain('Malformed: 1');
	});
});

afterEach(() => {
	process.argv = [];
	mockExit.mockClear();
	consoleInfSpy.mockClear();
	consoleLogSpy.mockClear();
	consoleWarnSpy.mockClear();
	consoleErrSpy.mockClear();
});

afterAll(() => {
	mockExit.mockRestore();
	consoleInfSpy.mockRestore();
	consoleLogSpy.mockRestore();
	consoleWarnSpy.mockRestore();
	consoleErrSpy.mockRestore();
});
