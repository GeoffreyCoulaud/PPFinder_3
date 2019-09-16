// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const rra = require('recursive-readdir-async');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow (html, devtools = false) {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
            nodeIntegration: true
        }
	});

	// and load the index.html of the app.
	mainWindow.loadFile(html);

	if (devtools){
		// Open the DevTools.
		mainWindow.webContents.openDevTools();
	}

	// Emitted when the window is closed.
	mainWindow.on('closed', function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});
}

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function () {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null){
		createWindow('lib/html/search.html', true);
	}
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', start);
function start(){
	// Create protocol
	const basePath = app.getAppPath(); // Base path used to resolve modules
	const scheme = 'import'; // Protocol will be "import://./…"
	require('./src/js/createProtocol')(scheme, basePath);
	
	// Create the window
	createWindow('lib/html/index.html', true);
}


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
		let options = data;
		options.currentLanguage = lang;
		return writeUserOptions(options);
	})
	.then(()=>{
		event.reply('languageChangeReply', '');
	})
	.catch((err)=>{
		console.error(err);
	});
});
function writeUserOptions(data){
	return new Promise((resolve, reject)=>{
		let j =  JSON.stringify(data);
		fsp.writeFile('userOptions.json', j)
		.then(()=>{
			resolve();
		})
		.catch((err)=>{
			reject(err);
		})
	});
}
function readUserOptions(){
	return new Promise((resolve, reject)=>{
		fsp.readFile('userOptions.json', 'utf8')
		.then(function(data){
			let toReturn = JSON.parse(data);
			resolve(toReturn);
		})
		.catch(function(err){
			reject(err);
		})
	});
}

ipcMain.on('search', function(event, options){
	// TODO Search the database with given search options
	event.reply('searchReply', []);
});

// ------------------------------------------------------------------------------------------
// Beatmap scanning process
// ------------------------------------------------------------------------------------------

// When a request to scan local beatmaps is sent,
// the program asks for a directory to scan, gets all .osu files there
// then sends this list to computeBeatmaps.js
// then a console log is produced.

// if an error happens, it is alert-ed and console.error-ed

ipcMain.on('scanBeatmaps', scanBeatmaps);
async function scanBeatmaps(event){
	// Default path to put the user in where searching Songs folder
	const winDefaultOsuPath = "C:\\Program Files (x86)\\osu!";

	// Ask for a directory to search
	dialog.showOpenDialog(mainWindow, {defaultPath: winDefaultOsuPath, properties: ['openDirectory']})
	.then(({canceled, filePaths})=>{ return new Promise((resolve, reject)=>{
		if (canceled || !filePaths.length){reject('User has cancelled the request');} 
		else {resolve(filePaths[0]);}
	});})
	// Wipe the database if a folder is selected
	.then((beatmapsDir)=>{return new Promise((resolve, reject)=>{
		// Tell the event emitter to wipe the database
		event.reply('wipeDB');
		// Wait for the database to be wiped (with a time limit)
		const timeout = 5 * 1000; // In miliseconds
		// Chain the beatmaps directory
		setTimeout(()=>{resolve(beatmapsDir);}, timeout);
		ipcMain.once('wipeDBReply', ()=>{resolve(beatmapsDir);});
	});})
	// Recursively find every .osu in the directory
	.then(function(beatmapsDir){return new Promise((resolve, reject)=>{
		// Keep track of the total 
		// (Every file dicovery will update it but not sequentially so it can seem to shrink over time)
		let maxTotal = 0;
		// Discover the files
		rra.list(beatmapsDir, {mode: rra.LIST, extensions: true, include: ['.osu']}, (obj, i, total)=>{
			if (total > maxTotal) {maxTotal = total;}
			// Inform the event emitter at each step that files are being discovered
			event.reply('stateScanBeatmaps', {state: 0, progression : maxTotal});
		})
		.then(()=>{
			// Map the files so that only the full paths remain
			files = files.map(x=>x.fullname);
			resolve(files);
		})
		.catch((err)=>{reject(`Error while scanning the fiels : ${err}`);});
	});})
	// Compute all of the discovered beatmaps
	.then(function(files){
		let computeBeatmaps = require('./src/js/computeBeatmaps.js');
		return computeBeatmaps(event, files);
	})
	// Send the maps done to the event emitter
	// because it's the one adding them to the database
	.then(function(done){ return new Promise((resolve,reject)=>{
		let addedToDb = 0;
		// Send the map to be added
		done.maps.forEach((elem, index)=>{event.reply('addMapToDB', elem);});
		// When a map is added to the database or fails,
		// increment addedToDB and inform the client of the state
		ipcMain.on('addMapToDBReply', (event, err)=>{
			if (err){reject(`Error while adding beatmap to the database : ${err}`);}
			addedToDb++;
			event.reply('stateScanBeatmaps', {state: 2, progression: addedToDb, max: done.ok });
			if(addedToDb === done.ok){ resolve(); }
		});
	});})
	// Inform the user that it's done
	.then(()=>{
		event.reply('stateScanBeatmaps', {state: 2, hasFinished: true});
	})
	// In case an unexpected error happens, alert and console.error it.
	.catch((err)=>{
		console.error(err);
		// Then close the loading bar
		event.reply('stateScanBeatmaps', {state: 3, hasFinished: true});
	});
}