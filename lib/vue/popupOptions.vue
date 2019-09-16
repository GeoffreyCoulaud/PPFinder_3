import customSelect from 'load:lib/vue/customSelect.vue';
import customSwitch from 'load:lib/vue/customSwitch.vue';

const popupOptions = Vue.component('popupOptions', {
	data: function(){return{
		type: 'popupOptions',
		visible: false,
		options: {
			language: [
				{name: "language-en", value: 'en', defaultSelected: true},
				{name: "language-fr", value: 'fr'}
			]
		}
	}},
	template: `<div :class="['popup', type, visible?'visible':'']">
		<div class="closeButton" @click="$emit('close')">
			<img src="../img/crossLight.svg" alt="close button icon"/>
		</div>
		<h2>{{lang['options-title']}}</h2>

		<h3>{{lang['option-link-type-title']}}</h3>
		<custom-switch class="input" :texts="[lang['option-link-type-http'], lang['option-link-type-direct']]"></custom-switch>

		<h3>{{lang['option-language-title']}}</h3>
		<custom-select name="languageSelect" class="input" :options="options.language" @changeValue="emitChangeLang"></custom-select>

	</div>`,
	methods: {
		show: function(){this.visible = true;},
		hide: function(){this.visible = false;},
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

export default popupOptions;