const roundButton = Vue.component('roundButton', {
    props: {
        image: {
            type: String
        }
    },
    data: function(){return{
        type: 'roundButton'
    }},
    template: `<div :class="[type]" @click="$emit('click')">
        <img :src="image" draggable="false" />
    </div>`
});

module.exports = roundButton;