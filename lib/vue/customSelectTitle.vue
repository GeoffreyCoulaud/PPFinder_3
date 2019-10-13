const customSelectTitle = Vue.component('customSelectTitle', {
	props: {
		name: {
			type: String,
			default: ''
		}
	},
	data: function(){return{
		type: "customSelectTitle"
	}},
	template: `<h3 :class="type">{{lang[name]}}</h3>`
});

module.exports = customSelectTitle;