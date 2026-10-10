// Expédition (mode unique) : difficulté → set → 5 actes, bénédictions entre les actes → choix final.
// Accès : assez de Pokémon au niveau de la difficulté. À chaque acte, 1 à 3 Pokémon ; chacun combat 3 fois par run.
// Gains : vœux à chaque acte gagné (dépensés en bénédictions), captures (on en garde une), fragments,
// matériaux de palier si les 5 actes sont gagnés.
import { CONFIG } from "./config.js";
import { SET, DIFFS, orderOf, withRng, seedFrom, owns, isNewFor, addCopy, log } from "./state.js";
import { simulate, alliesOf, combatConfig } from "./battle.js";
import { buffPool, buffDef, buffCost, drawCards, modsOf } from "./buffs.js";

const R = () => CONFIG.run, EX = () => CONFIG.expedition, BF = () => CONFIG.buffs;

// ───────── difficulté et accès ─────────
export const levelOf = (d) => DIFFS[d - 1].level;
export function eligible(save, d) {
  const L = levelOf(d);
  return Object.keys(save.coll).filter((k) => save.coll[k].L >= L).sort((a, b) => save.coll[b].L - save.coll[a].L || a.localeCompare(b));
}
export function access(save, d) {
  const have = eligible(save, d).length, need = R().minRoster;
  return { ok: have >= need, have, need, level: levelOf(d) };
}

// ───────── capture du légendaire ─────────
export function legendRate(level) {
  const L = EX().legend;
  if (level < L.minLevel) return 0;
  const t = Math.min(1, (level - L.minLevel) / (L.maxLevel - L.minLevel));
  return L.rateAtMin + (L.rateAtMax - L.rateAtMin) * t;
}
// Taux effectif : pity (et bonus d'appât) ajoutés seulement au-dessus du seuil.
export function legendChance(save, setId, level, bonus = 0) {
  const base = legendRate(level);
  return base > 0 ? Math.min(1, base + save.pity[setId] + bonus) : 0;
}
export function legendAttempt(save, setId, level, bonus = 0) {
  const chance = legendChance(save, setId, level, bonus);
  const caught = withRng(save, (r) => r()) < chance;
  if (caught) save.pity[setId] = 0;
  else if (legendRate(level) > 0) save.pity[setId] = +(save.pity[setId] + EX().pityStep).toFixed(4);
  return { chance, caught };
}

// Récompenses affichables.
export function expeditionRewards(save, d) {
  const E = EX(), mats = { [d]: E.matMain };
  if (d > 1) mats[d - 1] = E.matPrev;
  return { perAct: DIFFS[d - 1].voeux, acts: E.order.length, clearMats: mats, firstClear: save.firstClear[d] ? 0 : E.firstClearBonus, legend: legendRate(levelOf(d)) };
}

// ───────── démarrage ─────────
export function startRun(save, { diff, set }) {
  if (save.run) throw new Error("Une expédition est déjà en cours.");
  if (!(diff >= 1 && diff <= DIFFS.length)) throw new Error("Difficulté invalide.");
  const a = access(save, diff);
  if (!a.ok) throw new Error(`Il faut ${a.need} Pokémon niveau ${a.level} ou plus (tu en as ${a.have}).`);
  const S = SET[set];
  if (!S) throw new Error("Set inconnu.");
  if (save.voeux < EX().cost) throw new Error(`Il faut ${EX().cost} vœux.`);
  save.voeux -= EX().cost;
  const pool = buffPool(set);
  const { foes, cards } = withRng(save, (r) => {
    const weak = S.weak.slice();
    const foes = orderOf(set).map((role) => {
      const k = role === "weak" ? weak.splice(Math.floor(r() * weak.length), 1)[0] : role === "nice" ? S.nice[Math.floor(r() * S.nice.length)] : S.legend;
      // jet chromatique tiré à la rencontre, caché jusqu'au choix final
      return { role, k, shiny: r() < (role === "legend" ? EX().shinyRateLegend : EX().shinyRate) };
    });
    return { foes, cards: drawCards(pool, [], r) };
  });
  const uses = Object.fromEntries(eligible(save, diff).map((k) => [k, R().uses]));
  save.run = {
    diff, level: a.level, set, i: 0, foes, uses, team: null, results: [], captures: [], voeux: 0, phase: "fight",
    buffs: [], shop: { cards, bought: [], free: BF().freeFirst }, rerolls: BF().rerolls, legendBonus: 0, voeuxMult: 1,
    items: { ...CONFIG.items.start },
  };
  log(save, `Expédition : ${S.name}, difficulté ${diff}`);
  return save.run;
}

