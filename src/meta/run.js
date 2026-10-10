// Runs : expéditions (vœux + matériaux) et runs de capture (10 vœux, un set).
// Commun : difficulté 1..5 = niveau des adversaires ; accès si assez de Pokémon au niveau ;
// 5 actes ; à chaque acte on engage 3 Pokémon ; chacun peut combattre 3 fois par run.
import { CONFIG } from "./config.js";
import { SETS, SET, withRng, seedFrom, owns, isNewFor, addCopy, levelCap, log } from "./state.js";
import { simulate, alliesOf, combatConfig } from "./battle.js";

const R = () => CONFIG.run, CP = () => CONFIG.capture, EX = () => CONFIG.expedition;

// ───────── difficulté et accès ─────────
export const levelOf = (d) => R().levels[d - 1];
// Pokémon utilisables à la difficulté d (niveau ≥ niveau de la difficulté), du plus fort au plus faible.
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
  const L = CP().legend;
  if (level < L.minLevel) return 0;
  const t = Math.min(1, (level - L.minLevel) / (L.maxLevel - L.minLevel));
  return L.rateAtMin + (L.rateAtMax - L.rateAtMin) * t;
}
// Taux effectif : pity ajouté seulement au-dessus du seuil.
export function legendChance(save, setId, level) {
  const base = legendRate(level);
  return base > 0 ? Math.min(1, base + save.pity[setId]) : 0;
}
// Jet de capture du légendaire (après une victoire) : met à jour le pity du set.
export function legendAttempt(save, setId, level) {
  const chance = legendChance(save, setId, level);
  const caught = withRng(save, (r) => r()) < chance;
  if (caught) save.pity[setId] = 0;
  else if (legendRate(level) > 0) save.pity[setId] = +(save.pity[setId] + CP().pityStep).toFixed(4);
  return { chance, caught };
}

// Récompenses affichables d'une expédition.
export function expeditionRewards(save, d) {
  const E = EX(), mats = { [d]: E.matMain };
  if (d > 1) mats[d - 1] = E.matPrev;
  return { perAct: E.voeuxPerAct[d - 1], acts: R().acts, clearMats: mats, firstClear: save.firstClear[d] ? 0 : E.firstClearBonus };
}

// ───────── démarrage ─────────
// mode "expedition" ou "capture" (set requis)
export function startRun(save, { mode, diff, set }) {
  if (save.run) throw new Error("Un run est déjà en cours.");
  if (!(diff >= 1 && diff <= R().levels.length)) throw new Error("Difficulté invalide.");
  const a = access(save, diff);
  if (!a.ok) throw new Error(`Il faut ${a.need} Pokémon niveau ${a.level} ou plus (tu en as ${a.have}).`);
  const level = a.level;
  let foes;
  if (mode === "capture") {
    const S = SET[set];
    if (!S) throw new Error("Set inconnu.");
    if (save.voeux < CP().cost) throw new Error(`Il faut ${CP().cost} vœux.`);
    save.voeux -= CP().cost;
    foes = withRng(save, (r) => {
      const weak = S.weak.slice();
      return CP().order.map((role) => {
        const k = role === "weak" ? weak.splice(Math.floor(r() * weak.length), 1)[0] : role === "nice" ? S.nice[Math.floor(r() * S.nice.length)] : S.legend;
        // jet chromatique tiré à la rencontre, caché jusqu'au choix final
        return { role, k, shiny: r() < (role === "legend" ? CP().shinyRateLegend : CP().shinyRate) };
      });
    });
  } else if (mode === "expedition") {
    set = null;
    foes = withRng(save, (r) => EX().order.map((role) => {
      const pool = SETS.flatMap((s) => s[role]);
      return { role, k: pool[Math.floor(r() * pool.length)], shiny: false };
    }));
  } else throw new Error("Mode inconnu.");
  const uses = Object.fromEntries(eligible(save, diff).map((k) => [k, R().uses]));
  save.run = { mode, diff, level, set, i: 0, foes, uses, team: null, results: [], captures: [], voeux: 0, phase: "fight" };
  log(save, mode === "capture" ? `Run de capture : ${SET[set].name}, difficulté ${diff}` : `Expédition, difficulté ${diff}`);
  return save.run;
}

// Pokémon encore disponibles pour le prochain combat.
export const usable = (save) => Object.keys(save.run.uses).filter((k) => save.run.uses[k] > 0);
// Équipe proposée par défaut : les plus forts encore disponibles.
export const autoTeam = (save) => usable(save).sort((a, b) => save.coll[b].L - save.coll[a].L || a.localeCompare(b)).slice(0, R().teamSize);

function foeOf(run) {
  const f = run.foes[run.i], T = run.mode === "capture" ? CP() : EX();
  return { k: f.k, L: run.level, hp: T.foeHp[f.role], pow: T.foePow[f.role] };
}

// Prépare le combat de l'acte courant avec l'équipe choisie (pour la scène 3D).
export function nextFightConfig(save, team) {
  const run = save.run;
  if (!run || run.phase !== "fight") throw new Error("Pas de combat en attente.");
  team = [...new Set(team || [])];
  if (!team.length || team.length > R().teamSize) throw new Error(`Choisis 1 à ${R().teamSize} Pokémon.`);
  for (const k of team) if (!(run.uses[k] > 0)) throw new Error("Ce Pokémon n'a plus de combat disponible.");
  run.team = team;
  const seed = withRng(save, (r) => seedFrom(r));
  return combatConfig({ seed, allies: alliesOf(save, team), foe: foeOf(run) });
}

