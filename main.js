// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const osuMetadataGetter = require('./src/js/computeBeatmaps.js');
const rra = require('recursive-readdir-async');
const fs = require('fs');
const fsp = fs.promises;
let db = null;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow (html, devtools = false) {
	// Create the browser window.
	mainWindow = new BrowserWindow({width: 800, height: 600, webPreferences: {nodeIntegration: true}});
	// Load the index.html of the app.
	mainWindow.loadFile(html); 
	// Open the DevTools 
	if (devtools){mainWindow.webContents.openDevTools();}
	// Emitted when the window is closed.
	mainWindow.on('closed', function () {mainWindow = null;});
}

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On macOS, close only with Cmd + Q, not on "window-all-closed"
	if (process.platform !== 'darwin'){app.quit();}
});

app.on('activate', function () {
	// On macOS when there are no windows and the app is activated, create a new one
	if (mainWindow === null){createWindow('lib/html/search.html', true);}
});

// This method will be called when Electron has finished
app.on('ready', start);

function start(){
	// Create protocol to circumvent the file:// limitations to load modules
	const createProtocol = require('./src/js/createProtocol');
	const basePath = app.getAppPath(); // Base path used to resolve modules
	const scheme = 'load'; // Protocol will be "load://./…"
	createProtocol(scheme, basePath);
	
	// Create the window
	createWindow('lib/html/index.html', true);
}

// ------------------------------------------------------------------------------------------
// Commands sent by the browser handling
// ------------------------------------------------------------------------------------------

ipcMain.on('scanBeatmaps', scanBeatmaps);

ipcMain.on('readUserOptions', function(event){
	// Send the contents of the file userOptions.json
	readUserOptions()
	.then(function(data){
		event.reply('readUserOptionsReply', data);
	})
	.catch(function(err){
		event.reply('readuserOptionsReply', '');
		console.error(err);
	})
});

ipcMain.on('languageChange', function(event, lang){
	readUserOptions()
	.then((data)=>{
		data.currentLanguage = lang;
		return writeUserOptions(data);
	})
	.then(()=>{
		event.reply('languageChangeReply');
	})
	.catch((err)=>{
		console.error(err);
	});
});

// ------------------------------------------------------------------------------------------
// Beatmap scanning process
// ------------------------------------------------------------------------------------------

// When a request to scan local beatmaps is sent,
// the program asks for a directory to scan, gets all .osu files there
// then the database is wiped, 
// then it sends this list of files to computeBeatmaps.js
// then sends all of these computed metadatas to the event emitter

// if an error happens, it is console.error-ed

