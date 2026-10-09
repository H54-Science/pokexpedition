// Expédition façon « Théâtre » : logique pure, déterministe et sérialisable (pas de DOM).
//
// Déroulé : une troupe de 6 à 10 Pokémon, une suite d'actes. À chaque acte, des cartes d'incident :
//  · combats (normal, difficile ; acte clé = adversaire principal ; dernier acte = gardien de la zone),
//  · boutique : recrue d'un type (ajoute un Pokémon à la troupe), bénédiction (1 parmi 3), entracte (+1 vigueur).
// Un combat se joue à 3 Pokémon choisis dans la troupe ; chacun perd 1 vigueur (4 au départ).
// Les PV sont restaurés à chaque combat ; la difficulté monte d'acte en acte.
// Monnaie : les fleurs (gagnées en combat). Défaite : on peut retenter tant qu'il reste des « rappels ».
import { RNG } from "../combat/engine.js";
import { SPECIES, TYPES } from "../data/data.js";
import { ZONE } from "./../data/zones.js";
import { BOONS, BOON } from "../data/boons.js";

export const DIFF = {
  facile: { name: "Facile", acts: 6, lvl: -5, hp: 9, pow: 0.6, encores: 3 },
  normal: { name: "Normal", acts: 7, lvl: -3, hp: 10, pow: 0.66, encores: 2 },
  difficile: { name: "Difficile", acts: 8, lvl: -1, hp: 11, pow: 0.72, encores: 1 },
  infini: { name: "Infini", acts: Infinity, lvl: -3, hp: 10, pow: 0.66, encores: 2 },
};
export const TEAM_L = 20;          // niveau de l'équipe (pas encore de progression)
export const TROUPE_MIN = 6, TROUPE_MAX = 10;
export const VIGOR = 4;
const BOSS_LV = { 1: 8, 2: 6, 3: -3, 4: -4 };   // niveau du boss selon sa rareté (calibré en 1 contre 3)
const USABLE_BOONS = BOONS.filter((b) => !("xp" in b.mods) && !("lantern" in b.mods));
export const COST = { recruit: 80, boon: 60, rest: 50 };

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const shuffle = (r, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Actes clés (adversaires principaux) : vers 40 % et 70 % de l'expédition, puis le dernier (gardien).
export function keyActs(n) {
  if (!isFinite(n)) return [];
  return [...new Set([Math.max(3, Math.round(n * 0.4)), Math.round(n * 0.7), n])];
}

export function createRun({ zone, diff = "normal", troupe, seed }) {
  const z = ZONE[zone], D = DIFF[diff];
  if (!z) throw new Error("Zone inconnue");
  if (troupe.length < TROUPE_MIN || troupe.length > TROUPE_MAX) throw new Error(`La troupe doit compter ${TROUPE_MIN} à ${TROUPE_MAX} Pokémon.`);
  const r = RNG(seed ?? ((Math.random() * 2 ** 31) | 0));
  const state = {
    v: 1, zone, diff, seed: seed ?? 0, rng: 0, act: 1, nActs: D.acts, fleurs: 100, rerolls: 2, encores: D.encores,
    troupe: troupe.map((k) => ({ k, vig: VIGOR })), boons: [], cards: [], bought: [], pendingBoon: null,
    keys: {}, over: false, won: false, cleared: 0, log: [],
  };
  // adversaires principaux tirés à l'avance (affichés dès le début)
  const elites = shuffle(r, z.pool).sort((a, b) => SPECIES[b].tier - SPECIES[a].tier);
  const ka = keyActs(D.acts);
  ka.forEach((a, i) => { state.keys[a] = i === ka.length - 1 ? z.boss : elites[i % elites.length]; });
  state.rng = r.state();
  drawCards(state);
  return state;
}

function rngOf(state) { const r = RNG(0); r.set(state.rng); return r; }
function save(state, r) { state.rng = r.state(); }

export const isKeyAct = (state, act = state.act) => !!state.keys[act] || (!isFinite(state.nActs) && act % 3 === 0);
export const isFinal = (state, act = state.act) => isFinite(state.nActs) && act === state.nActs;

// Adversaire d'un combat : niveau selon rareté, difficulté et avancée dans l'expédition.
function foe(state, k, kind) {
  const D = DIFF[state.diff];
  const sp = SPECIES[k];
  const ramp = Math.floor((state.act - 1) * (isFinite(state.nActs) ? 0.6 : 0.9));
  const extra = kind === "hard" ? 2 : kind === "key" ? 2 : kind === "final" ? 3 : 0;
  const L = Math.max(2, TEAM_L + (BOSS_LV[sp.tier] || 0) + D.lvl + ramp + extra);
  const hp = D.hp + (state.act - 1) * 0.25 + (kind === "final" ? 2 : kind === "key" ? 1 : 0);
  return { k, L, hp: +hp.toFixed(2), pow: D.pow + (kind === "hard" ? 0.05 : 0) };
}

function combatCard(state, r, kind) {
  const z = ZONE[state.zone];
  let k;
  if (kind === "final" || kind === "key") k = state.keys[state.act] || pick(r, z.pool);
  else k = pick(r, z.pool);
  const base = { normal: 90, hard: 150, key: 200, final: 300 }[kind];
  const gold = state.boons.some((id) => BOON[id] && BOON[id].mods.gold) ? 1.5 : 1;
  return { kind: "combat", tier: kind, foe: foe(state, k, kind), reward: Math.round(base * gold) };
}

// Cartes de l'acte courant.
export function drawCards(state) {
  const r = rngOf(state);
  const z = ZONE[state.zone];
  const cards = [];
  if (isFinal(state)) cards.push(combatCard(state, r, "final"));
  else if (isKeyAct(state)) cards.push(combatCard(state, r, "key"));
  else { cards.push(combatCard(state, r, "normal")); cards.push(combatCard(state, r, "hard")); }
  const shop = shuffle(r, [
    { kind: "recruit", type: pick(r, z.fav), cost: COST.recruit },
    { kind: "recruit", type: pick(r, TYPES), cost: COST.recruit },
    { kind: "boon", cost: COST.boon },
    { kind: "rest", cost: COST.rest },
  ]).slice(0, 2);
  state.cards = cards.concat(shop);
  state.bought = [];
  save(state, r);
}

export function reroll(state) {
  if (state.rerolls <= 0) throw new Error("Plus de relance.");
  state.rerolls--;
  drawCards(state);
}

// Boutique : achète la carte i. Une bénédiction ouvre un choix (pendingBoon).
export function buy(state, i, available = () => true) {
  const c = state.cards[i];
  if (!c || c.kind === "combat") throw new Error("Carte invalide.");
  if (state.bought.includes(i)) throw new Error("Déjà acheté.");
  if (state.fleurs < c.cost) throw new Error("Pas assez de fleurs.");
  const r = rngOf(state);
  if (c.kind === "recruit") {
    if (state.troupe.length >= 14) throw new Error("Troupe complète.");
    const have = new Set(state.troupe.map((t) => t.k));
    const opts = Object.keys(SPECIES).filter((k) => SPECIES[k].t.includes(c.type) && !have.has(k) && SPECIES[k].tier <= 3 && available(k));
    if (!opts.length) throw new Error("Aucun Pokémon de ce type à recruter.");
    const k = pick(r, opts);
    state.troupe.push({ k, vig: VIGOR });
    state.log.push({ t: "recruit", k });
    c.got = k;
  } else if (c.kind === "boon") {
    state.pendingBoon = boonChoices(state, r);
  } else if (c.kind === "rest") {
    state.troupe.forEach((t) => (t.vig = Math.min(VIGOR, t.vig + 1)));
  }
  state.fleurs -= c.cost;
  state.bought.push(i);
  save(state, r);
  return c;
}

function boonChoices(state, r) {
  const left = USABLE_BOONS.filter((b) => !state.boons.includes(b.id));
  return shuffle(r, left).slice(0, 3).map((b) => b.id);
}
export function chooseBoon(state, id) {
  if (!state.pendingBoon || !state.pendingBoon.includes(id)) throw new Error("Choix invalide.");
  state.boons.push(id);
  state.pendingBoon = null;
}
export function skipBoon(state) { state.pendingBoon = null; }

// Bonus des types favorisés de la zone : +15 % de stats.
export function favored(state, k) { return SPECIES[k].t.some((t) => ZONE[state.zone].fav.includes(t)); }

// Configuration du moteur de combat pour la carte i et l'équipe choisie (3 noms de la troupe).
export function combatConfig(state, i, team) {
  const c = state.cards[i];
  if (!c || c.kind !== "combat") throw new Error("Ce n'est pas un combat.");
  if (team.length < 1 || team.length > 3) throw new Error("Choisis 1 à 3 Pokémon.");
  for (const k of team) { const t = state.troupe.find((x) => x.k === k); if (!t || t.vig <= 0) throw new Error("Pokémon épuisé ou absent."); }
  return {
    seed: (state.seed * 31 + state.act * 1009 + i * 7 + state.encores * 13) >>> 0,
    allies: team.map((k) => ({ k, L: TEAM_L, bonus: favored(state, k) ? 0.15 : 0 })),
    enemies: [{ k: c.foe.k, L: c.foe.L, boss: true }],
    pool: [], bossHp: c.foe.hp, bossPow: c.foe.pow,
    mods: state.boons.map((id) => BOON[id] && BOON[id].mods).filter(Boolean),
  };
}

// Résultat d'un combat.
export function finishCombat(state, i, team, win) {
  const c = state.cards[i];
  for (const k of team) { const t = state.troupe.find((x) => x.k === k); if (t) t.vig = Math.max(0, t.vig - 1); }
  state.log.push({ t: "combat", act: state.act, foe: c.foe.k, tier: c.tier, team, win });
  if (!win) {
    state.encores--;
    if (state.encores < 0 || !state.troupe.some((t) => t.vig > 0)) { state.over = true; state.won = false; }
    return { win };
  }
  state.fleurs += c.reward;
  state.cleared++;
  const r = rngOf(state);
  // bénédiction offerte après un acte clé ou le gardien
  if (c.tier === "key" || c.tier === "final") state.pendingBoon = boonChoices(state, r);
  save(state, r);
  if (c.tier === "final") { state.over = true; state.won = true; return { win, reward: c.reward }; }
  state.act++;
  // plus aucun Pokémon en état : fin
  if (!state.troupe.some((t) => t.vig > 0)) { state.over = true; state.won = !isFinite(state.nActs); }
  else drawCards(state);
  return { win, reward: c.reward };
}

// Pokémon encore jouables (au moins 1 vigueur).
export const fit = (state) => state.troupe.filter((t) => t.vig > 0).map((t) => t.k);
