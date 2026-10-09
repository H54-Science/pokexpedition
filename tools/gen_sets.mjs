// Génère src/meta/sets.json : 4 sets de 8 (1 légendaire, 3 « sympa », 4 faibles).
// Seules les espèces avec modèle chromatique sont utilisées. Le résultat est fait pour être retouché à la main.
// node tools/gen_sets.mjs
import fs from "fs";
import { SPECIES } from "../src/data/data.js";
import { CONFIG } from "../src/meta/config.js";

const idx = JSON.parse(fs.readFileSync(new URL("../models/index.json", import.meta.url)));
const ok = (k) => idx[k.toLowerCase()] && idx[k.toLowerCase()].shiny;
const THEMES = [
  { id: "abysses", name: "Abysses", legend: "KYOGRE", types: ["Eau", "Glace", "Vol"] },
  { id: "terres", name: "Terres brûlées", legend: "GROUDON", types: ["Sol", "Feu", "Roche"] },
  { id: "nuit", name: "Nuit sans fin", legend: "DARKRAI", types: ["Ténèbres", "Spectre", "Poison"] },
  { id: "feerie", name: "Féerie", legend: "XERNEAS", types: ["Fée", "Plante", "Psy"] },
];
const used = new Set(THEMES.map((t) => t.legend));
const score = (k, th) => SPECIES[k].t.reduce((s, t) => s + (th.types.indexOf(t) >= 0 ? 3 - th.types.indexOf(t) : 0), 0) + (CONFIG.evolutions[k] ? 1 : 0);
const sets = THEMES.map((th) => ({ id: th.id, name: th.name, legend: th.legend, nice: [], weak: [] }));
// starters imposés : répartition dans des sets différents qui maximise l'affinité de type
const S0 = CONFIG.start.starters;
let best = null;
const perm = (left, pick) => {
  if (pick.length === S0.length) { const v = pick.reduce((s, j, i) => s + score(S0[i], THEMES[j]), 0); if (!best || v > best.v) best = { v, pick: pick.slice() }; return; }
  for (const j of left) perm(left.filter((x) => x !== j), [...pick, j]);
};
perm(THEMES.map((_, j) => j), []);
best.pick.forEach((j, i) => { sets[j].weak.push(S0[i]); used.add(S0[i]); });
// tour par tour pour équilibrer : chaque set prend le meilleur candidat restant
for (const [role, tier, n] of [["nice", 3, 3], ["weak", 1, 4]]) {
  for (let r = 0; r < n; r++) for (let i = 0; i < sets.length; i++) {
    if (sets[i][role].length >= n) continue;
    const c = Object.keys(SPECIES).filter((k) => SPECIES[k].tier === tier && ok(k) && !used.has(k)).sort((a, b) => score(b, THEMES[i]) - score(a, THEMES[i]))[0];
    sets[i][role].push(c); used.add(c);
  }
}
fs.writeFileSync(new URL("../src/meta/sets.json", import.meta.url), JSON.stringify(sets, null, 2) + "\n");
for (const s of sets) console.log(s.name.padEnd(16), s.legend, "|", s.nice.join(" "), "|", s.weak.join(" "));
