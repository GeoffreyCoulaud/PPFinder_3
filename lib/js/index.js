// --- Lovefield database --- 

const lf = require('lovefield');
window.db = null;

// --- Electron communication

const { ipcRenderer } = require('electron');

// --- Components ---

import modOption from 'load:lib/vue/modOption.vue';
import modReset from 'load:lib/vue/modReset.vue';
import customSwitch from 'load:lib/vue/customSwitch.vue';
import customSlider from 'load:lib/vue/customSlider.vue';
import customSelect from 'load:lib/vue/customSelect.vue';
import buttonLoadMaps from 'load:lib/vue/buttonLoadMaps.vue';
import buttonOptions from 'load:lib/vue/buttonOptions.vue';
import buttonSend from 'load:lib/vue/buttonSend.vue';

let searchVue, buttonsVue, languageMixin, userOptions;

document.addEventListener('DOMContentLoaded', onDocReady);
function onDocReady(){
	function initUserOptions(){
		return new Promise((resolve, reject)=>{
			// Read user options from file
			ipcRenderer.on('readUserOptionsReply', function(event, data){
				if(data === ''){
					reject();
				} else {
					userOptions = data;
					resolve();
				}
			});
			ipcRenderer.send('readUserOptions');
		});
	}

	// --- Language initialisation ---

	function initLanguage(){		
		// This is a global mixin, all components have access to
		// its datas, properties, methods...
		// Useful because the language file is used for every text in the app
		languageMixin = Vue.mixin({
			data: function(){return{
				lang: require(`../lang/${userOptions.currentLanguage}.json`)
			}}
		})
	}
	
	// --- Vues initialisation ---

	function initVue(){
		searchVue = new Vue({
			el: '#search',
			data: {
				mods: ['hd', 'hr', 'dt', 'fl', 'nf', 'ez', 'ht', 'so'],
				sliders: [
					{name: 'slider-pp', range: {min:0, '25%':300, '50%':600, '75%':1000, max:10e5}},
					{name: 'slider-diff', step: 10e-2, range: {min:0, max:20}},
					{name: 'slider-ar', step: 10e-2, range: {min:0, max:11}},
					{name: 'slider-cs', step: 10e-2, range: {min:0, max:11}},
					{name: 'slider-od', step: 10e-2, range: {min:0, max:11}},
					{name: 'slider-hp', step: 10e-2, range: {min:0, max:11}},
					{name: 'slider-duration', step: 10e-2, range: {min:0, '50%': 10, '75%': 60, max: 120}},
					{name: 'slider-combo', range: {min:0, '50%':2000, '85%': 5000, max:65536}}
				],
				orderOptions: {
					name: 'order',
					options: [
						{name: 'order-pp', value: 0, defaultSelected: true},
						{name: 'order-diff', value: 1},
						{name: 'order-pp-diff', value: 2},
						{name: 'order-combo', value: 3},
						{name: 'order-pp-combo', value: 4},
						{name: 'order-duration', value: 5},
						{name: 'order-pp-duration', value: 6}
					]
				}
			},
			components: {
				modOption: modOption,
				modReset: modReset,
				customSwitch: customSwitch,
				customSlider: customSlider,
				customSelect: customSelect,
				buttonSend: buttonSend
			}
		});
		searchVue.$on('search', function(){
			// Get all search parameters values
			const searchParams = getSearchParameters();
			// Send the request to main process
			ipcRenderer.on('searchReply', handleSearchResults);
			ipcRenderer.send('search', searchParams);
		});

		buttonsVue = new Vue({
			el: '#buttons',
			components: {
				buttonOptions: buttonOptions,
				buttonLoadMaps: buttonLoadMaps
			}
		});
		// Default value for the language select
		buttonsVue
			.$children.find(x=>x.type==="buttonOptions")
			.$children.find(x=>x.type==="popupOptions")
			.$children.find(x=>x.name==="languageSelect")
			.select(userOptions.currentLanguage);
		// Handle language change
		buttonsVue.$on('languageChange', function(lang){
			console.log(`Language changed to "${lang}"`);
			ipcRenderer.on('languageChangeReply', function(){
				document.location.reload(true);
			});
			ipcRenderer.send('languageChange', lang);
		});
		// Handle beatmaps scan request
		buttonsVue.$on('scanBeatmaps', scanBeatmaps);
	}

	// --- Chaining ---
	initUserOptions()
	.then(()=>{
		return createDB();
	})
	.then(()=>{
		initLanguage();
		initVue();
	})
	.catch((err)=>{
		console.error(err);
		//alert('userOptions.json is missing, please reinstall PP Finder.');
	})
}

// --- Electron calls & scripts ---

function scanBeatmaps(){
	const buttonLoadMaps = buttonsVue
		.$children.find(x=>x.type==='buttonLoadMaps');

	const popupScan = buttonLoadMaps
		.$children.find(x=>x.type==='popupScan');
	
	// Request scanning local beatmaps
	ipcRenderer.send('scanBeatmaps');
	// Show the scan popup visibility to visible
	buttonLoadMaps.popups.info.visible = true;

	// Update the popup when main informs progression
	ipcRenderer.on('stateScanBeatmaps', function(event, data){
		popupScan.progression = data.progression ? data.progression : null; // {X} / max
		popupScan.state = data.state; // Which operation is happening
		popupScan.max = data.max ? data.max : null; // progression / {X}

		console.log(popupScan.state, popupScan.states[popupScan.state]);

		if (data.hasFinished){
			// Close the popup
			buttonLoadMaps.popups.info.visible = false;

			// TODO log the database to see if it works
			let b = window.db.getSchema().table('beatmapsMetadata');
			window.db.select().from(b).exec().then((rows)=>{
				console.log(rows.length, rows);
			});
		}
	});
}

