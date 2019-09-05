import customSelectOption from 'import:lib/vue/customSelectOption.vue';
import customSelectTitle from 'import:lib/vue/customSelectTitle.vue';

const customSelect = Vue.component('customSelect', {
	props: {
		options: { 
			type: Array
		},
		name: {
			type: String,
			default: ''
		},
		singleValue: {
			type: Boolean,
			default: true
		}
	},
	template: `<div :class="type">
		<custom-select-title v-if="name" :name="name"></custom-select-title>
		<custom-select-option v-for="option in options" v-bind="option"></custom-select-option>
	</div>`,
	data: function(){return{
		type: 'customSelect',
	}}, 
	methods: {
		getSelected: function(){
			let ticked = this.$children.filter(x=>x.state)
			if (this.singleValue){
				// Return the first one to be ticked or Null if nothing is ticked
				return (ticked.length === 0) ? null : ticked[0];
			} else {
				// Return all of the ticked elements
				return ticked;
			}
		}
	},
	components: {
		customSelectOption: customSelectOption,
		customSelectTitle: customSelectTitle
	}
});

export default customSelect;