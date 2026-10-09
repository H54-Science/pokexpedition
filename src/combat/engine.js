// Moteur de combat PokeImpact : logique pure, sans affichage, déterministe.
//
// Mêmes règles que le combat de Récolte (ordre des tours selon la vitesse, charges d'énergie
// partagées, attaque / 3 capacités / ultime, réactions élémentaires, altérations, boucliers,
// gardien en 2 phases, frappes rythmées).
//
// Principe : chaque appel résout une étape instantanément et renvoie une liste d'événements
// ({ t: "hit", src, tgt, dmg, hp, ... }) que la mise en scène rejoue à son rythme.
// Même graine + mêmes actions = même combat : un serveur ou l'hôte d'une partie en coop
// pourra faire tourner ce module tel quel (pas de Math.random, pas de DOM).
//
// Déroulé :
//   const b = new Combat({ allies, enemies, seed });
//   b.begin();
//   boucle : const t = b.nextTurn();            // { actor, skipped, events }
//            allié  → b.act(actor, { slot, idx, target, q })  (ou b.ult(unitId, …) à tout moment)
//            ennemi → b.enemyAct({ q })                        (q = qualité de la parade)
//            b.endTurn();
//   b.over / b.win
import { SPECIES, effectiveness, ELEMENTS, SWIRL, CRYSTAL, reactionFor, SWIRL_RX, CRYSTAL_RX, rxBase, statsAt } from "../data/data.js";
import { movesOf, MAX_EN, CHARGE_GAIN } from "../data/moves.js";

export const AV0 = 10000;
const NEG = ["poison", "burn", "para", "slow", "sleep", "frozen", "curse", "defdown", "atkdown"];
const n0 = (v) => v || 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Hasard reproductible (mulberry32), état sérialisable.
export function RNG(seed) {
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.state = () => s;
  r.set = (v) => { s = v >>> 0; };
  return r;
}

export function mergeMods(list) {
  const m = { type: {} };
  for (const x of list) for (const k in x) {
    if (k === "type") for (const t in x.type) m.type[t] = (m.type[t] || 0) + x.type[t];
    else if (typeof x[k] === "number") m[k] = (m[k] || 0) + x[k];
    else (m[k] = m[k] || []).push(x[k]);
  }
  return m;
}

// Qualité d'une frappe rythmée : 0 = ratée / absente, 1 = bien, 2 = parfait.
const ATK_Q = [1, 1.15, 1.3];
const DEF_Q = [1, 0.72, 0.45];

export class Combat {
  // cfg : { allies: [{ k, L, shiny?, hp?, charge? }], enemies: [{ k, L, boss?, elite?, shiny? }],
  //         seed, mods? (bonus d'équipe), danger? (1 = normal), pool? (renforts du gardien) }
  constructor(cfg) {
    this.cfg = cfg;
    this.rng = RNG(cfg.seed ?? 1);
    this.rm = mergeMods(Array.isArray(cfg.mods) ? cfg.mods : cfg.mods ? [cfg.mods] : []);
    this.maxPts = MAX_EN;
    this.pts = Math.min(MAX_EN, 3 + n0(this.rm.startPts));
    this.units = [];
    this.turnNo = 0;
    this.over = false; this.win = null;
    this.active = null;
    this.pendingPhase = null;
    this.ev = [];
    this.log = { reactions: 0, crits: 0, maxHit: 0, perfect: 0, parry: 0 };
    cfg.allies.forEach((m, i) => this.units.push(this.makeAlly(m, i)));
    cfg.enemies.forEach((e, i) => this.units.push(this.makeEnemy(e, i)));
  }

  get allies() { return this.units.filter((u) => u.side === "ally"); }
  get enemies() { return this.units.filter((u) => u.side === "enemy"); }
  unit(id) { return this.units.find((u) => u.id === id); }
  living(side) { return this.units.filter((u) => u.side === side && u.alive); }
  rand() { return this.rng(); }

