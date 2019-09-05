const modReset = Vue.component('modReset', {
	data: function(){return{
		type: 'modReset'
	}},
	template: 
		`<div :class="['mod', type]" v-on:click="reset">
			<img draggable="false" src="../img/mod-reset.svg" :alt="lang['mod-reset-desc']" :title="lang['mod-desc-reset']" />
		</div>`,
	methods: {
		reset: function(){
			// Select all the mods and set them to noCare
			this.$parent.$children.filter(x=>x.type==="modOption").forEach((x)=>{x.changeState(0)});
		}
	}
});

export default modReset;