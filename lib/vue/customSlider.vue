const customSlider = Vue.component('customSlider', {
	props: {
		range: { 
			type: Object,
			default: {min: 0, max: 0}
		},
		step: { 
			type: Number, 
			default: 1 
		},
		name: { 
			type: String
		}
	},
	data: function(){return{
		type: "customSlider",
		value: [this.range.min, this.range.max]
	}},
	template: `<div :class="type" :name="name">
		<h3>{{lang[name]}}</h3>
		<div class="valuesDisplay">
			<input class="min" v-model="value[0]" :min="range.min" :max="range.max" :step="step" type="number"/>
			<input class="max" v-model="value[1]" :min="range.min" :max="range.max" :step="step" type="number"/>
		</div>
		<div class="slider"></div>
	</div>`,
	methods: {
		slider: function(){
			// get the slider element
			return this.$el.querySelector('.slider');
		},
		getValue: function(){
			let val = this.slider().noUiSlider.get().map(x=>Number(x));
			// get always returns an array
			if (Array.isArray(val)){
				return val;
			} else {
				return [val];
			}
		},
		set: function(vals){
			// use the noUiSlider api to set
			this.slider().noUiSlider.set(vals);
			// update the value
			this.update();
		},
		update: function(e){
			// get the updated values
			this.value = this.getValue();
			// emit the changeValue event
			this.$emit('changeValue');
		}
	},
	mounted: function(){
		// Update the range to use the step option on all sub-ranges
		for (let [key, val] of Object.entries(this.range)){
			this.range[key] = [val, this.step];
		}

		// create the noUiSlider on mounting of element
		noUiSlider.create(this.slider(), {
			range: this.range,
			start: this.value,
			step: this.step,
			connect: true,
		});
		this.slider().noUiSlider.on('update', this.update);
		
		// Explicitly set the value attribute when value changes
		// this is important, else Vuejs does not bind the value in the
		// boxes to the sliders.
		let thisComponent = this;
		this.$el.getElementsByClassName('min')[0].addEventListener('input', function(event){
			const val = event.currentTarget.value;
			thisComponent.set([val, null]);
		});
		this.$el.getElementsByClassName('max')[0].addEventListener('input', function(event){
			const val = event.currentTarget.value;
			thisComponent.set([null, val]);
		});
	}
});

export default customSlider;