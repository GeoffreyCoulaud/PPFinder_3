
// ------------------------------------------------------------------------------------------
// Database communication
// ------------------------------------------------------------------------------------------

const {promises: fsp} = require('fs');
const path = require('path');

// * Internal function. Used to read file relatively from module.
async function readFileRelative(p, opt){
	let content = await fsp.readFile(path.join(__dirname, p), opt);
	return content;
}

// * Empties the given database according to ../sql/emptyBaseTables.sql,
// * then optimizes the database according to ../sql/optimizeBaseTables.sql
async function emptyDB(dbClient){
	// Get sql files
	let wipeQueries = await readFileRelative('../sql/emptyBaseTables.sql', 'utf-8');
	let optiQueries = await readFileRelative('../sql/optimizeBaseTables.sql', 'utf-8');
	
	// Remove the comments and split in individual queries
	wipeQueries = wipeQueries.split(';').filter(x=>x!=='');
	optiQueries = optiQueries.split(';').filter(x=>x!=='');
	
	// Regroup all of the queries in one array
	const queries = wipeQueries.concat(optiQueries);
	
	// Execute all queries
	for (let query of queries){
		await dbClient.query(query);
	}

	// End function
	return true;
}

// * Adds the given map to the given database
function addMapToDB(map, dbClient){return new Promise((resAdd, rejAdd)=>{

	class InsertQuery {
		constructor(table, columns){
			this.columns = columns;
			this.table = table;
			this.data = [];
			
			this.nRows = 0;
			
			this.constructionEnded = false;
			
			this.text = 'INSERT INTO ';
			this.text += table;
			this.text += '(';
			for (let i = 0; i<columns.length; i++){
				if(i>0){this.text+=',';}
				this.text += columns[i];
			}
			this.text += ') VALUES ';

			this.add = function(row){
				if (row.length !== this.columns.length){
					throw `Row has ${row.length} columns, ${this.columns.length} expected`;
				}

				// Text placeholder construction
				let rowPlaceholder = "";
				if (this.nRows>0){rowPlaceholder += ', ';}
				rowPlaceholder += '(';
				for (let i=0; i<row.length; i++){
					if (i>0){rowPlaceholder +=',';}
					rowPlaceholder += '?';
				}
				rowPlaceholder += ')';
				this.text += rowPlaceholder;
				
				// Adding the data to query data
				for (let i=0; i<row.length; i++){
					if (typeof row[i] === 'undefined'){
						throw `[Row ${this.nRows}] undefined value at column ${i}`;
					}
					this.data.push(row[i]);
				}

				// Increment the counter of insert subqueries
				this.nRows++;
			};
			
			this.endBuilding = function(){
				if (!this.constructionEnded){
					this.constructionEnded = true;
					this.text += ';';
				}
			}

			this.execute = function(dbClient){
				return dbClient.execute(this.text, this.data);
			}
		}
	}

	
	// Build the queries
	let promisedQueries = [];
	let queries = [
		new InsertQuery(
			'beatmapsmetadata', 
			['beatmapID', 'beatmapSetID', 'creator', 'version', 'artist', 'title', 'artistUnicode', 'titleUnicode', 'maxCombo']
		),
		new InsertQuery(
			'modsmetadata', 
			['beatmapID', 'modbits', 'stars', 'ar', 'cs', 'od', 'hp', 'duration', 'bpm']
		),
		new InsertQuery(
			'accuraciesmetadata', 
			['beatmapID', 'modbits', 'accuracy', 'pp']
		)
	];
	// Build the queries
	queries[0].add([map.beatmapID, map.beatmapSetID, map.creator, map.version, map.artist, map.title, map.artistUnicode, map.titleUnicode, map.maxCombo]);
	for (let mod of map.mods){
		queries[1].add([map.beatmapID, mod.modbits, mod.stars, mod.ar, mod.cs, mod.od, mod.hp, mod.duration, mod.bpm]);
		for (let acc of mod.accs){
			queries[2].add([map.beatmapID, mod.modbits, acc.accuracy, acc.pp]);
		}
	}
	queries.forEach(function finishTexts(query){
		// End query construction
		query.endBuilding();
		// Send the query to be executed
		promisedQueries.push( query.execute(dbClient) );
	});

	// Execute all the queries
	Promise.all(promisedQueries)
	.then(resAdd)
	.catch(rejAdd);
})}

// * Returns maps from the database matching the given criteria
function searchDB(criteria, dbClient){return new Promise((resSearch, rejSearch)=>{
	/*
	* criteria : a criteria formatted as expected in backend.js
	* dbClient : a usable database client
	*/

	// Modbits from ojsama
	const {modbits} = require('ojsama');

	
	// If null sent, return empty array
	if (criteria === null){
		console.warn('Research criteria null');
		resSearch([]);
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
	// Search sorts
	const sorts = require('./searchSorts.js');
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
					'{100:', acc100.pp, '},',
					'{99:',  acc99.pp,  '},',
					'{98:',  acc98.pp,  '},',
					'{95:',  acc95.pp,  '}',
				']'
			) as pp,

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
				modbits, 
				pp 
			FROM 
				accuraciesmetadata as acc100
			WHERE 
				acc100.accuracy = 100 and 
				acc100.pp BETWEEN ? AND ? and
				acc100.modbits & ? and
				NOT acc100.modbits & ?
		) as acc100

		-- mod data

		INNER JOIN modsmetadata as m
		ON 
			m.modbits = acc100.modbits and 
			m.beatmapID = acc100.beatmapID and
			m.ar BETWEEN ? AND ? and
			m.cs BETWEEN ? AND ? and
			m.od BETWEEN ? AND ? and
			m.hp BETWEEN ? AND ? and
			m.stars BETWEEN ? AND ? and
			m.duration BETWEEN ? AND ?
		
		-- .osu data

		INNER JOIN beatmapsmetadata as b
		ON 
			b.beatmapID = acc100.beatmapID and
			b.maxCombo BETWEEN ? AND ?
		
		-- Other accuracies for this score

		INNER JOIN accuraciesmetadata as acc99
		ON 
			acc99.accuracy = 99 and 
			acc100.beatmapID = acc99.beatmapID and 
			acc100.modbits = acc99.modbits

		INNER JOIN accuraciesmetadata as acc98
		ON 
			acc98.accuracy = 98 and 
			acc100.beatmapID = acc98.beatmapID and 
			acc100.modbits = acc98.modbits

		INNER JOIN accuraciesmetadata as acc95
		ON 
			acc95.accuracy = 95 and 
			acc100.beatmapID = acc95.beatmapID and 
			acc100.modbits = acc95.modbits

		-- Sorting
		
		${sort}

		-- Pagination

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
	.then(([rows, fields])=>{
		console.log(rows.length+" résultats.");
		console.log(fields.length+" champs.");
		if (rows.length === 0){return rows;}
		// Format the results
		rows = rows.map(row=>{
			// Turn pp into a Map
			console.log(row, row.pp);
			row.pp = JSON.parse(row.pp);
			row.pp = new Map(row.pp); 
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