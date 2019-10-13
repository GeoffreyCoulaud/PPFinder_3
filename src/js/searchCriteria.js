class MinMax {
	constructor(min = 0, max = 0){
		this.min = min;
		this.max = max;
	}
}
class ModsCriteria {
	constructor(wanted = [], notWanted = []){
		this.wanted = wanted;
		this.notWanted = notWanted;
	}
}
class SortCriteria {
	constructor(id = 0, desc = false){
		this.id = id;
		this.desc = desc;
	}
}
class SearchCriteria {
	constructor (
		ppMin, ppMax,
		starMin, starMax,
		arMin, arMax,
		csMin, csMax,
		odMin, odMax,
		hpMin, hpMax,
		durMin, durMax,
		cbMin, cbMax,
		sortID, sortType,
		modW, modNW
	){
		this.pp = new MinMax(ppMin, ppMax);
		this.stars = new MinMax(starMin, starMax);
		this.ar = new MinMax(arMin, arMax);
		this.cs = new MinMax(csMin, csMax);
		this.od = new MinMax(odMin, odMax);
		this.hp = new MinMax(hpMin, hpMax);
		this.duration = new MinMax(durMin, durMax);
		this.maxCombo = new MinMax(cbMin, cbMax);
		this.mods = new ModsCriteria(modW, modNW);
		this.sort = new SortCriteria(sortID, sortType);
	}
}

module.exports = {
    'MinMax': MinMax,
    'ModsCriteria': ModsCriteria,
    'SortCriteria': SortCriteria,
    'SearchCriteria': SearchCriteria
};