  // ───────── création des unités ─────────
  baseUnit(side, i, k, L, mods) {
    const sp = SPECIES[k];
    if (!sp) throw new Error("Espèce inconnue : " + k);
    return { id: (side === "ally" ? "a" : "e") + i, side, slot: i, k, L, types: sp.t, mods, alive: true,
      shield: 0, aura: null, st: {}, buffs: [], taunt: 0, charge: 0, av: 0, regen: null, thorns: 0, _extraDelay: 0 };
  }
  makeAlly(m, i) {
    const sp = SPECIES[m.k];
    const tm = mergeMods([sp.passive || {}, ...(m.mods ? [m.mods] : [])]);
    const st = statsAt(m.k, m.L);
    const bonus = n0(m.bonus);
    const u = this.baseUnit("ally", i, m.k, m.L, tm);
    u.maxHp = Math.floor(st.hp * (1 + bonus + n0(tm.hp)));
    u.hp = m.hp == null ? u.maxHp : clamp(Math.round(m.hp * u.maxHp), 1, u.maxHp);
    u.pow = st.pow * (1 + bonus + n0(tm.pow));
    u.def = st.def * (1 + bonus + n0(tm.def));
    u.spd0 = st.spd * (1 + n0(tm.spd) + n0(this.rm.spd));
    u.charge = Math.max(m.charge || 0, n0(this.rm.startCharge));
    u.shiny = !!m.shiny;
    const sh = n0(this.rm.startShield) + n0(tm.startShield);
    if (sh) u.shield = Math.round(u.maxHp * sh);
    return u;
  }
  makeEnemy(e, i) {
    const sp = SPECIES[e.k];
    const st = statsAt(e.k, e.L, 1);
    const dm = 1 + ((this.cfg.danger || 1) - 1) * 0.055;
    // boss de raid : PV et puissance réglables (cfg.bossHp, cfg.bossPow)
    const hpM = (e.boss ? (this.cfg.bossHp || 7.5) : e.elite ? 1.2 : 1) * dm;
    const u = this.baseUnit("enemy", i, e.k, e.L, mergeMods([sp.passive || {}]));
    Object.assign(u, {
      maxHp: Math.floor(st.hp * hpM), pow: st.pow * dm * (e.boss ? 1.12 * (this.cfg.bossPow || 1) : e.elite ? 1.08 : 1), def: st.def * dm,
      spd0: st.spd * (e.boss ? 1.05 : 1), boss: !!e.boss, elite: !!e.elite, shiny: !!e.shiny,
      cd: 1 + Math.floor(this.rand() * 2), charge: e.boss ? 20 : 0,
    });
    u.hp = u.maxHp;
    if (sp.passive && sp.passive.startShield) u.shield = Math.round(u.maxHp * sp.passive.startShield);
    return u;
  }

  // Instantané lisible d'une unité (joint aux événements pour que l'affichage suive).
  snap(u) { return { id: u.id, hp: u.hp, maxHp: u.maxHp, shield: u.shield, charge: u.charge, alive: u.alive, aura: u.aura && u.aura.t, st: Object.keys(u.st) }; }
  emit(e) { this.ev.push(e); return e; }
  flush() { const e = this.ev; this.ev = []; return e; }

  // ───────── mise en route ─────────
  begin() {
    for (const u of this.units) u.av = this.baseAV(u) * (u.side === "ally" ? 1 - n0(u.mods.opener) : 1) * (0.9 + this.rand() * 0.1);
    if (this.rm.firstStrike) this.allies.forEach((a) => (a.av = 1 + a.slot));
    this.enemies.forEach((e) => this.plan(e));
    this.emit({ t: "begin", pts: this.pts });
    return this.flush();
  }

  // ───────── ordre des tours ─────────
  spdOf(u) { let s = u.spd0 * (1 + this.buffSum(u, "spd")); if (u.st.slow) s *= 0.75; if (u.st.para) s *= 0.8; return s; }
  baseAV(u) { return AV0 / this.spdOf(u); }
  advance(u, f) { u.av = Math.max(0, u.av - this.baseAV(u) * f); }
  delay(u, f) { u.av += this.baseAV(u) * f; }
  // Les n prochains tours (frise).
  preview(n = 8) {
    const sim = this.units.filter((u) => u.alive).map((u) => ({ u, av: u.av }));
    const out = [];
    while (out.length < n && sim.length) {
      let b = sim[0]; for (const s of sim) if (s.av < b.av) b = s;
      const d = b.av; sim.forEach((s) => (s.av -= d)); out.push(b.u.id); b.av = this.baseAV(b.u);
    }
    return out;
  }

