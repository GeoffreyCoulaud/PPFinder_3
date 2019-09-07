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
            'scan-maps-state-processing'
        ],
        state: 0,
        progression: 0
	}},
	template: `<div :class="['popup', type, visible?'visible':'']">
        <h3>{{lang[states[state]]}}</h3>
        <div class="loading">
            <div v-bind:style="{width: progression*100+'%'}">
                {{progression*100 + '%'}}
            </div>
        </div>
	</div>`
});

export default popupScan;