function handleSearchResults(results){
	// TODO display list of results
	alert('Display search results');
	console.log(results);
}

function getSearchParameters(){
	let values = {
		'slider-duration': null,
		'slider-combo': null,
		'slider-diff': null,
		'slider-pp': null,
		'slider-ar': null,
		'slider-cs': null,
		'slider-od': null,
		'slider-hp': null,
		'order-way': null,
		'order': null,
		'mod-hr': null,
		'mod-dt': null,
		'mod-fl': null,
		'mod-nf': null,
		'mod-ez': null,
		'mod-ht': null,
		'mod-so': null,
		'mod-hd': null
	};

	// Get all search options' values
	const keys = Object.keys(values);
	const components = searchVue.$children.filter(x=>keys.includes(x.name));
	for (let component of components){
		values[component.name] = component.getValue();
	}

	return values;
}

// --- Database communication --- 

function createDB(){ return new Promise((resolve, reject)=>{
	// This creates an empty database with the necessary columns
	// ? maybe it would be profitable to add some indices

	const INTEGER = lf.Type.INTEGER;
	const STRING = lf.Type.STRING;
	const NUMBER = lf.Type.NUMBER; 

	let schemaBuilder = lf.schema.create('ppfinder', 1);

	schemaBuilder.createTable('beatmapsMetadata')
		.addColumn('ID', INTEGER)
		.addColumn('beatmapID', INTEGER)
		.addColumn('beatmapSetID', INTEGER)
		.addColumn('creator', STRING)
		.addColumn('version', STRING)
		.addColumn('artist', STRING)
		.addColumn('artistUnicode', STRING)
		.addColumn('title', STRING)
		.addColumn('titleUnicode', STRING)
		.addPrimaryKey(['ID'], true);

	schemaBuilder.createTable('modsMetadata')
		.addColumn('ID', INTEGER)
		.addColumn('beatmapID', INTEGER)
		.addColumn('mods', STRING)
		.addColumn('stars', NUMBER)
		.addColumn('ar', NUMBER)
		.addColumn('cs', NUMBER)
		.addColumn('od', NUMBER)
		.addColumn('hp', NUMBER)
		.addPrimaryKey(['ID'], true);

	schemaBuilder.createTable('accuraciesMetadata')
		.addColumn('ID', INTEGER)
		.addColumn('mods', STRING)
		.addColumn('beatmapID', INTEGER)
		.addColumn('accuracy', INTEGER)
		.addColumn('pp', NUMBER)
		.addPrimaryKey(['ID'], true);

	
	schemaBuilder.connect({storeType: lf.schema.DataStoreType.INDEXED_DB})
	.then((db)=>{
		window.db = db;
		resolve();
	}).catch((err)=>{
		throw Error(err);
	});
});}

function wipeDB(){
	// This just wipes the whole database

	const schema = window.db.getSchema();
	const accuraciesMetadata = schema.table('accuraciesMetadata');
	const beatmapsMetadata = schema.table('beatmapsMetadata');
	const modsMetadata = schema.table('modsMetadata');

	let transaction = window.db.createTransaction();

	let queries = [
		window.db.delete().from(accuraciesMetadata),
		window.db.delete().from(beatmapsMetadata),
		window.db.delete().from(modsMetadata)
	];

	return transaction.exec(queries);
}

function addBeatmapToDB(beatmapMetadata){

	const schema = window.db.getSchema();
	const accuraciesMetadata = schema.table('accuraciesMetadata');
	const beatmapsMetadata = schema.table('beatmapsMetadata');
	const modsMetadata = schema.table('modsMetadata');

	let transaction = window.db.createTransaction();
	let queries = [];
	let row;

	for (let mod of beatmapMetadata.mods){
		for (let accuracy of mod.accs){
			row = accuraciesMetadata.createRow({
				'pp': accuracy.pp,
				'accuracy': accuracy.accuracy,
				'mods': accuracy.mods,
				'beatmapID': beatmapMetadata.beatmapID
			});
			queries.push( window.db.insert().into(accuraciesMetadata).values([row]) );
		}
		row = modsMetadata.createRow({
			'beatmapID': beatmapMetadata.beatmapID,
			'mods': mod.mods,
			'stars': mod.stars,
			'ar': mod.ar,
			'cs': mod.cs,
			'od': mod.od,
			'hp': mod.hp
		});
		queries.push( window.db.insert().into(modsMetadata).values([row]) );
	}
	row = beatmapsMetadata.createRow({
		'beatmapID': beatmapMetadata.beatmapID,
		'beatmapSetID': beatmapMetadata.beatmapSetID,
		'creator': beatmapMetadata.creator,
		'version': beatmapMetadata.version,
		'artist': beatmapMetadata.artist,
		'title': beatmapMetadata.title,
		'artistUnicode': beatmapMetadata.artistUnicode,
		'titleUnicode': beatmapMetadata.titleUnicode
	});
	queries.push( window.db.insert().into(beatmapsMetadata).values([row]) );
	
	return transaction.exec(queries);
}

ipcRenderer.on('wipeDB', function(event, data){
	// When ordered to wipe the database, do it
	// then reply that it's done
	wipeDB().then(()=>{
		event.sender.send('wipeDBReply');
	});
});

ipcRenderer.on('addMapToDB', function(event, beatmapMetadata){
	// This is called when a map is computed
	addBeatmapToDB(beatmapMetadata)
	.then(()=>{
		ipcRenderer.send('addMapToDBReply');
	})
	.catch((err)=>{
		console.error('Error adding map to the database', err);
		ipcRenderer.send('addMapToDBReply', err)
	});
});