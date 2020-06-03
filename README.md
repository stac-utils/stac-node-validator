# stac-node-validator

Simple proof-of-concept to validate STAC Items, Catalogs and Collections with node.

## Setup

1. Install [node and npm](https://nodejs.org/en/) - should run with any recent version
2. `git clone --recurse-submodules https://github.com/m-mohr/stac-node-validator` to clone the repo and pull the submodules
3. `cd stac-node-validator` to switch into the new folder created by git
4. `npm install` to install dependencies

## Usage

- Validate a single file: `npm test -- /path/to/your/file.json`
- Validate multiple files: `npm test -- /path/to/your/catalog.json /path/to/your/item.json`