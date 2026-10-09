// Point d'entrée : combat de raid 3D, 3 alliés contre 1 boss.
// Paramètres d'URL : ?team=CHARIZARD,LAPRAS,GENGAR  &boss=GROUDON  &lv=20  &flv=16 (niveau du boss)
//                    &hp=12 &pow=0.7 (PV et puissance du boss)  &seed=123  &ult=1  &q=low
import { Stage } from "./render/stage.js";
import { Hud } from "./ui/hud.js";
import { Director } from "./game/director.js";
import { loadIndex } from "./render/assets.js";
import { SPECIES } from "./data/data.js";
import { Sfx } from "./audio.js";

const q = new URLSearchParams(location.search);
const list = (s, d) => (q.get(s) || d).split(",").map((x) => x.trim().toUpperCase()).filter((k) => SPECIES[k]);

// Niveau du boss selon sa rareté, par rapport au niveau de l'équipe (calibré : ~75-85 % de victoires en automatique).
const BOSS_LV = { 1: 8, 2: 6, 3: -3, 4: -4 };

async function start() {
  const bar = document.querySelector("#loading .bar i"), msg = document.querySelector("#loading small");
  const index = await loadIndex();
  const has = (k) => !!index[k.toLowerCase()];
  const lv = +q.get("lv") || 20;
  const team = list("team", "CHARIZARD,LAPRAS,GENGAR").filter(has).slice(0, 3);
  const boss = list("boss", "GROUDON").filter(has)[0] || "GROUDON";
  const blv = +q.get("flv") || Math.max(2, lv + (BOSS_LV[SPECIES[boss].tier] || 0));
  const seed = +q.get("seed") || ((Math.random() * 2 ** 31) | 0);
  const cfg = {
    seed, title: "Raid", boss: true,
    allies: team.map((k) => ({ k, L: lv, charge: q.has("ult") ? 100 : 0 })),
    enemies: [{ k: boss, L: blv, boss: true }],
    pool: [], bossHp: +q.get("hp") || 12, bossPow: +q.get("pow") || 0.7,
  };
  const stage = new Stage(document.getElementById("game"), { quality: q.get("q") === "low" ? "low" : "high" });
  if (q.get("dtcap")) stage.maxDt = +q.get("dtcap"); // tests sans carte graphique
  const hud = new Hud(document.getElementById("hud"), stage);
  const dir = new Director(stage, hud, cfg);
  await dir.load((p) => { bar.style.width = Math.round(p * 100) + "%"; msg.textContent = "CHARGEMENT… " + Math.round(p * 100) + " %"; });
  window.__game = { stage, hud, dir, cfg };
  msg.textContent = "CLIC OU TOUCHE POUR COMMENCER";
  await new Promise((r) => { const go = () => { removeEventListener("pointerdown", go); removeEventListener("keydown", go); r(); }; addEventListener("pointerdown", go); addEventListener("keydown", go); if (q.has("autostart")) r(); });
  Sfx.unlock();
  document.getElementById("loading").classList.add("out");
  dir.onRetry = () => { const u = new URL(location.href); u.searchParams.set("seed", (Math.random() * 2 ** 31) | 0); u.searchParams.set("autostart", "1"); location.href = u.toString(); };
  await dir.run();
}
start().catch((e) => { console.error(e); const m = document.querySelector("#loading small"); if (m) m.textContent = "Erreur : " + e.message; });
