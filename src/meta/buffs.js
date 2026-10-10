// Bénédictions d'expédition : cartes achetées entre les actes, pensées pour le set affronté.
// Le catalogue d'un set est calculé (pur, sans hasard) à partir des types de ses Pokémon :
//  · types offensifs super efficaces contre le set → « Attaques X +25 % » ;
//  · réactions qui utilisent ces types → « Dégâts de Floraison +60 % », « Vaporisation ×2,35 »… ;
//  · bénédictions générales (soin, énergie, bouclier…) et de capture (chromatiques, légendaire).
import { SPECIES, TYPES, effectiveness, REACTIONS, SWIRL_RX, CRYSTAL_RX, TYPE_COLOR } from "../data/data.js";
import { CONFIG } from "./config.js";
import { SET } from "./state.js";

const B = () => CONFIG.buffs;

// Score moyen d'un type offensif contre le set (légendaire ×3, sympa ×2, faibles ×1).
function scoreOf(setId) {
  const S = SET[setId];
  const team = [[S.legend, 3], ...S.nice.map((k) => [k, 2]), ...S.weak.map((k) => [k, 1])];
  const tot = team.reduce((n, [, w]) => n + w, 0);
  return (t) => team.reduce((n, [k, w]) => n + w * effectiveness(t, SPECIES[k].t), 0) / tot;
}
// Types offensifs super efficaces contre le set, du meilleur au moins bon.
export function setWeaknesses(setId) {
  const sc = scoreOf(setId);
  return TYPES.map((t) => ({ t, score: sc(t) })).filter((x) => x.score > 1.05).sort((a, b) => b.score - a.score);
}
// Réactions adaptées : au moins un des deux éléments nettement efficace (≥ 1,3), les 3 meilleures paires.
// Bonus thématique : réactions qui utilisent l'élément du légendaire (Floraison et Électrocharge contre les Eau…).
export function setReactions(setId) {
  const sc = scoreOf(setId), own = SPECIES[SET[setId].legend].t;
  return Object.entries(REACTIONS).map(([key, rx]) => { const els = key.split("|"); return { rx, els, s: sc(els[0]) + sc(els[1]) + (els.some((e) => own.includes(e)) ? 0.5 : 0), best: Math.max(sc(els[0]), sc(els[1])) }; })
    .filter((x) => x.best >= 1.3).sort((a, b) => b.s - a.s).slice(0, 3);
}

const GENERIC = [
  { id: "restes", name: "Restes", desc: "Chaque allié récupère 4 % de ses PV au début de son tour.", rarity: 1, icon: "leaf", mods: { regen: 0.04 } },
  { id: "poudre", name: "Poudre d'énergie", desc: "Chaque combat commence avec +1 charge d'énergie.", rarity: 1, icon: "star", mods: { startPts: 1 } },
  { id: "cloche", name: "Cloche coquille", desc: "Chaque combat commence avec un bouclier de 12 % des PV.", rarity: 1, icon: "moon", mods: { startShield: 0.12 } },
  { id: "scope", name: "Lentille", desc: "Chances de critique +15 %.", rarity: 1, icon: "sword", mods: { crit: 0.15 } },
  { id: "grelot", name: "Grelot coque", desc: "Soigne 10 % des dégâts infligés.", rarity: 2, icon: "flower", mods: { lifesteal: 0.1 } },
  { id: "pendule", name: "Pendule", desc: "Les ultimes commencent chaque combat chargés à 50 %.", rarity: 2, icon: "crown", mods: { startCharge: 50 } },
  { id: "ruban", name: "Ruban expert", desc: "Coups super efficaces ×2,4 au lieu de ×2.", rarity: 2, icon: "sword", mods: { superEff: 0.2 } },
  { id: "tempo", name: "Métronome", desc: "Chaque réaction recharge l'ultime du lanceur de +15.", rarity: 2, icon: "star", mods: { rxCharge: 15 } },
  { id: "herbe", name: "Herbe miracle", desc: "Toutes les réactions +40 %.", rarity: 3, icon: "flower", mods: { rx: 0.4 } },
];
const CAPTURE = [
  { id: "prisme", name: "Prisme chromatique", desc: "Chances de chromatique ×2 pour les prochaines rencontres du run.", rarity: 2, icon: "star", special: "shiny", capture: true },
  { id: "appat", name: "Appât légendaire", desc: "Capture du légendaire +5 points (2 fois maximum).", rarity: 3, icon: "crown", special: "legend", max: 2, capture: true },
  { id: "bourse", name: "Bourse de vœux", desc: "Vœux gagnés à chaque acte +50 % pour le reste du run.", rarity: 1, icon: "moon", special: "eco" },
];

