// Point d'entrée : hall (décor 3D + menu à icônes). Boucle : expédition (difficulté → set → actes et bénédictions)
// → captures, vœux, matériaux → collection (entraînement, élévation). L'ancien Théâtre reste accessible via ?theatre=1.
// Combat rapide pour tester : bouton de l'accueil, ou ?quick=1&team=CHARIZARD,LAPRAS,GENGAR&boss=GROUDON
import { Stage } from "./render/stage.js";
import { Hud } from "./ui/hud.js";
import { Screens } from "./ui/screens.js";
import { Director } from "./game/director.js";
import { loadIndex } from "./render/assets.js";
import { SPECIES } from "./data/data.js";
import { ZONES } from "./data/zones.js";
import { Sfx } from "./audio.js";
import * as R from "./game/run.js";
import { Lobby, SHOWCASE_MAX } from "./lobby/lobby.js";
import { icon } from "./ui/theatre.js";
import { h } from "./core.js";
import * as Meta from "./meta/index.js";
import { MetaScreens } from "./ui/metaScreens.js";
import { RunUI } from "./ui/runScreens.js";

const q = new URLSearchParams(location.search);
const store = {
  get(k, d) { try { const v = localStorage.getItem("pokeimpact." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { if (v == null) localStorage.removeItem("pokeimpact." + k); else localStorage.setItem("pokeimpact." + k, JSON.stringify(v)); } catch (e) {} },
};

let stage, scr, index, lobby, ms, ru, meta;
const saveMeta = () => { Meta.localStore.save(meta); updateRes(); };
function updateRes() { const el = document.querySelector(".lb-res"); if (el && meta) el.innerHTML = `Vœux <b>${meta.voeux}</b> · Éclats <b>${meta.shards}</b>${meta.run ? " · <i>run en cours</i>" : ""}`; }
const has = (k) => !!index[k.toLowerCase()];
const hudRoot = () => document.getElementById("hud");

// Lance un combat avec la scène 3D et rend { win }.
async function fight(cfg) {
  lobby && lobby.leave();
  scr.loading("Chargement du combat…");
  hudRoot().style.display = "";
  const hud = new Hud(hudRoot(), stage);
  const dir = new Director(stage, hud, cfg);
  await dir.load();
  scr.hide();
  const res = await new Promise((resolve) => { dir.onEnd = resolve; dir.run(); });
  dir.dispose();
  hudRoot().innerHTML = ""; hudRoot().style.display = "none";
  stage.shot("wide", { snap: true });
  return res;
}

// ───────── hall ─────────
const MENU = [
  { id: "expedition", icon: "book", label: "Expédition", sub: "Difficulté, set, bénédictions", c: "#ffcf6a" },
  { id: "collection", icon: "crown", label: "Collection", sub: "Entraînement, élévation", c: "#8dff9a" },
  { id: "hall", icon: "star", label: "Hall", sub: "Pokémon exposés", c: "#c58bff" },
  { id: "coop", icon: "moon", label: "Coop", sub: "Bientôt", c: "#ff8fb3", soon: true },
];
function buildMenu() {
  const nav = document.querySelector(".lb-menu");
  nav.innerHTML = "";
  MENU.forEach((m, i) => nav.append(h("button", { class: "lb-item", style: { "--c": m.c }, onclick: () => lobbyAction(m.id) },
    h("span", { class: "lb-ic" }, icon(m.icon)), h("span", null, h("b", null, m.label), h("small", null, m.sub)), h("kbd", null, i + 1))));
  addEventListener("keydown", (e) => {
    if (!lobby.active || scr.open) return;
    const m = MENU[+e.key - 1]; if (m) lobbyAction(m.id);
  });
}
const hallKeys = () => store.get("hall", Object.keys(meta.coll).slice(0, 3)).filter((k) => meta.coll[k]).slice(0, SHOWCASE_MAX);
const refreshHall = () => lobby.setShowcase(hallKeys().map((k) => Meta.formOf(k, meta.coll[k].elev)));
function toLobby() {
  scr.hide(); ru.close();
  lobby.enter(); refreshHall(); updateRes();
  const ui = document.getElementById("lobby-ui");
  ui.style.display = ""; ui.classList.remove("lb-enter", "lb-leave"); void ui.offsetWidth; ui.classList.add("lb-enter");
}
const back = () => toLobby();
function hideHallUi() {
  const ui = document.getElementById("lobby-ui");
  if (ui.style.display === "none") return;
  ui.classList.remove("lb-enter"); ui.classList.add("lb-leave");
  setTimeout(() => { if (ui.classList.contains("lb-leave")) { ui.style.display = "none"; ui.classList.remove("lb-leave"); } }, 200);
}

function lobbyAction(id) {
  hideHallUi();
  if (id === "expedition") return expeditionWelcome();
  if (id === "collection") return collection();
  if (id === "hall") return hallSettings();
  scr.message({ title: "Coop", lines: ["Inviter des amis et partir en expédition à plusieurs : bientôt."], btn: "Retour", onOk: back });
}
function hallSettings() {
  const chosen = hallKeys();
  ms.hallSettings({
    save: meta, chosen, max: SHOWCASE_MAX, onBack: back,
    onToggle: (k) => { const i = chosen.indexOf(k); if (i >= 0) chosen.splice(i, 1); else if (chosen.length < SHOWCASE_MAX) chosen.push(k); store.set("hall", chosen); hallSettings(); },
  });
}

// ───────── boucle de progression (src/meta) ─────────
const fail = (e, then) => scr.message({ title: "Impossible", lines: [e.message], btn: "OK", onOk: then });

// Expédition : Difficulté → Set → actes (équipe de 3 + bénédictions) → choix final → bilan.
function expeditionWelcome() {
  ru.close();
  scr.welcome({ hasRun: !!meta.run, onPrepare: () => runEntry(), onBack: back });
}
function runEntry() {
  if (meta.run) return meta.run.phase === "choice" ? runEnd() : runBoard();
  ru.difficulty({
    save: meta, onBack: () => { ru.close(); expeditionWelcome(); },
    onPick: (diff) => ru.sets({ save: meta, diff, onBack: () => runEntry(), onPick: (set) => startRun({ diff, set }) }),
  });
}
function startRun(opts) {
  try { Meta.startRun(meta, opts); } catch (e) { return fail(e, () => runEntry()); }
  saveMeta(); ru.team = null; runBoard();
}
function runBoard(last = null) {
  ru.board({
    save: meta, last,
    onLeave: () => { ru.close(); back(); },
    onStop: () => { Meta.stopRun(meta); saveMeta(); runEnd(); },
    onBuy: (i) => { let b; try { b = Meta.buyBuff(meta, i); } catch (e) { return fail(e, () => runBoard(last)); } saveMeta(); runBoard({ win: true, text: `Bénédiction : ${b.name}` }); },
    onReroll: () => { try { Meta.rerollShop(meta); } catch (e) { return fail(e, () => runBoard(last)); } saveMeta(); runBoard(last); },
    onFight: async (team) => {
      let cfg; try { cfg = Meta.nextFightConfig(meta, team); } catch (e) { return fail(e, runBoard); }
      saveMeta(); ru.close();
      const res = await fight(cfg);
      const out = Meta.resolveFight(meta, res.win); saveMeta();
      const name = SPECIES[out.foe].fr;
      const v = out.voeux ? ` · +${out.voeux} vœux` : "";
      const text = !out.win ? `Défaite contre ${name}` : out.captured ? `${name} capturé !${v}` : out.legend ? `${name} s'est échappé (${Math.round(out.legend.chance * 100)} %)${v}` : out.reward ? `${name} : matériau P${out.reward.mat} ×${out.reward.n}${v}` : `Victoire !${v}`;
      if (meta.run.phase === "choice") runEnd(); else runBoard({ win: out.win, text });
    },
  });
}
function runEnd() {
  ru.choice({
    save: meta,
    onKeep: (keep) => {
      let sum; try { sum = Meta.finishRun(meta, keep); } catch (e) { return fail(e, runEnd); }
      saveMeta();
      ru.summary({ save: meta, sum, onOk: () => { ru.close(); toLobby(); } });
    },
  });
}

let collMsg = "";
function collection(backTo = back) {
  const again = () => collection(backTo);
  ms.collection({
    save: meta, hall: hallKeys(), msg: collMsg, onBack: () => { collMsg = ""; backTo(); },
    onAct: async (act, k) => {
      collMsg = "";
      try {
        if (act === "trainMax") { const r = Meta.train(meta, k, 500); collMsg = `${SPECIES[k].fr} : niveau ${r.L}`; }
        if (act === "train") { const r = Meta.train(meta, k, 1); collMsg = `${SPECIES[k].fr} : niveau ${r.L}${r.capped ? " (plafond atteint)" : ""}`; }
        if (act === "elev") { const r = Meta.elevate(meta, k); collMsg = `${SPECIES[k].fr} : élévation ${r.elev}${r.evolved ? ` — évolue en ${SPECIES[r.evolved].fr} !` : ""}`; }
        if (act === "star") Meta.buyStar(meta, k);
        if (act === "shards") { Meta.redeemShards(meta, k); collMsg = `${SPECIES[k].fr} chromatique obtenu !`; }
        if (act === "hall") { const c = hallKeys(); const i = c.indexOf(k); if (i >= 0) c.splice(i, 1); else if (c.length < SHOWCASE_MAX) c.push(k); store.set("hall", c); }
      } catch (e) { collMsg = e.message; }
      saveMeta(); again();
    },
  });
}

function hub() {
  const prog = store.get("prog", { unlocked: 1, best: 0 });
  scr.hub({
    hasRun: !!store.get("run", null), best: prog.best,
    onNew: () => pickZone(),
    onResume: () => { lobby.leave(); act(store.get("run")); },
    onBack: back,
  });
}

async function quick() {
  const team = (q.get("team") || "CHARIZARD,LAPRAS,GENGAR").split(",").map((s) => s.trim().toUpperCase()).filter((k) => SPECIES[k] && has(k)).slice(0, 3);
  const boss = ((q.get("boss") || "GROUDON").toUpperCase());
  const lv = +q.get("lv") || 20, BL = { 1: 8, 2: 6, 3: -3, 4: -4 };
  const res = await fight({
    seed: (Math.random() * 2 ** 31) | 0,
    allies: team.map((k) => ({ k, L: lv, charge: q.has("ult") ? 100 : 0 })),
    enemies: [{ k: boss, L: +q.get("flv") || lv + (BL[SPECIES[boss].tier] || 0), boss: true }],
    pool: [], bossHp: +q.get("hp") || 12, bossPow: +q.get("pow") || 0.7,
  });
  scr.message({ title: res.win ? "Victoire !" : "K.O.", btn: "Retour au hall", onOk: () => toLobby() });
}

// ───────── préparation ─────────
function pickZone() {
  const prog = store.get("prog", { unlocked: 1, best: 0 });
  scr.zone({ unlocked: prog.unlocked, onBack: hub, onPick: (zone, diff) => pickTroupe(zone, diff) });
}
function pickTroupe(zone, diff) {
  scr.troupe({
    zone, available: has, preset: store.get("lastTroupe", []).filter(has),
    onBack: pickZone,
    onStart: (troupe) => {
      store.set("lastTroupe", troupe);
      lobby.leave();
      const state = R.createRun({ zone, diff, troupe, seed: (Math.random() * 2 ** 31) | 0 });
      act(state);
    },
  });
}

// ───────── actes ─────────
function save(state) { store.set("run", state.over ? null : state); }

function act(state) {
  save(state);
  if (state.pendingBoon) {
    return scr.boon({ ids: state.pendingBoon, onPick: (id) => { R.chooseBoon(state, id); act(state); }, onSkip: () => { R.skipBoon(state); act(state); } });
  }
  if (state.over) return endRun(state);
  scr.act({
    state,
    onReroll: () => { R.reroll(state); act(state); },
    onQuit: () => { if (confirmQuit()) { state.over = true; state.won = false; endRun(state); } },
    onCard: (i) => {
      const c = state.cards[i];
      if (c.kind !== "combat") {
        try { R.buy(state, i, (k) => has(k)); } catch (e) { alertMsg(e.message); }
        return act(state);
      }
      chooseTeam(state, i);
    },
  });
}
function chooseTeam(state, i) {
  scr.team({
    state, card: state.cards[i], last: store.get("lastTeam", []),
    onBack: () => act(state),
    onGo: async (team) => {
      store.set("lastTeam", team);
      const cfg = R.combatConfig(state, i, team);
      const res = await fight(cfg);
      const c = state.cards[i];
      R.finishCombat(state, i, team, res.win);
      save(state);
      scr.message({
        title: res.win ? "Victoire !" : "Défaite…",
        lines: res.win ? [`+${c.reward} fleurs`] : [state.over ? "Plus de rappel : l'expédition s'arrête." : `Rappels restants : ${state.encores}. Tu peux retenter.`],
        onOk: () => act(state),
      });
    },
  });
}
function endRun(state) {
  save(state);
  const prog = store.get("prog", { unlocked: 1, best: 0 });
  const zi = ZONES.findIndex((z) => z.id === state.zone);
  if (state.won && isFinite(state.nActs) && zi + 1 >= prog.unlocked) prog.unlocked = Math.min(ZONES.length, zi + 2);
  if (!isFinite(state.nActs)) prog.best = Math.max(prog.best || 0, state.cleared);
  store.set("prog", prog);
  store.set("run", null);
  scr.message({
    title: state.won ? "Expédition réussie !" : "Fin de l'expédition",
    lines: [`Combats gagnés : ${state.cleared}`, `Bénédictions : ${state.boons.length}`, state.won && isFinite(state.nActs) ? "Zone suivante débloquée." : ""],
    btn: "Retour au hall", onOk: () => toLobby(),
  });
}
const confirmQuit = () => window.confirm("Abandonner l'expédition en cours ?");
const alertMsg = (m) => window.alert(m);

// ───────── démarrage ─────────
async function start() {
  const msg = document.querySelector("#loading small");
  index = await loadIndex();
  stage = new Stage(document.getElementById("game"), { quality: q.get("q") === "low" ? "low" : "high" });
  if (q.get("dtcap")) stage.maxDt = +q.get("dtcap");
  stage.shot("wide", { snap: true });
  scr = new Screens(document.getElementById("screens"));
  hudRoot().style.display = "none";
  // hall : décor et Pokémon exposés
  const bar = document.querySelector("#loading .bar i");
  meta = Meta.localStore.load((Math.random() * 2 ** 31) | 0);
  ms = new MetaScreens(scr); ru = new RunUI(scr);
  lobby = new Lobby(stage);
  await lobby.load((p) => { if (bar) bar.style.width = Math.round(p * 80) + "%"; });
  await refreshHall();
  buildMenu();
  if (bar) bar.style.width = "100%";
  window.__game = { stage, scr, R, lobby, Meta, get meta() { return meta; } };
  msg.textContent = "CLIC OU TOUCHE POUR COMMENCER";
  await new Promise((r) => { const go = () => { removeEventListener("pointerdown", go); removeEventListener("keydown", go); r(); }; addEventListener("pointerdown", go); addEventListener("keydown", go); if (q.has("autostart")) r(); });
  Sfx.unlock();
  document.getElementById("loading").classList.add("out");
  if (q.has("quick")) return quick();
  if (q.has("theatre")) { toLobby(); hideHallUi(); return hub(); }   // ancien mode Théâtre (plus relié au hall)
  toLobby();
}
start().catch((e) => { console.error(e); const m = document.querySelector("#loading small"); if (m) m.textContent = "Erreur : " + e.message; });
