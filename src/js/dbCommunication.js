// ------------------------------------------------------------------------------------------
// Database communication
// ------------------------------------------------------------------------------------------

function emptyDB(dbClient){return new Promise((resWipe, rejWipe)=>{
	dbClient.query("TRUNCATE accuraciesmetadata")
	.then(()=>dbClient.query("TRUNCATE beatmapsmetadata"))
	.then(()=>dbClient.query("TRUNCATE modsmetadata"))
	.then(()=>dbClient.query("OPTIMIZE TABLE accuraciesmetadata"))
	.then(()=>dbClient.query("OPTIMIZE TABLE beatmapsmetadata"))
	.then(()=>dbClient.query("OPTIMIZE TABLE modsmetadata"))
	.then(()=>{ resWipe(); })
	.catch((err)=>{ rejWipe(err); });
})}

function addMapToDB(map, dbClient){return new Promise((resAdd, rejAdd)=>{

	class InsertQuery {
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

				// Adding it to query text
				if (this.n){ this.text += ',';}
				this.text += t;

				// Adding the data to query data
				this.data = this.data.concat(d);

				// Increment the counter of insert queries
				this.n++;
			}
		}
	}

	let promises = [];

	// Build the queries
	let queries = [new InsertQuery, new InsertQuery, new InsertQuery];
	
	// Add the base texts
	const baseTexts = [
		'INSERT INTO beatmapsMetadata (beatmapID, beatmapSetID, creator, version, artist, title, artistUnicode, titleUnicode, maxCombo) VALUES ',

		'INSERT INTO modsMetadata (beatmapID, mods, stars, ar, cs, od, hp, duration, bpm) VALUES ',
		
		'INSERT INTO accuraciesMetadata (beatmapID, mods, accuracy, pp) VALUES '
	];
	for (let i=0; i<queries.length; i++){
		queries[i].text = baseTexts[i];
	}
	
	// Add the values and text placeholders
	queries[0].add([map.beatmapID, map.beatmapSetID, map.creator, map.version, map.artist, map.title, map.artistUnicode, map.titleUnicode, map.maxCombo]);
	for (let mod of map.mods){
		queries[1].add([map.beatmapID, mod.mods, mod.stars, mod.ar, mod.cs, mod.od, mod.hp, mod.duration, mod.bpm]);
		for (let acc of mod.accs){
			queries[2].add([map.beatmapID, mod.mods, acc.accuracy, acc.pp]);
		}
	}
	queries.forEach((val)=>{val.text+=";";});

	// Execute all the queries
	for (let entry of Object.values(queries)){
		promises.push( dbClient.execute(entry.text, entry.data) );
	}
	Promise.all(promises)
	.then(()=>{ resAdd(); })
	.catch((err)=>{ rejAdd(err); });
})}

