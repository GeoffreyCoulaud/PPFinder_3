const sqlEscape = require('sql-escape');
const osu = require('ojsama');
const fs = require('fs');
const fsp = fs.promises;

class MapMetadata{
	constructor(title, artist, creator, version, beatmapSetID, beatmapID, maxCombo, titleUnicode = "", artistUnicode = ''){
		this.title = title;
		this.titleUnicode = titleUnicode;
		this.artist = artist;
		this.artistUnicode = artistUnicode;
		this.creator = creator;
		this.version = version;
		this.beatmapSetID = beatmapSetID;
		this.beatmapID = beatmapID;
		this.maxCombo = maxCombo;
		this.modsMetadatas = [];
	}
}

class ModMetadata{
	constructor(mods, ar, cs, od, hp, stars){
		this.mods = mods,
		this.ar = ar;
		this.cs = cs;
		this.od = od;
		this.hp = hp;
		this.stars = stars;
		this.accsMetadatas = [];
	}
}

class AccMetadata{
	constructor(accuracy, pp){
		this.accuracy = accuracy;
		this.pp = pp;
	}
}

// Parameters
const accuracies = [100, 99, 98, 95]; // All the computed accuracies
const possibleCombinations = require('./modCombos.js'); // All the computed mod combinations

async function computeFile(file, db){

	// TODO Use neDB instead of sqlite
	
	// Get any osu prop by name from the text given
	function getOsuProp(text, propName){
		const r = new RegExp('^'+propName+' *: *([0-9]+)$', 'gm');
		const matchs = r.exec(text);
		if (matchs === null || typeof matchs[1] !== 'string'){ return null; }
		return matchs[1];
	}
	
	// Detect bias regexps
	const isHR = new RegExp('HR');
	const isEZ = new RegExp('EZ');
	const isNotOnlyDigits = new RegExp('[^0-9]');

	// Compute the map's beatmapID and beatmapSetID
	let beatmapSetID = getOsuProp(file, 'BeatmapSetID');
	let beatmapID = getOsuProp(file, 'BeatmapID');
	// If at least one of the IDs is missing or not composed of only digits, skip the file
	if (
		beatmapID === null || 
		beatmapSetID === null || 
		isNotOnlyDigits.test(beatmapID) || 
		isNotOnlyDigits.test(beatmapSetID)
	){ 
		return null; 
	}
	// Else, convert from string to integer
	beatmapSetID = parseInt(beatmapSetID);
	beatmapID = parseInt(beatmapID);

	// Compute the global metadata for the map
	let parser = new osu.parser();
	let map;
	try{
		map = parser.feed(file).map;
	} catch (e){			
		// if we can't parse the file, skip it
		throw Error(`Beatmap can't be parsed : ${e}`);
	}

	// If the map isn't in STD mode, skip it
	if (map.mode !== osu.modes.std){ 
		throw Error(`Beatmap mode is not std`); 
	}
	
	// Create the base mapMetadata object needed
	let mapMetadata = new MapMetadata(map.title, map.artist, map.creator, map.version, beatmapSetID, beatmapID, map.max_combo(), map.title_unicode, map.artist_unicode);
	
	// Loop through all possible mods combinations
	forMod: for (let j = 0; j < possibleCombinations.length; j++){

		// Compute the mod combination metadata
		let combination = possibleCombinations[j];
		let modBits = osu.modbits.from_string(combination);
		let stars = new osu.diff().calc({'map':map, 'mods':modBits});

		// If there is HR or EZ set, apply their multipliers
		let bias = {ar: 1,cs: 1,od: 1,hp: 1};
		if (isHR.test(combination)){
			bias.ar = bias.od = bias.hp = 1.4;
			bias.cs = 1.3;
		} 
		else if (isEZ.test(combination)){
			bias.ar = bias.cs = bias.od = bias.hp = 0.5;
		}

		// Create the modMetadata object needed
		let modsMetadata = new ModMetadata(combination, map.ar*bias.ar, map.cs*bias.cs, map.od*bias.od, map.hp*bias.hp, stars.total);

		// Loop through all possible accuracies
		for (let k = 0; k < accuracies.length; k++){

			// Calculate PP for each accuracy
			let pp;
			try {
				pp = osu.ppv2({'stars': stars, 'acc_percent': accuracies[k]});
			} catch (e){
				// If pp calculation doesn't work, skip mod
				continue forMod;
			}
			let accMetadata = new AccMetadata(accuracies[k], pp.total);
			
			// Add the accMetadata object to its parent
			modsMetadata.accsMetadatas.push(accMetadata);
		}

		// Add the modsmetadata object to its parent
		mapMetadata.modsMetadatas.push(modsMetadata);
	}

	// Add the beatmap to the database
	await new Promise((resolve, reject)=>{
		db.insert(mapMetadata, function(err, newDoc){
			if (err){ reject('Error adding mapMetadata'); }
			else { resolve(); }
		});
	});

	// If everything has been done properly, return true
	return true;
}

async function computeAll(eventEmitter, filesList, db){
	/*
		eventEmitter is an electron event emitter which we can reply to.customSelectTitle
		filesList is an array of file paths
		db is a sqlite database

		This is an asynchronous function, thus it returns a promise.
		(but it doesn't return any data if there is no 'return' in the function)
	*/

	// Get the total number of steps
	let steps = filesList.length;
	let state = 1;

	// Inform the event emitter that state is beatmap computing 
	// and that it has just started.
	await eventEmitter.reply('stateScanBeatmaps', {
		state: state, // Computing maps
		progression: 0,
		max: steps,
		hasFinished: false
	});

	// For each file, compute the metadata
	forFiles: for (let i = 0; i < steps; i++){

		// Get .osu file contents
		const fileContents = await fsp.readFile(filesList[i], 'utf8');

		// Gets all the metadata for the file
		let mapSuccess = await computeFile(fileContents, db)
		.then(()=>{
			return true;
		}).catch((err)=>{
			console.log(`map ${i} skipped`);
			console.log(err);
			return false;
		});

		// Inform the user that this map is done
		await eventEmitter.reply('stateScanBeatmaps', {
			state: state,
			progression: (i+1),
			max: steps,
			hasFinished: false
		});
	}

	// Inform that it's finished
	return;
}

module.exports = computeAll;