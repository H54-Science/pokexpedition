// Interface de combat en HTML par-dessus la scène 3D.
import { h, clamp } from "../core.js";
import { SPECIES, TYPE_COLOR, STATUS, describe, fr } from "../data/data.js";
import { MAX_EN, SLOT_NAME } from "../data/moves.js";

const AURA_G = { Feu: "♨", Eau: "≈", Plante: "❦", Électrik: "ϟ", Glace: "❄" };
const KEYS_MV = ["Q", "W", "E", "R"];

export class Hud {
  constructor(root, stage) {
    this.root = root; this.stage = stage;
    this.disp = {};      // état affiché par unité (suit les événements, pas le moteur)
    this.pics = {};      // portraits
    this.plates = {}; this.cards = {};
    this.pts = 3;
    root.innerHTML = "";
    root.classList.add("letterbox");
    this.tl = h("div", { class: "timeline" });
    this.title = h("div", { class: "title" });
    this.top = h("div", { class: "topbar" });
    this.party = h("div", { class: "party" });
    this.energy = h("div", { class: "energy" });
    this.moves = h("div", { class: "moves" });
    this.hint = h("div", { class: "hint" });
    this.actions = h("div", { class: "actions off" }, this.hint, this.energy, this.moves);
    this.layer = h("div", { style: { position: "absolute", inset: "0" } });
    this.flashEl = h("div", { class: "flash" });
    root.append(this.layer, this.tl, this.title, this.top, this.party, this.actions, this.flashEl);
  }

  setPortraits(p) { this.pics = p; }
  pic(k) { return this.pics[k] || ""; }
  setTitle(t) { this.title.textContent = t; }

  // ───────── barre du haut ─────────
  buttons(list) {
    this.top.innerHTML = "";
    this.btn = {};
    for (const b of list) {
      const el = h("button", { class: "tbtn" + (b.on ? " on" : ""), onclick: b.onclick, title: b.title || "" }, b.label, b.key ? h("kbd", null, b.key) : null);
      this.btn[b.id] = el; this.top.appendChild(el);
    }
  }
  setBtn(id, on, label) { const b = this.btn[id]; if (!b) return; b.classList.toggle("on", !!on); if (label) b.firstChild.textContent = label; }

  // ───────── unités ─────────
  addUnit(u) {
    this.disp[u.id] = { id: u.id, k: u.k, L: u.L, side: u.side, boss: u.boss, hp: u.hp, maxHp: u.maxHp, shield: u.shield, charge: u.charge, alive: true, aura: null, st: [] };
    if (u.side === "enemy") {
      const el = h("div", { class: "plate" + (u.boss ? " boss" : "") },
        h("div", { class: "nm" }, h("span", null, fr(u.k)), h("small", null, (u.boss ? "Gardien · " : u.elite ? "Élite · " : "") + "N." + u.L)),
        h("div", { class: "hpbar" }, h("s"), h("b"), h("u")),
        h("div", { class: "tags" }));
      this.layer.appendChild(el); this.plates[u.id] = el;
    } else {
      const i = Object.keys(this.cards).length;
      const sp = SPECIES[u.k];
      const el = h("div", { class: "card", style: { "--c": TYPE_COLOR[sp.t[0]] }, onclick: () => this.onCard && this.onCard(u.id) },
        h("div", { class: "pt" }, h("span", { style: { backgroundImage: `url(${this.pic(u.k)})` } })),
        h("kbd", null, String(i + 1)),
        h("div", { class: "nm" }, fr(u.k)),
        h("div", { class: "lv" }, "N." + u.L + " · " + sp.t.join(" / ")),
        h("div", { class: "hpbar" }, h("s"), h("b"), h("u")),
        h("div", { class: "hpn" }),
        h("div", { class: "tags" }));
      this.party.appendChild(el); this.cards[u.id] = el;
    }
    this.refreshUnit(u.id);
  }
  removeUnit(id) { this.plates[id] && this.plates[id].remove(); delete this.plates[id]; }
  // Applique un instantané d'unité reçu dans un événement.
  apply(snap) {
    if (!snap) return;
    const d = this.disp[snap.id]; if (!d) return;
    Object.assign(d, snap);
    this.refreshUnit(snap.id);
  }
  refreshUnit(id) {
    const d = this.disp[id]; if (!d) return;
    const el = this.plates[id] || this.cards[id]; if (!el) return;
    const bar = el.querySelector(".hpbar");
    const p = clamp(d.hp / d.maxHp, 0, 1) * 100;
    bar.querySelector("b").style.width = p + "%";
    bar.querySelector("s").style.width = p + "%";
    bar.querySelector("u").style.width = clamp(d.shield / d.maxHp, 0, 1) * 100 + "%";
    const tags = el.querySelector(".tags"); tags.innerHTML = "";
    if (d.aura) tags.appendChild(h("span", { class: "tag", style: { color: TYPE_COLOR[d.aura] } }, AURA_G[d.aura] || "•"));
    for (const k of d.st || []) if (STATUS[k]) tags.appendChild(h("span", { class: "tag", style: { color: STATUS[k].color }, title: STATUS[k].name }, STATUS[k].icon));
    if (d.side === "enemy" && d.alive && this.intents && this.intents[id]) tags.appendChild(this.intents[id]);
    if (d.side === "ally") {
      el.querySelector(".hpn").textContent = `${Math.ceil(d.hp)} / ${d.maxHp}` + (d.shield ? ` +${d.shield}` : "");
      el.style.setProperty("--ch", Math.floor(d.charge || 0));
      el.classList.toggle("ready", d.alive && d.charge >= 100);
      el.classList.toggle("ko", !d.alive);
    }
    if (!d.alive && this.plates[id]) this.plates[id].style.opacity = "0";
  }
  setIntents(map) {
    this.intents = {};
    for (const id in map) {
      const it = map[id]; if (!it) continue;
      const tgt = it.tgt && this.disp[it.tgt];
      this.intents[id] = h("span", { class: "intent", title: it.m.n + " (" + it.m.t + ")" },
        tgt ? h("img", { src: this.pic(tgt.k) }) : null, (it.slot === "ult" ? "★ " : "") + it.m.n);
    }
    for (const id in this.plates) this.refreshUnit(id);
  }
  setActive(id) {
    for (const k in this.cards) this.cards[k].classList.toggle("now", k === id);
  }
  setTarget(id) {
    for (const k in this.plates) this.plates[k].classList.toggle("target", k === id);
  }
  // Suit les ennemis à l'écran.
  place() {
    for (const id in this.plates) {
      const el = this.plates[id], d = this.disp[id];
      if (!d || !d.alive || !this.stage.units.get(id)) continue;
      const s = this.stage.toScreen(this.stage.top(id));
      el.style.transform = `translate(${Math.round(s.x - el.offsetWidth / 2)}px, ${Math.round(s.y - 58)}px)`;
    }
    if (this.qte) this.qte.follow();
  }

