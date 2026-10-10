// Prochain objectif du joueur (logique pure) : la chose à faire maintenant pour progresser, et où la faire.
// Affiché dans le hall et sur les difficultés verrouillées.
import { fr } from "../data/data.js";
import { CONFIG } from "./config.js";
import { DIFFS, SETS, SET, speciesOf, owns, roleOf, levelCap } from "./state.js";
import { access } from "./run.js";
import { elevationCost } from "./progress.js";

export const matName = (t) => (DIFFS[t - 1] && DIFFS[t - 1].mat) || `Matériau ${t}`;
// Première difficulté où le légendaire devient capturable (null si aucune).
export function legendFrom() {
  const i = DIFFS.findIndex((d) => d.level >= CONFIG.expedition.legend.minLevel);
  return i < 0 ? null : { d: i + 1, ...DIFFS[i] };
}

// { title, text, action: "expedition" | "collection", diff?, set?, focus?, progress?: { n, max, label } }
export function nextGoal(save) {
  if (save.run) return { title: "Expédition en cours", text: `Reprends ton expédition ${SET[save.run.set].name} là où tu l'as laissée.`, action: "expedition" };
  if (!save.firstClear[1]) return { title: "Ta première expédition", action: "expedition", diff: 1,
    text: `Choisis la difficulté ${DIFFS[0].name} et gagne les ${CONFIG.expedition.order.length} combats. À la fin, tu gardes un des Pokémon capturés.` };
  const locked = DIFFS.findIndex((_, i) => !access(save, i + 1).ok);
  if (locked >= 0) return unlockGoal(save, locked + 1);
  const all = SETS.flatMap(speciesOf), n = all.filter((k) => owns(save, k)).length, sh = all.filter((k) => owns(save, k, true)).length;
  if (n < all.length) return { title: "Complète la collection", action: "expedition", progress: { n, max: all.length, label: "espèces" },
    text: "Chaque expédition te laisse garder un Pokémon que tu n'as pas encore. Les légendaires se capturent au dernier acte." };
  if (sh < all.length) return { title: "Chasse aux chromatiques", action: "expedition", progress: { n: sh, max: all.length, label: "chromatiques" },
    text: "Les chromatiques se révèlent au choix final. Les éclats chroma en achètent aussi dans la Collection." };
  return { title: "Collection complète", text: "Toutes les espèces, normales et chromatiques. Bravo !", action: "collection" };
}

// Débloquer la difficulté d : il faut assez de Pokémon à son niveau, donc des élévations.
function unlockGoal(save, d) {
  const a = access(save, d), D = DIFFS[d - 1], missing = a.need - a.have;
  const base = { title: `Débloquer ${D.name}`, unlock: d, diff: d, progress: { n: a.have, max: a.need, label: `Pokémon niveau ${a.level}` } };
  // candidats : Pokémon d'un set encore sous le niveau, les plus avancés puis les moins chers d'abord
  const cand = Object.keys(save.coll).filter((k) => save.coll[k].L < a.level && roleOf(k) && elevationCost(save, k)).map((k) => {
    const c = elevationCost(save, k);
    return { k, c, lackF: Math.max(0, c.frags - save.frags[c.set]), lackM: Math.max(0, c.mats - save.mats[c.mat]) };
  }).sort((x, y) => save.coll[y.k].L - save.coll[x.k].L || x.lackF + x.lackM - (y.lackF + y.lackM));
  if (cand.length < missing) return { ...base, action: "expedition",
    text: `Il te faut ${a.need} Pokémon niveau ${a.level} et tu n'en as pas assez à élever : capture de nouveaux Pokémon en expédition.` };
  const ready = cand.find((x) => !x.lackF && !x.lackM);
  if (ready) return { ...base, action: "collection", focus: ready.k,
    text: `${fr(ready.k)} peut être élevé maintenant (niveau ${levelCap(ready.c.n)}). Encore ${missing} Pokémon à monter au niveau ${a.level}.` };
  const x = cand[0], S = SET[x.c.set], need = [];
  if (x.lackM) need.push(`${x.lackM} ${matName(x.c.mat)} (expéditions ${DIFFS[x.c.mat - 1] ? DIFFS[x.c.mat - 1].name : x.c.mat} réussies)`);
  if (x.lackF) need.push(`${x.lackF} fragment${x.lackF > 1 ? "s" : ""} ${S.name} (captures non gardées du set ${S.name})`);
  return { ...base, action: "expedition", diff: x.c.mat, set: x.c.set,
    text: `Les Pokémon montent de niveau en s'élevant. Pour élever ${fr(x.k)}, il te manque ${need.join(" et ")}.` };
}
