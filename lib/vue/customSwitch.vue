const customSwitch = Vue.component('customSwitch', {
	props: {
		texts: {
			type: Array,
			default: function(){ return ['', ''] }
		},
		defaultValue: {
			type: Boolean,
			default: false
		},
		name: {
			type: String
		}
	},
	data: function(){return{
		value: this.defaultValue, // If true, set to normal order. If false, set to inverted order
		type: 'customSwitch'
	}},
	template: `<div :class="type">
		<span>{{texts[0]}}</span>
		<div v-bind:class="['indicator', value?'right':'']" @click="invertOrder"></div>
		<span>{{texts[1]}}</span>
	</div>`,
	methods: {
		getValue: function(){
			return this.value;
		},
		invertOrder: function(){
			this.value = !this.value;
			this.$emit('changeValue');
		}
	}
});

module.exports = customSwitch;