// ───────── bénédictions ─────────
export function shopView(save) {
  const run = save.run;
  if (!run || !run.shop) return null;
  return {
    free: run.shop.free, rerolls: run.rerolls,
    cards: run.shop.cards.map((id, i) => {
      const b = buffDef(run.set, id);
      return { i, ...b, cost: run.shop.free ? 0 : buffCost(b, run.diff), bought: run.shop.bought.includes(i) };
    }),
  };
}
export function buyBuff(save, i) {
  const run = save.run;
  if (!run || run.phase !== "fight" || !run.shop) throw new Error("Pas de bénédiction disponible.");
  if (run.shop.bought.includes(i)) throw new Error("Déjà prise.");
  const id = run.shop.cards[i], b = buffDef(run.set, id);
  if (!b) throw new Error("Carte invalide.");
  const cost = run.shop.free ? 0 : buffCost(b, run.diff);
  if (save.voeux < cost) throw new Error(`Il faut ${cost} vœux.`);
  save.voeux -= cost;
  run.buffs.push(id);
  run.shop.bought.push(i);
  if (b.special === "shiny") withRng(save, (r) => {   // nouveau jet pour les rencontres à venir
    for (let j = run.i; j < run.foes.length; j++) {
      const f = run.foes[j];
      if (!f.shiny) f.shiny = r() < (f.role === "legend" ? EX().shinyRateLegend : EX().shinyRate);
    }
  });
  if (b.special === "legend") run.legendBonus = Math.min(BF().legendLureMax, run.legendBonus + BF().legendPerLure);
  if (b.special === "eco") run.voeuxMult += 0.5;
  if (run.shop.free) run.shop = null;   // la carte offerte : une seule
  return b;
}
export function rerollShop(save) {
  const run = save.run;
  if (!run || !run.shop) throw new Error("Pas de bénédiction à relancer.");
  if (run.rerolls <= 0) throw new Error("Plus de relance.");
  run.rerolls--;
  run.shop.cards = withRng(save, (r) => drawCards(buffPool(run.set), run.buffs, r));
  run.shop.bought = [];
}
export const runMods = (run) => modsOf(run.set, run.buffs);

// ───────── objets ─────────
// Sac pour le combat : { id: { n, name, desc, color, fx } } (le combat décrémente n).
export function itemBag(counts = {}) {
  const L = CONFIG.items.list;
  return Object.fromEntries(Object.entries(counts).filter(([k, n]) => L[k] && n > 0).map(([k, n]) => [k, { ...L[k], n }]));
}

// ───────── combats ─────────
export const usable = (save) => Object.keys(save.run.uses).filter((k) => save.run.uses[k] > 0);
export const autoTeam = (save) => usable(save).sort((a, b) => save.coll[b].L - save.coll[a].L || a.localeCompare(b)).slice(0, R().teamSize);

function foeOf(run) {
  const f = run.foes[run.i];
  return { k: f.k, L: run.level, hp: EX().foeHp[f.role], pow: EX().foePow[f.role] };
}

// Prépare le combat de l'acte courant avec l'équipe choisie (pour la scène 3D).
export function nextFightConfig(save, team) {
  const run = save.run;
  if (!run || run.phase !== "fight") throw new Error("Pas de combat en attente.");
  team = [...new Set(team || [])];
  if (!team.length || team.length > R().teamSize) throw new Error(`Choisis 1 à ${R().teamSize} Pokémon.`);
  for (const k of team) if (!(run.uses[k] > 0)) throw new Error("Ce Pokémon n'a plus de combat disponible.");
  run.team = team;
  if (run.shop && run.shop.free) run.shop = null;   // carte offerte non prise : perdue
  const seed = withRng(save, (r) => seedFrom(r));
  return { ...combatConfig({ seed, allies: alliesOf(save, team), foe: foeOf(run), mods: runMods(run) }), items: itemBag(run.items), itemsPerTurn: CONFIG.items.perTurn };
}

// Applique le résultat du combat en cours (simulé ou joué en 3D). items : sac rendu par le combat (objets restants).
export function resolveFight(save, win, items = null) {
  const run = save.run;
  if (!run || run.phase !== "fight" || !run.team) throw new Error("Pas de combat en cours.");
  const f = run.foes[run.i];
  for (const k of run.team) run.uses[k]--;
  if (items) run.items = Object.fromEntries(Object.entries(items).map(([k, it]) => [k, it.n]));
  const out = { win, foe: f.k, role: f.role, team: run.team, captured: false };
  run.team = null;
  if (win) {
    const v = Math.round(DIFFS[run.diff - 1].voeux * run.voeuxMult);
    save.voeux += v; run.voeux += v; out.voeux = v;
    if (f.role !== "legend") { run.captures.push({ k: f.k, shiny: f.shiny, role: f.role }); out.captured = true; }
    else if (owns(save, f.k, false) && owns(save, f.k, true)) {
      const Rw = EX().legendDoneReward; save.mats[Rw.mat] += Rw.n; out.reward = Rw;   // légendaire complet : matériau rare
    } else {
      const att = legendAttempt(save, run.set, run.level, run.legendBonus);
      out.legend = att;
      if (att.caught) { run.captures.push({ k: f.k, shiny: f.shiny, role: f.role }); out.captured = true; }
    }
  }
  run.results.push(out);
  run.i++;
  if (!win || run.i >= run.foes.length || !usable(save).length) { run.phase = "choice"; run.shop = null; }
  else run.shop = { cards: withRng(save, (r) => drawCards(buffPool(run.set), run.buffs, r)), bought: [], free: false };
  return out;
}

