/*
	Base code from
	https://gist.github.com/smotaal/f1e6dbb5c0420bfd585874bd29f11c43

	Modified and "prettified" by Geoffrey Coulaud
*/

function createProtocol(scheme, base, normalize = true) {
	const mimeTypeFor = require('./mimeTypes');
	const path = require('path');
	const { app, protocol } = require('electron');
	const { URL } = require('url');
	const { readFileSync: read } = require('fs');

	// Should only be called after app:ready fires
	if (!app.isReady()) {
		return app.on('ready', ()=>createProtocol(...arguments));
	}

	////normalize = (!normalize) ? url => new URL(url).pathname: url => new URL(url.replace(/^.*?:[/]*/, `file:///`) // `${scheme}://./`).pathname.replace(/[/]$/, '');

	// Convert URLs using custom protocols to file protocol
	if (!normalize) {
		normalize = function(url){
			return new URL(url).pathname;
		};
	} else {
		normalize = function(url){
			// Replace the custom protocol with the 'file' protocol
			// ex: 'load:some/path/to/file.txt' becomes 'file:///some/path/to/file.txt'
			const matchTrailingSlash = new RegExp('[/]$');
			const matchInitialSlash = new RegExp('^[/]');
			const pathToMain = path.dirname(require.main.filename);
			let initial = new URL(url);
			// Get only the path to the resource, prefixed with a "/"
			let pathname = initial.pathname;
			// Remove the trailing "/" if it exists and the starting "/"
			pathname = pathname.replace(matchTrailingSlash, '').replace(matchInitialSlash, '');
			let separator = '/';
			if (process.platform === "win32"){
				// Replace any remaining "/" separator with "\" if we're on windows
				const anySlash = new RegExp('/', 'g');
				pathname = pathname.replace(anySlash,'\\');
				// Use the "\" separator
				separator = '\\';
			}
			// Get absolute path to the ressource
			let newPath = `${pathToMain}${separator}${pathname}`;
			// Return the url using file protocol
			return newPath;
		}
	}
	

	protocol.registerBufferProtocol(
		scheme, 
		function handle(req, res){
			let pathname, filename, data, mimeType;
			try {
				// Get normalized filename from file url
				filename = normalize(req.url);
				// Read contents into a buffer
				data = read(filename);
				// Resolve mimeType from extension
				mimeType = mimeTypeFor(filename);
				// Respond with mimeType & data
				res({ mimeType, data });
			} catch (exception) {
				console.error('Failed to load resource');
				console.error(exception, req, pathname, filename, data, mimeType);
			}
		}, function complete(err){
			if (err){
				console.error(`Failed to register ${scheme} protocol`);
				console.error(exception);
			}
		}            
	);
}

module.exports = createProtocol;