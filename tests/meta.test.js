// Tests de la boucle de progression (src/meta) : logique pure, à graine fixe.
import * as M from "../src/meta/index.js";
import { Combat } from "../src/combat/engine.js";
const { CONFIG } = M;
const ok = (c, msg) => { if (!c) throw new Error("ÉCHEC : " + msg); };
const clone = (o) => JSON.parse(JSON.stringify(o));

// ───── sets ─────
{ const err = M.contentErrors(); ok(!err.length, "contenu : " + err.join(" / ")); }
console.log("sets : ok");

// ───── taux de capture du légendaire ─────
ok(M.legendRate(29) === 0 && M.legendRate(1) === 0, "0 % sous le niveau 30");
ok(Math.abs(M.legendRate(30) - 0.03) < 1e-9 && Math.abs(M.legendRate(100) - 0.3) < 1e-9, "3 % à 30, 30 % à 100");
ok(Math.abs(M.legendRate(65) - 0.165) < 1e-9, "interpolation linéaire");
{ const s = M.newSave(1); s.pity.abysses = 0.5; ok(M.legendChance(s, "abysses", 20) === 0, "pity ignoré sous le seuil"); ok(Math.abs(M.legendChance(s, "abysses", 30) - 0.53) < 1e-9, "pity ajouté au-dessus"); }
// taux empirique au niveau 65, pity remis à zéro à chaque essai
{ const s = M.newSave(5); let c = 0; const n = 20000; for (let i = 0; i < n; i++) { s.pity.nuit = 0; if (M.legendAttempt(s, "nuit", 65).caught) c++; } ok(Math.abs(c / n - 0.165) < 0.01, "taux empirique ≈ 16,5 % : " + c / n); }
// pity : capture garantie en un nombre borné d'essais
{ const bound = Math.ceil((1 - 0.03) / CONFIG.expedition.pityStep) + 1; let worst = 0;
  for (let seed = 1; seed <= 300; seed++) { const s = M.newSave(seed); let n = 0; while (!M.legendAttempt(s, "terres", 30).caught) { n++; ok(n < bound, "pity non borné"); } worst = Math.max(worst, n + 1); ok(s.pity.terres === 0, "pity remis à 0"); }
  console.log(`légendaire : taux ok, pity borné (pire cas ${worst} essais au niveau 30, borne ${bound})`); }

// ───── taux chromatique ≈ 1/300 sur 100 000 jets ─────
{ const s = M.newSave(9); let sh = 0, n = 0;
  while (n < 100000) { s.voeux = 99; M.startRun(s, { set: "feerie", diff: 1 }); for (const f of s.run.foes) if (f.role !== "legend") { n++; if (f.shiny) sh++; } s.run = null; }
  const r = sh / n; ok(Math.abs(r - 1 / 300) < 0.0006, "taux chromatique " + r); console.log(`chromatique : ${sh}/${n} = 1/${Math.round(1 / r)}`); }

// ───── chromatiques cachés pendant le run ─────
{ const s = M.newSave(3); M.startRun(s, { set: "abysses", diff: 1 }); ok(M.publicRun(s.run).foes.every((f) => f.shiny === undefined), "chromatique caché avant le choix"); }

// ───── plafonds de niveau ─────
{ const s = M.newSave(2); M.train(s, "MUDKIP", 999); ok(s.coll.MUDKIP.L === 20, "plafond 20 à l'élévation 0");
  let threw = false; try { M.elevate(s, "MUDKIP"); } catch (e) { threw = true; } ok(threw, "élévation refusée sans ressources");
  s.frags.abysses = 999; s.mats = { 1: 99, 2: 99, 3: 99, 4: 99, 5: 99 };
  for (const cap of [40, 60, 80, 100, 100]) { M.elevate(s, "MUDKIP"); M.train(s, "MUDKIP", 9999); ok(s.coll.MUDKIP.L === cap, "plafond " + cap); }
  const t = M.newSave(2); M.train(t, "LITWICK", 999); t.frags.nuit = 99; t.mats[1] = 9; const ev = M.elevate(t, "LITWICK"); ok(ev.evolved === "CHANDELURE", "évolution à l'élévation 1");
  console.log("plafonds et élévation : ok"); }

