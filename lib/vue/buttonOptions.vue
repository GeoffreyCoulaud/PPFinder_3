import optionsMenu from 'import:lib/vue/optionsMenu.vue';

const buttonOptions = Vue.component('buttonOptions', {
	data: function(){return{
		type: 'buttonOptions',
		canBeClicked: true
	}},
	template: `<div :class="'button '+type" v-on:click="showOptions">
		<img draggable="false" src="../img/options.svg" />
		<options-menu v-on:close="onClose"></options-menu>
	</div>`,
	methods: {
		showOptions: function(){
			this.$children.filter(x=>x.type==="optionsMenu")[0].show();
		},
		hideOptions: function(){
			this.$children.filter(x=>x.type==="optionsMenu")[0].hide();
		},
		onClose: function(){
			// Prevent the show button click to be registered
			event.stopPropagation();
			// Hide the options menu
			this.hideOptions();
		}
	},
	components: {
		optionsMenu: optionsMenu
	}
});

export default buttonOptions;