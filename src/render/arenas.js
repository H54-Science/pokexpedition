// Pure scene profiles: shared by set selection, combat rendering and validation.
const base = { model:'sakura-sanctuary', zenith:'#66739e', horizon:'#d7b2ab', fog:'#b7a8bd', ambient:'#e5e7ff', ground:'#665451', sun:'#ffe0b5', rim:'#ffc1ac', particles:'#f2b8cd' };
export const ARENAS = {
  sakura:{name:'Sanctuaire japonais',...base},
  underwater:{...base,name:'Sanctuaire sous-marin',model:'underwater-sanctuary',zenith:'#073952',horizon:'#148caa',fog:'#136a80',ambient:'#b9f7ff',ground:'#073847',sun:'#a6e9ff',rim:'#40dbc8',particles:'#8ef9f6',rising:true,near:28,far:90},
  volcano:{...base,name:'Arène volcanique',model:'volcanic-arena',zenith:'#251526',horizon:'#843429',fog:'#592c34',ambient:'#ffc39d',ground:'#302030',sun:'#ffbc87',rim:'#ff4b22',particles:'#ff9b2d',rising:true},
  graveyard:{...base,name:'Cimetière d’automne',model:'autumn-graveyard',zenith:'#302d57',horizon:'#947278',fog:'#71636e',ambient:'#e1d0ed',ground:'#433244',sun:'#ffd3a6',rim:'#a770ee',particles:'#dd893b',near:30,far:100},
  forest:{...base,name:'Forêt luxuriante',model:'lush-forest-arena',zenith:'#277278',horizon:'#bbd59e',fog:'#85b7a1',ambient:'#e3ffd5',ground:'#254e43',sun:'#fff3b2',rim:'#77d3ad',particles:'#b8ec79',near:32,far:108},
  enchanted:{...base,name:'Forêt féerique',model:'lush-forest-arena',zenith:'#453776',horizon:'#ac85c3',fog:'#8e81af',ambient:'#e8d8ff',ground:'#313252',sun:'#ffd6ec',rim:'#b6a1ff',particles:'#ff9bea',rising:true},
  snow:{...base,name:'Palais des cimes enneigées',model:'snow-palace',zenith:'#427eaa',horizon:'#c2dff1',fog:'#b4cddd',ambient:'#e4f5ff',ground:'#6480a0',sun:'#fff3de',rim:'#94ceff',particles:'#ffffff'},
  psychic:{...base,name:'Palais de l’esprit',model:'snow-palace',zenith:'#494d8b',horizon:'#b9a8e5',fog:'#a2a4cd',ambient:'#ebdeff',ground:'#4e4b7d',sun:'#ead7ff',rim:'#a271ff',particles:'#ddbaff'},
  storm:{...base,name:'Sanctuaire de l’orage',zenith:'#25264c',horizon:'#5d6295',fog:'#555f88',ambient:'#cfdfff',ground:'#313046',sun:'#c1ddff',rim:'#8babff',particles:'#ffe857',rising:true},
};
export function arenaProfile(id='sakura') { return { id:ARENAS[id] ? id : 'sakura', ...(ARENAS[id] || ARENAS.sakura) }; }
