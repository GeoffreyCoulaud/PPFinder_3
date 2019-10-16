const popupOptions = require('./popupOptions.vue');
const darkFilter = require('./darkFilter.vue');
const roundButton = require('./roundButton.vue');

const menuOptions = Vue.component('menuOptions', {
	props: {
		languages: {
			type: Array
		},
		currentLanguage: {
			type: String
		}
	},
	data: function(){return{
		type: 'menuOptions',
		popups: {
			options: {
				visible: false
			}
		}
	}},
	template: `<div :class="['button', type]">
		<round-button :image="'../img/options.svg'" @click="showOptions"></round-button>
		<dark-filter :visible="popups.options.visible"></dark-filter>
		<popup-options @close="onClose" :languages="languages" :visible="popups.options.visible"></popup-options>
	</div>`,
	methods: {
		showOptions: function(){
			this.popups.options.visible = true;
		},
		hideOptions: function(){
			this.popups.options.visible = false;
		},
		onClose: function(){
			// Prevent the show button click to be registered
			event.stopPropagation();
			// Hide the options menu
			this.hideOptions();
		}
	},
	components: {
		popupOptions: popupOptions,
		darkFilter: darkFilter,
		roundButton: roundButton
	}
});

module.exports = menuOptions;