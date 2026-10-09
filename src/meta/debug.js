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
    `Matériaux ${[1, 2, 3, 4, 5].map((t) => `P${t} <b>${S.mats[t]}</b>`).join(" ")}`,
    `Fragments ${M.SETS.map((s) => `${s.name} <b>${S.frags[s.id]}</b>`).join(" · ")}`,
    `Éclats chroma <b>${S.shards}</b>`,
    `Pity ${M.SETS.map((s) => `${s.id} <b>${Math.round(S.pity[s.id] * 100)}</b>`).join(" ")}`,
  ].map((x) => `<span>${x}</span>`).join("");
  renderExp(); renderRun(); renderColl();
  $("log").textContent = S.log.slice().reverse().join("\n");
}

function renderExp() {
  const E = CONFIG.expedition;
  const team = S.team.map((k) => `${fr(M.formOf(k, S.coll[k].elev))} N${S.coll[k].L}`).join(", ");
  $("exp").innerHTML = `<p class="mute">Équipe : ${esc(team)}</p>` + [1, 2, 3, 4, 5].map((d) => {
    const r = M.rewardsOf(S, d);
    return `<div class="row"><button data-exp="${d}" ${S.run ? "disabled" : ""}>Difficulté ${d}</button>
      <span class="mute">adversaire niv. ${E.foeLevel[d - 1]} · +${r.voeux} vœux${S.firstClear[d] ? "" : " (1er clear)"} · ${Object.entries(r.mats).map(([t, n]) => `P${t}×${n}`).join(" ")}</span></div>`;
  }).join("") + `<div class="row"><button data-exp10="1" ${S.run ? "disabled" : ""}>×10 la plus haute gagnable</button></div>`;
}

