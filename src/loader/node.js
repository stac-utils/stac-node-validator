const axios = require('axios');
const fs = require('fs-extra');
const { isUrl } = require("../utils");

async function loader(uri) {
	if (isUrl(uri)) {
		let response = await axios.get(uri);
		return response.data;
	}
	else {
		return JSON.parse(await fs.readFile(uri, "utf8"));
	}
}

module.exports = loader;
