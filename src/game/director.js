// Metteur en scène du combat : fait tourner le moteur, rejoue ses événements en 3D,
// récupère les choix du joueur (souris + clavier), gère auto / ×2 / frappes rythmées.
import * as THREE from "three";
import { Clock, wait, sleep, tween, Ease, clamp } from "../core.js";
import { Combat } from "../combat/engine.js";
import { SPECIES, TYPE_COLOR, fr } from "../data/data.js";
import { makePokemon, portrait } from "../render/assets.js";
import { Sfx } from "../audio.js";

const CONTACT = new Set(["Normal", "Combat", "Acier", "Ténèbres", "Insecte", "Dragon", "Roche", "Sol"]);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const store = {
  get(k, d) { try { const v = localStorage.getItem("pokeimpact." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("pokeimpact." + k, JSON.stringify(v)); } catch (e) {} },
};

export class Director {
  constructor(stage, hud, cfg) {
    this.stage = stage; this.hud = hud; this.cfg = cfg;
    this.settings = { auto: store.get("auto", false), speed: store.get("speed", 1), qte: store.get("qte", true) };
    this.input = null;
    this.busy = false;
    hud.onCard = (id) => this.tapCard(id);
    stage.onFrame = () => hud.place();
    this.onKey = (e) => this.key(e);
    this.onPointer = (e) => this.pointer(e);
    addEventListener("keydown", this.onKey);
    stage.canvas.addEventListener("pointerdown", this.onPointer);
  }

  // ───────── mise en place ─────────
  async load(progress) {
    const cfg = this.cfg;
    this.b = new Combat({ seed: cfg.seed, allies: cfg.allies, enemies: cfg.enemies, pool: cfg.pool, danger: cfg.danger });
    const units = this.b.units;
    const species = [...new Set(units.map((u) => u.k).concat(cfg.pool || []))];
    let done = 0; const total = units.length + species.length;
    const step = () => progress && progress(++done / total);
    // modèles
    this.models = {};
    await Promise.all(units.map(async (u) => { this.models[u.id] = await makePokemon(u.k, { boss: u.boss, shiny: u.shiny }); step(); }));
    // portraits (un rendu par espèce, à la suite)
    const pics = {};
    for (const k of species) { pics[k] = await portrait(k); step(); }
    this.hud.setPortraits(pics);
    for (const u of units) { this.stage.addUnit(u.id, this.models[u.id], u.side); this.hud.addUnit(u); }
    this.layout(false);
    this.buildTopbar();
  }
  layout(anim) {
    this.stage.layout("ally", this.b.allies.map((u) => u.id), anim);
    this.stage.layout("enemy", this.b.living("enemy").map((u) => u.id), anim);
  }
  buildTopbar() {
    const s = this.settings;
    this.hud.buttons([
      { id: "qte", label: "Frappes rythmées", on: s.qte, onclick: () => this.toggle("qte"), title: "Jauge : zone verte = excellent (+30 % de dégâts ou −55 % subis), jaune = bien" },
      { id: "speed", label: "×" + s.speed, on: s.speed > 1, key: "X", onclick: () => this.toggle("speed") },
      { id: "auto", label: "Auto", on: s.auto, key: "A", onclick: () => this.toggle("auto") },
    ]);
  }
  toggle(k) {
    const s = this.settings;
    if (k === "speed") { s.speed = s.speed > 1 ? 1 : 2; Clock.scale = s.speed; this.hud.setBtn("speed", s.speed > 1, "×" + s.speed); }
    else { s[k] = !s[k]; this.hud.setBtn(k, s[k]); }
    store.set(k, s[k]);
    if (k === "auto" && s.auto && this.input) this.runAuto();
  }

  // ───────── déroulé ─────────
  async run() {
    Clock.scale = this.settings.speed;
    const b = this.b;
    this.hud.setTitle(this.cfg.title || "Combat");
    this.hud.setPts(b.pts);
    await this.intro();
    await this.play(b.begin());
    this.target = this.defaultTarget();
    while (!b.over) {
      const t = b.nextTurn();
      await this.play(t.events);
      if (!t.skipped && !b.over) {
        const u = b.unit(t.actor);
        if (u.side === "ally") await this.allyTurn(u);
        else await this.enemyTurn(u);
      }
      await this.play(b.endTurn());
      this.refreshIntents();
      await wait(140);
    }
    await this.finish();
  }

  async intro() {
    const st = this.stage;
    st.shot("intro", { snap: true });
    Sfx.music(this.cfg.boss ? "boss" : "battle");
    // les ennemis tombent du ciel
    for (const e of this.b.enemies) { const p = this.models[e.id].pivot; p.position.y = 6; p.visible = false; }
    await sleep(300);
    st.shot("wide", { k: 1.4 });
    for (const e of this.b.enemies) {
      const p = this.models[e.id].pivot, U = st.units.get(e.id);
      p.visible = true;
      tween(p.position, { y: 0 }, 520, Ease.outBounce).then(() => { st.fx.shock(U.home, TYPE_COLOR[SPECIES[e.k].t[0]], 1.8, 450); st.shake(e.boss ? 10 : 4, 250); Sfx.play("hit", 0.3); });
      await wait(170);
    }
    await sleep(900);
    this.refreshIntents();
  }

  defaultTarget() {
    const live = this.b.living("enemy");
    return (live.find((e) => e.boss) || live[0] || {}).id || null;
  }
  setTarget(id) {
    const u = this.b.unit(id); if (!u || !u.alive || u.side !== "enemy") return;
    this.target = id;
    this.stage.setTarget(id, true);
    this.hud.setTarget(id);
    if (this.input) this.stage.shot("shoulder", { id: this.input.u.id, target: id, k: 3 });
  }
  cycleTarget(dir) {
    const live = this.b.living("enemy").sort((a, b) => this.stage.units.get(a.id).home.x - this.stage.units.get(b.id).home.x);
    if (!live.length) return;
    const i = live.findIndex((e) => e.id === this.target);
    this.setTarget(live[(i + dir + live.length) % live.length].id);
    Sfx.play("soft");
  }
  refreshIntents() {
    const map = {};
    for (const e of this.b.living("enemy")) map[e.id] = this.b.intentOf(e);
    this.hud.setIntents(map);
  }
  refreshTimeline(nowId) { this.hud.timeline(this.b.preview(8), nowId); }

  // ───────── tour d'un allié ─────────
  async allyTurn(u) {
    if (!this.target || !this.b.unit(this.target).alive) this.target = this.defaultTarget();
    this.setTarget(this.target);
    this.stage.solo(u.id);
    this.stage.shot("shoulder", { id: u.id, target: this.target });
    const act = await new Promise((resolve) => {
      this.input = { u, resolve };
      this.showMoves();
      if (this.settings.auto) this.runAuto();
    });
    this.input = null;
    this.hud.hideMoves();
    if (!act || this.b.over || !u.alive) return;
    const opt = this.b.optionsOf(u)[act.idx];
    const m = opt.m, tg = m.tg || "one";
    const target = tg === "ally" ? this.b.lowest(u).id : act.target || this.target;
    const q = Combat.timed(m) ? await this.timing("atk", u, m, tg === "one" || tg === "blast" ? target : null) : 0;
    await this.play(this.b.act(u.id, { idx: act.idx, target, q }));
    if (this.target && !this.b.unit(this.target).alive) this.target = this.defaultTarget();
  }
  showMoves() {
    if (!this.input) return;
    const u = this.input.u;
    this.hud.showCommands(u, { getOpts: () => this.b.optionsOf(u), onPick: (i) => this.pick(i), onUlt: () => this.tapCard(u.id) });
  }
  pick(i) {
    if (!this.input || this.busy) return;
    const u = this.input.u, opt = this.b.optionsOf(u)[i];
    if (!opt) return;
    if (!opt.ok) { Sfx.play("weak"); this.hud.deny(); this.hud.toast("Pas assez d'énergie : l'attaque en rapporte 1."); return; }
    Sfx.play("tap");
    this.input.resolve({ idx: i, target: this.target });
  }
  async runAuto() {
    const inp = this.input; if (!inp || inp._auto) return;
    inp._auto = true;
    await wait(350);
    if (this.input !== inp || !this.settings.auto) { inp._auto = false; return; }
    for (const a of this.b.living("ally")) if (this.b.canUlt(a.id) && this.input === inp) await this.castUlt(a.id);
    if (this.input !== inp) return;
    const p = this.b.autoPlan(inp.u);
    inp._auto = false;
    if (p && this.input === inp && this.settings.auto) { if (p.target && this.b.unit(p.target).side === "enemy") this.setTarget(p.target); inp.resolve({ idx: p.idx, target: p.target }); }
  }

  // Ultime : action bonus pendant le tour d'un allié.
  async tapCard(id) {
    if (!this.input || this.busy) return;
    if (!this.b.canUlt(id)) { const u = this.b.unit(id); if (u && u.alive) this.hud.toast(`${fr(u.k)} : ultime à ${Math.floor(u.charge)} %`); return; }
    await this.castUlt(id);
  }
  async castUlt(id) {
    if (this.busy || !this.b.canUlt(id)) return;
    this.busy = true;
    this.hud.hideMoves();
    const u = this.b.unit(id), m = SPECIES[u.k].ult, tg = m.tg || "one";
    const target = tg === "one" || tg === "blast" ? this.target : null;
    const q = Combat.timed(m) && !this.settings.auto ? await this.timing("atk", u, m, target, true) : 0;
    await this.play(this.b.ult(id, { target, q }));
    this.busy = false;
    const inp = this.input;
    if (this.b.over || (inp && !inp.u.alive)) { if (inp) inp.resolve(null); return; }
    if (this.target && !this.b.unit(this.target).alive) this.target = this.defaultTarget();
    if (inp) { this.setTarget(this.target); this.stage.setActive(inp.u.id); this.stage.solo(inp.u.id); this.stage.shot("shoulder", { id: inp.u.id, target: this.target }); this.showMoves(); }
  }

  // ───────── tour ennemi ─────────
  async enemyTurn(e) {
    const it = this.b.intentOf(e);
    this.stage.solo(null);
    this.stage.shot("enemy", { id: e.id });
    await wait(260);
    let q = 0;
    if (it && it.m.p > 0) {
      const tg = it.m.tg || "one";
      q = await this.timing("def", e, it.m, tg === "one" || tg === "blast" ? it.tgt : null);
    }
    await this.play(this.b.enemyAct({ q }));
  }

  // Frappe rythmée sur la cible (ou au centre du camp visé).
  async timing(kind, u, m, targetId, ult) {
    if (!this.settings.qte || this.settings.auto) return 0;
    const st = this.stage;
    const side = u.side === "ally" ? "enemy" : "ally";
    const pos = () => {
      if (targetId && st.units.get(targetId)) return st.center(targetId);
      const ids = this.b.living(side).map((x) => x.id);
      const c = V(0, 0, 0); ids.forEach((id) => c.add(st.center(id))); return c.multiplyScalar(1 / Math.max(1, ids.length));
    };
    // préparation : le lanceur se ramasse et brille pendant que l'anneau se referme
    const P = this.models[u.id];
    tween(P.body.scale, { y: 0.9, x: 1.06, z: 1.06 }, 300, Ease.outQuad);
    const glow = setInterval(() => st.fx.rise(st.pos(u.id).clone(), TYPE_COLOR[m.t], 2, P.radius, P.height), 60);
    const q = await this.hud.timing(pos, { kind, color: TYPE_COLOR[m.t], D: ult ? 820 : 720 });
    clearInterval(glow);
    tween(P.body.scale, { y: 1, x: 1, z: 1 }, 160, Ease.outBack);
    if (q === 2) Sfx.play("crit"); else if (q === 1) Sfx.play("tap");
    return q;
  }

  // ───────── entrées ─────────
  key(e) {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === "a") return this.toggle("auto");
    if (k === "x") return this.toggle("speed");
    if (!this.input || this.busy) return;
    if (k === "q") return this.pick(0);
    if (k === "e") return this.hud.movesOpen() ? this.hud.closeMoves() : this.hud.openMoves();
    if (k === "escape") return this.hud.closeMoves();
    if (k === "u") return this.tapCard(this.input.u.id);
    if (/^[1-3]$/.test(k)) {
      if (this.hud.movesOpen()) return this.pick(+k);
      const a = this.b.allies[+k - 1]; if (a) this.tapCard(a.id);
    }
    if (k === "arrowleft") return this.cycleTarget(-1);
    if (k === "arrowright") return this.cycleTarget(1);
  }
  pointer(e) {
    if (!this.input || this.busy) return;
    const id = this.stage.pick(e.clientX, e.clientY);
    if (!id) return;
    const u = this.b.unit(id);
    if (u.side === "enemy" && id !== this.target) { this.setTarget(id); Sfx.play("soft"); }
    else if (u.side === "ally") this.tapCard(id);
  }

  // ───────── rejeu des événements ─────────
  async play(events) {
    for (const ev of events) await this.on(ev);
  }
  async on(ev) {
    const st = this.stage, hud = this.hud, b = this.b;
    switch (ev.t) {
      case "turn": {
        const u = b.unit(ev.id);
        st.setActive(ev.id); hud.setActive(ev.id);
        this.refreshTimeline(ev.id);
        if (u.side === "ally") st.shot("shoulder", { id: u.id, target: this.target || this.defaultTarget() });
        break;
      }
      case "pts": hud.setPts(ev.pts, ev.gain > 0); if (ev.gain > 0) Sfx.play("pts"); break;
      case "charge": hud.apply({ id: ev.id, charge: ev.charge }); if (ev.ready && b.unit(ev.id).side === "ally") Sfx.play("ultReady"); break;
      case "move": await this.moveStart(ev); break;
      case "hit": await this.hit(ev); break;
      case "moveEnd": await this.retreat(); this.cur = null; break;
      case "rxHit": case "dotHit": case "recoil": case "dmg": {
        hud.apply(ev.u);
        if (!st.units.get(ev.id)) break;
        const c = ev.t === "dotHit" ? undefined : ev.color;
        hud.float(st.center(ev.id), String(ev.dmg), "small", c || (ev.t === "recoil" ? "#ffb0a0" : undefined));
        st.flash(ev.id, c || "#ffffff", 90);
        if (ev.t === "rxHit") await wait(90);
        break;
      }
      case "dot": {
        const col = { poison: "#c070e0", curse: "#9a7ae0", burn: "#ff8a3a" }[ev.k];
        st.fx.burst(ev.k === "burn" ? "Feu" : ev.k === "poison" ? "Poison" : "Spectre", st.center(ev.id), 0.4, { noFlare: true });
        hud.float(st.top(ev.id), { poison: "Poison", curse: "Malédiction", burn: "Brûlure" }[ev.k], "label", col);
        await wait(380);
        break;
      }
      case "reaction": await this.reaction(ev); break;
      case "ko": await this.ko(ev); break;
      case "heal":
        hud.apply(ev.u);
        if (!ev.quiet || ev.v >= 3) hud.float(st.center(ev.id), "+" + ev.v, "heal");
        if (!ev.quiet) { st.fx.rise(st.pos(ev.id).clone(), "#9ff0b0", 18, st.units.get(ev.id).P.radius, st.units.get(ev.id).P.height); Sfx.play("heal"); }
        break;
      case "shield": hud.apply(ev.u); st.fx.shock(st.pos(ev.id).clone(), "#8ad8ff", 1.4, 420); hud.float(st.top(ev.id), "Bouclier", "label", "#8ad8ff"); Sfx.play("shield"); break;
      case "buff": {
        const up = Object.values(ev.buff).some((v) => v > 0);
        const txt = Object.keys(ev.buff).map((k) => ({ atk: "Atq", def: "Déf", spd: "Vit", crit: "Crit" }[k] + (ev.buff[k] > 0 ? "↑" : "↓"))).join(" ");
        hud.float(st.top(ev.id), txt, "label", up ? "#ffd060" : "#8ab8ff");
        st.fx.rise(st.pos(ev.id).clone(), up ? "#ffd060" : "#8ab8ff", 12, st.units.get(ev.id).P.radius, st.units.get(ev.id).P.height);
        Sfx.play(up ? "buff" : "debuff");
        break;
      }
      case "status": {
        hud.apply(ev.u);
        const S = { poison: "Poison", burn: "Brûlure", sleep: "Sommeil", frozen: "Gel", stun: "Étourdi", para: "Paralysie", fear: "Peur !", slow: "Ralenti", defdown: "Déf ↓", atkdown: "Atq ↓", curse: "Malédiction" };
        hud.float(st.top(ev.id), S[ev.k] || ev.k, "label", "#e0a8ff");
        Sfx.play("debuff");
        break;
      }
      case "cleanse": hud.apply(ev.u); break;
      case "say": hud.float(st.top(ev.id), ev.text, "label", "#ffd060"); if (ev.u) hud.apply(ev.u); break;
      case "skip": {
        hud.apply(ev.u);
        const txt = { frozen: "Gelé !", sleep: "Dort…", stun: "Étourdi !", para: "Paralysé !" }[ev.why];
        hud.float(st.top(ev.id), txt, "label", "#ffe066");
        if (ev.why === "frozen") st.fx.burst("Glace", st.center(ev.id), 0.7);
        if (ev.why === "para") st.fx.burst("Électrik", st.center(ev.id), 0.5);
        await wait(700);
        break;
      }
      case "phase": await this.phase(ev); break;
      case "spawn": await this.spawn(ev); break;
      case "endTurn": hud.apply(ev.u); break;
      case "end": break;
    }
  }

  // ───────── chorégraphie d'une capacité ─────────
  async moveStart(ev) {
    const st = this.stage, b = this.b;
    const u = b.unit(ev.id), m = ev.m, P = this.models[ev.id], U = st.units.get(ev.id);
    this.cur = { ev, u, m, P, U, contact: false, hitsShown: 0, projected: new Set() };
    this.hud.banner(ev.id, m, ev.slot);
    Sfx.play("cast", m.t);
    if (ev.slot === "ult") await this.ultCinematic(ev);
    const tg = ev.tg;
    if (!ev.offensive) {
      // soutien : halo + particules qui montent
      st.fx.shock(U.home.clone(), TYPE_COLOR[m.t], 1.6, 500);
      st.fx.rise(U.home.clone(), TYPE_COLOR[m.t], 20, P.radius, P.height);
      await this.hop(P, 0.35, 260);
      return;
    }
    if (tg === "all") {
      st.solo(null);
      st.shot("aoe", { side: u.side === "ally" ? "ally" : "enemy" });
      await this.hop(P, 0.8, 380);
      const foes = b.enemiesOf(u).map((x) => st.units.get(x.id).home);
      const c = foes.reduce((a, v) => a.add(v), V(0, 0, 0)).multiplyScalar(1 / Math.max(1, foes.length));
      st.fx.shock(c, TYPE_COLOR[m.t], 5, 600);
      st.fx.shock(c, "#ffffff", 3.5, 420);
      st.shake(8, 300);
      Sfx.play("boom");
      await wait(160);
      return;
    }
    if (tg === "rand") { await this.hop(P, 0.3, 200); return; }
    // une cible : au contact si attaque physique, sinon à distance
    const t = ev.target && st.units.get(ev.target);
    if (!t) return;
    this.cur.contact = CONTACT.has(m.t) && m.p > 0;
    if (this.cur.contact) await this.dash(P, U, t);
    else await this.windup(P, U, t);
  }
  async hop(P, hgt, ms) {
    await tween(P.pivot.position, { y: hgt }, ms * 0.45, Ease.outQuad);
    await tween(P.pivot.position, { y: 0 }, ms * 0.55, Ease.inQuad);
  }
  // Élan vers la cible (saut en arc), puis frappe.
  async dash(P, U, T) {
    const from = U.home.clone(), to = T.P.pivot.position.clone();
    const dir = to.clone().sub(from).setY(0).normalize();
    const dest = to.clone().addScaledVector(dir, -(T.P.radius + P.radius + 0.25));
    P.pivot.rotation.y = Math.atan2(dir.x, dir.z);
    P.play("walk", { speed: 2.2, fade: 0.1 });
    await tween(P.body.scale, { y: 0.86 }, 110, Ease.outQuad);
    tween(P.body.scale, { y: 1.08 }, 140, Ease.outQuad).then(() => tween(P.body.scale, { y: 1 }, 180, Ease.outQuad));
    const s = { t: 0 };
    await tween(s, { t: 1 }, 300, Ease.inOutCubic, { onUpdate: () => { P.pivot.position.lerpVectors(from, dest, s.t); P.pivot.position.y = Math.sin(s.t * Math.PI) * 0.7; } });
    P.pivot.position.y = 0;
    P.play("idle", { fade: 0.15 });
    // petit coup en avant
    tween(P.pivot.position, { x: dest.x + dir.x * 0.25, z: dest.z + dir.z * 0.25 }, 70, Ease.outQuad);
  }
  async windup(P, U, T) {
    const dir = T.P.pivot.position.clone().sub(U.home).setY(0).normalize();
    P.pivot.rotation.y = Math.atan2(dir.x, dir.z);
    await tween(P.pivot.position, { x: U.home.x - dir.x * 0.25, z: U.home.z - dir.z * 0.25 }, 140, Ease.outQuad);
    tween(P.pivot.position, { x: U.home.x + dir.x * 0.35, z: U.home.z + dir.z * 0.35 }, 120, Ease.outQuad);
  }
  async retreat() {
    const c = this.cur; if (!c) return;
    const { P, U } = c;
    if (!U.alive) return;
    const to = U.home.clone();
    if (P.pivot.position.distanceTo(to) > 0.5) {
      P.play("walk", { speed: 2.2, fade: 0.1 });
      const from = P.pivot.position.clone(), s = { t: 0 };
      await tween(s, { t: 1 }, 320, Ease.inOutCubic, { onUpdate: () => { P.pivot.position.lerpVectors(from, to, s.t); P.pivot.position.y = Math.sin(s.t * Math.PI) * 0.4; } });
      P.play("idle", { fade: 0.2 });
    } else await tween(P.pivot.position, { x: to.x, y: 0, z: to.z }, 160, Ease.outQuad);
    P.pivot.position.copy(to);
    tween(P.pivot.rotation, { y: U.face }, 200, Ease.outQuad);
  }

  async hit(ev) {
    const st = this.stage, hud = this.hud, c = this.cur;
    const T = st.units.get(ev.id); if (!T) return;
    const m = c ? c.m : { t: ev.type, n: "" };
    const src = ev.src && st.units.get(ev.src);
    // à distance : un projectile par cible (ou par coup pour les coups au hasard)
    if (c && !c.contact && src && !ev.splash && !(c.ev.tg === "all")) {
      const key = c.ev.tg === "rand" ? "r" + c.hitsShown : ev.id + ":" + ev.i;
      if (!c.projected.has(key)) {
        c.projected.add(key);
        const a = st.mouth(ev.src), bpos = st.center(ev.id);
        if (c.ev.slot === "ult" || c.ev.slot === "heavy") { st.fx.beam(a, bpos, TYPE_COLOR[m.t], 420, c.ev.slot === "ult" ? 0.3 : 0.18); await wait(120); }
        else await st.fx.projectile(m.t, a, bpos, { dur: 260, arc: c.ev.tg === "rand" ? 1.2 : 0.5 });
      }
    }
    c && c.hitsShown++;
    const k = ev.k || 0.1, big = ev.crit || ev.slot === "ult" || (c && c.ev.q === 2 && T.side === "enemy");
    const pos = st.center(ev.id);
    st.fx.burst(ev.type, pos, (ev.aoe ? 0.7 : 1) * (ev.crit ? 1.4 : 1) * (ev.slot === "ult" ? 1.5 : 1) * (0.7 + k));
    if (big) st.fx.shock(pos, "#ffffff", 1.6, 300, { vertical: true, width: 0.08 });
    st.flash(ev.id, "#ffffff", 110);
    this.hud.apply(ev.u);
    // chiffres
    const colr = T.side === "enemy" ? TYPE_COLOR[ev.type] : "#ff9a8a";
    hud.float(pos, String(ev.dmg), ev.crit ? "crit" : ev.aoe || ev.splash ? "small" : "", ev.crit ? null : lighten(colr));
    if (!ev.aoe && !ev.splash && ev.i === 0) {
      if (ev.eff > 1) hud.float(st.top(ev.id), "Super efficace !", "label", "#ffd060");
      else if (ev.eff < 1) hud.float(st.top(ev.id), "Peu efficace…", "label", "#a8b0c8");
    }
    // son, tremblement, arrêt sur image, recul
    if (ev.crit) Sfx.play("crit"); else Sfx.play("hit", k);
    if (ev.i === 0 && !ev.aoe) { if (ev.eff > 1) Sfx.play("superEff"); else if (ev.eff < 1) Sfx.play("weak"); }
    Clock.hitstop(ev.crit ? 110 : 35 + k * 90);
    st.shake(3 + k * 14 + (ev.crit ? 4 : 0) + (ev.slot === "ult" ? 5 : 0), 220 + k * 220);
    this.knock(T, src, 0.18 + k * 0.5);
    await wait(ev.aoe ? 70 : c && c.ev.m.hits > 1 ? 120 : 160);
  }
  knock(T, src, dist) {
    if (!T.alive) return;
    const P = T.P, from = src ? src.P.pivot.position : V(0, 0, 0);
    const dir = P.pivot.position.clone().sub(from).setY(0); if (dir.lengthSq() < 1e-4) dir.set(0, 0, T.side === "ally" ? 1 : -1); dir.normalize();
    const h = T.home;
    tween(P.pivot.position, { x: h.x + dir.x * dist, z: h.z + dir.z * dist }, 70, Ease.outQuad).then(() => tween(P.pivot.position, { x: h.x, z: h.z }, 320, Ease.outCubic));
    tween(P.body.rotation, { x: (T.side === "ally" ? 1 : -1) * -0.18 }, 70).then(() => tween(P.body.rotation, { x: 0 }, 300, Ease.outBack));
  }

  async reaction(ev) {
    const st = this.stage, hud = this.hud;
    if (!st.units.get(ev.id)) return;
    const pos = st.center(ev.id);
    hud.float(st.top(ev.id).add(V(0, 0.4, 0)), ev.name.toUpperCase(), "rx", ev.color);
    st.fx.shock(pos, ev.color, 2.4, 520, { vertical: true });
    st.fx.shock(st.pos(ev.id).clone(), ev.color, 3, 600);
    st.fx.burst(ev.from || "Normal", pos, 1.3);
    hud.flash(0.22, 260, ev.color);
    Sfx.play("reaction", ev.rx);
    Clock.hitstop(80);
    if (ev.rx === "electro") { const others = this.b.living("enemy").filter((e) => e.id !== ev.id).slice(0, 2); for (const o of others) st.fx.bolt(pos, st.center(o.id), "#b48cff"); }
    await wait(ev.secondary ? 120 : 280);
  }

  async ko(ev) {
    const st = this.stage, U = st.units.get(ev.id); if (!U) return;
    this.hud.apply(ev.u);
    U.alive = false;
    const P = U.P, pos = st.center(ev.id);
    Sfx.play("ko");
    st.fx.burst(SPECIES[P.k].t[0], pos, 1.1);
    st.flash(ev.id, "#ffffff", 220);
    await wait(180);
    P.mats.forEach((m) => { m.transparent = true; m.needsUpdate = true; });
    const o = { a: 1 };
    tween(o, { a: 0 }, 520, Ease.inQuad, { onUpdate: () => P.mats.forEach((m) => (m.opacity = o.a)) }).then(() => { P.pivot.visible = false; });
    tween(P.body.scale, { y: 0.4, x: 1.2, z: 1.2 }, 520, Ease.inQuad);
    st.fx.rise(st.pos(ev.id).clone(), "#ffffff", 16, P.radius, P.height);
    if (U.side === "enemy") {
      this.hud.removeUnit(ev.id);
      if (this.target === ev.id) { this.target = this.defaultTarget(); this.stage.setTarget(this.target, !!this.input); this.hud.setTarget(this.target); }
    }
    await wait(260);
  }

  // Ultime : assombrissement, gros plan, bandeau, ralenti.
  async ultCinematic(ev) {
    const st = this.stage, hud = this.hud, u = this.b.unit(ev.id), P = this.models[ev.id];
    Sfx.play("ultStart");
    if (u.side === "ally") st.solo(ev.id);
    st.spotlight(ev.id); st.setDim(0.72);
    hud.letterbox(true);
    if (u.side === "ally") { P.pivot.rotation.y = Math.PI; }
    st.shot("closeup", { id: ev.id, k: 7 });
    const close = hud.cutIn(ev.id, ev.m, u.side);
    const slow = Clock.scale; Clock.scale = 0.35 * slow;
    const iv = setInterval(() => st.fx.rise(st.pos(ev.id).clone(), TYPE_COLOR[ev.m.t], 3, P.radius * 1.2, P.height * 1.2), 40);
    st.fx.shock(st.pos(ev.id).clone(), TYPE_COLOR[ev.m.t], 2.6, 900);
    st.fx.shock(st.pos(ev.id).clone(), "#ffffff", 1.6, 700);
    tween(P.body.scale, { x: 1.08, y: 1.08, z: 1.08 }, 260, Ease.outBack);
    await sleep(Math.round(1150 / Math.max(1, this.settings.speed * 0.8)));
    clearInterval(iv);
    close();
    Clock.scale = slow;
    tween(P.body.scale, { x: 1, y: 1, z: 1 }, 200);
    st.setDim(0); st.spotlight(null);
    hud.letterbox(false);
    hud.flash(0.55, 300);
    Sfx.play("boom");
    if (ev.tg === "one" || ev.tg === "blast") st.shot(u.side === "ally" ? "shoulder" : "enemy", u.side === "ally" ? { id: ev.id, target: ev.target, k: 6 } : { id: ev.id, k: 6 });
    else st.shot("wide", { k: 6 });
    P.pivot.rotation.y = st.units.get(ev.id).face;
    await wait(160);
  }

  async phase(ev) {
    const st = this.stage;
    Sfx.play("boom"); st.shake(16, 700); this.hud.flash(0.35, 500, "#ff3030");
    this.hud.toast(`${fr(this.b.unit(ev.id).k)} se déchaîne !`, 2000);
    st.flash(ev.id, "#ff6060", 400);
    st.fx.pillar(st.pos(ev.id).clone(), "#ff4a3a", 7, 1000, 1.6);
    st.fx.rise(st.pos(ev.id).clone(), "#ff4a3a", 30, 1.5, 3);
    this.hud.apply(ev.u);
    await wait(900);
  }
  async spawn(ev) {
    const st = this.stage, u = this.b.unit(ev.id);
    const P = await makePokemon(u.k);
    this.models[u.id] = P;
    st.addUnit(u.id, P, "enemy");
    this.hud.addUnit(u);
    this.layout(true);
    const U = st.units.get(u.id); P.pivot.position.copy(U.home); P.pivot.position.y = 6; U.moveTo = null;
    await tween(P.pivot.position, { y: 0 }, 420, Ease.outBounce);
    st.fx.shock(U.home, TYPE_COLOR[u.types[0]], 1.6, 400);
    this.refreshIntents();
  }

  // ───────── fin ─────────
  async finish() {
    const b = this.b, st = this.stage;
    this.hud.hideMoves();
    st.setTarget(null); st.setActive(null); st.solo(null);
    this.hud.tl.style.opacity = "0"; this.hud.setIntents({});
    await wait(400);
    if (b.win) {
      Sfx.music("victory"); Sfx.play("victory");
      st.shot("victory", { k: 1.6 });
      for (const a of b.living("ally")) { const P = this.models[a.id]; tween(P.pivot.rotation, { y: 0 }, 400); (async () => { for (let i = 0; i < 3; i++) { await this.hop(P, 0.45, 360); await wait(120); } })(); }
    } else { Sfx.music(null); Sfx.play("defeat"); st.shot("wide", { k: 1 }); }
    await sleep(1400);
    const L = b.log;
    this.hud.result({ win: b.win, stats: [[b.turnNo, "tours"], [L.perfect, "frappes parfaites"], [L.parry, "parades"], [L.reactions, "réactions"], [L.maxHit, "plus gros coup"]], onRetry: () => this.onRetry && this.onRetry() });
  }

  dispose() {
    removeEventListener("keydown", this.onKey);
    this.stage.canvas.removeEventListener("pointerdown", this.onPointer);
  }
}

function lighten(hex) {
  const c = new THREE.Color(hex); c.lerp(new THREE.Color("#ffffff"), 0.45); return "#" + c.getHexString();
}
