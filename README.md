# stac-node-validator

Simple proof-of-concept to validate STAC Items, Catalogs, Collections and core extensions with node.

See the [STAC Validator Comparison](COMPARISON.md) for the features supported by this validator and the others out there.

## Versions

**Current version:** 2.0.0-beta.17

| STAC Node Validator Version | Supported STAC Versions |
| --------------------------- | ----------------------- |
| 1.1.0 / 1.2.x / 2.x.x       | >= 1.0.0-rc.1           |
| 0.4.x / 1.0.x               | >= 1.0.0-beta.2 and < 1.0.0-rc.3 |
| 0.3.0                       | 1.0.0-beta.2            |
| 0.2.1                       | 1.0.0-beta.1            |

## Quick Start

1. `npx stac-node-validator /path/to/your/file-or-folder` to temporarily install the library and validate the provided file for folder. See the chapters below for advanced usage options.

## Setup

1. Install a recent version of [node](https://nodejs.org) (>= 22.1.0) and npm
2. For CLI use: `npm install -g stac-node-validator`
   For programmatic use in another project: `npm install stac-node-validator`

## Usage

- Validate a single file: `stac-node-validator /path/to/your/file.json`
- Validate multiple files: `stac-node-validator /path/to/your/catalog.json /path/to/your/item.json`

Instead of paths to local files, you can also use HTTP(S) URLs. Other protocols such as S3 are not supported yet.

- Validate a single folder (considers all `json` files in the `examples` folder): `stac-node-validator ./stac-spec`
- Validate a single folder (considers all `json` files the given folder): `stac-node-validator ./stac-spec --all`

Further options to add to the commands above:

- To validate against schemas in a local STAC folder (e.g. `dev` branch): `--schemas /path/to/stac/folder`
- To validate against a specific local schema (e.g. an external extension): `--schemaMap https://stac-extensions.github.io/foobar/v1.0.0/schema.json=./json-schema/schema.json`
- To not verify SSL/TLS certificates: `--ignoreCerts`
- Add `--verbose` to get a more detailed output
- Add `--strict` to enable strict mode in validation for schemas and numbers (as defined by [ajv](https://ajv.js.org/strict-mode.html) for options `strictSchema`, `strictNumbers` and `strictTuples`)
- To lint local JSON files: `--lint` (add `--verbose` to get a diff with the changes required)
- To format / pretty-print local JSON files: `--format` (Attention: this will override the source files without warning!)
- To run custom validation code: `--custom ./path/to/validation.js` - The validation.js needs to contain a class that implements the `BaseValidator` interface. See [custom.example.js](./custom.example.js) for an example.

**Note on API support:** Validating lists of STAC items/collections (i.e. `GET /collections` and `GET /collections/:id/items`) is partially supported.
It only checks the contained items/collections, but not the other parts of the response (e.g. `links`).

### Config file

You can also pass a config file via the `--config` option. Simply pass a file path as value.
Parameters set via CLI will not override the corresponding setting in the config file.

The config file uses the same option names as above.
To specify the files to be validated, add an array with paths.
The schema map is an object instead of string separated with a `=` character.

### Development

1. `git clone https://github.com/stac-utils/stac-node-validator` to clone the repo
2. `cd stac-node-validator` to switch into the new folder created by git
3. `npm install` to install dependencies
4. Run the commands as above, but replace `stac-node-validator` with `node bin/cli.js`, for example `node bin/cli.js /path/to/your/file.json`

### Test

Simply run `npm test` in a working [development environment](#development).

If you want to disable tests for your fork of the repository, simply delete `.github/workflows/test.yaml`.