function searchDB(criteria, dbClient){return new Promise((resSearch, rejSearch)=>{
	
	// Modbits from ojsama
	const {modbits} = require('ojsama');
	
	// Criteria format expected from user
	// User input format validator
	const validateFormat = require('./src/js/validateFormat.js');
	class MinMaxFormat extends validateFormat.Format{
		constructor(min, max, forceInt = false){
			super('object');
			this.min = new NumberFormat(0, max, forceInt);
			this.max = new NumberFormat(min, Number.MAX_SAFE_INTEGER, forceInt);
			this.match = function(obj){
				if (typeof obj.min !== 'number'){return false;}
				if (typeof obj.max !== 'number'){return false;}
				return this.min.match(obj.min) && this.max.match(obj.max);
			}
		}
	}
	const criteriaFormat = {
		pp       : MinMaxFormat(0, 1e5, false),
		ar       : MinMaxFormat(0, 11, false),
		cs       : MinMaxFormat(0, 11, false),
		od       : MinMaxFormat(0, 11, false),
		hp       : MinMaxFormat(0, 11, false),
		stars    : MinMaxFormat(0, 20, false),
		bpm      : MinMaxFormat(0, Number.MAX_SAFE_INTEGER, true),
		duration : MinMaxFormat(0, Number.MAX_SAFE_INTEGER, true),
		maxCombo : MinMaxFormat(0, Number.MAX_SAFE_INTEGER, true),
		mods     : {
			include: validateFormat.StringFormat(null),
			exclude: validateFormat.StringFormat(null)
		},
		sort : {
			id     : validateFormat.NumberFormat(0, sorts.length-1),
			desc   : validateFormat.BoolFormat()
		}
	}
	
	// If null sent, return empty array
	if (criteria === null){
		console.warn('Research criteria null');
		resSearch([]);
	} 
	// Validate the criteria properties
	else if ( !validateFormat.validate(criteria, criteriaFormat) ){
		throw new Error('Invalid search criterias');
	}

	// Build the masks for mod inclusion / exclusion
	const includeModbits = modbits.from_string(criteria.mods.include);
	const excludeModbits = modbits.from_string(criteria.mods.exclude);

	// Pagination system
	// ! These must be escaped to be integers
	const offset = 0;
	const limit = 50;

	// Sorting system
	const sortPrefix = 'ORDER BY ';
	const sorts = [
		'acc100.pp',                // Sort by PP
		'm.stars',                  // Sort by Stars
		'acc100.pp / m.stars',      // Sort by PP / Stars
		'b.maxCombo',               // Sort by Combo
		'acc100.pp / b.maxCombo',   // Sort by PP / Note
		'm.duration',               // Sort by Duration
		'acc100.pp / m.duration'    // Sort by PP / Minute
	];
	if (!(criteria.sort.id) in sorts){ 
		// Handle non existing sorts
		console.warn('Non existing sort requested', criteria.sort.id);
		criteria.sort.id = 0; 
	} 
	const sortSuffix = (criteria.sort.desc) ? 'DESC' : 'ASC';
	const sort = `${sortPrefix} ${sorts[criteria.sort.id]} ${sortSuffix}`;

	// Build the query
	let query =  `
		SELECT
			CONCAT(
				'[',
					'[100:', acc100.pp, '],',
					'[99:',  acc99.pp,  '],',
					'[98:',  acc98.pp,  '],',
					'{95:',  acc95.pp,  ']',
				']',
			) as pp

			m.modbits as modbits,
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

		FROM (
			SELECT 
				beatmapID, 
				mods, 
				pp 
			FROM 
				accuraciesmetadata as acc100
			WHERE 
				acc100.accuracy = 100 and 
				acc100.pp BETWEEN ? AND ? 
				m.modbits & ? and
				NOT m.modbits & ?
		) as acc100

		/* Données spécifiques au mod */

		INNER JOIN modsmetadata as m
		ON 
			m.modBits = acc100.modBits and 
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

		/* Sorting */
		
		${sort}

		/* Pagination */

		LIMIT ${limit} OFFSET ${offset}
	`;

	/* Placeholders order :
		ppmin, ppmax,
		includeModBits, excludeModBits,
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
		includeModbits, excludeModbits,
		criteria.ar.min, criteria.ar.max,
		criteria.cs.min, criteria.cs.max,
		criteria.od.min, criteria.od.max,
		criteria.hp.min, criteria.hp.max,
		criteria.stars.min, criteria.stars.max,
		criteria.duration.min, criteria.duration.max,
		criteria.maxCombo.min, criteria.maxCombo.max,
	])
	.then((rows)=>{
		// Format the results
		rows = rows.map(row=>{
			// Turn pp into a Map
			row.pp = new Map(JSON.parse(row.pp)); 
			// Format duration to be readable
			row.durationHuman = secToMinSec(row.duration); 
			delete row.duration;
			// Add array of mods from modbits
			const modsStr = modbits.toString(row.modbits);
			let index     = 0;
			row.mods      = [];
			while (index < modsStr.length){
				row.mods.push(modsStr.substring(index, index+2)); 
				index += 2;
			}
		});
		// Resolve with the rows
		resSearch(rows);
	})
	.catch((err)=>{
		rejSearch(err);
	})
})}

module.exports = {
    addMapToDB: addMapToDB,
    searchDB  : searchDB,
    emptyDB   : emptyDB
};