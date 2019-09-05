import customSelect from 'import:lib/vue/customSelect.vue';
import customSwitch from 'import:lib/vue/customSwitch.vue';

const optionsMenu = Vue.component('optionsMenu', {
	data: function(){return{
		type: 'optionsMenu',
		visible: false,
		options: {
			language: [
				{name: "language-en", value: 'en', defaultSelected: true},
				{name: "language-fr", value: 'fr'}
			]
		}
	}},
	template: `<div :class="['popup', type, visible?'visible':'']">
		<div class="closeButton" v-on:click="$emit('close')">
			<img src="../img/crossLight.svg" alt="close button icon"/>
		</div>
		<h2>{{lang['options-title']}}</h2>

		<h3>{{lang['option-link-type-title']}}</h3>
		<custom-switch class="input" :texts="[lang['option-link-type-http'], lang['option-link-type-direct']]"></custom-switch>

		<h3>{{lang['option-language-title']}}</h3>
		<custom-select name="languageSelect" class="input" :options="options.language" v-on:changeValue="langChange"></custom-select>

	</div>`,
	methods: {
		show: function(){this.visible = true;
		},
		hide: function(){this.visible = false;},
		langChange: function(){
			// Get the language that is selected
			this.$children
		}
	}, 
	components: {
		customSelect: customSelect,
		customSwitch: customSwitch
	}
});

export default optionsMenu;