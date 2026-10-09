// Point d'entrée : prototype de combat 3D (étape 1).
// Paramètres d'URL pour tester : ?team=CHARIZARD,LAPRAS,GENGAR,BLISSEY&foes=MACHAMP,NIDOKING,ARCANINE&lv=20&flv=28
//                                 ?boss=GROUDON (gardien + renforts), ?seed=123
import { Stage } from "./render/stage.js";
import { Hud } from "./ui/hud.js";
import { Director } from "./game/director.js";
import { loadIndex } from "./render/assets.js";
import { SPECIES } from "./data/data.js";
import { Sfx } from "./audio.js";

const q = new URLSearchParams(location.search);
const list = (s, d) => (q.get(s) || d).split(",").map((x) => x.trim().toUpperCase()).filter((k) => SPECIES[k]);

async function start() {
  const bar = document.querySelector("#loading .bar i"), msg = document.querySelector("#loading small");
  const index = await loadIndex();
  const has = (k) => !!index[k.toLowerCase()];
  const lv = +q.get("lv") || 20, flv = +q.get("flv") || 28;
  const team = list("team", "CHARIZARD,LAPRAS,GENGAR,BLISSEY").filter(has).slice(0, 4);
  const boss = q.get("boss") && list("boss", "")[0];
  const foes = boss ? [{ k: boss, L: flv - 4, boss: true }]
    : list("foes", "MACHAMP,NIDOKING,ARCANINE").filter(has).slice(0, 5).map((k, i, a) => ({ k, L: flv, elite: a.length === 3 && i === 1 }));
  const seed = +q.get("seed") || ((Math.random() * 2 ** 31) | 0);
  const cfg = {
    seed, title: boss ? "Gardien" : "Combat d'entraînement", boss: !!boss,
    allies: team.map((k) => ({ k, L: lv, charge: q.has("ult") ? 100 : 0 })), enemies: foes,
    pool: boss ? ["SANDILE", "TRAPINCH", "CACNEA", "CLAYDOL"].filter(has) : [],
  };
  const stage = new Stage(document.getElementById("game"), { quality: q.get("q") === "low" ? "low" : "high" });
  if (q.get("dtcap")) stage.maxDt = +q.get("dtcap"); // tests sans carte graphique
  const hud = new Hud(document.getElementById("hud"), stage);
  const dir = new Director(stage, hud, cfg);
  await dir.load((p) => { bar.style.width = Math.round(p * 100) + "%"; msg.textContent = "Chargement des modèles… " + Math.round(p * 100) + " %"; });
  window.__game = { stage, hud, dir, cfg };
  msg.textContent = "Clic ou touche pour commencer";
  await new Promise((r) => { const go = () => { removeEventListener("pointerdown", go); removeEventListener("keydown", go); r(); }; addEventListener("pointerdown", go); addEventListener("keydown", go); if (q.has("autostart")) r(); });
  Sfx.unlock();
  document.getElementById("loading").classList.add("out");
  dir.onRetry = () => { const u = new URL(location.href); u.searchParams.set("seed", (Math.random() * 2 ** 31) | 0); u.searchParams.set("autostart", "1"); location.href = u.toString(); };
  await dir.run();
}
start().catch((e) => { console.error(e); const m = document.querySelector("#loading small"); if (m) m.textContent = "Erreur : " + e.message; });
