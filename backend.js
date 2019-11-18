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

// Criteria format validation for database search
const DBSorts = require('./src/js/searchSorts.js');
const val     = require('./src/js/validateFormat.js');
class MinMaxFormat extends val.Format{
	constructor(min, max, forceInt = false){
		super('object');
		this.min = new val.NumberFormat(0, max, forceInt);
		this.max = new val.NumberFormat(min, Number.MAX_SAFE_INTEGER, forceInt);
		this.match = function(obj){
			if (typeof obj.min !== 'number'){return false;}
			if (typeof obj.max !== 'number'){return false;}
			return this.min.match(obj.min) && this.max.match(obj.max);
		}
	}
}
const searchCriteriaFormat = {
	pp      : new MinMaxFormat(0, 1e5, false),
	ar      : new MinMaxFormat(0, 11, false),
	cs      : new MinMaxFormat(0, 11, false),
	od      : new MinMaxFormat(0, 11, false),
	hp      : new MinMaxFormat(0, 11, false),
	stars   : new MinMaxFormat(0, 20, false),
	bpm     : new MinMaxFormat(0, Number.MAX_SAFE_INTEGER, true),
	duration: new MinMaxFormat(0, Number.MAX_SAFE_INTEGER, true),
	maxCombo: new MinMaxFormat(0, Number.MAX_SAFE_INTEGER, true),
	mods: {
		include: new val.StringFormat(null),
		exclude: new val.StringFormat(null)
	},
	sort: {
		id  : new val.NumberFormat(0, DBSorts.length-1),
		desc: new val.BoolFormat()
	}
}

function createWindow (html, devtools = false) {
	// Create the browser window.
	mainWindow = new BrowserWindow({width: 800, height: 600, webPreferences: {nodeIntegration: true}});
	mainWindow.loadFile(html); 
	mainWindow.webContents.on('new-window', function(event, url){
		// Open urls in OS default browser
		event.preventDefault();
		shell.openExternal(url);
	});
	// Open the DevTools 
	if (devtools){mainWindow.webContents.openDevTools();}

	// Emitted when the window is closed.
	mainWindow.on('closed', ()=>{mainWindow = null;});
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
ipcMain.on('searchBeatmaps', function(event, {id, page, criteria}){
	/*
	* id : String to keep track of the search queries
	* page : Integer starting from 0
	* criteria : Search criteria matching searchCriteriaFormat 
	*/
	console.log('Searching database...');
	// Validate the criteria format
	// Validate the page number
	if (val.validate(criteria, searchCriteriaFormat) && val.validate(page, new val.NumberFormat(0, Number.MAX_SAFE_INTEGER, true))){
		// Search the beatmap database according to the given criteria
		searchDB(criteria, page, dbClient)
		.then(([results, page, maxPage, nPerPage])=>{ 
			event.reply('searchBeatmapsReply', {
				id: id, 
				page: page, // Return the real page given by database
				maxPage: maxPage,
				nPerPage: nPerPage,
				results: results
			}); 
			console.log('Searching finished !');
		})
		.catch((err)=>{ 
			console.error(err); 
		});
	} else {
		// Wrong criteria format, don't search.
		console.log('Error with criteria format');
	}
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