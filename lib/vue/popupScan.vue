import loadingBar from 'load:lib/vue/loadingBar.vue';

const popupScan = Vue.component('popupScan', {
	props: {
		visible: {
			type: Boolean,
			default: true
		}
	},
	data: function(){return{
        type: 'popupScan',
        progression: {
            discover: {progression: 0},
            read: {progression: 0, failed: 0, max: 0},
            compute: {progression: 0, failed: 0, max: 0},
            database: {progression: 0, failed: 0, max: 0}
        }
	}},
	template: `<div :class="['popup', type, visible?'visible':'']">
        <p>{{lang['scan-maps-state-listing']}}</p>
        <loading-bar :progression="progression.discover.progression"></loading-bar>
        
        <p>{{lang['scan-maps-state-reading']}}</p>
        <loading-bar
            :progression="progression.read.progression"
            :failed="progression.read.failed"
            :max="progression.read.max"
        ></loading-bar>

        <p>{{lang['scan-maps-state-computing']}}</p>
        <loading-bar 
            :progression="progression.compute.progression" 
            :failed="progression.compute.failed"
            :max="progression.compute.max"
        ></loading-bar>
        
        <p>{{lang['scan-maps-state-database']}}</p>
        <loading-bar 
            :progression="progression.database.progression" 
            :failed="progression.database.failed"
            :max="progression.database.max"
        ></loading-bar>
	</div>`,
    components : {	
        loadingBar : loadingBar
    },
});

export default popupScan;