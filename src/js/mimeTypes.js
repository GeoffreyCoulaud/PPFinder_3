const { extname } = require('path');

class MimeTypesList{
	constructor(){
		// Default MIME type and plain text
		this[''] =
		this['.txt'] = 'text/plain';
		
		// Javascript text
		this['.js'] = 
		this['.ts'] = 
		this['.mjs'] =
		this['.vue'] = 'text/javascript';
		
		// HTML text
		this['.html'] = 
		this['.htm'] = 'text/html';
		
		// JSON
		this['.json'] = 'application/json';
		
		// CSS text
		this['.css'] = 'text/css';
		
		// SVG images
		this['.svg'] = 'application/svg+xml';
		
		// PNG images
		this['.png'] = 'image/png';

		// JPG images
		this['.jpeg'] = 
		this['.jpg'] = 'image/jpeg';
	}
}

function mime (filename){
	let mimeTypes = new MimeTypesList();
	return mimeTypes[extname(`${filename || ''}`).toLowerCase()];
}


module.exports = mime;