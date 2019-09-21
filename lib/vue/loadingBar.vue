const loadingBar = Vue.component('loadingBar', {
    props: {
        progression : {
            type: Number,
            default: 0
        },
        failed : {
            type: Number,
            default: 0
        },
        max : {
            type: [Number, Object],
            default: null
        }
    },
    data: function(){return{
        type: "loadingBar"
    }},
    template : `<div :class="[type]">
        <div class="texts">
            <span v-if="max===null">
                {{progression + failed}}
            </span>
            <span v-if="max!==null">
                {{(progression+failed)+'/'+max}}
            </span>
        </div>
        <div class="progression" :style="{width: (max === null)?('0%'):(progression/max*100+'%')}"></div>
        <div class="failed" :style="{width: (max === null)?('0%'):(failed/max*100+'%')}"></div>
    </div>`
});

export default loadingBar;