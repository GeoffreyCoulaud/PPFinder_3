import popupOptions from 'load:lib/vue/popupOptions.vue';
import darkFilter from 'load:lib/vue/darkFilter.vue';

const buttonOptions = Vue.component('buttonOptions', {
	data: function(){return{
		type: 'buttonOptions',
		popups: {
			options: {
				visible: false
			}
		}
	}},
	template: `<div :class="['button', type, popups.options.visible?'noClick':'']" @click="showOptions">
		<img draggable="false" src="../img/options.svg" />
		<dark-filter :visible="popups.options.visible"></dark-filter>
		<popup-options @close="onClose" :visible="popups.options.visible"></popup-options>
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
		darkFilter: darkFilter
	}
});

export default buttonOptions;