  // Passe au tour suivant : altérations de début de tour, tour sauté éventuel.
  nextTurn() {
    if (this.over) return { actor: null, skipped: true, events: [] };
    const alive = this.units.filter((u) => u.alive);
    let u = alive[0]; for (const x of alive) if (x.av < u.av) u = x;
    const d = u.av; for (const x of alive) x.av -= d;
    this.turnNo++;
    this.active = u;
    this.emit({ t: "turn", id: u.id, n: this.turnNo });
    const skipped = this.startTurn(u);
    if (u.side === "enemy" && !skipped && u.alive) {
      if (!u.intent || (u.intent.tgt && !this.unit(u.intent.tgt).alive)) this.plan(u);
    }
    this.checkEnd();
    return { actor: u.id, skipped: skipped || !u.alive || this.over, events: this.flush() };
  }
  startTurn(u) {
    if (u.side === "ally" && this.rm.regen) this.heal(u, u.maxHp * this.rm.regen, true);
    if (u.regen && u.regen.n > 0) this.heal(u, u.maxHp * u.regen.v, true);
    const dots = [["poison", 0.08 * (1 + n0(this.rm.poison) * (u.side === "enemy" ? 1 : 0))], ["curse", 0.1]];
    for (const [k, f] of dots) if (u.st[k]) { this.dot(u, Math.max(1, Math.round(u.maxHp * f * (u.boss ? 0.5 : 1))), k); if (!u.alive) return true; }
    if (u.st.burn) { this.dot(u, Math.max(1, Math.round(u.st.burn.dmg)), "burn"); if (!u.alive) return true; }
    for (const k of ["frozen", "sleep", "stun"]) if (u.st[k]) {
      delete u.st[k];
      this.emit({ t: "skip", id: u.id, why: k, u: this.snap(u) });
      return true;
    }
    if (u.st.para && this.rand() < 0.25) { this.emit({ t: "skip", id: u.id, why: "para", u: this.snap(u) }); return true; }
    return false;
  }
  dot(u, dmg, k) {
    this.emit({ t: "dot", id: u.id, k, dmg });
    this.applyDamage(u, dmg, null, { dot: true });
  }

  // Fin du tour de l'unité active.
  endTurn() {
    const u = this.active; if (!u) return this.flush();
    if (!this.over && this.pendingPhase) { const bp = this.pendingPhase; this.pendingPhase = null; if (bp.alive) this.bossPhase(bp); }
    if (u.alive) {
      for (const k in u.st) { const s = u.st[k]; if (s && s.n != null) { s.n--; if (s.n <= 0) delete u.st[k]; } }
      u.buffs = u.buffs.filter((b) => --b.n > 0);
      if (u.taunt > 0) u.taunt--;
      if (u.thorns > 0) u.thorns--;
      if (u.regen) { u.regen.n--; if (u.regen.n <= 0) u.regen = null; }
      if (u.aura) { u.aura.n--; if (u.aura.n <= 0) u.aura = null; }
      u.av = this.baseAV(u) + (u._extraDelay || 0); u._extraDelay = 0;
      if (u.side === "enemy") this.plan(u);
      this.emit({ t: "endTurn", id: u.id, u: this.snap(u) });
    }
    this.active = null;
    this.checkEnd();
    return this.flush();
  }

  checkEnd() {
    if (this.over) return true;
    if (!this.living("enemy").length) { this.over = true; this.win = true; }
    else if (!this.living("ally").length) { this.over = true; this.win = false; }
    if (this.over) this.emit({ t: "end", win: this.win });
    return this.over;
  }

