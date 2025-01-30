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
			if (url.protocol && url.protocol !== 'file:' && url.protocol.length > 1) {
				throw new Error(`Protocol not supported: ${url.protocol}`);
			}
			else {
				throw new Error(`File not found: ${uri}`);
			}
		}
	}
}

module.exports = loader;
