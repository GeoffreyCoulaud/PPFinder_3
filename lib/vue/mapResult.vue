const mapResult = Vue.component('mapResult', {
	props: {
		linkMode     : {type: String, default: 'http'},
		beatmapID    : {type: Number},
		beatmapSetID : {type: Number},
		ar           : {type: Number},
		cs           : {type: Number},
		od           : {type: Number},
		hp           : {type: Number},
		stars        : {type: Number},
		durationHuman: {type: String},
		author       : {type: String},
		version      : {type: String},
		artist       : {type: String},
		artistUnicode: {type: String},
		title        : {type: String},
		titleUnicode : {type: String},
		mods         : {type: Array},
		pp           : {type: Array}
	},
	data: function(){return{
		type: 'mapResult'
	}},
	template : 
	`<a 
		:href="
			(linkMode === 'osu') ? 
			('osu://b/'+beatmapID) : 
			('https://osu.ppy.sh/beatmapsets/' + beatmapSetID + '#osu/' + beatmapID)" 
		:class="[type]" 
		target="_blank"
	>
		<!-- Background -->
		<div class="background">
			<img alt="background image" :src="'https://assets.ppy.sh/beatmaps/' + beatmapSetID + '/covers/cover.jpg'">
			<div class="overlay"></div>
		</div>

		<!-- Content    -->
		<div class="content">
			<div class="resultTitle">
				<div class="mapTitle">
					<span class="artist">  {{artist}} </span>
					-
					<span class="title"> {{title}} </span>
				</div>

				<div class="version">
					<span class="versionName"> {{version}} </span>
					<span class="mods"> 
						<img v-for="mod in mods" :src="'../img/mod-' + mod.toLowerCase() + '.svg'" :alt="lang[mod+'-desc']" :title="lang[mod+'-desc']" draggable="false" />
					</span>
				</div>
			</div>

			<div class="metadata">
				<span>
					<img src="../img/star.svg" alt="duration" />
					{{stars.toFixed(2)}}
				</span>
				<span>
					<img src="../img/time.svg" alt="duration" />
					{{durationHuman}}
				</span>
				<span>{{lang['results-ar']}} {{ar.toFixed(2)}} </span>
				<span>{{lang['results-cs']}} {{cs.toFixed(2)}} </span>
				<span>{{lang['results-od']}} {{od.toFixed(2)}} </span>
				<span>{{lang['results-hp']}} {{hp.toFixed(2)}} </span>
			</div>

			<div class="pp">
				<span v-for="(mapValue, index) of pp" class="ppItem"> 
					{{mapValue[0] + "% " + mapValue[1] + "pp"}} 
				</span>
			</div>
		</div>
		
	</a>`
});

module.exports = mapResult;