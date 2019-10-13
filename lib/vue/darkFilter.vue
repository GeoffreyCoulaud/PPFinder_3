const darkFilter = Vue.component('darkFilter', {
    props: {
        visible: {
            type: Boolean,
            default: false
        }
    },
    data: function(){return{
        type: 'darkFilter'
    }},
    template: `<div :class="[type, visible?'visible':'']"></div>`
})

module.exports = darkFilter;