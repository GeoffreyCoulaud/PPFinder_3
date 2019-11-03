// --- Electron communication

const { ipcRenderer } = require('electron');
const hash = require('object-hash');

// --- Search elements ---

const selectableMods = [
	'HD', 
	'HR', 
	'DT', 
	'FL', 
	'NF', 
	'EZ', 
	'HT', 
	'SO'
];
const sliders = [
	{name: 'slider-pp', range: {min:0, '25%':300, '50%':600, '75%':1000, max:10e5}},
	{name: 'slider-diff', step: 10e-2, range: {min:0, max:20}},
	{name: 'slider-ar', step: 10e-2, range: {min:0, max:11}},
	{name: 'slider-cs', step: 10e-2, range: {min:0, max:11}},
	{name: 'slider-od', step: 10e-2, range: {min:0, max:11}},
	{name: 'slider-hp', step: 10e-2, range: {min:0, max:11}},
	{name: 'slider-duration', step: 10e-2, range: {min:0, '50%': 10, '75%': 60, max: 120}},
	{name: 'slider-bpm', range: {min: 0, '20%': 50, '80%':400, max: 1000}},
	{name: 'slider-combo', range: {min:0, '50%':2000, '85%': 5000, max:65536}}
];
const orderOptions = [
	{name: 'order-pp', value: 0, defaultSelected: true},
	{name: 'order-diff', value: 1},
	{name: 'order-pp-diff', value: 2},
	{name: 'order-combo', value: 3},
	{name: 'order-pp-combo', value: 4},
	{name: 'order-duration', value: 5},
	{name: 'order-pp-duration', value: 6}
];

const searchRequests = [];


// --- Components ---

const modOption    = require('../vue/modOption.vue');
const modReset     = require('../vue/modReset.vue');
const customSwitch = require('../vue/customSwitch.vue');
const customSlider = require('../vue/customSlider.vue');
const customSelect = require('../vue/customSelect.vue');
const menuLoadMaps = require('../vue/menuLoadMaps.vue');
const menuOptions  = require('../vue/menuOptions.vue');
const buttonSend   = require('../vue/buttonSend.vue');
const mapResult    = require('../vue/mapResult.vue');

let languages = require('../lang/languages.json');

let 
	searchVue, 
	menusVue, 
	userOptions, 
	resultsVue, 
	languageMixin;

document.addEventListener('DOMContentLoaded', onDocReady);
function onDocReady(){
	
	// --- User options initialisation ---
	
	function initUserOptions(){return new Promise((resolve, reject)=>{
		// Read user options from file
		ipcRenderer.on('readUserOptionsReply', function(event, data){
			if (data === ''){reject();} 
			else { userOptions = data; resolve();}
		});
		ipcRenderer.send('readUserOptions');
	});}

	// --- Language initialisation ---

	function initLanguage(){
		// This is a global mixin, all components have access to
		// its datas, properties, methods...
		// Useful because the language file is used for every text in the app
		languageMixin = Vue.mixin({
			data: function(){return{
				lang: require(`../lang/${userOptions.currentLanguage}.json`)
			}}
		});

		// Update languages to select the selected one
		// (for the settings)
		const selectedIndex = languages.findIndex(x=>x.value===userOptions.currentLanguage);
		languages[selectedIndex].defaultSelected = true;
	}

	// --- Vues initialisation ---

	function initVue(){
		
		// * Vue container for search parameters
		searchVue = new Vue({
			el: '#search',
			data: {
				mods        : selectableMods,
				sliders     : sliders,
				orderOptions: orderOptions
			},
			components: {
				modOption   : modOption,
				modReset    : modReset,
				customSwitch: customSwitch,
				customSlider: customSlider,
				customSelect: customSelect,
				buttonSend  : buttonSend
			}
		});
		searchVue.$on('search', searchDB);

		// * Vue container for the menus
		menusVue = new Vue({
			el: '#menus',
			data: {
				currentLanguage: userOptions.currentLanguage,
				languages      : languages
			},
			components: {
				menuLoadMaps: menuLoadMaps,
				menuOptions : menuOptions
			}
		});
		// Default value for the language select
		// Handle language change
		menusVue.$on('languageChange', function(lang){
			ipcRenderer.on('languageChangeReply', ()=>{document.location.reload(true);});
			ipcRenderer.send('languageChange', lang);
		});
		// Handle beatmaps scan request
		menusVue.$on('scanBeatmaps', scanBeatmaps);

		// * Vue container for the search results
		resultsVue =  new Vue({
			el: "#results",
			data: {
				results: []
			},
			components: {
				mapResult: mapResult
			}
		});
	}
	
	// --- Chaining ---
	
	// Initialyse the interface
	initUserOptions()
	.then(initLanguage)
	.then(initVue)
	.catch((err)=>{console.error(err); });
}

