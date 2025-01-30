const axios = require('axios');
const fs = require('fs-extra');
const { isHttpUrl } = require('../utils');

async function loader(uri) {
	if (isHttpUrl(uri)) {
		const response = await axios.get(uri);
		return response.data;
	}
	else {
		if (await fs.exists(uri)) {
			return JSON.parse(await fs.readFile(uri, "utf8"));
		}
		else {
			const url = URL.parse(uri);
			// url.protocol.length > 2 check that it's not a Windows path, e.g. c: as in c://foo/bar
			if (url && url.protocol && url.protocol.length > 2 && url.protocol !== 'file:') {
				throw new Error(`Protocol not supported: ${url.protocol}`);
			}
			else {
				const path = require('path');
				throw new Error(`File not found: ${uri}`);
			}
		}
	}
}

module.exports = loader;
