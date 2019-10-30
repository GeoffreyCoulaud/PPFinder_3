// ------------------------------------------------------------------------------------------
// Beatmap scanning process
// ------------------------------------------------------------------------------------------

// When a request to scan local beatmaps is sent,
// the program asks for a directory to scan, gets all .osu files there
// then the database is wiped, 
// then it sends this list of files to computeBeatmaps.js
// then sends all of these computed metadatas to the event emitter

// if an error happens, it is console.error-ed

const {addMapToDB, emptyDB} = require('./dbCommunication.js');
const osuMetadataGetter     = require('./computeBeatmaps.js');
const {promises: fsp}       = require('fs');
const {dialog}              = require('electron');
const rra                   = require('recursive-readdir-async');

function scanBeatmaps(event, dbClient){
    /*
    * Parameters
    * - event    : an electron event emitter (normally the window)
    * - dbClient : a database client usable by dbCommunication.js
    */

    // Import database communication functions

	// Default path to put the user in where searching Songs folder
	const winDefaultOsuPath = "C:\\Program Files (x86)\\osu!\\Songs";

	// To keep track of what's done
	const done = {
		discover : { progression: 0 },
		read     : { progression: 0, failed: 0, max: null },
		compute  : { progression: 0, failed: 0, max: null },
		database : { progression: 0, failed: 0, max: null },
		finished : false
	}
	
	// To inform the user
	function sendState(){
		// This will never throw exceptions, it fails silently ////and cries in the corrner
		try         {event.reply('stateScanBeatmaps', done);}
		catch (err) {console.log('Could not send state', err);}
	}

	// Ask for a directory to search
	dialog.showOpenDialog({defaultPath: winDefaultOsuPath, properties: ['openDirectory']})
	.then(({canceled, filePaths})=>{return new Promise((resolve, reject)=>{
		if      (canceled)         {reject('User has cancelled the request');}
		else if (!filePaths.length){reject('No .osu files in directory');}
		else                       {resolve(filePaths[0]);}
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
		.catch((err)=> reject(`Error during directories scanning [${err}]`));
	})})

	// Empty the database
	.then(function(filesList){return new Promise((resolve, reject)=>{
		emptyDB(dbClient)
		.then(()=>resolve(filesList))
		.catch((err)=>reject(err))
	})})

	// Compute all of the discovered beatmaps
	.then(function(filesList){return new Promise((resolve,reject)=>{
		// Set the temporary max-s (they can decrease later)
		done.read.max     =
		done.compute.max  =
		done.database.max = filesList.length;

		// Start to parse the files
		doFile(0, filesList, resolve);
		
		// doFile is a recursive function to circumvent the open files limit
		// it gets a file's content, then, at the same time parses the file data and starts the next file
		function doFile(index, filesList, callback = resolve){
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
					localReject(`Error during file reading [${err}]`);
				})
				.finally(()=>sendState());
			})

			// Get the osu metadata from file contents
			.then((fileData)=>{
				return new Promise((localResolve, localReject)=>{
					// Compute the metadata
					osuMetadataGetter.metadataFromString(fileData)
					.then((metadata)=>{
						done.compute.progression++;
						localResolve(metadata);
					})
					.catch((err)=>{
						done.compute.failed++;
						done.database.max--;
						localReject(`Error during file data parsing [${err}]`);
					})
					.finally(sendState);
				})
			})

			// Send to be added to the database
			.then((metadata)=>{return new Promise((localResolve, localReject)=>{
				addMapToDB(metadata, dbClient)
				.then(()=>{
					done.database.progression++;
					localResolve();
				})
				.catch((err)=>{
					done.database.failed++;
					localReject(`Error during database adding [${err}]`);
				})
				.finally(()=>{
					sendState();
				});
			})})
			
			// Handle all the errors
			.catch((err)=>{
				console.error(err);
			})

			// > What's next ?
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
	});})

	// Inform the user that it's done
	.then(()=>{
		done.finished = true;
		sendState();
		// Log the success
		console.log('Beatmap processing finished !');
	})

	// Handle unexpected errors
	.catch((err)=>{
		// In case an unexpected error happens, console.error it
		console.error(err);
		// Then close the loading bar
		done.finished = true;
		sendState();
	});
}

module.exports = scanBeatmaps;