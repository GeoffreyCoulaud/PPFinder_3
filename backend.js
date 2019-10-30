// Modules
const {app, shell, BrowserWindow, ipcMain} = require('electron');
const fs                                           = require('fs');
const fsp                                          = fs.promises;

// Database
const mysql = require('mysql2/promise');
let dbClient;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
const frontendFile = "./lib/html/frontend.html";
let mainWindow;

function createWindow (html, devtools = false) {
	// Create the browser window.
	mainWindow = new BrowserWindow({width: 800, height: 600, webPreferences: {nodeIntegration: true}});
	// Load the index.html of the app.
	mainWindow.loadFile(html); 
	// Open target=_blank links in default os browser
	mainWindow.webContents.on('new-window', function(event, url){
		event.preventDefault();
		shell.openExternal(url);
	});
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
	if (mainWindow === null){createWindow(frontendFile, true);}
});

// This method will be called when Electron has finished
app.on('ready', start);

async function start(){
	// Establish a new connection to the database
	dbClient = await mysql.createConnection({
		host: 'localhost',
		user: 'root',
		database: 'ppfinder'
	});

	// Create protocol to circumvent the "file://" limitations to load modules
	const createProtocol = require('./src/js/createProtocol.js');
	const basePath = app.getAppPath(); // Base path used to resolve modules
	const scheme = 'load';             // Protocol will be "load://./…"
	createProtocol(scheme, basePath);
	
	// Create the window
	createWindow(frontendFile, true);
}

// ------------------------------------------------------------------------------------------
// Commands handling (sent by the browser)
// ------------------------------------------------------------------------------------------

const scanBeatmaps = require('./src/js/scanBeatmaps.js');
ipcMain.on('scanBeatmaps', (event)=>{
	scanBeatmaps(event, dbClient);
});

const {searchDB} = require('./src/js/dbCommunication.js');
ipcMain.on('searchBeatmaps', function(event, {id, criteria}){
	// Search the beatmap database according to the given criteria
	searchDB(criteria, dbClient)
	.then((results)=>{ 
		event.reply('searchBeatmapsReply', {id: id, results : results}); 
	})
	.catch((err)=>{ console.error(err); });
});	

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
	// Change the language to the given one
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
// User options handling
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