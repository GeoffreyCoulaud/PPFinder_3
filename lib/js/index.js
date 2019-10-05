// --- Electron communication

const { ipcRenderer } = require('electron');

// --- Search elements ---

const selectableMods = [
	'hd', 
	'hr', 
	'dt', 
	'fl', 
	'nf', 
	'ez', 
	'ht', 
	'so'
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


// --- Components ---

import modOption from 'load:lib/vue/modOption.vue';
import modReset from 'load:lib/vue/modReset.vue';
import customSwitch from 'load:lib/vue/customSwitch.vue';
import customSlider from 'load:lib/vue/customSlider.vue';
import customSelect from 'load:lib/vue/customSelect.vue';
import menuLoadMaps from 'load:lib/vue/menuLoadMaps.vue';
import menuOptions from 'load:lib/vue/menuOptions.vue';
import buttonSend from 'load:lib/vue/buttonSend.vue';

let searchVue, menusVue, userOptions, languageMixin;

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

		menusVue = new Vue({
			el: '#menus',
			components: {
				menuOptions: menuOptions,
				menuLoadMaps: menuLoadMaps
			}
		});
		// Default value for the language select
		menusVue
			.$children.find(x=>x.type==="menuOptions")
			.$children.find(x=>x.type==="popupOptions")
			.$children.find(x=>x.name==="languageSelect")
			.select(userOptions.currentLanguage);
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
	}

	// --- Chaining ---
	// Initialyse the interface
	initUserOptions()
	.then(initLanguage)
	.then(initVue)
	// handle the errors
	.catch((err)=>{
		console.error(err);
	})
}

// --- Electron calls & scripts ---

function scanBeatmaps(){
	
	// Request scanning local beatmaps
	ipcRenderer.send('scanBeatmaps');
	
	// Show the scan popup
	const menuLoadMaps = menusVue.$children.find(x=>x.type==='menuLoadMaps');
	menuLoadMaps.popups.info.visible = true;
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

class MinMax {
	constructor(min = 0, max = 0){
		this.min = min;
		this.max = max;
	}
}
class ModsCriteria {
	constructor(wanted = [], notWanted = []){
		this.wanted = wanted;
		this.notWanted = notWanted;
	}
}
class SortCriteria {
	constructor(id = 0, desc = false){
		this.id = id;
		this.desc = desc;
	}
}
class SearchCriteria {
	constructor (
		ppMin, ppMax,
		starMin, starMax,
		arMin, arMax,
		csMin, csMax,
		odMin, odMax,
		hpMin, hpMax,
		durMin, durMax,
		cbMin, cbMax,
		sortID, sortType,
		modW, modNW
	){
		this.pp = new MinMax(ppMin, ppMax);
		this.stars = new MinMax(starMin, starMax);
		this.ar = new MinMax(arMin, arMax);
		this.cs = new MinMax(csMin, csMax);
		this.od = new MinMax(odMin, odMax);
		this.hp = new MinMax(hpMin, hpMax);
		this.duration = new MinMax(durMin, durMax);
		this.maxCombo = new MinMax(cbMin, cbMax);
		this.mods = new ModsCriteria(modW, modNW);
		this.sort = new SortCriteria(sortID, sortType);
	}
}

function searchDB(criteria = null){return new Promise((resolve, reject)=>{
	if (criteria === null){
		// ! TEMPORARY, its sole pupose is testing
		resolve([]);
	}

	// Prepare the criterias
	const vals = getSearchParameters();

	// Prepare the mods lists
	let mods = [];
	for (let entry of Object.entries(vals)){
		if (entry[0].startsWith('mod')){
			mods.push({name: entry[0], state: entry[2]});
		}
	}
	const modsWanted = mods.filter(x=>x.state === 1);
	const modsNotWanted = mods.filter(x=>x.state === 2);

	// Wrap all the criterias in an object
	let criteria = new SearchCriteria(
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
})}

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
		// * log the database to see if it works
		searchDB({})
		.then((response)=>{console.log(response);})
		.catch((err)=>{console.log('Could not search database', err)});
	}
});