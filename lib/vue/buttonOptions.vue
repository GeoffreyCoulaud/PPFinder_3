import popupOptions from 'load:lib/vue/popupOptions.vue';

const buttonOptions = Vue.component('buttonOptions', {
	data: function(){return{
		type: 'buttonOptions',
		canBeClicked: true
	}},
	template: `<div :class="'button '+type" @click="showOptions">
		<img draggable="false" src="../img/options.svg" />
		<popup-options @close="onClose"></popup-options>
	</div>`,
	methods: {
		showOptions: function(){
			this.$children.filter(x=>x.type==="popupOptions")[0].show();
		},
		hideOptions: function(){
			this.$children.filter(x=>x.type==="popupOptions")[0].hide();
		},
		onClose: function(){
			// Prevent the show button click to be registered
			event.stopPropagation();
			// Hide the options menu
			this.hideOptions();
		}
	},
	components: {
		popupOptions: popupOptions
	}
});

export default buttonOptions;