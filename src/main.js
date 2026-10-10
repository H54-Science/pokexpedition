// Point d'entrée : hall (décor 3D, prochain objectif, menu). Boucle : expédition (difficulté → set → actes et bénédictions)
// → captures, vœux, cristaux → collection (élévation, étoiles). Réglages : son, combat, graphismes, sauvegarde, aide.
// L'ancien Théâtre reste accessible via ?theatre=1.
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
import { openHelp } from "./ui/help.js";

const q = new URLSearchParams(location.search);
const store = {
  get(k, d) { try { const v = localStorage.getItem("pokeimpact." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { if (v == null) localStorage.removeItem("pokeimpact." + k); else localStorage.setItem("pokeimpact." + k, JSON.stringify(v)); } catch (e) {} },
};

let stage, scr, index, lobby, ms, ru, meta;
// Préférences (mêmes clés que le Director pour qte / speed / auto).
const prefs = () => ({ sound: store.get("sound", true), music: store.get("music", true), qte: store.get("qte", true), speed2: store.get("speed", 1) > 1, auto: store.get("auto", false), low: store.get("quality", "high") === "low" });
const applySound = () => { const p = prefs(); Sfx.config({ sound: p.sound, music: p.music }); };
const saveMeta = () => { Meta.localStore.save(meta); updateRes(); };
function updateRes() {
  const el = document.querySelector(".lb-res"); if (!el || !meta) return;
  el.innerHTML = `Vœux <b>${meta.voeux}</b>${meta.shards ? ` · Éclats chroma <b>${meta.shards}</b>` : ""}`;
  renderGoal();
}
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
  { id: "expedition", icon: "book", label: "Expédition", sub: "Combats, captures, bénédictions", c: "#ffbf74", main: true },
  { id: "collection", icon: "crown", label: "Collection", sub: "Élever, étoiles, chromatiques, hall", c: "#8dff9a" },
  { id: "settings", icon: "gear", label: "Réglages", sub: "Son, commandes, comment jouer", c: "#7fd8ff" },
];
function buildMenu() {
  const nav = document.querySelector(".lb-menu");
  nav.innerHTML = "";
  MENU.forEach((m, i) => nav.append(h("button", { class: "lb-item" + (m.main ? " main" : ""), style: { "--c": m.c }, onclick: () => lobbyAction(m.id) },
    h("span", { class: "lb-ic" }, icon(m.icon)), h("span", null, h("b", null, m.label), h("small", null, m.sub)), h("kbd", null, i + 1))));
  addEventListener("keydown", (e) => {
    if (!lobby.active || scr.open) return;
    const m = MENU[+e.key - 1]; if (m) lobbyAction(m.id);
  });
}
// Carte « Prochain objectif » du hall : la chose à faire maintenant, calculée depuis la sauvegarde (src/meta/goals.js).
function renderGoal() {
  const el = document.querySelector(".lb-goal"); if (!el || !meta) return;
  const g = Meta.nextGoal(meta), p = g.progress;
  el.replaceChildren(h("button", { class: "lb-goal-card", onclick: () => goalAction(g) },
    h("small", null, "Prochain objectif"), h("b", null, g.title), h("p", null, g.text),
    p ? h("span", { class: "lb-goal-bar" }, h("i", { style: { width: `${Math.round(100 * Math.min(1, p.n / p.max))}%` } }), h("em", null, `${p.n}/${p.max} ${p.label}`)) : null,
    h("span", { class: "lb-goal-go" }, g.action === "collection" ? "Ouvrir la Collection ›" : meta.run ? "Reprendre ›" : "Partir en expédition ›")));
}
function goalAction(g) {
  hideHallUi();
  if (g.action === "collection") { if (g.focus) ms.collSel = g.focus; return collection(); }
  if (g.diff && Meta.access(meta, g.diff).ok) ru.lastDiff = g.diff;
  if (g.set) ru.lastSet = g.set;
  runEntry();
}
const hallKeys = () => store.get("hall", Object.keys(meta.coll).slice(0, 3)).filter((k) => meta.coll[k]).slice(0, SHOWCASE_MAX);
const refreshHall = () => lobby.setShowcase(hallKeys().map((k) => Meta.formOf(k, meta.coll[k].elev)));
function toLobby() {
  scr.hide(); ru.close(); ms.close();
  lobby.enter(); refreshHall(); updateRes();
  Sfx.music("camp");
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
  if (id === "expedition") return runEntry();
  if (id === "collection") return collection();
  if (id === "settings") return settings();
}

// ───────── réglages ─────────
let settingsMsg = "", reloadNeeded = false;
function settings() {
  const msgNow = settingsMsg; settingsMsg = "";
  ms.settings({
    save: meta, prefs: { ...prefs(), reload: reloadNeeded }, msg: msgNow, onBack: back,
    onSet: (k, v) => {
      if (k === "speed2") store.set("speed", v ? 2 : 1);
      else if (k === "low") { store.set("quality", v ? "low" : "high"); reloadNeeded = true; }
      else store.set(k, v);
      if (k === "sound" || k === "music") applySound();
      settings();
    },
    onReload: () => location.reload(),
    onHelp: () => openHelp(),
    onResetTips: () => { store.set("tips", []); settingsMsg = "Les conseils réapparaîtront au prochain combat."; settings(); },
    onExport: () => {
      const url = URL.createObjectURL(new Blob([Meta.serialize(meta)], { type: "application/json" }));
      const a = h("a", { href: url, download: `pokexpedition-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      settingsMsg = "Sauvegarde exportée."; settings();
    },
    onImport: (text) => {
      try { meta = Meta.deserialize(text); } catch (e) { settingsMsg = "Fichier illisible : " + e.message; return settings(); }
      saveMeta(); refreshHall(); settingsMsg = "Sauvegarde importée."; settings();
    },
    onReset: () => {
      Meta.localStore.reset(); store.set("hall", null);
      meta = Meta.newSave((Math.random() * 2 ** 31) | 0); saveMeta(); refreshHall();
      settingsMsg = "Nouvelle partie commencée."; settings();
    },
  });
}

// ───────── boucle de progression (src/meta) ─────────
const fail = (e, then) => scr.message({ title: "Impossible", lines: [e.message], btn: "OK", onOk: then });

// Expédition : Difficulté → Set → [bénédiction → équipe → combat] × actes → choix final → bilan.
function runEntry() {
  if (meta.run) return meta.run.phase === "choice" ? runEnd() : runBoard();
  Sfx.music("map");
  ru.difficulty({
    save: meta, onBack: () => { ru.close(); back(); },
    onCollection: () => { ru.close(); collection(() => runEntry()); },
    onPick: (diff) => ru.sets({ save: meta, diff, onBack: () => runEntry(), onPick: (set) => startRun({ diff, set }) }),
  });
}
function startRun(opts) {
  try { Meta.startRun(meta, opts); } catch (e) { return fail(e, () => runEntry()); }
  saveMeta(); ru.team = null; ru.blessAct = null; runBoard();
}
function runBoard(last = null) {
  Sfx.music("map");
  const leave = () => { ru.close(); back(); };
  // bénédictions d'abord (une fois par acte), puis l'équipe
  if (Meta.shopView(meta) && ru.blessAct !== meta.run.i) return ru.blessings({
    save: meta, last, onLeave: leave,
    onContinue: () => { ru.blessAct = meta.run.i; runBoard(); },
    onBuy: (i) => { let b; try { b = Meta.buyBuff(meta, i); } catch (e) { return fail(e, () => runBoard(last)); } saveMeta(); runBoard({ win: true, text: `Bénédiction obtenue : ${b.name}` }); },
    onReroll: () => { try { Meta.rerollShop(meta); } catch (e) { return fail(e, () => runBoard(last)); } saveMeta(); runBoard(last); },
  });
  ru.board({
    save: meta, last, onLeave: leave,
    onStop: () => { Meta.stopRun(meta); saveMeta(); runEnd(); },
    onFight: async (team) => {
      let cfg; try { cfg = Meta.nextFightConfig(meta, team); } catch (e) { return fail(e, runBoard); }
      saveMeta(); ru.close();
      const res = await fight(cfg);
      const out = Meta.resolveFight(meta, res.win, cfg.items); saveMeta();
      const name = SPECIES[out.foe].fr, v = out.voeux ? ` · +${out.voeux} vœux` : "";
      const text = !out.win ? `Défaite contre ${name} : l'expédition s'arrête.`
        : out.captured ? `${name} capturé !${v}`
        : out.legend ? (out.legend.chance ? `${name} vaincu, mais il s'est échappé (${Math.round(out.legend.chance * 100)} %)${v}` : `${name} vaincu ! (non capturable à ce niveau)${v}`)
        : out.reward ? `${name} vaincu : +${out.reward.n} ${Meta.matName(out.reward.mat)}${v}` : `Victoire !${v}`;
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
      ru.summary({ save: meta, sum, goal: Meta.nextGoal(meta), onOk: () => { ru.close(); toLobby(); } });
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
        if (act === "elev") { const r = Meta.elevate(meta, k); collMsg = `${SPECIES[k].fr} : élévation ${r.elev}, niveau ${meta.coll[k].L}${r.evolved ? ` — évolue en ${SPECIES[r.evolved].fr} !` : ""}`; }
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
    items: Meta.itemBag(Meta.CONFIG.items.start), itemsPerTurn: Meta.CONFIG.items.perTurn,
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
  const errors = Meta.contentErrors();
  if (errors.length) { msg.textContent = "Contenu à corriger (src/meta/sets.js ou config.js) :"; document.querySelector("#loading > div").append(h("ul", { class: "load-err" }, ...errors.map((e) => h("li", null, e)))); return; }
  index = await loadIndex();
  const missing = Meta.SETS.flatMap((S) => Meta.speciesOf(S)).filter((k) => !has(k));
  if (missing.length) console.warn("Espèces sans modèle 3D (models/index.json) :", missing.join(", "));
  applySound();
  stage = new Stage(document.getElementById("game"), { quality: (q.get("q") || store.get("quality", "high")) === "low" ? "low" : "high" });
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