  // ───────── frise ─────────
  timeline(ids, nowId) {
    this.tl.innerHTML = "";
    ids.slice(0, 8).forEach((id, i) => {
      const d = this.disp[id]; if (!d) return;
      this.tl.appendChild(h("div", { class: "tl " + d.side + (i === 0 && id === nowId ? " now" : ""), style: { backgroundImage: `url(${this.pic(d.k)})` }, title: fr(d.k) }, h("i", null, String(i))));
    });
  }

  // ───────── énergie et actions ─────────
  setPts(n, gain) {
    this.pts = n;
    this.energy.innerHTML = "";
    this.energy.appendChild(h("b", null, "ÉNERGIE"));
    for (let i = 0; i < MAX_EN; i++) this.energy.appendChild(h("i", { class: i < n ? "on" : "" }));
    if (gain) { this.energy.classList.remove("gain"); void this.energy.offsetWidth; this.energy.classList.add("gain"); }
  }
  deny() { this.energy.classList.remove("shake"); void this.energy.offsetWidth; this.energy.classList.add("shake"); }
  showMoves(u, opts, onPick) {
    this.moves.innerHTML = "";
    opts.forEach((o, i) => {
      const m = o.m, c = TYPE_COLOR[m.t];
      const el = h("button", { class: "mv" + (i === 0 ? " basic" : "") + (o.ok ? "" : " no"), style: { "--c": c }, onclick: () => onPick(i) },
        h("kbd", null, KEYS_MV[i]),
        h("b", null, m.n),
        h("small", null, (i === 0 ? "Attaque" : SLOT_NAME[o.slot]) + " · " + m.t),
        h("div", { class: "cost" }, i === 0 ? h("em", null, "+1 énergie") : Array.from({ length: o.cost }, () => h("i"))),
        h("div", { class: "tip" }, h("b", null, m.n), " — ", describe(m)));
      this.moves.appendChild(el);
    });
    this.hint.textContent = "Clic ou ← → : changer de cible · 1-4 : ultimes";
    this.actions.classList.remove("off");
  }
  hideMoves() { this.actions.classList.add("off"); }

