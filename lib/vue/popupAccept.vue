const popupAccept = Vue.component('popupAccept', {
	props: {
		visible: {
			type: Boolean,
			default: true
		}
	},
	data: function(){return{
		type: 'popupAccept',
		role: 'popup'
	}},
	template: `<div :class="['popup', type, visible ? 'visible' : '']">
		<p><pre>{{lang['refresh-maps-desc']}}</pre></p>
		<div class="optionsContainer">
			<div class="refuse option" @click="$emit('refused')">{{lang['refresh-maps-refuse']}}</div>
			<div class="accept option" @click="$emit('accepted')">{{lang['refresh-maps-accept']}}</div>
		</div>
	</div>`
});

module.exports = popupAccept;