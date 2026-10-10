// Vérifie le contenu éditable (sets, difficultés, objets, évolutions) et les fichiers dont il dépend.
// npm run check
import fs from "fs";
import { SPECIES } from "../src/data/data.js";
import { CONFIG } from "../src/meta/config.js";
import { SETS, speciesOf, orderOf, contentErrors } from "../src/meta/state.js";

const root = new URL("../", import.meta.url);
const exists = (p) => fs.existsSync(new URL(p, root));
const idx = JSON.parse(fs.readFileSync(new URL("models/index.json", root)));
const err = contentErrors(), warn = [];

const used = new Set([...SETS.flatMap(speciesOf), ...CONFIG.start.starters, ...Object.values(CONFIG.evolutions).flat()]);
for (const k of used) {
  if (!SPECIES[k]) continue;   // déjà signalé par contentErrors
  const m = idx[k.toLowerCase()];
  if (!m) err.push(`${k} : pas de modèle 3D (models/${k.toLowerCase()}.glb absent de models/index.json).`);
  else if (!m.shiny) warn.push(`${k} : pas de texture chromatique (models/shiny/${k.toLowerCase()}.webp) — le chromatique aura l'apparence normale.`);
  if (!exists(`assets/pokemon/${k}.png`)) warn.push(`${k} : pas de sprite assets/pokemon/${k}.png — portrait 3D utilisé à la place.`);
}
for (const [k, chain] of Object.entries(CONFIG.evolutions)) for (const f of [k, ...chain]) if (!SPECIES[f]) err.push(`Évolution ${k} : espèce inconnue ${f}.`);

for (const S of SETS) console.log(`${S.name.padEnd(16)} ${S.legend.padEnd(10)} | ${S.nice.join(" ")} | ${S.weak.join(" ")} | ${orderOf(S.id).join(" ")}`);
console.log(`${CONFIG.difficulties.length} difficultés : ${CONFIG.difficulties.map((d) => `${d.name} (niv. ${d.level})`).join(", ")}`);
for (const w of warn) console.log("attention :", w);
for (const e of err) console.log("ERREUR :", e);
if (err.length) process.exit(1);
console.log("contenu : ok");
