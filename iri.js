const { parse } = require('uri-js');

// We don't allow empty URIs, same-document and mailto here
module.exports = {
	'iri': value => {
		if (typeof value !== 'string' || value.length === 0) {
			return;
		}

		const iri = parse(value);
		if ((iri.reference === 'absolute' || iri.reference === 'uri') && iri.scheme && iri.host) {
			return true;
		}

		return false;
	},
	'iri-reference': value => {
		if (typeof value !== 'string' || value.length === 0) {
			return;
		}

		const iri = parse(value);
		if ((iri.reference === 'absolute' || iri.reference === 'uri') && iri.scheme && (iri.host !== undefined)) {
			return true;
		}

		return (iri.path && (iri.reference === 'relative' || iri.reference === 'uri'));
	}
};
