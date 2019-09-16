import popupAccept from 'load:lib/vue/popupAccept.vue';
import popupScan from 'load:lib/vue/popupScan.vue';
import darkFilter from 'load:lib/vue/darkFilter.vue';

const buttonLoadMaps = Vue.component('buttonLoadMaps', {
	data: function(){return{
		type: 'buttonLoadMaps',
		popups: {
			permission: {
				visible: false
			},
			info: {
				visible: false
			}
		}
	}},
	template: `<div :class="['button', type, (popups.permission.visible || popups.info.visible)?'noClick':'']" @click="showPermissionPopup">
		<img draggable="false" src="../img/playOsu.svg" />
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
		darkFilter: darkFilter
	}
});

export default buttonLoadMaps;