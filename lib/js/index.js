// --- Language handling ---

let currentLanguage = {
	"name": 'en'
};

function initLanguage(newLang){
	if (typeof newLang === 'string'){
		// Set the new language name if provided,
		// else keep the current language
		currentLanguage.name = newLang;
	}

	// Import the selected language
	let jsonFile = require(`../lang/${currentLanguage.name}.json`);

	// Return the translations/texts
	return jsonFile;
}

// --- Components ---

import modOption from 'import:lib/vue/modOption.vue';
import modReset from 'import:lib/vue/modReset.vue';
import customSwitch from 'import:lib/vue/customSwitch.vue';
import customSlider from 'import:lib/vue/customSlider.vue';
import customSelect from 'import:lib/vue/customSelect.vue';
import buttonLoadMaps from 'import:lib/vue/buttonLoadMaps.vue';
import buttonOptions from 'import:lib/vue/buttonOptions.vue';

let searchVue, buttonsVue;
document.addEventListener('DOMContentLoaded', onDocReady);
function onDocReady(){
	// --- Language initialisation ---
	
	// This is a global mixin, all components have access to
	// its datas, properties, methods...
	// Useful because the language file is used for every text in the app
	Vue.mixin({
		data: function(){return{
			lang: initLanguage()
		}}
	})

	// --- Vues ---

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
					{name: 'order-pp-duration', value: 6},
					{name: 'order-bpm', value: 7},
				]
			}
		},
		components: {
			modOption: modOption,
			modReset: modReset,
			customSwitch: customSwitch,
			customSlider: customSlider,
			customSelect: customSelect
		}
	});
	
	buttonsVue = new Vue({
		el: '#buttons',
		components: {
			buttonOptions: buttonOptions,
			buttonLoadMaps: buttonLoadMaps
		}
	});
}

// --- Electron calls & scripts ---

function scanBeatmaps(){
	// TODO request scanning local beatmaps
	alert('Native folder selector placeholder');
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
		'order': 'getTicked',
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
	const components = searchVue.$children.filter(x=>Object.keys(values).contains(x.name));
	for (let component of components){
		const name = component.name;
		if (values[name] === null){
			values[name] = component.value;
		} else {
			values[name] = component[values[name]]().value;
		}
	}

	// Get the order mode (value is called)
	let orderComponent = searchVue.$children.filter(x=>x.name==="order")[0];
	values['order'] = orderComponent.getSelected().value;

	return values;
}