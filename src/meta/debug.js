// Page meta.html : interface de debug de la boucle (sans 3D).
import * as M from "./index.js";
import { SPECIES } from "../data/data.js";

const { CONFIG } = M;
let S = M.localStore.load((Math.random() * 2 ** 31) | 0);
let runLog = [];
const $ = (id) => document.getElementById(id);
const RF = { weak: "faible", nice: "sympa", legend: "légendaire" };
const fr = (k) => (SPECIES[k] ? SPECIES[k].fr : k);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

function act(fn) {
  $("err").textContent = "";
  try { const r = fn(); M.localStore.save(S); render(); return r; } catch (e) { $("err").textContent = e.message; render(); }
}

function render() {
  $("res").innerHTML = [
    `Vœux <b>${S.voeux}</b>`,
    `Matériaux ${M.DIFFS.map((_, i) => i + 1).map((t) => `P${t} <b>${S.mats[t]}</b>`).join(" ")}`,
    `Fragments ${M.SETS.map((s) => `${s.name} <b>${S.frags[s.id]}</b>`).join(" · ")}`,
    `Éclats chroma <b>${S.shards}</b>`,
    `Pity ${M.SETS.map((s) => `${s.id} <b>${Math.round(S.pity[s.id] * 100)}</b>`).join(" ")}`,
  ].map((x) => `<span>${x}</span>`).join("");
  renderExp(); renderRun(); renderColl();
  $("log").textContent = S.log.slice().reverse().join("\n");
}

function renderExp() {
  $("exp").innerHTML = M.DIFFS.map((_, i) => i + 1).map((d) => {
    const r = M.expeditionRewards(S, d), a = M.access(S, d);
    return `<div class="row"><button data-exp="${d}" ${S.run || !a.ok ? "disabled" : ""}>Difficulté ${d} (niv. ${a.level})</button>
      <span class="mute">${a.have}/${a.need} Pokémon au niveau · ${r.perAct} vœux par acte gagné · run complet : ${Object.entries(r.clearMats).map(([t, n]) => `P${t}×${n}`).join(" ")}${r.firstClear ? ` + ${r.firstClear} vœux (1er clear)` : ""}</span></div>`;
  }).join("") + `<div class="row"><button data-exp10="1" ${S.run ? "disabled" : ""}>×10 la plus haute accessible</button></div>`;
}

function renderRun() {
  const el = $("run"), run = S.run;
  if (!run) {
    el.innerHTML = `<div class="row"><select id="set">${M.SETS.map((s) => `<option value="${s.id}">${esc(s.name)} — ${fr(s.legend)}</option>`).join("")}</select>
      difficulté <select id="lvl">${M.DIFFS.map((_, i) => i + 1).map((d) => `<option value="${d}" ${M.access(S, d).ok ? "" : "disabled"}>${d} (niv. ${M.levelOf(d)})</option>`).join("")}</select>
      <button class="main" id="start">Lancer</button></div>
      <p class="mute" id="chance"></p>` + (runLog.length ? `<div>${runLog.join("")}</div>` : "");
    const upd = () => { const set = $("set").value, L = M.levelOf(+$("lvl").value); const s = M.SET[set]; $("chance").textContent = `${s.nice.map(fr).join(", ")} · faibles : ${s.weak.map(fr).join(", ")} · capture de ${fr(s.legend)} au niveau ${L} : ${(M.legendChance(S, set, L) * 100).toFixed(1)} %`; };
    $("set").onchange = upd; $("lvl").onchange = upd; upd();
    $("start").onclick = () => act(() => { M.startRun(S, { set: $("set").value, diff: +$("lvl").value }); runLog = []; });
    return;
  }
  const P = M.publicRun(run);
  const steps = P.foes.map((f, i) => {
    const res = run.results[i];
    const st = res ? (res.win ? `<span class="ok">victoire${res.captured ? " · capturé" : ""}${res.legend ? ` (${(res.legend.chance * 100).toFixed(0)} %)` : ""}${res.reward ? " · matériau rare" : ""}</span>` : `<span class="bad">défaite</span>`) : i === run.i && run.phase === "fight" ? "à jouer" : "";
    return `<tr><td>${i + 1}</td><td>${RF[f.role]}</td><td>${fr(f.k)}${f.shiny ? ' <span class="shiny">✦</span>' : ""}</td><td>${st}</td></tr>`;
  }).join("");
  let html = `<p>${esc(M.SET[run.set].name)}, difficulté ${run.diff} (niv. ${run.level})</p><table>${steps}</table>`;
  if (run.phase === "fight") html += `<div class="row"><button class="main" id="next">Combat suivant</button><button id="all">Tout jouer</button><button id="stop">Arrêter</button></div>`;
  else {
    const ch = M.choices(S);
    html += `<h2 style="margin-top:10px">Choix final : garder un seul Pokémon nouveau</h2><div class="row">` + (ch.map((c) => `<button class="card ${c.isNew ? "new" : ""}" data-keep="${c.i}" ${c.isNew ? "" : "disabled"}>${fr(c.k)}${c.shiny ? ' <span class="shiny">✦ chromatique</span>' : ""}<br><small class="mute">${RF[c.role]}${c.isNew ? " · nouveau" : " · déjà possédé"}</small></button>`).join("") || '<span class="mute">Aucune capture.</span>') +
      `</div><div class="row"><button data-keep="none">Ne rien garder</button><span class="mute">Le reste devient fragments (faible ${CONFIG.expedition.fragments.weak}, sympa ${CONFIG.expedition.fragments.nice}, légendaire ${CONFIG.expedition.fragments.legend}) ; chromatique non gardé = 1 éclat.</span></div>`;
  }
  el.innerHTML = html;
  const sv = M.shopView(S);
  if (sv && run.phase === "fight") el.insertAdjacentHTML("beforeend", `<h2 style="margin-top:10px">Bénédictions ${sv.free ? "(une offerte)" : ""}</h2><div class="row">` + sv.cards.map((c) => `<button data-buff="${c.i}" ${c.bought ? "disabled" : ""} title="${esc(c.desc)}">${esc(c.name)} — ${c.cost} vœux</button>`).join("") + `<button data-reroll="1" ${sv.rerolls ? "" : "disabled"}>Relancer (${sv.rerolls})</button></div>`);
  el.querySelectorAll("[data-buff]").forEach((b) => (b.onclick = () => act(() => M.buyBuff(S, +b.dataset.buff))));
  el.querySelectorAll("[data-reroll]").forEach((b) => (b.onclick = () => act(() => M.rerollShop(S))));
  if (run.buffs.length) el.insertAdjacentHTML("beforeend", `<p class="mute">Actives : ${run.buffs.map((id) => esc(M.buffDef(run.set, id).name)).join(", ")}</p>`);
  const step = () => { const r = M.fightNext(S); runLog.push(`<div>${fr(r.foe)} : ${r.win ? "victoire" : "défaite"}</div>`); };
  if ($("next")) $("next").onclick = () => act(step);
  if ($("all")) $("all").onclick = () => act(() => { while (S.run.phase === "fight") step(); });
  if ($("stop")) $("stop").onclick = () => act(() => M.stopRun(S));
  el.querySelectorAll("[data-keep]").forEach((b) => (b.onclick = () => act(() => {
    const k = b.dataset.keep === "none" ? null : +b.dataset.keep; const sum = M.finishRun(S, k);
    runLog = [`<p>Gardé : ${sum.kept ? fr(sum.kept.k) + (sum.kept.shiny ? " ✦" : "") : "rien"} · +${sum.frags} fragments · +${sum.shards} éclats</p>`];
  })));
}

