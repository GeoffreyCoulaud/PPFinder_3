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
	template: `<div v-bind:class="[type, selected?'selected':'']" @click="select">
		<span class="name">{{lang[name]}}</span>
	</div>`,
	data: function(){return{
		type: 'customSelectOption',
		selected: this.defaultSelected
	}},
	methods: {
		getValue: function(){
			return this.value;
		},
		select: function(emit = true){
			// If parent is 'one value at a time' 
			// and new value is 'ticked', untick ticked values
			const parent = this.$parent;
			if (parent.singleValue){
				parent.$children.filter(x=>x.type==='customSelectOption').forEach((x)=>{x.selected=false});
			}
			// Set state to selected
			this.selected = true;
			// Emit 'change' event from the select
			if (emit){
				this.$parent.$emit('changeValue', this.value);
			}
		},
	}
});

export default customSelectOption;