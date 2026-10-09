// Expéditions : difficulté 1..5, toutes ouvertes. Victoire = vœux + matériaux de palier.
import { CONFIG } from "./config.js";
import { SETS, withRng, seedFrom, log } from "./state.js";
import { simulate, alliesOf } from "./battle.js";

export function expeditionFoe(save, d, r) {
  const E = CONFIG.expedition, role = E.foeRole[d - 1];
  const pool = SETS.flatMap((s) => (role === "legend" ? [s.legend] : s[role]));
  return { k: pool[Math.floor(r() * pool.length)], L: E.foeLevel[d - 1], hp: E.foeHp[d - 1], pow: E.foePow[d - 1] };
}

export function rewardsOf(save, d) {
  const E = CONFIG.expedition;
  const mats = { [d]: E.matMain };
  if (d > 1) mats[d - 1] = E.matPrev;
  return { voeux: E.voeux[d - 1] + (save.firstClear[d] ? 0 : E.firstClearBonus), mats };
}

// Joue une expédition avec l'équipe courante. Renvoie { win, foe, rewards }.
export function playExpedition(save, d) {
  if (!(d >= 1 && d <= 5)) throw new Error("Difficulté 1 à 5.");
  if (!save.team.length) throw new Error("Équipe vide.");
  if (save.run) throw new Error("Un run de capture est en cours.");
  const { foe, seed } = withRng(save, (r) => ({ foe: expeditionFoe(save, d, r), seed: seedFrom(r) }));
  const res = simulate({ seed, allies: alliesOf(save), foe });
  if (!res.win) { log(save, `Expédition ${d} perdue contre ${foe.k}`); return { win: false, foe }; }
  const rewards = rewardsOf(save, d);
  save.voeux += rewards.voeux;
  for (const t in rewards.mats) save.mats[t] += rewards.mats[t];
  save.firstClear[d] = true;
  log(save, `Expédition ${d} gagnée : +${rewards.voeux} vœux`);
  return { win: true, foe, rewards };
}
