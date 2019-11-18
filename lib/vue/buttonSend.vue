const buttonSend = Vue.component('buttonSend', {
    data: function(){return{
        type: 'buttonSend',
        role: 'button'
    }},
    template: `<div :class="['button', type]" @click="search">
        <span>{{lang['search-button']}}</span>
        <img src="../img/search.svg" />
    </div>`,
    methods: {
        search: function(){
            this.$root.$emit('search');
        }
    }
});

module.exports = buttonSend;