// État du compte (sérialisable) et utilitaires communs. Aucun accès au DOM.
import { RNG } from "../combat/engine.js";
import { SPECIES } from "../data/data.js";
import { CONFIG } from "./config.js";
import SETS_JSON from "./sets.js";

export const SETS = SETS_JSON;
export const SET = Object.fromEntries(SETS.map((s) => [s.id, s]));
export const DIFFS = CONFIG.difficulties;
export const orderOf = (setId) => SET[setId].order || CONFIG.expedition.order;
export const speciesOf = (S) => [S.legend, ...S.nice, ...S.weak];

// Set et rôle d'une espèce (weak | nice | legend), ou null hors sets.
const ROLE = {};
for (const s of SETS) {
  ROLE[s.legend] = { set: s.id, role: "legend" };
  for (const k of s.nice) ROLE[k] = { set: s.id, role: "nice" };
  for (const k of s.weak) ROLE[k] = { set: s.id, role: "weak" };
}
export const roleOf = (k) => ROLE[k] || null;

// Erreurs de contenu (sets, difficultés, objets) : liste de messages, vide si tout va bien.
export function contentErrors() {
  const err = [], seen = {}, ids = new Set();
  for (const S of SETS) {
    const tag = `Set « ${S.id} »`;
    if (!S.id || ids.has(S.id)) err.push(`${tag} : id manquant ou en double.`);
    ids.add(S.id);
    if (!S.name) err.push(`${tag} : nom manquant.`);
    if (!S.legend || !Array.isArray(S.nice) || !Array.isArray(S.weak)) { err.push(`${tag} : legend, nice et weak sont obligatoires.`); continue; }
    const order = S.order || CONFIG.expedition.order;
    const need = (r) => order.filter((x) => x === r).length;
    if (!order.length || order.some((r) => !["weak", "nice", "legend"].includes(r))) err.push(`${tag} : order ne doit contenir que "weak", "nice" ou "legend".`);
    if (S.weak.length < need("weak")) err.push(`${tag} : ${need("weak")} combats faibles mais seulement ${S.weak.length} faibles.`);
    if (need("nice") && !S.nice.length) err.push(`${tag} : il faut au moins un Pokémon « nice ».`);
    for (const k of speciesOf(S)) {
      if (!SPECIES[k]) err.push(`${tag} : espèce inconnue ${k} (à ajouter dans src/data/data.js).`);
      if (seen[k]) err.push(`${k} est dans deux sets (${seen[k]} et ${S.id}).`);
      seen[k] = S.id;
    }
  }
  if (!DIFFS.length) err.push("Aucune difficulté dans CONFIG.difficulties.");
  DIFFS.forEach((d, i) => { if (!(d.level > 0) || !(d.voeux >= 0) || !(d.buffScale > 0)) err.push(`Difficulté ${i + 1} : level, voeux et buffScale sont obligatoires.`); });
  for (const [k, n] of Object.entries(CONFIG.items.start)) if (!CONFIG.items.list[k] || !(n >= 0)) err.push(`Objet de départ inconnu ou quantité invalide : ${k}.`);
  for (const k of CONFIG.start.starters) if (!SPECIES[k]) err.push(`Pokémon de départ inconnu : ${k}.`);
  return err;
}

// Complète une sauvegarde après un ajout de set ou de difficulté (compteurs à zéro).
export function normalize(s) {
  for (const S of SETS) { s.frags[S.id] ??= 0; s.pity[S.id] ??= 0; }
  for (let d = 1; d <= Math.max(DIFFS.length, 5); d++) { s.mats[d] ??= 0; s.firstClear[d] ??= false; }
  if (s.run && (!SET[s.run.set] || !DIFFS[s.run.diff - 1])) s.run = null;   // set ou difficulté retirés : run abandonné
  return s;
}

export function newSave(seed = 1) {
  const C = CONFIG;
  const s = normalize({
    v: C.save.version,
    rng: seed >>> 0,
    voeux: C.start.voeux,
    mats: {},
    frags: {},
    shards: 0,
    pity: {},
    firstClear: {},
    coll: {},
    run: null,
    log: [],
  });
  for (const k of C.start.starters) addCopy(s, k, false, C.start.level);
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
