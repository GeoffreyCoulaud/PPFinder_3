import popupAccept from 'import:lib/vue/popupAccept.vue';

const buttonLoadMaps = Vue.component('buttonLoadMaps', {
	data: function(){return{
		type: 'buttonLoadMaps',
		canBeClicked: true,
		popup: {
			visible: false
		}
	}},
	template: `<div :class="'button '+type" v-on:click="showPopup">
		<img draggable="false" src="../img/playOsu.svg" />
		<popup-accept :visible="popup.visible" v-on:accepted="onAccepted" v-on:refused="onRefused"></popup-accept>
	</div>`,
	methods: {
		showPopup: function(){this.popup.visible = true;},
		hidePopup: function(){this.popup.visible = false;},
		onAccepted: function(){
			// Prevent the show button click to be triggered
			event.stopPropagation();
			// Hide the popup
			this.hidePopup();
			// Request a scan to electron
			scanBeatmaps();
		}, 
		onRefused: function(){
			// Prevent the show button click to be triggered
			event.stopPropagation();
			// Hide the popup
			this.hidePopup();
		}
	},
	components: {
		popupAccept: popupAccept
	}
});

export default buttonLoadMaps;