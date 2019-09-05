const customSwitch = Vue.component('customSwitch', {
	props: {
		texts: {
			type: Array,
			default: function(){ return ['', ''] }
		},
		defaultValue: {
			type: Boolean,
			default: false
		}
	},
	data: function(){return{
		value: this.defaultValue, // If true, set to normal order. If false, set to inverted order
		type: 'customSwitch'
	}},
	template: `<div :class="type">
		<span>{{texts[0]}}</span>
		<div v-bind:class="['indicator', value?'right':'']" v-on:click="invertOrder"></div>
		<span>{{texts[1]}}</span>
	</div>`,
	methods: {
		invertOrder: function(){
			this.value = !this.value;
		}
	}
});

export default customSwitch;