function renderColl() {
  const rows = Object.entries(S.coll).sort((a, b) => b[1].L - a[1].L).map(([k, e]) => {
    const r = M.roleOf(k), c = M.elevationCost(S, k), form = M.formOf(k, e.elev);
    return `<tr><td>${fr(k)}${form !== k ? ` → ${fr(form)}` : ""}</td><td>${r ? `${M.SET[r.set].name} · ${RF[r.role]}` : "-"}</td>
      <td>${e.normal ? "normal" : ""} ${e.shiny ? '<span class="shiny">✦</span>' : ""}</td>
      <td>N${e.L} / ${M.levelCap(e.elev)}</td><td>élév. ${e.elev}</td><td>${"★".repeat(e.stars)}${"☆".repeat(CONFIG.stars.max - e.stars)}</td>
      <td><button data-elev="${k}" title="${c ? `${c.frags} fragments + ${c.mats} P${c.mat}` : ""}" ${c ? "" : "disabled"}>Élever${c ? ` (${c.frags} fr., ${c.mats} P${c.mat})` : ""}</button>
      <button data-star="${k}" ${e.stars < CONFIG.stars.max ? "" : "disabled"}>Étoile${e.stars < CONFIG.stars.max ? ` (${CONFIG.stars.cost[e.stars]} fr.)` : ""}</button>
      ${e.shiny ? "" : `<button data-shard="${k}">✦ éclats</button>`}</td></tr>`;
  }).join("");
  $("coll").innerHTML = `<table><tr><th>Espèce</th><th>Set</th><th>Copies</th><th>Niveau</th><th>Élévation</th><th>Étoiles</th><th></th></tr>${rows}</table>`;
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const d = b.dataset;
  if (d.exp) act(() => { const r = M.playExpedition(S, +d.exp, M.SETS[0].id); if (!r.cleared) throw new Error(`Expédition ratée : +${r.voeux} vœux quand même.`); });
  if (d.exp10) act(() => { const x = M.DIFFS.map((_, i) => i + 1).reverse().find((y) => M.access(S, y).ok); for (let i = 0; i < 10; i++) M.playExpedition(S, x, M.SETS[i % M.SETS.length].id); });
  if (d.elev) act(() => M.elevate(S, d.elev));
  if (d.star) act(() => M.buyStar(S, d.star));
  if (d.shard) act(() => M.redeemShards(S, d.shard));
});
$("reset").onclick = () => { if (!confirm("Effacer la progression ?")) return; M.localStore.reset(); S = M.newSave((Math.random() * 2 ** 31) | 0); runLog = []; M.localStore.save(S); render(); };
render();
