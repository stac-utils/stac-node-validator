# stac-node-validator

Simple proof-of-concept to validate STAC Items, Catalogs, Collections and core extensions with node.

See the [STAC Validator Comparison](COMPARISON.md) for the features supported by this validator and the others out there.

## Versions

**Current version: 0.4.7**

| STAC Node Validator Version | Supported STAC Versions |
| --------------------------- | ----------------------- |
| >= 0.4.0                    | >= 1.0.0-beta.2         |
| 0.3.0                       | 1.0.0-beta.2            |
| 0.2.1                       | 1.0.0-beta.1            |

## Quick Start

1. Install [node and npm](https://nodejs.org) - should run with any recent version
2. `npx stac-node-validator /path/to/your/file-or-folder` to temporarily install the library and validate the provided file for folder. See the chapters below for advanced usage options.

## Setup

1. Install [node and npm](https://nodejs.org) - should run with any recent version
2. `npm install -g stac-node-validator` to install the library permanently

## Usage

- Validate a single file: `stac-node-validator /path/to/your/file.json`
- Validate multiple files: `stac-node-validator /path/to/your/catalog.json /path/to/your/item.json`

Instead of paths to local files, you can also use HTTP(S) URLs. Other protocols such as S3 are not supported yet.

- Validate a single folder (considers all `json` files in `examples` folders): `stac-node-validator ./stac-spec`

Further options to add to the commands above:

- To validate against schemas in a local STAC folder (e.g. `dev` branch): `--schemas /path/to/stac/folder`
- To not verify SSL/TLS certificates: `--ignoreCerts`
- To lint local JSON files: `--lint` (add `--verbose` to get a diff with the changes required)
- To format / pretty-print local JSON files: `--format` (Attention: this will override the source files without warning!)

**Note on API support:** Validating lists of STAC items/collections (i.e. `GET /collections` and `GET /collections/:id/items`) is partially supported.
It only checks the contained items/collections, but not the other parts of the response (e.g. `links`).

### Development

1. `git clone https://github.com/m-mohr/stac-node-validator` to clone the repo
2. `cd stac-node-validator` to switch into the new folder created by git
3. `npm install` to install dependencies
4. Run the commands as above, but replace `stac-node-validator` with `node bin/cli.js`, for example `node bin/cli.js /path/to/your/file.json`