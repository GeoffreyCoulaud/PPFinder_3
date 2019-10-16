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

const modOption = require('../vue/modOption.vue');
const modReset = require('../vue/modReset.vue');
const customSwitch = require('../vue/customSwitch.vue');
const customSlider = require('../vue/customSlider.vue');
const customSelect = require('../vue/customSelect.vue');
const menuLoadMaps = require('../vue/menuLoadMaps.vue');
const menuOptions = require('../vue/menuOptions.vue');
const buttonSend = require('../vue/buttonSend.vue');
const mapResult = require('../vue/mapResult.vue');

let 
	searchVue, 
	menusVue, 
	userOptions, 
	resultsVue, 
	languages,
	languageMixin;

document.addEventListener('DOMContentLoaded', onDocReady);
function onDocReady(){
	
	// --- User options initialisation ---
	
	function initUserOptions(){
		return new Promise((resolve, reject)=>{
			// Read user options from file
			ipcRenderer.on('readUserOptionsReply', function(event, data){
				if (data === ''){
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
		
		// * Vue container for search parameters
		searchVue = new Vue({
			el: '#search',
			data: {
				mods: selectableMods,
				sliders: sliders,
				orderOptions: orderOptions
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

		// * Vue container for the menus
		menusVue = new Vue({
			el: '#menus',
			data: {
				languages : require('../lang/languages.json'),
				currentLanguage: userOptions.currentLanguage
			},
			components: {
				menuOptions: menuOptions,
				menuLoadMaps: menuLoadMaps
			}
		});
		// Default value for the language select
		// Handle language change
		menusVue.$on('languageChange', function(lang){
			console.log(`Language changed to "${lang}"`);
			ipcRenderer.on('languageChangeReply', function(){
				document.location.reload(true);
			});
			ipcRenderer.send('languageChange', lang);
		});
		// Handle beatmaps scan request
		menusVue.$on('scanBeatmaps', scanBeatmaps);

		// * Vue container for the search results
		resultsVue =  new Vue({
			el: "#results",
			data: {
				results: [
					// ! Temporary
					{
						beatmapID: 2084862,
						beatmapSetID: 983911,
						ar: 9.4,
						cs: 4.2,
						od: 9.6,
						hp: 5.5,
						stars: 6.93,
						mods: [
							'HD',
							'HR'
						],
						durationHuman: '2:18',
						author: 'Fatfan Kolek',
						version: 'Intense Exstasy',
						artist: 'S3RL',
						title: 'Bass Slut (Original Mix)',
						pp: new Map([
							[100, 402],
							[99, 369],
							[98, 345],
							[95, 308]
						])
					}
				]
			},
			components: {
				mapResult: mapResult
			}
		})
	}

	// --- Chaining ---

	// Initialyse the interface
	initUserOptions()
	.then(initLanguage)
	.then(initVue)
	// handle the errors
	.catch((err)=>{console.error(err); });
}

// --- Electron calls & scripts ---

function scanBeatmaps(){
	// Request scanning local beatmaps
	ipcRenderer.send('scanBeatmaps');
	// Show the scan popup
	const menuLoadMaps = menusVue.$children.find(x=>x.type==='menuLoadMaps');
	menuLoadMaps.popups.info.visible = true;
}

function handleSearchResults(res){
	// Log the results
	console.log('Search results : ');
	console.array(res);
	// Display list of results
	resultsVue.results = res;
}

// --- Database searching --- 

/*
	How searching works : 
	- The user clicks search
	- The client gets the different criteria
	- The client registers a query to the database in history
	- The client sends a query (event searchBeatmaps sent to main.js)
	
	- WAIT...
	
	- If the request's initial time is older than the latest request gotten's initial time, ignore this response
	- The server responds with an array of maps (event searchBeatmapsReply sent to index.js)
	- The response is displayed 
*/

const {SearchCriteria} = require('../../src/js/searchCriteria.js');

class SearchRequest {
	constructor(id, criteria = null){
		this.id = id;
		this.criteria = criteria;
		this.finished = false;
	}
}

let DEBUGTIME = null;

function showSearchLoader(){
	// TODO
	DEBUGTIME = console.time();
	console.log('Searching...');
}

function hideSearchLoader(){
	// TODO
	console.timeEnd(DEBUGTIME);
	console.log('Finished searching !');
}

function getSearchParameters(){
	
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

	// Create the search criteria
	const criteria = {
		mods: {
			notWanted: mods.filter(x=>x.value===2).map(x=>x.name),
			wanted: mods.filter(x=>x.value===1).map(x=>x.name)
		},
		sort: {
			desc: getParam('order-way'),
			id: getParam('order')
		},
		duration: new MinMax(getParam('slider-duration')),
		maxCombo: new MinMax(getParam('slider-combo')),
		stars: new MinMax(getParam('slider-diff')),
		pp: new MinMax(getParam('slider-pp')),
		ar: new MinMax(getParam('slider-ar')),
		cs: new MinMax(getParam('slider-cs')),
		od: new MinMax(getParam('slider-od')),
		hp: new MinMax(getParam('slider-hp')),
	}

	return criteria;
}

function searchDB(){

	// Create a searching ID
	const ID = hash.MD5(Date.now());
	const req = new SearchRequest(ID);
	
	// Get the search parameters from DOM
	const vals = getSearchParameters();
	
	// Prepare the mods lists
	const mods = Object.entries(vals).filter(x=>x[0].startsWith('mod-'));
	const modsWanted = mods.filter(x=>x[1] === 1);
	const modsNotWanted = mods.filter(x=>x[1] === 2);
	
	// Wrap all the criterias in an object
	const criteria = new SearchCriteria(
		vals['slider-pp'][0], vals['slider-pp'][1],
		vals['slider-diff'][0], vals['slider-diff'][1],
		vals['slider-ar'][0], vals['slider-ar'][1],
		vals['slider-cs'][0], vals['slider-cs'][1],
		vals['slider-od'][0], vals['slider-od'][1],
		vals['slider-hp'][0], vals['slider-hp'][1],
		vals['slider-duration'][0], vals['slider-duration'][1],
		vals['slider-combo'][0], vals['slider-combo'][1],
		vals['order'], vals['order-way'],
		modsWanted, modsNotWanted
	);
	req.criteria = criteria;
	
	// Show the loader
	showSearchLoader();
	
	// Query the database
	searchRequests.push(req);
	ipcRenderer.send('searchBeatmaps', req);
}

ipcRenderer.on('searchBeatmapsReply', function(event, {id, results}){
	// Close this request
	searchRequests.find(x=>x.id===id).finished = true;
	
	// If the last request started has finished, hide the search loader
	// (ignore the previous ones since they will never be shown)
	if (searchRequests[searchRequests.length-1].finished){
		hideSearchLoader();
	}

	// If this is the most recent, handle it.
	const f = searchRequests.filter(x=>x.finished);
	const lastFinishedID = f[f.length-1].id;
	if (lastFinishedID === id){
		handleSearchResults(results);
	}
});

// --- Communication with main --- 

ipcRenderer.on('stateScanBeatmaps', function(event, progression){
	const menuLoadMaps = menusVue.$children.find(x=>x.type==='menuLoadMaps');
	const popupScan = menuLoadMaps.$children.find(x=>x.type==='popupScan');

	// Update popup
	popupScan.progression = progression;

	// Handle end
	if (progression.forceHide){
		// Close the popup
		menuLoadMaps.popups.info.visible = false;
	}
});

// --- General purpose functions ---

function secToMinSec(seconds){
	let secondsFinal = seconds%60
	let minutes = (seconds-secondsFinal) / 60;
	return `${minutes}:${secondsFinal}`;
}