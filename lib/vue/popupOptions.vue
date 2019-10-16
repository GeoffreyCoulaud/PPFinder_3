const customSelect = require('./customSelect.vue');
const customSwitch = require('./customSwitch.vue');

const popupOptions = Vue.component('popupOptions', {
	props: {
		visible: {
			type: Boolean,
			default: false
		},
		languages: {
			type: Array
		},
		currentLanguage: {
			type: String
		}
	},
	data: function(){return{
		type: 'popupOptions',
	}},
	template: `<div :class="['popup', type, visible?'visible':'']">
		<div class="closeButton" @click="$emit('close')">
			<img src="../img/crossLight.svg" alt="close button icon"/>
		</div>
		<h2>{{lang['options-title']}}</h2>

		<h3>{{lang['option-link-type-title']}}</h3>
		<custom-switch class="input" :texts="[lang['option-link-type-http'], lang['option-link-type-direct']]"></custom-switch>

		<h3>{{lang['option-language-title']}}</h3>
		<custom-select name="languageSelect" class="input" :options="languages.map((x)=>{return {'name':x.name, 'value':x.id, 'isNameRaw': true}})" @changeValue="emitChangeLang"></custom-select>

	</div>`,
	methods: {
		emitChangeLang: function(lang){
			// Inform the vue instance that the language changed
			this.$root.$emit('languageChange', lang);
		}
	}, 
	components: {
		customSelect: customSelect,
		customSwitch: customSwitch
	}
});

module.exports = popupOptions;