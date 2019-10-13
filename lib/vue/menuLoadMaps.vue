const popupAccept = require('./popupAccept.vue');
const popupScan = require('./popupScan.vue');
const darkFilter = require('./darkFilter.vue');
const roundButton = require('./roundButton.vue');

const menuLoadMaps = Vue.component('menuLoadMaps', {
	data: function(){return{
		type: 'menuLoadMaps',
		popups: {
			permission: {
				visible: false
			},
			info: {
				visible: false
			}
		}
	}},
	template: `<div :class="['button', type]">
		<round-button :image="'../img/playOsu.svg'" @click="showPermissionPopup"></round-button>
		<dark-filter :visible="popups.permission.visible || popups.info.visible"></dark-filter>
		<popup-accept :visible="popups.permission.visible" @accepted="onAccepted" @refused="onRefused"></popup-accept>
		<popup-scan :visible="popups.info.visible"></popup-scan>
	</div>`,
	methods: {
		showPermissionPopup: function(){
			this.popups.permission.visible = true;
		},
		hidePermissionPopup: function(){
			this.popups.permission.visible = false;
		},
		onAccepted: function(){
			// Prevent the show button click to be triggered
			event.stopPropagation();
			// Hide the permission popup
			this.hidePermissionPopup();
			// Bubble up the event to the vue
			this.$root.$emit('scanBeatmaps');
		}, 
		onRefused: function(){
			// Prevent the show button click to be triggered
			event.stopPropagation();
			// Hide the popup
			this.hidePermissionPopup();
		}
	},
	components: {
		popupAccept: popupAccept,
		popupScan: popupScan,
		darkFilter: darkFilter,
		roundButton: roundButton
	}
});

module.exports = menuLoadMaps;