// Catalogue complet d'un set (déterministe).
export function buffPool(setId) {
  const weak = setWeaknesses(setId).slice(0, 4), wt = weak.map((w) => w.t);
  const name = SET[setId].name;
  const list = weak.map((w) => ({
    id: `type_${w.t}`, name: `Affinité ${w.t}`, desc: `Attaques ${w.t} +25 %. Super efficace contre le set ${name}.`, rarity: 1, color: TYPE_COLOR[w.t], icon: "sword", mods: { type: { [w.t]: 0.25 } },
  }));
  // réactions qui exploitent les faiblesses du set
  for (const { rx, els } of setReactions(setId)) {
    const amp = !!rx.mult;
    list.push({ id: `rx_${rx.id}`, name: `Maîtrise : ${rx.name}`, rarity: 2, color: rx.color, icon: "flower", mods: { rxOf: { [rx.id]: 0.6 } },
      desc: amp ? `${rx.name} (${els.join(" + ")}) ×${(rx.mult + 0.6).toFixed(2).replace(".", ",")} au lieu de ×${String(rx.mult).replace(".", ",")}.` : `Dégâts ${/^[AEÉIOU]/.test(rx.name) ? "d'" : "de "}${rx.name} (${els.join(" + ")}) +60 %. ${rx.desc}` });
  }
  if (wt.includes("Vol")) list.push({ id: "rx_swirl", name: `Maîtrise : ${SWIRL_RX.name}`, desc: "Attaques Vol +20 %, Dispersion +50 %.", rarity: 2, color: SWIRL_RX.color, icon: "flower", mods: { type: { Vol: 0.2 }, swirl: 0.5 } });
  if (wt.includes("Roche") || wt.includes("Sol")) list.push({ id: "rx_crystal", name: `Maîtrise : ${CRYSTAL_RX.name}`, desc: "Attaques Roche et Sol +20 %, boucliers de Cristallisation +50 %.", rarity: 2, color: CRYSTAL_RX.color, icon: "flower", mods: { type: { Roche: 0.2, Sol: 0.2 }, crystal: 0.5 } });
  return [...list, ...GENERIC, ...CAPTURE].map((b) => ({ max: 1, color: "#c9b27a", ...b }));
}
export const buffDef = (setId, id) => buffPool(setId).find((b) => b.id === id);

// Prix en vœux selon la rareté et la difficulté.
export const buffCost = (b, diff) => Math.round(B().cost[b.rarity - 1] * B().diffScale[diff - 1]);

// Tire `n` cartes (rareté pondérée, sans ce qui est déjà au maximum).
export function drawCards(pool, owned, r, n = B().shopSize) {
  const left = pool.filter((b) => owned.filter((x) => x === b.id).length < b.max);
  const out = [];
  while (out.length < n && left.length) {
    const w = left.map((b) => B().weight[b.rarity - 1]);
    let x = r() * w.reduce((a, c) => a + c, 0), i = 0;
    while (x > w[i]) x -= w[i++];
    out.push(left.splice(Math.min(i, left.length - 1), 1)[0].id);
  }
  return out;
}

// Mods du moteur pour les bénédictions possédées.
export const modsOf = (setId, ids) => ids.map((id) => buffDef(setId, id)).filter((b) => b && b.mods).map((b) => b.mods);
