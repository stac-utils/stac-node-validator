const { parse } = require('uri-js');

// We don't allow empty URIs, same-document and mailto here
const IRI = {
	'iri': value => {
		if (typeof value !== 'string' || value.length === 0) {
			return false;
		}

		const iri = parse(value);
		if ((iri.reference === 'absolute' || iri.reference === 'uri') && iri.scheme && (iri.host || iri.path)) {
			return true;
		}

		return false;
	},
	'iri-reference': value => {
		if (typeof value !== 'string' || value.length === 0) {
			return false;
		}

		const iri = parse(value);
		if ((iri.reference === 'absolute' || iri.reference === 'uri') && iri.scheme && (iri.host || iri.path)) {
			return true;
		}

		return (iri.path && (iri.reference === 'relative' || iri.reference === 'uri'));
	}
};

module.exports = IRI;
