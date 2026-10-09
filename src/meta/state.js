// État du compte (sérialisable) et utilitaires communs. Aucun accès au DOM.
import { RNG } from "../combat/engine.js";
import { CONFIG } from "./config.js";
import SETS_JSON from "./sets.json" with { type: "json" };

export const SETS = SETS_JSON;
export const SET = Object.fromEntries(SETS.map((s) => [s.id, s]));

// Set et rôle d'une espèce (weak | nice | legend), ou null hors sets.
const ROLE = {};
for (const s of SETS) {
  ROLE[s.legend] = { set: s.id, role: "legend" };
  for (const k of s.nice) ROLE[k] = { set: s.id, role: "nice" };
  for (const k of s.weak) ROLE[k] = { set: s.id, role: "weak" };
}
export const roleOf = (k) => ROLE[k] || null;

export function newSave(seed = 1) {
  const C = CONFIG;
  const s = {
    v: C.save.version,
    rng: seed >>> 0,
    voeux: C.start.voeux,
    mats: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    frags: Object.fromEntries(SETS.map((x) => [x.id, 0])),
    shards: 0,
    pity: Object.fromEntries(SETS.map((x) => [x.id, 0])),
    firstClear: { 1: false, 2: false, 3: false, 4: false, 5: false },
    coll: {},
    team: [],
    run: null,
    log: [],
  };
  for (const k of C.start.starters) addCopy(s, k, false, C.start.level);
  s.team = C.start.starters.slice(0, C.team.size);
  return s;
}

// RNG du compte : on reprend l'état stocké, on le réécrit après usage.
export function withRng(save, fn) {
  const r = RNG(0); r.set(save.rng);
  try { return fn(r); } finally { save.rng = r.state(); }
}
export const seedFrom = (r) => Math.floor(r() * 2 ** 31);

// ───────── collection ─────────
export const owns = (save, k, shiny = false) => !!(save.coll[k] && save.coll[k][shiny ? "shiny" : "normal"]);
export const isNewFor = (save, k, shiny) => !owns(save, k, shiny);

export function addCopy(save, k, shiny, level = 1) {
  if (owns(save, k, shiny)) throw new Error(`Déjà possédé : ${k}${shiny ? " chromatique" : ""}`);
  const e = save.coll[k] || (save.coll[k] = { normal: false, shiny: false, L: level, xp: 0, elev: 0, stars: 0 });
  e[shiny ? "shiny" : "normal"] = true;
  return e;
}

// Forme jouée (évolution selon l'élévation).
export function formOf(k, elev) {
  const chain = CONFIG.evolutions[k];
  if (!chain) return k;
  const steps = CONFIG.evolveAt.filter((e) => elev >= e).length;
  return steps === 0 ? k : chain[Math.min(chain.length, steps) - 1];
}

export const levelCap = (elev) => (elev >= CONFIG.levelCaps.length ? 100 : CONFIG.levelCaps[elev]);

export function log(save, msg) { save.log.push(msg); if (save.log.length > 60) save.log.shift(); }
