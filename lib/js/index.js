// --- Electron communication

const { ipcRenderer } = require('electron');

// --- Components ---

import modOption from 'import:lib/vue/modOption.vue';
import modReset from 'import:lib/vue/modReset.vue';
import customSwitch from 'import:lib/vue/customSwitch.vue';
import customSlider from 'import:lib/vue/customSlider.vue';
import customSelect from 'import:lib/vue/customSelect.vue';
import buttonLoadMaps from 'import:lib/vue/buttonLoadMaps.vue';
import buttonOptions from 'import:lib/vue/buttonOptions.vue';
import buttonSend from 'import:lib/vue/buttonSend.vue';

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
		popupScan.progression = data.progression; // {X} / max
		popupScan.state = data.state; // Which operation is happening
		popupScan.max = data.max; // progression / {X}

		if (data.hasFinished){
			// Close the popup
			buttonLoadMaps.popups.info.visible = false;
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