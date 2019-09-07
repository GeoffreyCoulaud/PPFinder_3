// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron');
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

ipcMain.on('scanBeatmaps', function(event){

});