// --- Database searching --- 

/*
* How searching works : 
* - The user clicks search
* - The client gets the different criteria
* - The client registers a query to the database in history
* - The client sends a query (event searchBeatmaps sent to main.js)
* 
* - WAIT...
* 
* - If the request's initial time is older than the latest request gotten's initial time, ignore this response
* - The server responds with an array of maps (event searchBeatmapsReply sent to index.js)
* - The response is displayed 
*/

class SearchRequest {
	constructor(id, criteria = null){
		this.id       = id;
		this.criteria = criteria;
		this.finished = false;
	}
}

function showSearchLoader(){
	// TODO
	console.time("Search duration ");
	console.log('Searching...');
}

function hideSearchLoader(){
	// TODO
	console.log('Finished searching !');
	console.timeEnd("Search duration ");
}

function getSearchCriteria(){
	
	function getParam(name){
		const component = searchVue.$children.find(x=>x.name===name);
		return component.getValue();
	}

	class MinMax{
		constructor(arr){
			this.min = arr[0];
			this.max = arr[1];
		}
	}
	class ModParam{
		constructor(name, value){
			this.name = name;
			this.value = value;
		}
	}

	// Get the state for all the mods
	const mods = [
		new ModParam('HR', getParam('mod-hr')),
		new ModParam('DT', getParam('mod-dt')),
		new ModParam('FL', getParam('mod-fl')),
		new ModParam('NF', getParam('mod-nf')),
		new ModParam('EZ', getParam('mod-ez')),
		new ModParam('HT', getParam('mod-ht')),
		new ModParam('SO', getParam('mod-so')),
		new ModParam('HD', getParam('mod-hd'))
	];
	// Create the include / exclude mods strings
	const includeMods = mods.filter(x=>x.value===1).map(x=>x.name).join('');
	const excludeMods = mods.filter(x=>x.value===2).map(x=>x.name).join('');

	// Get the duration in seconds, not minutes
	let duration = new MinMax(getParam('slider-duration'));
	duration.min *= 60;
	duration.max *= 60;

	// Create the search criteria
	const criteria = {
		sort: {
			desc: getParam('order-way'),
			id  : getParam('order')
		},
		mods: {
			include: includeMods,
			exclude: excludeMods
		},
		duration: duration,
		maxCombo: new MinMax(getParam('slider-combo')),
		stars   : new MinMax(getParam('slider-diff')),
		pp      : new MinMax(getParam('slider-pp')),
		ar      : new MinMax(getParam('slider-ar')),
		cs      : new MinMax(getParam('slider-cs')),
		od      : new MinMax(getParam('slider-od')),
		hp      : new MinMax(getParam('slider-hp')),
	}

	return criteria;
}

function searchDB(){
	// Create a searching ID
	const ID       = hash.MD5(Date.now());
	const criteria = getSearchCriteria();
	const req      = new SearchRequest(ID, criteria);
	
	// Show the loader
	showSearchLoader();
	
	// Query the database
	searchRequests.push(req);
	ipcRenderer.send('searchBeatmaps', req);
}

function handleSearchResults(results){
	// Log the results
	console.clear();
	console.log('Search results : ');
	console.table(results);
	// Display list of results
	resultsVue.results = results;
}

ipcRenderer.on('searchBeatmapsReply', function(event, {id, results}){
	// * Close this request and all the requests before this one

	let pos = 0;

	// Loop through all db requests from the last
	const lastSearchIndex = searchRequests.length-1;
	for (let i=lastSearchIndex; i>=0; i--){
		const elem = searchRequests[i];
		if (elem.id === id){ 
			// If the elem is the one corresponding to the request,
			// finish it and store its position in array.
			elem.finished = true; 
			pos = i;
			hideSearchLoader();
			handleSearchResults(results);
		} 
		else if (i<pos && elem.finished){
			// If the elem is finished, break
			// (because all the ones under it are finished too)
			break;
		}
	}
});

// --- Database scan process ---

function scanBeatmaps(){
	// Request scanning local beatmaps
	// (it's handled in the backend)
	ipcRenderer.send('scanBeatmaps');
	// Show the scan popup
	const menuLoadMaps = menusVue.$children.find(x=>x.type==='menuLoadMaps');
	menuLoadMaps.popups.info.visible = true;
}

ipcRenderer.on('stateScanBeatmaps', function(event, progression){
	const menuLoadMaps = menusVue.$children.find(x => x.type === 'menuLoadMaps');
	const popupScan    = menuLoadMaps.$children.find(x => x.type === 'popupScan');

	// Update popup
	popupScan.progression = progression;

	// Handle end
	if (progression.finished){
		// Close the popup
		menuLoadMaps.popups.info.visible = false;
	}
});