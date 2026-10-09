// Tests de la logique d'expédition : expéditions complètes simulées (combats joués par le moteur en auto).
import { Combat } from "../src/combat/engine.js";
import * as R from "../src/game/run.js";
import { ZONES } from "../src/data/zones.js";

function fight(cfg) {
  const b = new Combat(cfg); b.begin(); let g = 0;
  while (!b.over && g++ < 900) { const t = b.nextTurn(); if (!t.skipped) { const u = b.unit(t.actor); if (u.side === "ally") { for (const a of b.living("ally")) if (b.canUlt(a.id)) b.ult(a.id, { q: 1 }); if (!b.over && u.alive) { const p = b.autoPlan(u); p && b.act(u.id, { ...p, q: 1 }); } } else b.enemyAct({ q: 1 }); } b.endTurn(); }
  return b.win;
}
function play(zone, diff, seed) {
  const troupe = ["CHARIZARD", "LAPRAS", "GENGAR", "BLISSEY", "DRAGONITE", "ALAKAZAM"];
  const s = R.createRun({ zone, diff, troupe, seed });
  let guard = 0;
  while (!s.over && guard++ < 60) {
    if (s.pendingBoon) R.chooseBoon(s, s.pendingBoon[0]);
    // achète une bénédiction si possible
    const bi = s.cards.findIndex((c, i) => c.kind === "boon" && !s.bought.includes(i) && s.fleurs >= c.cost);
    if (bi >= 0) { R.buy(s, bi); if (s.pendingBoon) R.chooseBoon(s, s.pendingBoon[0]); }
    const ri = s.cards.findIndex((c, i) => c.kind === "rest" && !s.bought.includes(i) && s.fleurs >= c.cost);
    if (ri >= 0 && s.troupe.filter((t) => t.vig > 0).length < 4) R.buy(s, ri);
    const ci = s.cards.findIndex((c) => c.kind === "combat");
    const team = s.troupe.filter((t) => t.vig > 0).sort((a, b) => b.vig - a.vig).slice(0, 3).map((t) => t.k);
    const cfg = R.combatConfig(s, ci, team);
    R.finishCombat(s, ci, team, fight(cfg));
  }
  JSON.parse(JSON.stringify(s)); // sérialisable
  return s;
}
for (const diff of ["facile", "normal", "difficile"]) {
  let w = 0, acts = 0; const N = 30;
  for (let i = 1; i <= N; i++) { const s = play(ZONES[i % 9].id, diff, i); if (s.won) w++; acts += s.cleared; }
  console.log(`${diff} : ${w}/${N} expéditions gagnées, ${(acts / N).toFixed(1)} combats gagnés en moyenne`);
}
const a = play("foret", "normal", 7), b = play("foret", "normal", 7);
if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error("expédition non déterministe");
console.log("déterminisme expédition : ok");