// Combat de l'acte en simulation (équipe auto si non précisée).
export function fightNext(save, team) {
  const cfg = nextFightConfig(save, team || autoTeam(save));
  const e = cfg.enemies[0];
  const { win } = simulate({ seed: cfg.seed, allies: cfg.allies, foe: { k: e.k, L: e.L, hp: cfg.bossHp, pow: cfg.bossPow }, mods: cfg.mods });
  return resolveFight(save, win);
}

export const cleared = (run) => run.results.length === run.foes.length && run.results.every((r) => r.win);

// Captures proposées à l'écran de choix (chromatiques révélés ici), avec « nouveau pour le compte ».
export function choices(save) {
  const run = save.run;
  if (!run || run.phase !== "choice") throw new Error("Pas d'écran de fin.");
  return run.captures.map((c, i) => ({ i, ...c, isNew: isNewFor(save, c.k, c.shiny) }));
}

// Vue publique : chromatiques masqués tant qu'on n'est pas au choix final.
export function publicRun(run) {
  if (!run) return null;
  const hide = run.phase !== "choice";
  return { ...run, foes: run.foes.map((f) => ({ ...f, shiny: hide ? undefined : f.shiny })), captures: run.captures.map((c) => ({ ...c, shiny: hide ? undefined : c.shiny })) };
}

// Fin : garde la capture n° keep (ou aucune), convertit le reste ; matériaux si les 5 actes sont gagnés.
export function finishRun(save, keep = null) {
  const run = save.run;
  const list = choices(save);
  if (keep !== null && keep !== undefined) {
    const c = list[keep];
    if (!c) throw new Error("Choix invalide.");
    if (!c.isNew) throw new Error("Ce Pokémon est déjà possédé : il ne peut pas être gardé.");
  }
  const sum = { kept: null, frags: 0, shards: 0, voeux: run.voeux, mats: {}, cleared: cleared(run), set: run.set };
  list.forEach((c) => {
    if (c.i === keep) { const e = addCopy(save, c.k, c.shiny); sum.kept = { k: c.k, shiny: c.shiny, L: e.L }; return; }
    sum.frags += EX().fragments[c.role];
    if (c.shiny) sum.shards += EX().shardPerShiny;
  });
  save.frags[run.set] += sum.frags;
  save.shards += sum.shards;
  if (sum.cleared) {
    const r = expeditionRewards(save, run.diff);
    for (const t in r.clearMats) { save.mats[t] += r.clearMats[t]; sum.mats[t] = r.clearMats[t]; }
    if (r.firstClear) { save.voeux += r.firstClear; sum.voeux += r.firstClear; sum.firstClear = r.firstClear; }
    save.firstClear[run.diff] = true;
  }
  save.run = null;
  log(save, `Fin d'expédition D${run.diff} : ${sum.cleared ? "réussie" : "interrompue"}, ${sum.kept ? "gardé " + sum.kept.k + (sum.kept.shiny ? " ✦" : "") : "rien gardé"}, +${sum.frags} fragments`);
  return sum;
}

// Abandon : on passe directement à la fin avec ce qui est acquis.
export function stopRun(save) {
  if (!save.run || save.run.phase !== "fight") throw new Error("Rien à arrêter.");
  save.run.phase = "choice"; save.run.shop = null;
}

// Expédition complète en simulation (tests, page de debug) : prend la 1re carte offerte, puis la moins chère abordable.
export function playExpedition(save, d, set, { keep = "best" } = {}) {
  startRun(save, { diff: d, set });
  while (save.run.phase === "fight") {
    const sv = shopView(save);
    if (sv) { const c = sv.cards.filter((x) => !x.bought && x.cost <= save.voeux).sort((a, b) => a.cost - b.cost)[0]; if (c) buyBuff(save, c.i); }
    fightNext(save);
  }
  const ch = choices(save).filter((c) => c.isNew).sort((a, b) => ({ legend: 3, nice: 2, weak: 1 }[b.role] - { legend: 3, nice: 2, weak: 1 }[a.role]))[0];
  return finishRun(save, keep === "best" && ch ? ch.i : null);
}
