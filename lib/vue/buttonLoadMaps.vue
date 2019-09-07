import popupAccept from 'import:lib/vue/popupAccept.vue';
import popupScan from 'import:lib/vue/popupScan.vue';


const buttonLoadMaps = Vue.component('buttonLoadMaps', {
	data: function(){return{
		type: 'buttonLoadMaps',
		canBeClicked: true,
		popups: {
			permission: {
				visible: false
			},
			info: {
				visible: false
			}
		}
	}},
	template: `<div :class="'button '+type" v-on:click="showPermissionPopup">
		<img draggable="false" src="../img/playOsu.svg" />
		<popup-accept :visible="popups.permission.visible" v-on:accepted="onAccepted" v-on:refused="onRefused"></popup-accept>
		<popup-scan :visible="popups.info.visible"></popup-scan>
	</div>`,
	methods: {
		showPermissionPopup: function(){this.popups.permission.visible = true;},
		hidepermissionPopup: function(){this.popups.permission.visible = false;},
		onAccepted: function(){
			// Prevent the show button click to be triggered
			event.stopPropagation();
			// Hide the permission popup
			this.hidePopup();
			// Show the scan popup
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
		popupAccept: popupAccept,
		popupScan: popupScan
	}
});

export default buttonLoadMaps;