// Run de capture : 10 vœux, un set et un niveau ; 5 combats en raid ; on garde UN Pokémon nouveau,
// le reste devient fragments de set (et éclats chroma pour les chromatiques non gardés).
import { CONFIG } from "./config.js";
import { SET, withRng, seedFrom, owns, isNewFor, addCopy, levelCap, log } from "./state.js";
import { simulate, alliesOf } from "./battle.js";

const C = () => CONFIG.capture;

// Taux de capture du légendaire selon le niveau (sans pity).
export function legendRate(level) {
  const L = C().legend;
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
  else if (legendRate(level) > 0) save.pity[setId] = +(save.pity[setId] + C().pityStep).toFixed(4);
  return { chance, caught };
}

export function startRun(save, { set, level }) {
  const S = SET[set];
  if (!S) throw new Error("Set inconnu.");
  if (save.run) throw new Error("Un run est déjà en cours.");
  if (!save.team.length) throw new Error("Équipe vide.");
  level = Math.round(level);
  if (!(level >= C().levelMin && level <= C().levelMax)) throw new Error(`Niveau ${C().levelMin} à ${C().levelMax}.`);
  if (save.voeux < C().cost) throw new Error("Pas assez de vœux.");
  save.voeux -= C().cost;
  const foes = withRng(save, (r) => {
    const weak = S.weak.slice();
    return C().order.map((role) => {
      let k;
      if (role === "weak") k = weak.splice(Math.floor(r() * weak.length), 1)[0];
      else if (role === "nice") k = S.nice[Math.floor(r() * S.nice.length)];
      else k = S.legend;
      // jet chromatique tiré à la rencontre, caché jusqu'au choix final
      const shiny = r() < (role === "legend" ? C().shinyRateLegend : C().shinyRate);
      return { role, k, shiny };
    });
  });
  save.run = { set, level, i: 0, foes, captures: [], results: [], phase: "fight" };
  log(save, `Run de capture : ${S.name}, niveau ${level}`);
  return save.run;
}

// Combat suivant. Renvoie { win, foe, captured, legend? }.
export function fightNext(save) {
  const run = save.run;
  if (!run || run.phase !== "fight") throw new Error("Pas de combat en attente.");
  const f = run.foes[run.i];
  const foe = { k: f.k, L: run.level, hp: C().foeHp[f.role], pow: C().foePow[f.role] };
  const seed = withRng(save, (r) => seedFrom(r));
  const { win } = simulate({ seed, allies: alliesOf(save), foe });
  const out = { win, foe: f.k, role: f.role, captured: false };
  if (win) {
    if (f.role !== "legend") { run.captures.push({ k: f.k, shiny: f.shiny, role: f.role }); out.captured = true; }
    else if (owns(save, f.k, false) && owns(save, f.k, true)) {
      // légendaire complet : matériaux rares, pas de capture
      const R = C().legendDoneReward; save.mats[R.mat] += R.n; out.reward = R;
    } else {
      const att = legendAttempt(save, run.set, run.level);
      out.legend = att;
      if (att.caught) { run.captures.push({ k: f.k, shiny: f.shiny, role: f.role }); out.captured = true; }
    }
  }
  run.results.push(out);
  run.i++;
  if (!win || run.i >= run.foes.length) run.phase = "choice";
  return out;
}

// Captures proposées à l'écran de choix (chromatiques révélés ici), avec « nouveau pour le compte ».
export function choices(save) {
  const run = save.run;
  if (!run || run.phase !== "choice") throw new Error("Pas d'écran de choix.");
  return run.captures.map((c, i) => ({ i, ...c, isNew: isNewFor(save, c.k, c.shiny) }));
}

// Vue publique du run : chromatiques masqués tant qu'on n'est pas au choix final.
export function publicRun(run) {
  if (!run) return null;
  const hide = run.phase !== "choice";
  return { ...run, foes: run.foes.map((f) => ({ ...f, shiny: hide ? undefined : f.shiny })), captures: run.captures.map((c) => ({ ...c, shiny: hide ? undefined : c.shiny })) };
}

// Termine le run : garde la capture n° keep (ou aucune), convertit le reste.
export function finishRun(save, keep = null) {
  const run = save.run;
  const list = choices(save);
  if (keep !== null && keep !== undefined) {
    const c = list[keep];
    if (!c) throw new Error("Choix invalide.");
    if (!c.isNew) throw new Error("Ce Pokémon est déjà possédé : il ne peut pas être gardé.");
  }
  const sum = { kept: null, frags: 0, shards: 0 };
  list.forEach((c) => {
    if (c.i === keep) {
      const e = addCopy(save, c.k, c.shiny, Math.min(run.level, levelCap(0)));
      sum.kept = { k: c.k, shiny: c.shiny, L: e.L };
      return;
    }
    sum.frags += C().fragments[c.role];
    if (c.shiny) sum.shards += C().shardPerShiny;
  });
  save.frags[run.set] += sum.frags;
  save.shards += sum.shards;
  save.run = null;
  log(save, `Fin du run : ${sum.kept ? "gardé " + sum.kept.k + (sum.kept.shiny ? " ✦" : "") : "rien gardé"}, +${sum.frags} fragments, +${sum.shards} éclats`);
  return sum;
}

// Abandon : on passe directement au choix avec les captures déjà faites.
export function stopRun(save) {
  if (!save.run || save.run.phase !== "fight") throw new Error("Rien à arrêter.");
  save.run.phase = "choice";
}
