import loadingBar from 'import:lib/vue/loadingBar.vue';

const popupScan = Vue.component('popupScan', {
	props: {
		visible: {
			type: Boolean,
			default: true
		}
	},
	data: function(){return{
        type: 'popupScan',
        states: [
            'scan-maps-state-listing',
            'scan-maps-state-processing',
            'scan-maps-state-add-to-database',
            'scan-maps-state-error'
        ],
        state: 0,
        progression: 0,
        max: 0
	}},
	template: `<div :class="['popup', type, visible?'visible':'']">
        <h3>{{lang[states[state]]}}</h3>
        <loading-bar :progression="progression" :max="max"></loading-bar>
	</div>`,
    components : {
        loadingBar : loadingBar
    },
});

export default popupScan;