// ───── conversion, une seule copie gardée, pas de double possession ─────
{ const s = M.newSave(4);
  // run forcé : 4 captures dont un chromatique
  s.run = { set: "nuit", buffs: [], shop: null, level: 10, diff: 1, i: 5, phase: "choice", results: [], foes: [], uses: {}, voeux: 0,
    captures: [{ k: "PUMPKABOO", shiny: false, role: "weak" }, { k: "MURKROW", shiny: true, role: "weak" }, { k: "GENGAR", shiny: false, role: "nice" }, { k: "LITWICK", shiny: false, role: "weak" }] };
  const ch = M.choices(s); ok(ch[3].isNew === false, "Litwick normal déjà possédé = pas nouveau");
  let threw = false; try { M.finishRun(clone(s), 3); } catch (e) { threw = true; } ok(threw, "impossible de garder un doublon");
  const sum = M.finishRun(s, 2);
  ok(sum.kept.k === "GENGAR" && s.coll.GENGAR.normal, "Gengar gardé");
  ok(sum.frags === 1 + 1 + 1 && s.frags.nuit === 3, "fragments : 3 faibles non gardés = 3");
  ok(ch[0].isNew === false, "Pitrouille (starter) déjà possédé");
  ok(sum.shards === 1 && s.shards === 1, "1 éclat pour le chromatique non gardé");
  ok(!s.coll.MURKROW && !s.coll.PUMPKABOO.shiny, "une seule capture gardée");
  s.shards = 5; M.redeemShards(s, "GENGAR"); ok(s.coll.GENGAR.shiny && s.shards === 0, "5 éclats = chromatique");
  console.log("conversion et choix final : ok"); }

// ───── accès par difficulté, actes et utilisations ─────
{ const s = M.newSave(8);
  ok(M.access(s, 1).ok && !M.access(s, 2).ok, "6 Pokémon niv. 20 : D1 seulement");
  let threw = false; try { M.startRun(s, { set: "nuit", diff: 2 }); } catch (e) { threw = true; } ok(threw, "D2 refusée");
  for (const k of Object.keys(s.coll).slice(0, 5)) s.coll[k].L = 40;
  ok(!M.access(s, 2).ok, "5 Pokémon niv. 40 ne suffisent pas"); s.coll[Object.keys(s.coll)[5]].L = 40; ok(M.access(s, 2).ok && !M.access(s, 3).ok, "6 niv. 40 : D2 oui, D3 non");
  M.startRun(s, { set: "nuit", diff: 1 });
  ok(Object.values(s.run.uses).every((u) => u === CONFIG.run.uses) && s.run.foes.length === M.orderOf("nuit").length, "actes du déroulé, 3 utilisations chacun");
  const t = Object.keys(s.run.uses).slice(0, 3); M.nextFightConfig(s, t); M.resolveFight(s, true);
  ok(t.every((k) => s.run.uses[k] === CONFIG.run.uses - 1), "utilisation décomptée");
  threw = false; try { M.nextFightConfig(s, Object.keys(s.coll).slice(0, 4)); } catch (e) { threw = true; } ok(threw, "4 Pokémon refusés");
  for (const k of t) s.run.uses[k] = 0; threw = false; try { M.nextFightConfig(s, [t[0]]); } catch (e) { threw = true; } ok(threw, "Pokémon épuisé refusé");
  console.log("accès, actes et utilisations : ok"); }

// ───── objets : sac de départ, transmis au combat, restants rendus par le combat ─────
{ const s = M.newSave(31); M.startRun(s, { set: "abysses", diff: 1 });
  const cfg = M.nextFightConfig(s, M.autoTeam(s));
  ok(Object.keys(cfg.items).length && Object.values(cfg.items).every((it) => it.n > 0 && it.fx), "sac transmis au combat");
  const id = Object.keys(cfg.items)[0], n0 = cfg.items[id].n; cfg.items[id].n--;
  M.resolveFight(s, true, cfg.items);
  ok(s.run.items[id] === n0 - 1, "objet utilisé retiré du sac");
  // moteur : un objet soigne et ne consomme pas le tour
  const b = new Combat({ seed: 3, allies: [{ k: "MUDKIP", L: 50, hp: 0.5 }], enemies: [{ k: "GENGAR", L: 5 }] });
  b.begin(); let a = null;
  for (let g = 0; g < 20 && !a; g++) { const t = b.nextTurn(), u = t.actor && b.unit(t.actor); if (u && !t.skipped && u.side === "ally") a = u; else { if (u && !t.skipped) b.enemyAct(); b.endTurn(); } }
  ok(a, "tour d'allié atteint");
  const hp0 = a.hp; b.useItem(CONFIG.items.list.potion.fx, "Potion");
  ok(a.hp > hp0 && b.active === a, "potion : soin, tour conservé");
  console.log("objets : ok"); }