function renderRun() {
  const el = $("run"), run = S.run;
  if (!run) {
    el.innerHTML = `<div class="row"><select id="set">${M.SETS.map((s) => `<option value="${s.id}">${esc(s.name)} — ${fr(s.legend)}</option>`).join("")}</select>
      niveau <input id="lvl" type="number" min="1" max="100" value="${Math.max(1, Math.min(...S.team.map((k) => S.coll[k].L)))}" style="width:60px">
      <button class="main" id="start">Lancer (${CONFIG.capture.cost} vœux)</button></div>
      <p class="mute" id="chance"></p>` + (runLog.length ? `<div>${runLog.join("")}</div>` : "");
    const upd = () => { const set = $("set").value, L = +$("lvl").value; const s = M.SET[set]; $("chance").textContent = `${s.nice.map(fr).join(", ")} · faibles : ${s.weak.map(fr).join(", ")} · capture de ${fr(s.legend)} au niveau ${L} : ${(M.legendChance(S, set, L) * 100).toFixed(1)} %`; };
    $("set").onchange = upd; $("lvl").oninput = upd; upd();
    $("start").onclick = () => act(() => { M.startRun(S, { set: $("set").value, level: +$("lvl").value }); runLog = []; });
    return;
  }
  const P = M.publicRun(run);
  const steps = P.foes.map((f, i) => {
    const res = run.results[i];
    const st = res ? (res.win ? `<span class="ok">victoire${res.captured ? " · capturé" : ""}${res.legend ? ` (${(res.legend.chance * 100).toFixed(0)} %)` : ""}${res.reward ? " · matériau rare" : ""}</span>` : `<span class="bad">défaite</span>`) : i === run.i && run.phase === "fight" ? "à jouer" : "";
    return `<tr><td>${i + 1}</td><td>${RF[f.role]}</td><td>${fr(f.k)}${f.shiny ? ' <span class="shiny">✦</span>' : ""}</td><td>${st}</td></tr>`;
  }).join("");
  let html = `<p>${esc(M.SET[run.set].name)}, niveau ${run.level}</p><table>${steps}</table>`;
  if (run.phase === "fight") html += `<div class="row"><button class="main" id="next">Combat suivant</button><button id="all">Tout jouer</button><button id="stop">Arrêter</button></div>`;
  else {
    const ch = M.choices(S);
    html += `<h2 style="margin-top:10px">Choix final : garder un seul Pokémon nouveau</h2><div class="row">` + (ch.map((c) => `<button class="card ${c.isNew ? "new" : ""}" data-keep="${c.i}" ${c.isNew ? "" : "disabled"}>${fr(c.k)}${c.shiny ? ' <span class="shiny">✦ chromatique</span>' : ""}<br><small class="mute">${RF[c.role]}${c.isNew ? " · nouveau" : " · déjà possédé"}</small></button>`).join("") || '<span class="mute">Aucune capture.</span>') +
      `</div><div class="row"><button data-keep="none">Ne rien garder</button><span class="mute">Le reste devient fragments (faible ${CONFIG.capture.fragments.weak}, sympa ${CONFIG.capture.fragments.nice}, légendaire ${CONFIG.capture.fragments.legend}) ; chromatique non gardé = 1 éclat.</span></div>`;
  }
  el.innerHTML = html;
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
    const inTeam = S.team.includes(k);
    return `<tr><td><input type="checkbox" data-team="${k}" ${inTeam ? "checked" : ""}></td>
      <td>${fr(k)}${form !== k ? ` → ${fr(form)}` : ""}</td><td>${r ? `${M.SET[r.set].name} · ${RF[r.role]}` : "-"}</td>
      <td>${e.normal ? "normal" : ""} ${e.shiny ? '<span class="shiny">✦</span>' : ""}</td>
      <td>N${e.L} / ${M.levelCap(e.elev)}</td><td>élév. ${e.elev}</td><td>${"★".repeat(e.stars)}${"☆".repeat(CONFIG.stars.max - e.stars)}</td>
      <td><button data-train="${k}">Entraîner</button>
      <button data-elev="${k}" title="${c ? `${c.frags} fragments + ${c.mats} P${c.mat}` : ""}" ${c ? "" : "disabled"}>Élever${c ? ` (${c.frags} fr., ${c.mats} P${c.mat})` : ""}</button>
      <button data-star="${k}" ${e.stars < CONFIG.stars.max ? "" : "disabled"}>Étoile${e.stars < CONFIG.stars.max ? ` (${CONFIG.stars.cost[e.stars]} fr.)` : ""}</button>
      ${e.shiny ? "" : `<button data-shard="${k}">✦ éclats</button>`}</td></tr>`;
  }).join("");
  $("coll").innerHTML = `<p class="mute">Cocher jusqu'à ${CONFIG.team.size} Pokémon pour l'équipe.</p><table><tr><th>Équipe</th><th>Espèce</th><th>Set</th><th>Copies</th><th>Niveau</th><th>Élévation</th><th>Étoiles</th><th></th></tr>${rows}</table>`;
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const d = b.dataset;
  if (d.exp) act(() => { const r = M.playExpedition(S, +d.exp); if (!r.win) throw new Error(`Défaite contre ${fr(r.foe.k)} (niv. ${r.foe.L}).`); });
  if (d.exp10) act(() => { for (let i = 0; i < 10; i++) { let done = false; for (let x = 5; x >= 1 && !done; x--) { const L = Math.min(...S.team.map((k) => S.coll[k].L)); if (CONFIG.expedition.foeLevel[x - 1] <= L + 2) { M.playExpedition(S, x); done = true; } } if (!done) M.playExpedition(S, 1); } });
  if (d.train) act(() => M.train(S, d.train, 1));
  if (d.elev) act(() => M.elevate(S, d.elev));
  if (d.star) act(() => M.buyStar(S, d.star));
  if (d.shard) act(() => M.redeemShards(S, d.shard));
});
document.addEventListener("change", (e) => {
  const c = e.target.closest("[data-team]"); if (!c) return;
  const sel = [...document.querySelectorAll("[data-team]:checked")].map((x) => x.dataset.team);
  act(() => M.setTeam(S, sel));
});
$("reset").onclick = () => { if (!confirm("Effacer la progression ?")) return; M.localStore.reset(); S = M.newSave((Math.random() * 2 ** 31) | 0); runLog = []; M.localStore.save(S); render(); };
render();
