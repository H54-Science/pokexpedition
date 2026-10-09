// Tests du moteur de combat : combats complets en automatique + déterminisme.
import { Combat } from "../src/combat/engine.js";
import { SPECIES } from "../src/data/data.js";

function play(seed, cfgExtra = {}) {
  const b = new Combat({ seed, allies: [{ k: "CHARIZARD", L: 20 }, { k: "LAPRAS", L: 20 }, { k: "GENGAR", L: 20 }, { k: "BLISSEY", L: 20 }],
    enemies: [{ k: "MACHAMP", L: 21 }, { k: "NIDOKING", L: 21 }, { k: "ARCANINE", L: 21 }], ...cfgExtra });
  const evs = [...b.begin()];
  let guard = 0;
  while (!b.over && guard++ < 500) {
    const t = b.nextTurn(); evs.push(...t.events);
    if (!t.skipped) {
      const u = b.unit(t.actor);
      if (u.side === "ally") {
        for (const a of b.living("ally")) if (b.canUlt(a.id)) evs.push(...b.ult(a.id, { target: b.living("enemy")[0]?.id, q: 2 }));
        if (!b.over && u.alive) { const p = b.autoPlan(u); if (p) evs.push(...b.act(u.id, { ...p, q: (seed + guard) % 3 })); }
      } else evs.push(...b.enemyAct({ q: guard % 3 }));
    }
    evs.push(...b.endTurn());
  }
  return { b, evs, guard };
}

let wins = 0, turns = 0;
const N = 300;
for (let s = 1; s <= N; s++) { const { b, guard } = play(s); if (!b.over) throw new Error("combat sans fin, graine " + s); if (b.win) wins++; turns += guard; }
console.log(`combats normaux : ${wins}/${N} victoires, ${(turns / N).toFixed(1)} tours en moyenne`);

const a = play(42), c = play(42);
if (JSON.stringify(a.evs) !== JSON.stringify(c.evs)) throw new Error("non déterministe");
console.log("déterminisme : ok (" + a.evs.length + " événements identiques)");

let bw = 0;
for (let s = 1; s <= 100; s++) { const { b } = play(s, { enemies: [{ k: "GROUDON", L: 24, boss: true }], pool: ["SANDILE", "TRAPINCH", "CACNEA"] }); if (b.win) bw++; }
console.log(`gardien Groudon : ${bw}/100 victoires`);

// toutes les espèces jouables
for (const k of Object.keys(SPECIES)) { const b = new Combat({ seed: 3, allies: [{ k, L: 15 }], enemies: [{ k, L: 15 }] }); b.begin(); let g = 0; while (!b.over && g++ < 400) { const t = b.nextTurn(); if (!t.skipped) { const u = b.unit(t.actor); if (u.side === "ally") { const p = b.autoPlan(u); if (p) b.act(u.id, p); } else b.enemyAct(); } b.endTurn(); } }
console.log("toutes les espèces : ok (" + Object.keys(SPECIES).length + ")");
const kinds = {}; for (const e of a.evs) kinds[e.t] = (kinds[e.t] || 0) + 1; console.log(kinds);
