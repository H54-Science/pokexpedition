// Taux de victoire indicatifs : équipe de 3 (niveau L, étoiles 0) contre les adversaires des expéditions et des runs.
// node tools/balance_meta.mjs
import { CONFIG, SETS, simulate } from "../src/meta/index.js";
const N = +process.argv[2] || 40;
const teams = { faibles: ["MUDKIP", "LITWICK", "TRAPINCH"], sympa: ["LAPRAS", "GENGAR", "FLYGON"] };
const rate = (allies, foe) => { let w = 0; for (let s = 1; s <= N; s++) if (simulate({ seed: s * 7919, allies, foe }).win) w++; return Math.round((100 * w) / N); };
const E = CONFIG.expedition, Cp = CONFIG.capture;
for (const [tn, ks] of Object.entries(teams)) for (const L of [20, 40, 60, 80, 100]) {
  const allies = ks.map((k) => ({ k, L }));
  const ex = [1, 2, 3, 4, 5].map((d) => { const role = E.foeRole[d - 1]; const k = role === "legend" ? SETS[0].legend : SETS[1][role][0]; return rate(allies, { k, L: E.foeLevel[d - 1], hp: E.foeHp[d - 1], pow: E.foePow[d - 1] }); });
  const cap = ["weak", "nice", "legend"].map((role) => { const k = role === "legend" ? SETS[2].legend : SETS[2][role][1]; return rate(allies, { k, L, hp: Cp.foeHp[role], pow: Cp.foePow[role] }); });
  console.log(`${tn.padEnd(7)} L${String(L).padEnd(3)} expé D1-5 : ${ex.map((x) => String(x).padStart(3)).join(" ")} %   run au même niveau faible/sympa/légende : ${cap.join(" / ")} %`);
}
