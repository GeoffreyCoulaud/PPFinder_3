const loadingBar = Vue.component('loadingBar', {
    props: {
        progression : {
            type: Number,
            default: 0
        },
        max : {
            type: [Number, Object],
            default: 0
        }
    },
    data: function(){return{
        type: "loadingBar"
    }},
    template : `<div :class="[type]">
        <div :style="{width: (!max)?('100%'):(progression/max*100+'%')}">
            <span v-if="max===null">{{progression}}</span>
            <span v-if="max!==null">{{progression + '/' + max}}</span>
        </div>
    </div>`
});

export default loadingBar;