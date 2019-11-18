
// ------------------------------------------------------------------------------------------
// Database communication
// ------------------------------------------------------------------------------------------

const SQL = require('sql-template-strings');
const {promises: fsp} = require('fs');
const path = require('path');

// Modbits from ojsama
const {modbits} = require('ojsama');

// * Internal function. Used to transform nSec int to string min:sec
function secToMinSec(nSec){
	let nMin = Math.floor(nSec/60)+'';
	nSec = nSec-nMin*60+'';

	while (nMin.length < 2){nMin = '0'+nMin;}
	while (nSec.length < 2){nSec = '0'+nSec;}

	return `${nMin}:${nSec}`;
}

// * Internal function to convert mods string to list of mod strings
function explodeStr(str, chunkSize){
	let chunks = [];
	for (let i=0; i<str.length; i+=chunkSize){
		chunks.push(str.substring(i, i+chunkSize));
	}
	return chunks;
}

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
function buildSearchQuery(criteria, sort, offset, limit){
	const query = SQL`SELECT
		CONCAT(
			'[[100,',
			acc100.pp,
			'],[99,',
			acc99.pp,
			'],[98,',
			acc98.pp,
			'],[95,',
			acc95.pp,
			']]'
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
		b.maxCombo as maxCombo,
		b.beatmapID as beatmapID,
		b.beatmapSetID as beatmapSetID
	FROM
		accuraciesmetadata as acc100
	INNER JOIN modsmetadata as m
	ON 
		m.modbits = acc100.modbits and 
		m.beatmapID = acc100.beatmapID and
		m.ar BETWEEN ${criteria.ar.min} AND ${criteria.ar.max} and
		m.cs BETWEEN ${criteria.cs.min} AND ${criteria.cs.max} and
		m.od BETWEEN ${criteria.od.min} AND ${criteria.od.max} and
		m.hp BETWEEN ${criteria.hp.min} AND ${criteria.hp.max} and
		m.stars BETWEEN ${criteria.stars.min} AND ${criteria.stars.max} and
		m.duration BETWEEN ${criteria.duration.min} AND ${criteria.duration.max}
	INNER JOIN beatmapsmetadata as b
	ON 
		b.beatmapID = acc100.beatmapID and
		b.maxCombo BETWEEN ${criteria.maxCombo.min} AND ${criteria.maxCombo.max}
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
	WHERE 
		acc100.accuracy = 100 and 
		acc100.pp BETWEEN ${criteria.pp.min} AND ${criteria.pp.max} and
		(acc100.modbits & ${criteria.mods.include} = ${criteria.mods.include}) and
		(NOT acc100.modbits & ${criteria.mods.exclude}) 
	`;
	query
	.append(sort)
	.append(SQL`LIMIT ${offset}, ${limit};`);

	return query;
}

function buildRowNumberQuery(criteria){
	const query = SQL`SELECT
		count(*) as nRows
	FROM
		accuraciesmetadata as acc100
	INNER JOIN modsmetadata as m
	ON 
		m.modbits = acc100.modbits and 
		m.beatmapID = acc100.beatmapID and
		m.ar BETWEEN ${criteria.ar.min} AND ${criteria.ar.max} and
		m.cs BETWEEN ${criteria.cs.min} AND ${criteria.cs.max} and
		m.od BETWEEN ${criteria.od.min} AND ${criteria.od.max} and
		m.hp BETWEEN ${criteria.hp.min} AND ${criteria.hp.max} and
		m.stars BETWEEN ${criteria.stars.min} AND ${criteria.stars.max} and
		m.duration BETWEEN ${criteria.duration.min} AND ${criteria.duration.max}
	INNER JOIN beatmapsmetadata as b
	ON 
		b.beatmapID = acc100.beatmapID and
		b.maxCombo BETWEEN ${criteria.maxCombo.min} AND ${criteria.maxCombo.max}
	WHERE 
		acc100.accuracy = 100 and 
		acc100.pp BETWEEN ${criteria.pp.min} AND ${criteria.pp.max} and
		(acc100.modbits & ${criteria.mods.include} = ${criteria.mods.include}) and
		(NOT acc100.modbits & ${criteria.mods.exclude})
	LIMIT 1
	`;

	return query;
}

async function searchDB(criteria, page, dbClient){
	/*
	* criteria : a criteria formatted as expected in backend.js
	* page : a page number starting from 0
	* dbClient : a usable database client

	* Returns :
	[
		[0] = rows : a list of rows returned by the database
		[1] = page : the current page
		[2] = maxPage : the maximum page number
		[3] = resPerPage : the number of rows per page
	]
	*/

	let rows, fields;
	
	// If null sent, return empty array
	if (criteria === null){
		console.warn('Research criteria null');
		resSearch([]);
	}
	
	// Build the masks for mod inclusion / exclusion
	criteria.mods.include = modbits.from_string(criteria.mods.include);
	criteria.mods.exclude = modbits.from_string(criteria.mods.exclude);
	
	// Pagination system
	// Get the maximum number of pages
	const nRowsQuery   = buildRowNumberQuery(criteria);
	[rows, fields]     = await dbClient.execute(nRowsQuery);
	let nRes           = rows[0]['nRows'];
	const resPerPage   = 50;
	const maxPage       = Math.ceil(nRes/resPerPage);
	// Get only an existing page number
	page = Math.min(maxPage, Math.max(page,0)); 
	const offset = page*resPerPage;
	const limit  = resPerPage;
	
	// Sorting system
	const sortPrefix = 'ORDER BY ';
	const sorts      = require('./searchSorts.js');
	if (!(criteria.sort.id in sorts)){ 
		// Handle non existing sorts
		console.warn('Non existing sort requested', criteria.sort.id);
		criteria.sort.id = 0; 
	} 
	const sortSuffix = (criteria.sort.desc) ? 'DESC': 'ASC';
	const sort       = ` ${sortPrefix} ${sorts[criteria.sort.id]} ${sortSuffix} `;

	// Search
	const searchQuery = buildSearchQuery(criteria, sort, offset, limit);
	[rows, fields] = await dbClient.execute(searchQuery)
	
	// Format the results
	if (rows.length){
		rows = rows.map(row=>{
			// Turn pp into a Map
			row.pp = JSON.parse(row.pp); 
			// Format duration to be readable
			row.durationHuman = secToMinSec(row.duration); 
			delete row.duration;
			// Add mod string from modbits
			let m = modbits.string(row.modbits.readUInt16BE());
			row.mods = explodeStr(m, 2);
			delete row.modbits;
			return row;
		});
		return [rows, page, maxPage, resPerPage];
	}
}

module.exports = {
    addMapToDB: addMapToDB,
    searchDB  : searchDB,
    emptyDB   : emptyDB
};