// ───── bénédictions ─────
{ const s = M.newSave(21);
  for (const S of M.SETS) { const pool = M.buffPool(S.id); ok(pool.length >= 12 && new Set(pool.map((b) => b.id)).size === pool.length, "catalogue " + S.id); }
  ok(M.buffPool("abysses").some((b) => b.id === "rx_floraison") && M.buffPool("abysses").some((b) => b.id === "type_Électrik"), "Abysses : Floraison et Électrik proposés");
  ok(!M.buffPool("abysses").some((b) => b.id === "type_Feu"), "Abysses : pas de bonus Feu");
  M.startRun(s, { set: "abysses", diff: 1 });
  let v = M.shopView(s); ok(v.free && v.cards.length === CONFIG.buffs.shopSize && v.cards.every((c) => c.cost === 0), "1re carte offerte");
  const v0 = s.voeux; M.buyBuff(s, 0); ok(s.voeux === v0 && s.run.buffs.length === 1 && !s.run.shop, "carte offerte prise, boutique fermée");
  M.fightNext(s);
  if (s.run.phase === "fight") {
    v = M.shopView(s); ok(!v.free && v.cards.every((c) => c.cost > 0), "boutique payante après l'acte 1");
    const r0 = s.run.rerolls; M.rerollShop(s); ok(s.run.rerolls === r0 - 1, "relance");
    s.voeux = 0; let threw = false; try { M.buyBuff(s, 0); } catch (e) { threw = true; } ok(threw, "achat refusé sans vœux");
  }
  // le bonus de réaction atteint bien le moteur
  const t = M.newSave(22); M.startRun(t, { set: "abysses", diff: 1 }); t.run.buffs = ["rx_floraison", "type_Plante"];
  const cfg = M.nextFightConfig(t, M.autoTeam(t));
  ok(cfg.mods.some((m) => m.rxOf && m.rxOf.floraison) && cfg.mods.some((m) => m.type && m.type.Plante), "mods transmis au combat");
  console.log("bénédictions : ok"); }

// ───── joueur automatique : boucle complète, déterminisme, sauvegarde ─────
function bot(seed, steps, saveAt = -1) {
  let s = M.newSave(seed); let snap = null; const stat = { expClear: 0, runs: 0, kept: 0, legends: 0, elev: 0, maxDiff: 1 };
  for (let step = 0; step < steps; step++) {
    if (step === saveAt) { snap = M.serialize(s); s = M.deserialize(snap); }
    for (const k in s.coll) M.train(s, k, 50);
    for (const k in s.coll) { try { M.elevate(s, k); stat.elev++; } catch (e) {} }
    const d = [5, 4, 3, 2, 1].find((x) => M.access(s, x).ok);
    stat.maxDiff = Math.max(stat.maxDiff, d);
    const sum = M.playExpedition(s, d, M.SETS[step % 4].id); stat.runs++;
    if (sum.cleared) stat.expClear++;
    if (sum.kept) { stat.kept++; if (M.roleOf(sum.kept.k).role === "legend") stat.legends++; }
    for (const k in s.coll) ok(s.coll[k].normal || s.coll[k].shiny, "entrée vide " + k);
  }
  return { s, stat, snap };
}
const A = bot(11, 400), B = bot(11, 400);
ok(M.serialize(A.s) === M.serialize(B.s), "déterminisme du joueur automatique");
const C = bot(11, 400, 150);
ok(M.serialize(C.s) === M.serialize(A.s), "sauvegarde puis rechargement : partie identique");
{ const t = M.deserialize(M.serialize(A.s)); ok(JSON.stringify(t) === JSON.stringify(A.s), "aller-retour de sauvegarde"); }
const kept = Object.values(A.s.coll).reduce((n, e) => n + e.normal + e.shiny, 0);
console.log("déterminisme et sauvegarde : ok");
console.log(`joueur automatique, 400 étapes :`, A.stat, `collection ${Object.keys(A.s.coll).length} espèces / ${kept} copies, vœux ${A.s.voeux}, fragments`, A.s.frags);