// Applique le résultat du combat en cours (simulé ou joué en 3D).
export function resolveFight(save, win) {
  const run = save.run;
  if (!run || run.phase !== "fight" || !run.team) throw new Error("Pas de combat en cours.");
  const f = run.foes[run.i];
  for (const k of run.team) run.uses[k]--;
  const out = { win, foe: f.k, role: f.role, team: run.team, captured: false };
  run.team = null;
  if (win && run.mode === "expedition") {
    const v = EX().voeuxPerAct[run.diff - 1];
    save.voeux += v; run.voeux += v; out.voeux = v;
  } else if (win) {
    if (f.role !== "legend") { run.captures.push({ k: f.k, shiny: f.shiny, role: f.role }); out.captured = true; }
    else if (owns(save, f.k, false) && owns(save, f.k, true)) {
      const Rw = CP().legendDoneReward; save.mats[Rw.mat] += Rw.n; out.reward = Rw;   // légendaire complet : matériau rare
    } else {
      const att = legendAttempt(save, run.set, run.level);
      out.legend = att;
      if (att.caught) { run.captures.push({ k: f.k, shiny: f.shiny, role: f.role }); out.captured = true; }
    }
  }
  run.results.push(out);
  run.i++;
  if (!win || run.i >= run.foes.length || !usable(save).length) run.phase = "choice";
  return out;
}

// Combat de l'acte en simulation (équipe auto si non précisée).
export function fightNext(save, team) {
  const cfg = nextFightConfig(save, team || autoTeam(save));
  const e = cfg.enemies[0];
  const { win } = simulate({ seed: cfg.seed, allies: cfg.allies, foe: { k: e.k, L: e.L, hp: cfg.bossHp, pow: cfg.bossPow } });
  return resolveFight(save, win);
}

export const cleared = (run) => run.results.length === run.foes.length && run.results.every((r) => r.win);

// Captures proposées à l'écran de choix (chromatiques révélés ici), avec « nouveau pour le compte ».
export function choices(save) {
  const run = save.run;
  if (!run || run.phase !== "choice") throw new Error("Pas d'écran de fin.");
  return run.captures.map((c, i) => ({ i, ...c, isNew: isNewFor(save, c.k, c.shiny) }));
}

// Vue publique du run : chromatiques masqués tant qu'on n'est pas au choix final.
export function publicRun(run) {
  if (!run) return null;
  const hide = run.phase !== "choice";
  return { ...run, foes: run.foes.map((f) => ({ ...f, shiny: hide ? undefined : f.shiny })), captures: run.captures.map((c) => ({ ...c, shiny: hide ? undefined : c.shiny })) };
}

// Fin du run. Capture : garde la capture n° keep (ou aucune), convertit le reste.
// Expédition : matériaux et bonus de premier clear si les 5 actes sont gagnés.
export function finishRun(save, keep = null) {
  const run = save.run;
  const list = choices(save);
  const sum = { mode: run.mode, kept: null, frags: 0, shards: 0, voeux: run.voeux, mats: {}, cleared: cleared(run) };
  if (run.mode === "expedition") {
    if (sum.cleared) {
      const r = expeditionRewards(save, run.diff);
      for (const t in r.clearMats) { save.mats[t] += r.clearMats[t]; sum.mats[t] = r.clearMats[t]; }
      if (r.firstClear) { save.voeux += r.firstClear; sum.voeux += r.firstClear; sum.firstClear = r.firstClear; }
      save.firstClear[run.diff] = true;
    }
    save.run = null;
    log(save, `Fin d'expédition D${run.diff} : ${sum.cleared ? "réussie" : "échec"}, +${sum.voeux} vœux`);
    return sum;
  }
  if (keep !== null && keep !== undefined) {
    const c = list[keep];
    if (!c) throw new Error("Choix invalide.");
    if (!c.isNew) throw new Error("Ce Pokémon est déjà possédé : il ne peut pas être gardé.");
  }
  list.forEach((c) => {
    if (c.i === keep) { const e = addCopy(save, c.k, c.shiny, Math.min(run.level, levelCap(0))); sum.kept = { k: c.k, shiny: c.shiny, L: e.L }; return; }
    sum.frags += CP().fragments[c.role];
    if (c.shiny) sum.shards += CP().shardPerShiny;
  });
  save.frags[run.set] += sum.frags;
  save.shards += sum.shards;
  save.run = null;
  log(save, `Fin du run : ${sum.kept ? "gardé " + sum.kept.k + (sum.kept.shiny ? " ✦" : "") : "rien gardé"}, +${sum.frags} fragments, +${sum.shards} éclats`);
  return sum;
}

// Abandon : on passe directement à la fin avec ce qui est acquis.
export function stopRun(save) {
  if (!save.run || save.run.phase !== "fight") throw new Error("Rien à arrêter.");
  save.run.phase = "choice";
}

// Expédition complète en simulation (tests, page de debug).
export function playExpedition(save, d) {
  startRun(save, { mode: "expedition", diff: d });
  while (save.run.phase === "fight") fightNext(save);
  return finishRun(save);
}
