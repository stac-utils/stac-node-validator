# stac-node-validator

Simple proof-of-concept to validate STAC Items, Catalogs, Collections and core extensions with node.

Version: 0.2.1 - supports STAC 1.0.0-beta.1

## Setup

1. Install [node and npm](https://nodejs.org) - should run with any recent version
2. `npm install -g stac-node-validator` to install the library

## Usage

- Validate a single file: `stac-node-validator /path/to/your/file.json`
- Validate multiple files: `stac-node-validator /path/to/your/catalog.json /path/to/your/item.json`
- Validate a single folder (considers all `json` files in `examples` folders): `stac-node-validator ./stac-spec`
- Validate all examples in the STAC spec repo (only present if installed from GitHub): `stac-node-validator`

### Development

1. `git clone --recurse-submodules https://github.com/m-mohr/stac-node-validator` to clone the repo and pull the submodules
2. `cd stac-node-validator` to switch into the new folder created by git
3. `npm install install` to install dependencies
4. Run the commands as above, but replace `stac-node-validator` with `npm test --`, for example `npm test -- /path/to/your/file.json`