  // ───────── IA ennemie : intention visible ─────────
  plan(e) {
    const allies = this.living("ally"); if (!allies.length) { e.intent = null; return; }
    const sp = SPECIES[e.k];
    let slot = "basic";
    if ((e.boss || e.elite) && e.charge >= 100) slot = "ult";
    else if (e.cd <= 0 && this.rand() < 0.75) slot = "skill";
    const m = sp[slot];
    let tgt = null;
    const tg = m.tg || "one";
    if (tg === "one" || tg === "blast" || tg === "rand") {
      const taunter = allies.find((a) => a.taunt > 0);
      if (taunter) tgt = taunter;
      else {
        const smart = e.boss || e.elite || this.rand() < 0.5;
        let best = -1;
        for (const a of allies) {
          const sc = (smart ? effectiveness(m.t, a.types) * (1.4 - (a.hp / a.maxHp) * 0.6) : 1) * (0.75 + this.rand() * 0.5);
          if (sc > best) { best = sc; tgt = a; }
        }
      }
    } else if (tg === "ally") { const f = this.living("enemy"); tgt = f.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a), f[0]); }
    e.intent = { slot, tgt: tgt ? tgt.id : null };
  }
  // Ce que va faire un ennemi (pour l'affichage de l'intention).
  intentOf(e) { if (!e.intent) return null; return { slot: e.intent.slot, m: SPECIES[e.k][e.intent.slot], tgt: e.intent.tgt }; }

  // L'ennemi actif agit. q = qualité de la parade du joueur (0, 1, 2).
  enemyAct({ q = 0 } = {}) {
    const e = this.active;
    if (!e || e.side !== "enemy" || !e.alive || this.over) return this.flush();
    if (!e.intent || (e.intent.tgt && !this.unit(e.intent.tgt).alive)) this.plan(e);
    const it = e.intent; if (!it) return this.flush();
    if (it.slot === "skill") e.cd = 2 + Math.floor(this.rand() * 2); else e.cd--;
    if (it.slot === "ult") e.charge = 0;
    this.useMove(e, SPECIES[e.k][it.slot], it.slot, it.tgt ? this.unit(it.tgt) : null, q);
    this.checkEnd();
    return this.flush();
  }

  // ───────── actions du joueur ─────────
  // Les choix possibles pour un allié : attaque + 3 capacités (avec coût et disponibilité).
  optionsOf(u) {
    const sp = SPECIES[u.k];
    return [
      { slot: "basic", m: sp.basic, cost: 0, ok: true },
      ...movesOf(u.k).map((mv) => ({ ...mv, ok: mv.cost <= this.pts })),
    ];
  }
  // Faut-il une frappe rythmée pour cette capacité ?
  static timed(m) { return m.p > 0; }

  // act(unitId, { idx: 0 = attaque, 1..3 = capacités, target: id, q })
  act(id, { idx = 0, target = null, q = 0 } = {}) {
    const u = this.unit(id);
    if (!u || u !== this.active || u.side !== "ally" || !u.alive || this.over) throw new Error("Ce n'est pas le tour de cet allié.");
    const opt = this.optionsOf(u)[idx];
    if (!opt) throw new Error("Capacité inconnue.");
    if (opt.cost > this.pts) throw new Error("Pas assez de charges d'énergie.");
    if (opt.slot === "basic") this.addPts(1);
    else { this.pts -= opt.cost; this.emit({ t: "pts", pts: this.pts }); }
    this.useMove(u, opt.m, opt.slot, target ? this.unit(target) : null, q);
    this.checkEnd();
    return this.flush();
  }

  // Ultime : action bonus, ne consomme pas le tour. Possible pour tout allié à 100 % de jauge.
  canUlt(id) { const u = this.unit(id); return !!u && u.side === "ally" && u.alive && u.charge >= 100 && !this.over; }
  ult(id, { target = null, q = 0 } = {}) {
    const u = this.unit(id);
    if (!this.canUlt(id)) throw new Error("Ultime indisponible.");
    u.charge = 0;
    const m = SPECIES[u.k].ult;
    const tg = m.tg || "one";
    this.useMove(u, m, "ult", tg === "ally" ? this.lowest(u) : target ? this.unit(target) : null, q);
    this.checkEnd();
    return this.flush();
  }

  enemiesOf(u) { return this.living(u.side === "ally" ? "enemy" : "ally"); }
  friendsOf(u) { return this.living(u.side); }
  lowest(u) { const f = this.friendsOf(u); return f.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a), f[0]); }

  useMove(u, m, slot, target, q = 0) {
    const tg = m.tg || "one";
    const foes = this.enemiesOf(u);
    if (!foes.length) return;
    if ((tg === "one" || tg === "blast") && (!target || !target.alive || target.side === u.side)) target = foes[0];
    if (slot !== "ult") this.gainCharge(u, CHARGE_GAIN[slot] || 20);
    const offensive = m.p > 0 || m.aura || (m.st && !["self", "ally", "allies"].includes(tg));
    this.emit({ t: "move", id: u.id, slot, m, tg, target: target ? target.id : null, offensive: !!offensive, q });
    if (offensive) {
      let qm = 1;
      if (m.p > 0) {
        if (u.side === "ally") {
          qm = ATK_Q[q] || 1;
          if (q === 2) { this.log.perfect++; if (slot === "basic") this.addPts(1); }
        } else {
          qm = DEF_Q[q] || 1;
          if (q === 2) { this.log.parry++; for (const a of this.living("ally")) if (tg === "all" || tg === "rand" || a === target) this.gainCharge(a, 10, true); }
        }
      }
      let dealt = 0;
      if (tg === "all") {
        const ts = this.enemiesOf(u);
        for (let i = 0; i < ts.length; i++) dealt += this.strike(u, ts[i], m, slot, { aoe: true, mult: qm });
      } else if (tg === "rand") {
        for (let i = 0; i < (m.hits || 3); i++) {
          const ts = this.enemiesOf(u); if (!ts.length) break;
          const t = ts[Math.floor(this.rand() * ts.length)];
          dealt += this.strike(u, t, m, slot, { mult: qm, hitIndex: i });
        }
      } else {
        const t = target;
        const hits = m.hits || 1;
        for (let i = 0; i < hits && t.alive; i++) dealt += this.strike(u, t, m, slot, { hitIndex: i, mult: qm });
        if (tg === "blast") for (const o of this.enemiesOf(u)) if (o !== t) dealt += this.strike(u, o, m, slot, { mult: 0.5 * qm, splash: true });
      }
      if (u.alive && dealt > 0) {
        const ls = n0(this.rm.lifesteal) * (u.side === "ally" ? 1 : 0) + n0(u.mods.lifesteal) + n0(m.drain);
        if (ls) this.heal(u, dealt * ls);
        if (m.recoil) this.applyDamage(u, Math.max(1, Math.round(dealt * m.recoil)), null, { recoil: true });
      }
      if (u.alive && m.selfBuff) this.buff(u, m.selfBuff, m.dur || 2);
      if (u.alive && m.selfDebuff) this.buff(u, Object.fromEntries(Object.entries(m.selfDebuff).map(([k, v]) => [k, -v])), m.dur || 2);
      if (u.alive && m.selfDelay) u._extraDelay = this.baseAV(u) * m.selfDelay;
      if (m.selfKO && u.alive) { u.hp = 1; this.emit({ t: "say", id: u.id, text: "1 PV", u: this.snap(u) }); }
      if (m.adv && tg !== "ally" && tg !== "allies" && u.alive) this.advance(u, m.adv);
      if (m.pts && u.side === "ally") this.addPts(m.pts);
    } else {
      const tgts = tg === "self" ? [u] : tg === "ally" ? [target && target.alive && target.side === u.side ? target : this.lowest(u)] : this.friendsOf(u);
      for (const t of tgts) {
        if (m.heal) this.heal(t, t.maxHp * m.heal);
        if (m.shield) this.addShield(t, (tg === "self" ? t.maxHp : u.maxHp) * m.shield);
        if (m.buff) this.buff(t, m.buff, m.dur || 2);
        if (m.regen) t.regen = { v: m.regen, n: m.dur || 2 };
        if (m.cleanse) this.cleanse(t);
        if (m.adv && t !== u) this.advance(t, m.adv);
        if (m.adv && t === u && tg === "allies") this.advance(t, m.adv * 0.5);
        if (m.charge && t !== u) this.gainCharge(t, m.charge);
        if (m.taunt && t === u) { t.taunt = m.taunt; this.emit({ t: "say", id: t.id, text: "Provocation" }); }
        if (m.thorns && t === u) t.thorns = 3;
      }
      if (m.pts && u.side === "ally") this.addPts(m.pts);
      if (m.taunt && tg !== "self") u.taunt = m.taunt;
      if (m.taunt && u.side === "ally") this.enemies.forEach((e) => { if (e.alive && e.intent && e.intent.tgt && (SPECIES[e.k][e.intent.slot].tg || "one") !== "all") e.intent.tgt = u.id; });
    }
    this.emit({ t: "moveEnd", id: u.id });
  }

  // Un coup : réaction éventuelle, dégâts, effets.
  strike(a, t, m, slot, o = {}) {
    if (!t.alive) return 0;
    let rx = null, amp = 1, rxType = null;
    if (a.side === "ally") ({ rx, amp, rxType } = this.react(a, t, m.t));
    let dmg = 0, crit = false, eff = 1;
    if (m.p > 0) {
      const r = this.calc(a, t, m, slot, o.mult || 1);
      dmg = Math.round(r.dmg * amp); crit = r.crit; eff = r.eff;
    }
    if (dmg > 0) {
      if (crit) this.log.crits++;
      this.log.maxHit = Math.max(this.log.maxHit, dmg);
      this.gainCharge(t, 8, true);
      this.applyDamage(t, dmg, a, { hit: { src: a.id, type: m.t, crit, eff, slot, k: clamp(dmg / t.maxHp, 0, 1), aoe: !!o.aoe, splash: !!o.splash, i: o.hitIndex || 0, rx: rx ? rx.id : null } });
      if (a.alive && t.thorns && a !== t) a.st.burn = { n: 2, dmg: Math.max(2, a.maxHp * 0.06) };
      if (this.rm.helmet && t.side === "ally" && a.alive && a.side === "enemy") this.applyDamage(a, Math.max(1, Math.round(a.maxHp * this.rm.helmet)), null, { quiet: true });
    }
    if (rx) this.reaction(a, t, rx, rxType);
    if (t.alive && m.st && this.rand() < m.st.ch) this.addStatus(t, m.st.k, m.st.dur || m.st.n);
    if (t.alive && a.mods.onHit) for (const oh of a.mods.onHit) if (this.rand() < oh.ch) this.addStatus(t, oh.k, 2);
    if (t.alive && a.mods.onHitType) for (const oh of a.mods.onHitType) if (oh.t === m.t && this.rand() < oh.ch) this.addStatus(t, oh.k, 1);
    if (t.alive && m.delay) this.delay(t, m.delay);
    if (!t.alive && a.side !== t.side) this.gainCharge(a, 10, true);
    return dmg;
  }

  calc(a, t, m, slot, mult = 1) {
    const L = a.L;
    const atkM = 1 + this.buffSum(a, "atk") - (a.st.atkdown ? 0.3 : 0);
    const defM = Math.max(0.3, 1 + this.buffSum(t, "def") - (t.st.defdown ? t.st.defdown.v || 0.3 : 0)) * (1 - n0(a.mods.pierce));
    const A = a.pow * Math.max(0.3, atkM), D = Math.max(1, t.def * defM);
    let dmg = ((((2 * L) / 5 + 2) * m.p * A) / D) / 50 + 2;
    const stab = a.types.includes(m.t) ? 1.5 + n0(a.mods.stab) : 1;
    const eff = effectiveness(m.t, t.types);
    let em = eff; if (eff > 1 && a.side === "ally") em *= 1 + n0(this.rm.superEff);
    const rm = a.side === "ally" ? this.rm : { type: {} };
    let bonus = 1 + n0(rm.type[m.t]) + n0(a.mods.type && a.mods.type[m.t]) + n0(rm.dmg);
    if (slot === "basic") bonus += n0(rm.basic) + n0(a.mods.basic);
    if (slot === "skill" || slot === "tech" || slot === "heavy") bonus += n0(rm.skill) + n0(a.mods.skill);
    if (a.hp / a.maxHp < 0.5) bonus += n0(a.mods.lowHp);
    const hasStatus = ["poison", "burn", "para", "slow", "atkdown", "defdown", "curse"].some((k) => a.st[k]);
    if (hasStatus) bonus += n0(a.mods.guts);
    if (m.facade && hasStatus) bonus += 0.5;
    if (m.hex && NEG.some((k) => t.st[k])) bonus += 0.6;
    if (t.st.quicken && (m.t === "Plante" || m.t === "Électrik")) bonus += 0.35;
    const critCh = 0.06 + n0(m.crit) + n0(rm.crit) + n0(a.mods.crit) + this.buffSum(a, "crit");
    const crit = this.rand() < critCh;
    const critM = crit ? 1.5 + n0(rm.critDmg) + n0(a.mods.critDmg) : 1;
    const tough = 1 - n0(t.mods.tough);
    dmg = dmg * stab * em * bonus * critM * tough * (0.9 + this.rand() * 0.1) * mult;
    return { dmg: Math.max(1, dmg), crit, eff };
  }

  // ───────── réactions élémentaires (côté joueur) ─────────
  react(a, t, type) {
    let rx = null, amp = 1, rxType = null;
    if (ELEMENTS.includes(type)) {
      if (t.aura && t.aura.t !== type) {
        rx = reactionFor(type, t.aura.t); rxType = t.aura.t;
        if (rx) t.aura = null; else t.aura = { t: type, n: 2 };
      } else t.aura = { t: type, n: 2 };
    } else if (SWIRL.includes(type) && t.aura) { rx = SWIRL_RX; rxType = t.aura.t; t.aura = null; }
    else if (CRYSTAL.includes(type) && t.aura) { rx = CRYSTAL_RX; rxType = t.aura.t; t.aura = null; }
    if (rx && rx.mult) amp = rx.mult + n0(this.rm.amp) + (n0(this.rm.rx) + n0(a.mods.rx)) * 0.3;
    return { rx, amp, rxType };
  }
  reaction(a, t, rx, rxType) {
    this.log.reactions++;
    this.emit({ t: "reaction", id: t.id, src: a.id, rx: rx.id, name: rx.name, color: rx.color, from: rxType });
    if (a.side === "ally" && this.rm.rxCharge) this.gainCharge(a, this.rm.rxCharge);
    const rb = rxBase(a.L) * (1 + n0(this.rm.rx) + n0(a.mods.rx));
    const others = this.enemiesOf(a).filter((o) => o !== t);
    switch (rx.id) {
      case "combustion": t.st.burn = { n: 3, dmg: rb * 0.45 }; break;
      case "surcharge":
        if (t.alive) this.rxHit(t, rb * 1.0, rx);
        for (const o of others) this.rxHit(o, rb * 0.6, rx);
        if (t.alive) this.delay(t, 0.25);
        break;
      case "electro": {
        const pool = others.slice();
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        const chain = [t, ...pool.slice(0, 2)];
        for (const c of chain) if (c.alive) this.rxHit(c, rb * 0.9, rx);
        break;
      }
      case "floraison": {
        if (t.alive) this.rxHit(t, rb * 1.5, rx);
        const hh = 0.08 * (1 + n0(a.mods.bloomHeal));
        for (const f of this.friendsOf(a)) this.heal(f, f.maxHp * hh);
        break;
      }
      case "gel": if (t.alive) { if (t.boss) this.delay(t, 0.5); else t.st.frozen = { n: 1 }; } break;
      case "supra": if (t.alive) { t.st.defdown = { n: 2, v: 0.3 }; this.rxHit(t, rb * 0.5, rx); } break;
      case "catalyse": if (t.alive) t.st.quicken = { n: 2 }; break;
      case "dispersion": {
        const sw = 1 + n0(this.rm.swirl) + n0(a.mods.swirl);
        for (const o of others) {
          this.rxHit(o, rb * 0.6 * sw, rx, rxType);
          if (!o.alive) continue;
          if (o.aura && o.aura.t !== rxType) {
            const r2 = reactionFor(rxType, o.aura.t);
            if (r2) { o.aura = null; this.emit({ t: "reaction", id: o.id, src: a.id, rx: r2.id, name: r2.name, color: r2.color, from: rxType, secondary: true }); this.secondaryRx(o, r2, rb); }
            else o.aura = { t: rxType, n: 2 };
          } else o.aura = { t: rxType, n: 2 };
        }
        if (t.alive) this.rxHit(t, rb * 0.6 * sw, rx, rxType);
        break;
      }
      case "cristal": {
        const amt = (4 + a.L * 1.4) * (1 + n0(this.rm.crystal) + n0(a.mods.crystal));
        for (const f of this.friendsOf(a)) this.addShield(f, amt);
        break;
      }
    }
  }
  secondaryRx(o, r2, rb) {
    if (r2.mult) this.rxHit(o, rb * 0.8, r2);
    else if (r2.id === "gel") { if (o.boss) this.delay(o, 0.4); else o.st.frozen = { n: 1 }; }
    else if (r2.id === "combustion") o.st.burn = { n: 3, dmg: rb * 0.45 };
    else if (r2.id === "catalyse") o.st.quicken = { n: 2 };
    else if (r2.id === "supra") o.st.defdown = { n: 2, v: 0.3 };
    else this.rxHit(o, rb * 0.8, r2);
    this.log.reactions++;
  }
  rxHit(t, amt, rx, type) {
    if (!t.alive) return;
    const d = Math.max(1, Math.round(amt));
    this.applyDamage(t, d, null, { rxHit: { rx: rx.id, color: rx.color, type: type || null } });
  }

  // ───────── dégâts, K.O. ─────────
  applyDamage(t, dmg, src, o = {}) {
    if (!t.alive) return;
    let absorbed = 0;
    if (t.shield > 0) { absorbed = Math.min(t.shield, dmg); t.shield -= absorbed; dmg -= absorbed; }
    t.hp -= dmg;
    if (t.boss && !t.enraged && t.hp > 0 && t.hp < t.maxHp * 0.5) { t.enraged = true; this.pendingPhase = t; }
    if (t.hp <= 0 && t.side === "ally" && this.rm.endure && !this.endureUsed && !o.recoil) {
      this.endureUsed = true; t.hp = 1; this.emit({ t: "say", id: t.id, text: "Tient bon !" });
    }
    if (t.hp < 0) t.hp = 0;
    const kind = o.hit ? "hit" : o.rxHit ? "rxHit" : o.dot ? "dotHit" : o.recoil ? "recoil" : "dmg";
    this.emit({ t: kind, id: t.id, dmg: dmg + absorbed, absorbed, ...(o.hit || {}), ...(o.rxHit || {}), u: this.snap(t) });
    if (t.hp <= 0) this.ko(t);
  }
  ko(u) {
    if (!u.alive) return;
    u.alive = false; u.aura = null; u.st = {}; u.shield = 0; u.hp = 0;
    this.emit({ t: "ko", id: u.id, u: this.snap(u) });
    if (u.boss) for (const e of this.living("enemy")) this.applyDamage(e, e.hp, null, {});
  }

  // Gardien sous 50 % : enrage et appelle des renforts.
  bossPhase(b) {
    b.buffs.push({ k: "atk", v: 0.25, n: 99 }); b.charge = Math.min(100, b.charge + 50);
    this.emit({ t: "phase", id: b.id, u: this.snap(b) });
    const pool = (this.cfg.pool || []).filter((k) => SPECIES[k] && SPECIES[k].tier <= 2);
    if (!pool.length) return;
    const free = Math.max(0, 3 - this.living("enemy").length);
    for (let i = 0; i < free; i++) {
      const k = pool[Math.floor(this.rand() * pool.length)];
      const e = this.makeEnemy({ k, L: Math.max(2, b.L - 4) }, this.units.filter((u) => u.side === "enemy").length);
      e.av = this.baseAV(e) * 0.6;
      this.units.push(e);
      this.plan(e);
      this.emit({ t: "spawn", id: e.id, k: e.k, u: this.snap(e) });
    }
  }

  // ───────── effets d'état ─────────
  buffSum(u, k) { let s = 0; for (const b of u.buffs) if (b.k === k) s += b.v; return s; }
  buff(t, obj, n) {
    for (const k in obj) t.buffs.push({ k, v: obj[k], n: n + 1 });
    this.emit({ t: "buff", id: t.id, buff: obj });
  }
  addStatus(t, k, n) {
    if (!t.alive) return;
    if (t.boss && (k === "sleep" || k === "stun" || k === "frozen")) { this.delay(t, 0.35); this.emit({ t: "say", id: t.id, text: "Résiste" }); return; }
    if (k === "fear") { this.delay(t, 0.25); this.emit({ t: "status", id: t.id, k, u: this.snap(t) }); return; }
    if (k === "burn") t.st.burn = { n: n || 3, dmg: Math.max(2, t.maxHp * 0.06) };
    else if (k === "defdown") t.st.defdown = { n: n || 2, v: 0.3 };
    else t.st[k] = { n: k === "sleep" || k === "stun" || k === "frozen" ? 1 : n || 2 };
    this.emit({ t: "status", id: t.id, k, u: this.snap(t) });
  }
  cleanse(t) { for (const k of NEG.concat("stun")) delete t.st[k]; this.emit({ t: "cleanse", id: t.id, u: this.snap(t) }); }
  heal(t, amt, quiet) {
    if (!t.alive) return;
    const v = Math.round(Math.min(t.maxHp - t.hp, amt)); if (v <= 0) return;
    t.hp += v;
    this.emit({ t: "heal", id: t.id, v, quiet: !!quiet, u: this.snap(t) });
  }
  addShield(t, amt) {
    if (!t.alive) return;
    t.shield = Math.round(Math.min(t.maxHp * 0.6, t.shield + amt));
    this.emit({ t: "shield", id: t.id, u: this.snap(t) });
  }
  gainCharge(u, v, quiet) {
    if (!u.alive) return;
    const before = u.charge;
    u.charge = Math.min(100, u.charge + v * (1 + n0(u.mods.charge)));
    if (!quiet || (u.side === "ally" && before < 100 && u.charge >= 100)) this.emit({ t: "charge", id: u.id, charge: u.charge, ready: before < 100 && u.charge >= 100 });
  }
  addPts(n) {
    const before = this.pts;
    this.pts = Math.min(this.maxPts, this.pts + n);
    if (this.pts !== before) this.emit({ t: "pts", pts: this.pts, gain: this.pts - before });
  }

  // ───────── jeu automatique (allié) ─────────
  autoPlan(u) {
    const foes = this.living("enemy"); if (!foes.length) return null;
    const team = this.living("ally");
    const bestT = (m) => foes.reduce((b, e) => { const sc = effectiveness(m.t, e.types) * (1.5 - (e.hp / e.maxHp) * 0.5); return sc > b.sc ? { e, sc } : b; }, { e: foes[0], sc: -1 }).e;
    const val = (m) => {
      const tg = m.tg || "one";
      if (m.p > 0) {
        const t = bestT(m);
        return m.p * (m.hits || 1) * (tg === "all" ? foes.length * 0.8 : tg === "blast" ? 1 + (foes.length - 1) * 0.4 : 1) * effectiveness(m.t, t.types) * (u.types.includes(m.t) ? 1.5 : 1) * (m.recoil ? 0.85 : 1);
      }
      if (m.heal) return team.some((a) => a.hp / a.maxHp < 0.45) ? 150 : 5;
      if (m.shield || m.buff || m.regen) return this.pts >= 4 ? 70 : 25;
      if (m.st) return this.pts >= 3 ? 65 : 20;
      if (m.adv) return 55;
      return 20;
    };
    const opts = this.optionsOf(u);
    let best = { idx: 0, sc: val(opts[0].m) + 30 };
    opts.forEach((o, i) => {
      if (i === 0 || !o.ok) return;
      const sc = val(o.m) - o.cost * 26 + (this.pts >= this.maxPts ? 30 : 0);
      if (sc > best.sc) best = { idx: i, sc };
    });
    const m = opts[best.idx].m, tg = m.tg || "one";
    const target = tg === "ally" ? this.lowest(u) : m.p > 0 ? bestT(m) : foes[0];
    return { idx: best.idx, target: target ? target.id : null };
  }

  // État complet sérialisable (sauvegarde, réseau).
  serialize() {
    return JSON.stringify({ cfg: this.cfg, rng: this.rng.state(), pts: this.pts, turnNo: this.turnNo, over: this.over, win: this.win,
      active: this.active && this.active.id, units: this.units, log: this.log, endureUsed: !!this.endureUsed });
  }
}
