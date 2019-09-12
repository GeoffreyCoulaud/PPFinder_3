// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const rra = require('recursive-readdir-async');
const sqlite = require('sqlite');
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
	const winDefaultPath = "C:\\Program Files (x86)\\osu!\\Songs";

	// Ask for a directory to search
	(async function ask(){
		let {canceled, filePaths} = await dialog.showOpenDialog(mainWindow, {
			defaultPath: winDefaultPath,
			properties: ['openDirectory']
		});
		if (canceled || !filePaths.length){
			throw new Error('User has cancelled the request');
		} else {
			return filePaths[0];
		}
	})()
	.then(async function(beatmapsDir){
		// Recursively find every .osu in the directory
		const optionsRRA = {mode: rra.LIST, extensions: true, include: ['.osu']};
		let maxTotal = 0;
		let files = await rra.list(beatmapsDir, optionsRRA, (obj, i, total)=>{
			if (total > maxTotal) {maxTotal = total;}
			// Inform the event emitter that files are being discovered
			event.reply('stateScanBeatmaps', {
				state: 0,
				progression : maxTotal,
				max: null,
				hasFinished: false 
			});
		});
		// Map the files so that only the full paths remain
		files = files.map(x=>x.fullname);
		return files;
	})
	.then(async function (files){
		// Establish a new connection to the database
		let db = await sqlite.open('./ppfinder.db', { Promise });
		// Empty the tables
		let clearString = await fsp.readFile('src/sql/emptyBaseTables.sql', 'utf-8');
		await db.run(clearString);
		// Return the database and chain the files
		return [files, db];
	})
	.then(async function([files, db]){
		// Start computing beatmaps
		let computeBeatmaps = require('./src/js/computeBeatmaps.js');
		await computeBeatmaps(event, files, db);

		// Console log that the job is finished
		// Inform the user that the job is finished
		console.log('Beatmap calculation ended.');
		event.reply('stateScanBeatmaps', {
			state: 2, // adding to db
			progression: 0,
			max: 0,
			hasFinished: true
		});
	})
	.catch((err)=>{
		// In case an unexpected error happens, alert and console.error it.
		console.error('Error during beatmap scanning', err);
		// Then close the loading bar
		event.reply('stateScanBeatmaps', {
			state: 3, // Error
			progression: 0,
			max: 0,
			hasFinished: true
		})
	});
}