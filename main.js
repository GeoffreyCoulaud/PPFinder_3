// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const osuMetadataGetter = require('./src/js/computeBeatmaps.js');
const rra = require('recursive-readdir-async');
const fs = require('fs');
const fsp = fs.promises;

// Database
const mysql = require('mysql2/promise');
let dbClient;

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

async function start(){
	// Establish a new connection pool to the database
	dbClient = await mysql.createPool({
		host: 'localhost',
		user: 'root',
		database: 'ppfinder',
		waitForConnections: true,
		connectionLimit: 100,
		queueLimit: 0
	});

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
// Beatmap searching process
// ------------------------------------------------------------------------------------------

// When a request for beatmaps is sent, 
// the program searchs the database for beatmaps that match the criterias
// as an array of Play-s

function searchBeatmaps(event, c, start = 0, limit = 50){
	// TODO Prepare the criteria to be understood by the database
}


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
		if (canceled){reject('User has cancelled the request');}
		else if (!filePaths.length){reject('No .osu files in directory');}
		else {resolve(filePaths[0]);}
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
		// Map the files so that only the full paths remain
		.then((files)=>resolve(files.map(x=>x.fullname)))
		.catch((err)=> reject('Error during directories scanning', err));
	})})

	// Empty the database
	.then(function(filesList){return new Promise((resolve, reject)=>{
		emptyDB()
		.then(()=>resolve(filesList))
		.catch((err)=>reject(err))
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
					done.compute.max--;
					done.database.max--;
					localReject('Error during file reading', err);
				})
				.finally(()=>sendState());
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
					done.database.max--;
					localReject('Error during file data parsing', err);
				})
				.finally(()=>sendState());
			})})

			// Send to be added to the database
			.then((metadata)=>{return new Promise((localResolve, localReject)=>{
				addMapToDB(metadata)
				.then(()=>{
					done.database.progression++;
					localResolve();
				})
				.catch((err)=>{
					done.database.failed++;
					localReject(err)
				})
				.finally(()=>{
					sendState();
				});
			})})
			
			// console error the possible errors occuring
			.catch(handleError)
			.finally(()=>{
				// Test if it was the last addition to the database
				if (done.database.progression + done.database.failed === done.database.max){
					callback();
				}
				// If the file is not the last, start to do the next one
				if (index+1 < filesList.length){ 
					doFile(index+1, filesList); 
				}
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

function emptyDB(){return new Promise((resWipe, rejWipe)=>{
	dbClient.query("TRUNCATE accuraciesmetadata")
	.then(()=> dbClient.query("TRUNCATE beatmapsmetadata"))
	.then(()=> dbClient.query("TRUNCATE modsmetadata"))
	.then(()=> dbClient.query("OPTIMIZE TABLE accuraciesmetadata"))
	.then(()=> dbClient.query("OPTIMIZE TABLE beatmapsmetadata"))
	.then(()=> dbClient.query("OPTIMIZE TABLE modsmetadata"))
	.then(()=>{
		resWipe();
	}).catch((err)=>{
		rejWipe(err);
	});
})}

function addMapToDB(map){return new Promise((resAdd, rejAdd)=>{

	// ! Add the combo and duration columns

	class Query {
		constructor(){
			this.text = '';
			this.data = [];
			this.n = 0;
			this.add = function(d){
				// Creation of the text placeholder
				let t = '(';
				for (let i = 0; i<d.length; i++){ 
					if (i !== 0){ t +=','; }
					t += '?';
				}
				t+= ')';

				// Adding it to text
				if (this.n){ this.text += ',';}
				this.text += t;

				// Adding the data
				this.data = this.data.concat(d);

				// Increment the counter
				this.n++;
			}
		}
	}
	let promises = [];
	let queries = [new Query, new Query, new Query];

	const baseTexts = [
		'INSERT INTO beatmapsMetadata (beatmapID, beatmapSetID, creator, version, artist, title, artistUnicode, titleUnicode) VALUES ',

		'INSERT INTO modsMetadata (beatmapID, mods, stars, ar, cs, od, hp) VALUES ',
		
		'INSERT INTO accuraciesMetadata (beatmapID, mods, accuracy, pp) VALUES '
	];
	for (let i=0; i<queries.length; i++){queries[i].text = baseTexts[i];}
	
	queries[0].add([map.beatmapID, map.beatmapSetID, map.creator, map.version, map.artist, map.title, map.artistUnicode, map.titleUnicode]);
	for (let mod of map.mods){
		queries[1].add([map.beatmapID, mod.mods, mod.stars, mod.ar, mod.cs, mod.od, mod.hp]);
		for (let acc of mod.accs){
			queries[2].add([map.beatmapID, mod.mods, acc.accuracy, acc.pp]);
		}
	}
	
	queries.forEach((val)=>{val.text+=";";});

	for (let entry of Object.values(queries)){
		promises.push( dbClient.execute(entry.text, entry.data) );
	}

	Promise.all(promises)
	.then(()=>{
		resAdd();
	})
	.catch((err)=>{
		rejAdd(err);
	});
})}

function searchDB(criteria){return new Promise((resSearch, rejSearch)=>{
	/*
		* Criteria description
		- pp / stars / ar / cs / od / hp / duration / maxCombo
			- min (Number)
			- max (Number)
		- mods
			- wanted (Array)
			- notWanted (Array)
	*/
	
	// Generate all the possible mods
	const allMods = require('./src/js/modCombos.js');
	let okMods = allMods.filter((x)=>{
		// Filter out the mods that are not in wanted
		for (let mod of criteria.mods.wanted){
			// If the combination does not contain the wanted exclude combination,
			if (x.match(new RegExp(mod)) === null){
				return false;
			}
		}
		// Filter out the mods that are in not wanted 
		for (let mod of criteria.mods.notWanted){
			// If the combination does contains the not wanted exclude combination,
			if (x.match(new RegExp(mod)) !== null){
				return false;
			}
		}
		// Else keep the mod combination
		return true;
	});

	// Pagination system
	// ! These must be escaped to be integers
	const offset = 0;
	const limit = 50;

	// Build the query
	let modsCriteria = '';
	if (allMods.length !== okMods.length){
		modsCriteria = "and mods in (";
		for (let i=0; i<okMods.length; i++){
			if (i !== 0) {modsCriteria+=","}
			modsCriteria += "'"+okMods[i]+"'";
		}
		modsCriteria += ")";
	}
	let query =  `
		SELECT
			CONCAT(
				acc100.pp, ';',
				acc99.pp, ';',
				acc98.pp, ';',
				acc95.pp
			) as pp

			m.mods as mods,
			m.duration as duration,
			m.ar as ar,
			m.cs as cs,
			m.od as od,
			m.hp as hp,
			m.stars as stars,

			b.title as title,
			b.titleUnicode as titleUnicode,
			b.artist as artist,
			b.artistUnicode as artistUnicode,
			b.creator as creator,
			b.version as version,
			b.maxCombo as maxCombo

		FROM (SELECT beatmapID, mods, pp FROM accuraciesmetadata WHERE accuracy = 100 and pp BETWEEN ? AND ? ${modsCriteria}) as acc100

		/* Données spécifiques au mod */

		INNER JOIN modsmetadata as m
		ON 
			m.mods = acc100.mods and 
			m.beatmapID = acc100.beatmapID and
			m.ar BETWEEN ? AND ? and
			m.cs BETWEEN ? AND ? and
			m.od BETWEEN ? AND ? and
			m.hp BETWEEN ? AND ? and
			m.stars BETWEEN ? AND ? and
			m.duration BETWEEN ? AND ?
		
		/* Données du .osu */

		INNER JOIN beatmapsmetadata as b
		ON 
			b.beatmapID = acc100.beatmapID and
			b.maxCombo BETWEEN ? AND ?
		
		/* Autres accuracies pour le même score*/

		INNER JOIN accuraciesmetadata as acc99
		ON 
			acc99.accuracy = 99 and 
			acc100.beatmapID = acc99.beatmapID and 
			acc100.mods = acc99.mods

		INNER JOIN accuraciesmetadata as acc98
		ON 
			acc98.accuracy = 98 and 
			acc100.beatmapID = acc98.beatmapID and 
			acc100.mods = acc98.mods

		INNER JOIN accuraciesmetadata as acc95
		ON 
			acc95.accuracy = 95 and 
			acc100.beatmapID = acc95.beatmapID and 
			acc100.mods = acc95.mods

		/* Pagination */

		LIMIT ${limit} OFFSET ${offset}
	`;

	/* Placeholders order :
		ppmin, ppmax,
		armin, armax,
		csmin, csmax,
		odmin, odmax,
		hpmin, hpmax,
		starsmin, starsmax,
		durationmin, durationmax,
		maxCombomin, maxCombomax
	*/

	dbClient.execute(query, [
		criteria.pp.min, criteria.pp.max,
		criteria.ar.min, criteria.ar.max,
		criteria.cs.min, criteria.cs.max,
		criteria.od.min, criteria.od.max,
		criteria.hp.min, criteria.hp.max,
		criteria.stars.min, criteria.stars.max,
		criteria.duration.min, criteria.duration.max,
		criteria.maxCombo.min, criteria.maxCombo.max,
	])
	.then((rows)=>{
		resSearch(rows);
	})
	.catch((err)=>{
		rejSearch(err);
	})
})}

// ------------------------------------------------------------------------------------------
// User options 
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