const customSelectOption = Vue.component('customSelectOption', {
	props: {
		name: {
			type: String
		},
		value: {
			type: [String, Number] // string or positive integer
		},
		defaultSelected: {
			type: Boolean,
			default: false
		}
	},
	template: `<div v-bind:class="[type, selected?'selected':'']" v-on:click="toggle">
		<span class="name">{{lang[name]}}</span>
	</div>`,
	data: function(){return{
		type: 'customSelectOption',
		selected: this.defaultSelected
	}},
	methods: {
		toggle: function(){
			// Toggle state
			const newState = !this.selected;
			// If parent is 'one value at a time' 
			// and new value is 'ticked', untick ticked values
			const parent = this.$parent;
			if (parent.singleValue && newState){
				parent.$children.filter(x=>x.type==='customSelectOption').forEach((x)=>{x.selected=false});
			}
			// Apply toggled state
			this.selected = newState;
			// Emit 'change' event
			this.$emit('changeValue')
		},
	}
});

export default customSelectOption;