const axios = require('axios');

async function loader(uri) {
	// Todo: Temporary workaround for https://github.com/OSGeo/PROJ/issues/4088
	const projjson = uri.startsWith('https://proj.org/schemas/');
	if (projjson) {
		uri = uri.replace('https://proj.org/schemas/', 'https://proj.org/en/latest/schemas/');
	}

	let response = await axios.get(uri);
	return response.data;
}

module.exports = loader;
