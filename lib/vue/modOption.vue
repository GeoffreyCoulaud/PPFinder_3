const modOption = Vue.component('modOption', {
	props: ['name'],
	data: function(){return{
		activeClass: "noCare",
		activeState: 0,
		type: 'modOption'
	}},
	template: 
		`<div :class="['mod', type, activeClass]" :name="name" v-on:click="loopState">
			<img draggable="false" :src="'../img/'+name+'.svg'" :alt="lang[name+'-desc']" />
		</div>`,
	methods: {
		changeState: function(newState){
			const stateNames = ['noCare', 'wanted', 'notWanted'];
			this.activeState = newState;
			this.activeState %= 3;
			this.activeClass = stateNames[this.activeState];
		},
		loopState: function(){
			// Go to the next state
			this.changeState(this.activeState+1);
			
			// Forbid incompatible mods at the same time          
			const forbCombs = [['hr', 'ez'], ['dt', 'ht']];
			for (let c of forbCombs){
				if (c.includes(this.modId)){
					// Get the opposite mod's id
					const opposite = c.filter(x=>x!==this.modId)[0];
					// Get the component corresponding
					const oppositeElem =  this.$parent.$children.filter(x=>x.modId===opposite)[0];
					// If the opposite mod is 'wanted', put its state to 'noCare'
					if (oppositeElem.activeState === 1) {
						oppositeElem.changeState(0);
					}
				}
			}
		} 
	}
});

export default modOption;