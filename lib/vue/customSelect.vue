import customSelectOption from 'load:lib/vue/customSelectOption.vue';
import customSelectTitle from 'load:lib/vue/customSelectTitle.vue';

const customSelect = Vue.component('customSelect', {
	props: {
		options: { type: Array },
		name: { type: String },
		title: { type: String },
		singleValue: { type: Boolean, default: true}
	},
	template: `<div :class="type">
		<custom-select-title v-if="title" :name="name"></custom-select-title>
		<custom-select-option v-for="option in options" v-bind="option" @changeValue="valueChanged"></custom-select-option>
	</div>`,
	data: function(){return{
		type: 'customSelect',
	}}, 
	methods: {
		getValue: function(){
			let selected = this.getSelected();
			return selected ? selected.getValue() : null;
		},
		getSelected: function(){
			let ticked = this.$children.filter(x=>x.selected);
			if (this.singleValue){
				// Return the first one to be ticked or Null if nothing is ticked
				return (ticked.length === 0) ? null : ticked[0];
			} else {
				// Return all of the ticked elements
				return ticked;
			}
		},
		valueChanged: function(){
			// Bubble up the changeValue event
			this.$emit('changeValue');
		},
		select: function(val){
			this.$children.find(x=>x.getValue()===val).select(false);
		}
	},
	components: {
		customSelectOption: customSelectOption,
		customSelectTitle: customSelectTitle
	}
});

export default customSelect;