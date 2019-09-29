const osu = require('ojsama');
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
		this.mods = [];
		this.addMod = function(modMetadata){
			this.mods.push(modMetadata);
			return this;
		}
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
		this.accs = [];
		this.addAcc = function(accMetadata){
			this.accs.push(accMetadata);
			return this;
		}
	}
}

class AccMetadata{
	constructor(accuracy, pp){
		this.accuracy = 'acc'+accuracy;
		this.pp = pp;
	}
}

function roundToPlaces(n, places){
	return Math.round(n * 10**places) / 10**places;
}

function round2(n){
	return roundToPlaces(n, 2);
}

// Parameters
const accuracies = [100, 99, 98, 95]; // All the computed accuracies
const possibleCombinations = require('./modCombos.js'); // All the computed mod combinations

function metadataFromString(fileData){return new Promise(function(resolve, reject){
	
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
	let beatmapSetID = getOsuProp(fileData, 'BeatmapSetID');
	let beatmapID = getOsuProp(fileData, 'BeatmapID');
	// If at least one of the IDs is missing or not composed of only digits, skip the file
	if (
		beatmapID === null || 
		beatmapSetID === null || 
		isNotOnlyDigits.test(beatmapID) || 
		isNotOnlyDigits.test(beatmapSetID)
	){ 
		throw Error("BeatmapID or BeatmapSetID error"); 
	}
	// Else, convert from string to integer
	beatmapSetID = parseInt(beatmapSetID);
	beatmapID = parseInt(beatmapID);

	// Compute the global metadata for the map
	let parser = new osu.parser();
	let map;
	try{
		map = parser.feed(fileData).map;
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
		let modMetadata = new ModMetadata(combination, map.ar*bias.ar, map.cs*bias.cs, map.od*bias.od, map.hp*bias.hp, round2(stars.total));

		// Loop through all possible accuracies
		for (let k = 0; k < accuracies.length; k++){

			// Calculate PP for each accuracy
			let pp;
			try {
				pp = osu.ppv2({'stars': stars, 'acc_percent': accuracies[k]});
				if (typeof pp.total === 'undefined'){ throw 'Total pp undefined'; }
				if (pp.total !== 0 && !pp.total){ throw 'Total pp not 0 and falsy'; }
			} catch (e){
				// If pp calculation doesn't work, skip mod
				continue forMod;
			}
			let accMetadata = new AccMetadata(accuracies[k], round2(pp.total, 2));
			
			// Add the accMetadata object to its parent
			modMetadata.addAcc(accMetadata);
		}

		// Add the mod metadata to the map metadata
		mapMetadata.addMod(modMetadata);
	}

	// Just return the mapMetadata
	resolve(mapMetadata);
});}

module.exports = {
	metadataFromString: metadataFromString,
	MapMetadata: MapMetadata,
	ModMetadata: ModMetadata,
	AccMetadata: AccMetadata
};