  // ───────── textes ─────────
  float(pos3, text, cls = "", color) {
    const s = this.stage.toScreen(pos3); if (s.behind) return;
    const el = h("div", { class: "float " + cls, style: { left: s.x + (Math.random() - 0.5) * 30 + "px", top: s.y + (Math.random() - 0.5) * 16 + "px", color: color || null } }, text);
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
  banner(u, m, slot) {
    if (this._ban) { const b = this._ban; b.classList.add("out"); setTimeout(() => b.remove(), 260); }
    const d = this.disp[u];
    const el = h("div", { class: "banner " + d.side, style: { "--c": TYPE_COLOR[m.t] } },
      h("i", { style: { backgroundImage: `url(${this.pic(d.k)})` } }),
      h("div", null, h("small", null, (slot === "ult" ? "Ultime" : SLOT_NAME[slot] || "Attaque") + " · " + fr(d.k)), h("b", null, m.n)));
    this.root.appendChild(el); this._ban = el;
    clearTimeout(this._banT); this._banT = setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 260); if (this._ban === el) this._ban = null; }, 1600);
  }
  toast(text, ms = 1800) {
    const el = h("div", { class: "toast" }, text); this.root.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }
  flash(alpha = 0.6, ms = 260, color = "#fff") {
    const f = this.flashEl; f.style.background = color; f.style.transition = "none"; f.style.opacity = alpha;
    requestAnimationFrame(() => { f.style.transition = `opacity ${ms}ms ease-out`; f.style.opacity = 0; });
  }
  letterbox(on) { this.root.classList.toggle("on", on); this.root.classList.toggle("cine", on); }
  cutIn(u, m, side) {
    const d = this.disp[u];
    const el = h("div", { class: "cut " + side, style: { "--c": TYPE_COLOR[m.t] + "dd" } },
      h("div", null, h("small", null, side === "ally" ? "ULTIME" : "ATTAQUE ULTIME"), h("b", null, m.n), h("span", null, fr(d.k))));
    this.root.appendChild(el);
    return () => { el.classList.add("out"); setTimeout(() => el.remove(), 320); };
  }
  stamp(pos3, text, cls) {
    const s = this.stage.toScreen(pos3);
    const el = h("div", { class: "stamp " + cls, style: { left: s.x + "px", top: s.y - 70 + "px" } }, text);
    this.root.appendChild(el); setTimeout(() => el.remove(), 950);
  }

  // ───────── frappe rythmée ─────────
  // Anneau qui se referme sur un point 3D. Résout 0 (raté), 1 (bien) ou 2 (parfait).
  timing(getPos, { kind = "atk", color, D = 720 } = {}) {
    return new Promise((res) => {
      const ring = h("div", { class: "ring" }), core = h("div", { class: "core" });
      const lbl = h("div", { class: "lbl" }, kind === "atk" ? "ESPACE / CLIC : FRAPPE" : "ESPACE / CLIC : PARADE");
      const el = h("div", { class: "qte " + kind, style: { "--c": color || "#ffd76a" } }, ring, core, lbl);
      this.root.appendChild(el);
      const t0 = performance.now();
      let done = false;
      const follow = () => { const s = this.stage.toScreen(getPos()); el.style.transform = `translate(${s.x}px, ${s.y}px)`; };
      follow();
      const tick = () => {
        if (done) return;
        const t = (performance.now() - t0) / D;
        const sc = Math.max(0, 3.2 - 2.2 * t);
        ring.style.width = ring.style.height = 64 * sc + "px";
        ring.style.opacity = Math.min(1, t * 3);
        follow();
        if (t > 1.25) finish(0);
        else requestAnimationFrame(tick);
      };
      const finish = (q) => {
        if (done) return; done = true;
        removeEventListener("keydown", onKey, true); removeEventListener("pointerdown", onTap, true);
        el.remove(); this.qte = null;
        const s = getPos();
        this.stamp(s, q === 2 ? (kind === "atk" ? "PARFAIT !" : "PARADE !") : q === 1 ? "BIEN" : "RATÉ", q === 2 ? "" : q === 1 ? "good" : "miss");
        res(q);
      };
      const judge = () => {
        const t = (performance.now() - t0) / D, e = Math.abs(t - 1);
        finish(e < 0.09 ? 2 : e < 0.22 ? 1 : 0);
      };
      const onKey = (e) => { if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); e.stopPropagation(); judge(); } };
      const onTap = (e) => { if (e.button === 0) { e.stopPropagation(); judge(); } };
      addEventListener("keydown", onKey, true); addEventListener("pointerdown", onTap, true);
      this.qte = { follow };
      requestAnimationFrame(tick);
    });
  }

  result({ win, stats, onRetry }) {
    const el = h("div", { class: "result" + (win ? "" : " lose") },
      h("div", { class: "box" },
        h("h2", null, win ? "VICTOIRE" : "K.O."),
        h("div", { class: "stats" }, ...stats.map(([v, l]) => h("div", null, h("b", null, String(v)), h("small", null, l)))),
        h("button", { onclick: () => { el.remove(); onRetry(); } }, "Rejouer")));
    this.root.appendChild(el);
  }
}
