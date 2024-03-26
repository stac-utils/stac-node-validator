const axios = require('axios');

async function loader(uri) {
	let response = await axios.get(uri);
	return response.data;
}

module.exports = loader;
