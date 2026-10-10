// Point d'entrée : hall (lobby 3D). Boucle : expéditions (vœux, matériaux) → runs de capture (Vœux) → collection (entraînement, élévation).
// Le Théâtre (zone → troupe → actes) reste accessible depuis les expéditions.
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
import { Lobby } from "./lobby/lobby.js";
import { SKINS, skinThumb } from "./lobby/trainer.js";
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
// spawn : "door" (entrée), "stage" (sur la scène, après une expédition), "keep" (là où on était)
function toLobby(spawn = "keep") { scr.hide(); lobby.enter({ spawn }); updateRes(); }
const back = () => toLobby("keep");

function lobbyAction(id) {
  lobby.pause(true);
  if (id === "expedition") return expeditionWelcome();
  if (id === "capture") return runEntry("capture");
  if (id === "collection" || id === "training") return collection();
  if (id === "wardrobe") {
    return scr.wardrobe({
      skins: SKINS, current: lobby.trainer.skin, thumb: skinThumb, onBack: back,
      onPick: async (n) => { store.set("skin", n); await lobby.setSkin(n); back(); },
    });
  }
  scr.message({ title: "Coop", lines: ["Inviter des amis et partir en expédition à plusieurs : bientôt."], btn: "Retour", onOk: back });
}

// ───────── boucle de progression (src/meta) ─────────
const fail = (e, then) => scr.message({ title: "Impossible", lines: [e.message], btn: "OK", onOk: then });

// Expéditions et vœux : Difficulté → (Set) → actes (choix de 3 Pokémon par combat) → fin.
function expeditionWelcome() {
  ru.close();
  scr.welcome({ hasRun: !!meta.run, onPrepare: () => runEntry("expedition"), onBack: back });
}
function runEntry(mode) {
  if (meta.run) return meta.run.phase === "choice" ? runEnd() : runBoard();
  ru.difficulty({
    save: meta, mode, onBack: () => { ru.close(); mode === "expedition" ? expeditionWelcome() : back(); },
    onPick: (diff) => {
      if (mode === "expedition") return startRun({ mode, diff });
      ru.sets({ save: meta, diff, onBack: () => runEntry(mode), onPick: (set) => startRun({ mode, diff, set }) });
    },
  });
}
function startRun(opts) {
  try { Meta.startRun(meta, opts); } catch (e) { return fail(e, () => runEntry(opts.mode)); }
  saveMeta(); ru.team = null; runBoard();
}
function runBoard(last = null) {
  ru.board({
    save: meta, last,
    onLeave: () => { ru.close(); back(); },
    onStop: () => { Meta.stopRun(meta); saveMeta(); runEnd(); },
    onFight: async (team) => {
      let cfg; try { cfg = Meta.nextFightConfig(meta, team); } catch (e) { return fail(e, runBoard); }
      saveMeta(); ru.close();
      const res = await fight(cfg);
      const out = Meta.resolveFight(meta, res.win); saveMeta();
      const name = SPECIES[out.foe].fr;
      const text = !out.win ? `Défaite contre ${name}` : out.captured ? `${name} capturé !` : out.legend ? `${name} s'est échappé (${Math.round(out.legend.chance * 100)} %)` : out.reward ? `${name} : matériau P${out.reward.mat} ×${out.reward.n}` : out.voeux ? `Victoire ! +${out.voeux} vœux` : "Victoire !";
      if (meta.run.phase === "choice") runEnd(); else runBoard({ win: out.win, text });
    },
  });
}
function runEnd() {
  const finish = (keep) => {
    let sum; try { sum = Meta.finishRun(meta, keep); } catch (e) { return fail(e, runEnd); }
    saveMeta();
    ru.summary({ save: meta, sum, onOk: () => { ru.close(); toLobby("keep"); } });
  };
  if (meta.run.mode === "expedition") return finish(null);
  ru.choice({ save: meta, onKeep: finish });
}

let collMsg = "";
function collection(backTo = back) {
  const again = () => collection(backTo);
  ms.collection({
    save: meta, partner: lobby.partnerKey, msg: collMsg, onBack: () => { collMsg = ""; backTo(); },
    onAct: async (act, k) => {
      collMsg = "";
      try {
        if (act === "trainMax") { const r = Meta.train(meta, k, 500); collMsg = `${SPECIES[k].fr} : niveau ${r.L}`; }
        if (act === "train") { const r = Meta.train(meta, k, 1); collMsg = `${SPECIES[k].fr} : niveau ${r.L}${r.capped ? " (plafond atteint)" : ""}`; }
        if (act === "elev") { const r = Meta.elevate(meta, k); collMsg = `${SPECIES[k].fr} : élévation ${r.elev}${r.evolved ? ` — évolue en ${SPECIES[r.evolved].fr} !` : ""}`; }
        if (act === "star") Meta.buyStar(meta, k);
        if (act === "shards") { Meta.redeemShards(meta, k); collMsg = `${SPECIES[k].fr} chromatique obtenu !`; }
        if (act === "partner") { store.set("partner", k); scr.loading("Ton partenaire arrive…"); await lobby.setPartner(Meta.formOf(k, meta.coll[k].elev)); lobby.partnerKey = k; }
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
  scr.message({ title: res.win ? "Victoire !" : "K.O.", btn: "Retour au hall", onOk: () => toLobby("keep") });
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
    btn: "Retour au hall", onOk: () => toLobby("stage"),
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
  // hall : modèle, dresseur, partenaire
  const bar = document.querySelector("#loading .bar i");
  meta = Meta.localStore.load((Math.random() * 2 ** 31) | 0);
  ms = new MetaScreens(scr); ru = new RunUI(scr);
  lobby = new Lobby(stage, { onAction: lobbyAction });
  await lobby.load((p) => { if (bar) bar.style.width = Math.round(p * 80) + "%"; });
  await lobby.setSkin(store.get("skin", SKINS[0]));
  const partner = [store.get("partner", null), ...Object.keys(meta.coll)].find((k) => k && meta.coll[k]);
  await lobby.setPartner(Meta.formOf(partner, meta.coll[partner].elev)); lobby.partnerKey = partner;
  if (bar) bar.style.width = "100%";
  window.__game = { stage, scr, R, lobby, Meta, get meta() { return meta; } };
  msg.textContent = "CLIC OU TOUCHE POUR COMMENCER";
  await new Promise((r) => { const go = () => { removeEventListener("pointerdown", go); removeEventListener("keydown", go); r(); }; addEventListener("pointerdown", go); addEventListener("keydown", go); if (q.has("autostart")) r(); });
  Sfx.unlock();
  document.getElementById("loading").classList.add("out");
  if (q.has("quick")) return quick();
  if (q.has("theatre")) { toLobby("door"); lobby.pause(true); return hub(); }   // ancien mode Théâtre (plus relié au hall)
  toLobby("door");
}
start().catch((e) => { console.error(e); const m = document.querySelector("#loading small"); if (m) m.textContent = "Erreur : " + e.message; });
