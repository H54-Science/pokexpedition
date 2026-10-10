// Progression : élévation (fragments + matériau de palier), étoiles, éclats chroma.
// Pas d'entraînement : un Pokémon est toujours au plafond de niveau de son élévation (20/40/60/80/100).
import { CONFIG } from "./config.js";
import { roleOf, owns, addCopy, levelCap, formOf, log } from "./state.js";

const entry = (save, k) => { const e = save.coll[k]; if (!e) throw new Error("Pokémon non possédé."); return e; };

export function elevationCost(save, k) {
  const e = entry(save, k), n = e.elev + 1;
  if (n > CONFIG.elevation.fragments.length) return null;
  const r = roleOf(k);
  return { n, set: r && r.set, frags: CONFIG.elevation.fragments[n - 1], mat: n, mats: CONFIG.elevation.mats[n - 1] };
}

// Élévation N : il faut être au plafond actuel, payer fragments du set + matériau de palier N.
export function elevate(save, k) {
  const e = entry(save, k), c = elevationCost(save, k);
  if (!c) throw new Error("Élévation maximale.");
  if (!c.set) throw new Error("Espèce hors set : pas de fragments.");
  if (save.frags[c.set] < c.frags) throw new Error(`Il faut ${c.frags} fragments du set.`);
  if (save.mats[c.mat] < c.mats) throw new Error(`Il faut ${c.mats} matériaux de palier ${c.mat}.`);
  const before = formOf(k, e.elev);
  save.frags[c.set] -= c.frags; save.mats[c.mat] -= c.mats; e.elev = c.n; e.L = levelCap(e.elev);
  const after = formOf(k, e.elev);
  log(save, `${k} : élévation ${e.elev}${after !== before ? `, évolue en ${after}` : ""}`);
  return { elev: e.elev, evolved: after !== before ? after : null };
}

export function buyStar(save, k) {
  const e = entry(save, k), S = CONFIG.stars, r = roleOf(k);
  if (e.stars >= S.max) throw new Error("Étoiles au maximum.");
  if (!r) throw new Error("Espèce hors set.");
  const cost = S.cost[e.stars];
  if (save.frags[r.set] < cost) throw new Error(`Il faut ${cost} fragments du set.`);
  save.frags[r.set] -= cost; e.stars++;
  return { stars: e.stars };
}

// Éclats chroma → version chromatique d'une espèce possédée en normal.
export function redeemShards(save, k) {
  if (!owns(save, k, false)) throw new Error("Il faut posséder l'espèce en normal.");
  if (owns(save, k, true)) throw new Error("Chromatique déjà possédé.");
  const r = roleOf(k), cost = r && r.role === "legend" ? CONFIG.shards.costLegend : CONFIG.shards.cost;
  if (save.shards < cost) throw new Error(`Il faut ${cost} éclats.`);
  save.shards -= cost; addCopy(save, k, true);
  return { cost };
}