function scanBeatmaps(event){
	// Default path to put the user in where searching Songs folder
	const winDefaultOsuPath = "C:\\Program Files (x86)\\osu!\\Songs";

	// To keep track of what's done
	const done = {
		discover: { progression: 0 },
		read: { progression: 0, failed: 0, max: null },
		compute: { progression: 0, failed: 0, max: null },
		database: { progression: 0, failed: 0, max: null },
		forceHide: false
	}
	
	// To inform the user
	function sendState(){
		// This will never throw exceptions, it fails silently ////and cries in the corrner
		try { event.reply('stateScanBeatmaps', done); }
		catch (err) { console.log('Could not send state', err); }
	}

	// Ask for a directory to search
	dialog.showOpenDialog(mainWindow, {defaultPath: winDefaultOsuPath, properties: ['openDirectory']})
	.then(({canceled, filePaths})=>{return new Promise((resolve, reject)=>{
		if (canceled || !filePaths.length){reject('User has cancelled the request');} 
		else {resolve(filePaths[0]);}
	})})

	// Initialize the database
	.then((beatmapsDir)=>{return new Promise((resolve, reject)=>{
		// Establish a connection to the database then empty it
		connectToDB()
		.catch((err)=>{reject('Could not connect to the database', err)})
		.then(emptyDB)
		.catch((err)=>{reject('Could not empty the database', err)})
		.then(()=>{resolve(beatmapsDir)})
	})})

	// Recursively find every .osu in the directory
	.then(function(beatmapsDir){return new Promise((resolve, reject)=>{
		// Discover the files
		rra.list(beatmapsDir, {mode: rra.LIST, extensions: true, include: ['.osu']}, (obj, i, progression)=>{
			if (progression > done.discover.progression){
				done.discover.progression = progression;
			}
			// Inform the event emitter at each step that files are being discovered
			sendState();
		})
		.then((files)=>{
			// Map the files so that only the full paths remain
			files = files.map(x=>x.fullname);
			resolve(files);
		})
		.catch((err)=>{
			reject('Error during directories scanning', err);
		});
	})})

	// Compute all of the discovered beatmaps
	.then(function(filesList){return new Promise((resolve,reject)=>{

		// Set the temporary max-s (they can decrease later)
		done.read.max = filesList.length;
		done.compute.max = filesList.length;
		done.database.max = filesList.length;

		// Start to parse the files
		doFile(0, filesList, resolve, handleError);
		
		// doFile is a recursive function to circumvent the open files limit
		// it gets a file's content, then, at the same time parses the file data and starts the next file
		function doFile(index, filesList, callback = resolve, handleError = console.error){
			// Read the file
			new Promise((localResolve, localReject)=>{
				fsp.readFile(filesList[index], 'utf8')
				.then((data)=>{
					done.read.progression++;
					localResolve(data);
				})
				.catch((err)=>{
					done.read.failed++;
					done.compute.failed++;
					done.database.failed++;
					localReject('Error during file reading', err);
				})
				.finally(()=>{
					sendState();
				});
			})
			// Get the osu metadata from file contents
			.then((fileData)=>{ return new Promise((localResolve, localReject)=>{
				// Compute the metadata
				osuMetadataGetter.metadataFromString(fileData)
				.then((metadata)=>{
					done.compute.progression++;
					localResolve(metadata);
				})
				.catch((err)=>{
					done.compute.failed++;
					done.database.failed++;
					localReject('Error during file data parsing', err);
				})
				.finally(()=>{
					sendState();
				});
			})})
			// Send to be added to the database
			.then((metadata)=>{return new Promise((localResolve, localReject)=>{
				addMapToDB(metadata)
				.then(localResolve)
				.catch((err)=>{
					done.database.failed++;
					localReject('Error during addition to the database', err)
				})
				.finally(()=>{
					done.database.progression++;
					sendState();
				});
			})})
			// console error the possible errors occuring
			.catch(handleError)
			// do the next file
			.finally(()=>{
				// If the file is not the last, start to do the next one
				if (index+1 < filesList.length){ doFile(index+1, filesList); }
				else { callback(); }
			});
		}

		// If an error appears here, console.error it since it's not important
		function handleError(info, err){
			console.error(info, typeof err, err);
		}
	});})

	// Inform the user that it's done
	.then(()=>{
		done.forceHide = true;
		sendState();
		// Log the success
		console.log('Beatmap processing finished !');
	})

	// Handle unexpected errors
	.catch((err)=>{
		// In case an unexpected error happens, console.error it
		console.error(err);
		// Then close the loading bar
		done.forceHide = true;
		sendState();
	});
}

// ------------------------------------------------------------------------------------------
// Database communication
// ------------------------------------------------------------------------------------------

function disconnectDB(){return new Promise((resDisconnect, rejDisconnect)=>{
	// ! TEMPORARY
	db = null;
	resDisconnect();
})}
function connectToDB(){return new Promise((resConnect, rejConnect)=>{
	// ! TEMPORARY
	db = 'dummy database';
	resConnect();
})}
function emptyDB(){return new Promise((resWipe, rejWipe)=>{
	// ! TEMPORARY
	fsp.writeFile('db.txt', '')
	.then(resWipe)
	.catch(rejWipe);
})}
function addMapToDB(mapMetadata){return new Promise((resAdd, rejAdd)=>{
	// ! TEMPORARY
	let data = JSON.stringify(mapMetadata)+',\n';
	fsp.appendFile('db.txt', data)
	.then(resAdd)
	.catch(rejAdd);
})}

// ------------------------------------------------------------------------------------------
// Global functionnalities
// ------------------------------------------------------------------------------------------

function writeUserOptions(data){return new Promise((resolve, reject)=>{
	let j =  JSON.stringify(data);
	fsp.writeFile('userOptions.json', j)
	.then(()=>{resolve();})
	.catch((err)=>{reject(err);});
});}

function readUserOptions(){return new Promise((resolve, reject)=>{
	fsp.readFile('userOptions.json', 'utf8')
	.then(function(data){resolve(JSON.parse(data));})
	.catch(function(err){reject(err);});
});}