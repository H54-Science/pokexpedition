// Interface de combat « raid » (3 alliés contre 1 boss), en HTML par-dessus la scène 3D.
// Barre du boss en haut, frise à gauche, équipe en bas à gauche, pile de commandes en bas à droite.
import { h, clamp } from "../core.js";
import { SPECIES, TYPE_COLOR, STATUS, describe, fr } from "../data/data.js";
import { MAX_EN, SLOT_NAME } from "../data/moves.js";

const AURA_G = { Feu: "♨", Eau: "≈", Plante: "❦", Électrik: "ϟ", Glace: "❄" };
const SVG = (d) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d); s.appendChild(p); return s; };
const ICON = {
  atk: "M21 3l-1.2 4.8-9.3 9.3-3.6-3.6 9.3-9.3zM4.6 12.6l6.8 6.8-1.6 1.6-2.2-2.2L4.3 22 2 19.7l3.2-3.3L3 14.2z",
  moves: "M12 1.5l2.8 7.7 7.7 2.8-7.7 2.8L12 22.5l-2.8-7.7L1.5 12l7.7-2.8z",
  items: "M8 7V6a4 4 0 0 1 8 0v1h3.5l1 14.5h-17L4.5 7zm2 0h4V6a2 2 0 0 0-4 0zM9 12h6v2H9z",
  ult: "M12 1l2.3 6.2L20.5 4l-3.2 5.9L23 12l-5.7 2.1 3.2 5.9-6.2-3.2L12 23l-2.3-6.2-6.2 3.2 3.2-5.9L1 12l5.7-2.1L3.5 4l6.2 3.2z",
};
const SEG_HUE = [190, 205, 222, 250, 275]; // cyan → bleu → violet

export class Hud {
  constructor(root, stage) {
    this.root = root; this.stage = stage;
    this.disp = {}; this.pics = {}; this.cards = {}; this.boss = null;
    this.pts = 3;
    root.innerHTML = "";
    root.classList.add("letterbox");
    this.fxl = h("div", { class: "fx" });
    this.tl = h("div", { class: "timeline" });
    this.top = h("div", { class: "topbar" });
    this.bossEl = h("div", { class: "bossbar" });
    this.party = h("div", { class: "party" });
    this.cmds = h("div", { class: "cmds" });
    this.mvpanel = h("div", { class: "mvpanel" });
    this.ebar = h("div", { class: "ebar" });
    this.cmdzone = h("div", { class: "cmdzone off" }, this.cmds, this.mvpanel, this.ebar);
    this.flashEl = h("div", { class: "flash" });
    root.append(this.fxl, this.tl, this.bossEl, this.top, this.party, this.cmdzone, this.flashEl);
    this.setPts(3);
  }

  setPortraits(p) { this.pics = p; }
  pic(k) { return this.pics[k] || ""; }
  setTitle() {}

  // ───────── outils (haut droite) ─────────
  buttons(list) {
    this.top.innerHTML = ""; this.btn = {};
    for (const b of list) {
      const el = h("button", { class: "tbtn" + (b.on ? " on" : ""), onclick: b.onclick, title: b.title || "" }, h("span", null, b.label), b.key ? h("kbd", null, b.key) : null);
      this.btn[b.id] = el; this.top.appendChild(el);
    }
  }
  setBtn(id, on, label) { const b = this.btn[id]; if (!b) return; b.classList.toggle("on", !!on); if (label) b.firstChild.textContent = label; }

  // ───────── unités ─────────
  addUnit(u) {
    this.disp[u.id] = { id: u.id, k: u.k, L: u.L, side: u.side, boss: u.boss, hp: u.hp, maxHp: u.maxHp, shield: u.shield, charge: u.charge, alive: true, aura: null, st: [] };
    const sp = SPECIES[u.k];
    if (u.side === "enemy") {
      this.boss = u.id;
      this.bossEl.innerHTML = "";
      this.bossEl.append(
        h("div", { class: "row" },
          h("span", { class: "nm" }, fr(u.k)),
          h("span", { class: "lv" }, "N." + u.L),
          h("span", { class: "types" }, ...sp.t.map((t) => h("span", { class: "tchip", style: { "--c": TYPE_COLOR[t] } }, t))),
          h("span", { class: "tags" })),
        h("div", { class: "bhp" }, h("s"), h("b"), h("u"), u.boss ? h("i", { title: "Rage sous 50 %" }) : null),
        h("div", { class: "num" }),
        h("div", { class: "intentwrap" }));
    } else {
      const i = Object.keys(this.cards).length;
      const el = h("div", { class: "card", style: { "--c": TYPE_COLOR[sp.t[0]] }, onclick: () => this.onCard && this.onCard(u.id) },
        h("div", { class: "pt" }, h("span", { style: { backgroundImage: `url(${this.pic(u.k)})` } }), h("em", null, String(u.L))),
        h("div", { class: "info" },
          h("div", { class: "top" }, h("span", { class: "nm" }, fr(u.k)), h("span", { class: "hpn" })),
          h("div", { class: "hpbar" }, h("s"), h("b"), h("u")),
          h("div", { class: "tags" })),
        h("kbd", null, String(i + 1)));
      this.party.appendChild(el); this.cards[u.id] = el;
    }
    this.refreshUnit(u.id);
  }
  removeUnit() {}
  apply(snap) {
    if (!snap) return;
    const d = this.disp[snap.id]; if (!d) return;
    Object.assign(d, snap);
    this.refreshUnit(snap.id);
  }
  tagsOf(d) {
    const out = [];
    if (d.aura) out.push(h("span", { class: "tag", style: { color: TYPE_COLOR[d.aura] }, title: "Aura " + d.aura }, AURA_G[d.aura] || "•"));
    for (const k of d.st || []) if (STATUS[k]) out.push(h("span", { class: "tag", style: { color: STATUS[k].color }, title: STATUS[k].name }, STATUS[k].icon));
    return out;
  }
  refreshUnit(id) {
    const d = this.disp[id]; if (!d) return;
    const p = clamp(d.hp / d.maxHp, 0, 1);
    if (d.side === "enemy") {
      const el = this.bossEl, bar = el.querySelector(".bhp"); if (!bar) return;
      bar.querySelector("b").style.width = `calc(${p * 100}% - 6px)`;
      bar.querySelector("s").style.width = `calc(${p * 100}% - 6px)`;
      bar.querySelector("u").style.width = clamp(d.shield / d.maxHp, 0, 1) * 100 + "%";
      bar.classList.toggle("mid", p <= 0.5 && p > 0.2); bar.classList.toggle("low", p <= 0.2);
      el.querySelector(".num").textContent = `${Math.ceil(d.hp)} / ${d.maxHp}` + (d.shield ? `  (+${d.shield})` : "");
      const tags = el.querySelector(".row .tags"); tags.innerHTML = ""; tags.append(...this.tagsOf(d));
      return;
    }
    const el = this.cards[id]; if (!el) return;
    const bar = el.querySelector(".hpbar");
    bar.querySelector("b").style.width = p * 100 + "%";
    bar.querySelector("s").style.width = p * 100 + "%";
    bar.querySelector("u").style.width = clamp(d.shield / d.maxHp, 0, 1) * 100 + "%";
    bar.classList.toggle("mid", p <= 0.5 && p > 0.2); bar.classList.toggle("low", p <= 0.2);
    el.querySelector(".hpn").textContent = `${Math.ceil(d.hp)} / ${d.maxHp}` + (d.shield ? ` +${d.shield}` : "");
    const tags = el.querySelector(".tags"); tags.innerHTML = ""; tags.append(...this.tagsOf(d));
    el.style.setProperty("--ch", Math.floor(d.charge || 0));
    el.classList.toggle("ready", d.alive && d.charge >= 100);
    el.classList.toggle("ko", !d.alive);
    if (this.cmdUnit === id) this.refreshUlt();
  }
  // Intention du boss : capacité prévue et cible.
  setIntents(map) {
    const wrap = this.bossEl.querySelector(".intentwrap"); if (!wrap) return;
    wrap.innerHTML = "";
    const it = map[this.boss]; if (!it) return;
    const tgt = it.tgt && this.disp[it.tgt];
    const tg = it.m.tg || "one";
    wrap.appendChild(h("div", { class: "intent" + (it.slot === "ult" ? " ult" : "") },
      tgt ? h("img", { src: this.pic(tgt.k) }) : null,
      h("small", null, it.slot === "ult" ? "ULTIME EN PRÉPARATION" : "PRÉPARE"),
      h("b", null, it.m.n + (tg === "all" ? " · toute l'équipe" : tgt ? " → " + fr(tgt.k) : ""))));
  }
  setActive(id) { for (const k in this.cards) this.cards[k].classList.toggle("now", k === id); }
  setTarget() {}
  place() { if (this.qte) this.qte.follow(); }

  // ───────── frise ─────────
  timeline(ids, nowId) {
    this.tl.innerHTML = "";
    ids.slice(0, 7).forEach((id, i) => {
      const d = this.disp[id]; if (!d) return;
      this.tl.appendChild(h("div", { class: "tl " + d.side + (i === 0 && id === nowId ? " now" : ""), title: fr(d.k) },
        h("span", { style: { backgroundImage: `url(${this.pic(d.k)})`, backgroundSize: "cover", backgroundPosition: "center 30%" } }),
        i ? h("i", null, String(i)) : null));
    });
  }

  // ───────── énergie ─────────
  setPts(n, gain) {
    this.pts = n;
    this.ebar.innerHTML = "";
    this.ebar.append(
      h("div", { class: "eb-lbl" }, h("b", null, `${n}/${MAX_EN}`), h("small", null, "ÉNERGIE")),
      h("div", { class: "eb-segs" }, ...Array.from({ length: MAX_EN }, (_, i) => h("i", { class: i < n ? "on" : "", style: { "--h": SEG_HUE[i] } }))));
    if (gain) { this.ebar.classList.remove("gain"); void this.ebar.offsetWidth; this.ebar.classList.add("gain"); }
    if (this.cmdUnit) this.refreshMovesBtn();
  }
  deny() { this.ebar.classList.remove("shake"); void this.ebar.offsetWidth; this.ebar.classList.add("shake"); }

  // ───────── commandes ─────────
  // h : { onPick(i), onUlt(), getOpts() }
  showCommands(u, handlers) {
    this.cmdUnit = u.id; this.handlers = handlers;
    const opts = handlers.getOpts();
    const basic = opts[0].m;
    const cmd = (cls, icon, label, small, onclick, key) => h("button", { class: "cmd " + cls, onclick },
      h("span", { class: "ci" }, SVG(ICON[icon])), h("b", null, label), h("small", null, ...small), key ? h("kbd", null, key) : null, h("span", { class: "shine" }));
    this.ultBtn = cmd("ult", "ult", "ULTIME", [h("span", { class: "pct" }, "")], () => handlers.onUlt(), "U");
    this.itemsBtn = cmd("items", "items", "OBJETS", [h("span", { class: "cnt" }, "")], () => this.openItems(), "I");
    this.movesBtn = cmd("moves", "moves", "CAPACITÉS", [h("span", { class: "cnt" }, "")], () => this.openMoves(), "E");
    this.atkBtn = cmd("atk", "atk", "ATTAQUE", [h("span", null, basic.n), h("em", null, "+1 ⚡")], () => handlers.onPick(0), "Q");
    this.cmds.innerHTML = "";
    this.cmds.append(this.ultBtn, this.itemsBtn, this.movesBtn, this.atkBtn);
    this.cmds.classList.remove("enter"); void this.cmds.offsetWidth; this.cmds.classList.add("enter");
    this.closeMoves();
    this.refreshUlt(); this.refreshMovesBtn(); this.refreshItemsBtn();
    this.cmdzone.classList.remove("off");
  }
  refreshUlt() {
    if (!this.ultBtn || !this.cmdUnit) return;
    const d = this.disp[this.cmdUnit]; const c = Math.floor(d.charge || 0);
    this.ultBtn.style.setProperty("--p", Math.min(1, c / 100));
    this.ultBtn.classList.toggle("ready", c >= 100);
    this.ultBtn.querySelector(".pct").textContent = c >= 100 ? SPECIES[d.k].ult.n : c + " %";
  }
  refreshMovesBtn() {
    if (!this.movesBtn || !this.handlers) return;
    const opts = this.handlers.getOpts().slice(1);
    this.movesBtn.querySelector(".cnt").textContent = `${opts.filter((o) => o.ok).length}/3 dispo.`;
    if (this.mode === "moves") this.renderMoves();
  }
  refreshItemsBtn() {
    if (!this.itemsBtn || !this.handlers) return;
    const items = this.handlers.getItems ? this.handlers.getItems() : [], n = items.reduce((s, o) => s + o.n, 0);
    this.itemsBtn.classList.toggle("off", !items.some((o) => o.ok));
    this.itemsBtn.querySelector(".cnt").textContent = n ? `${n} dans le sac` : "sac vide";
  }
  // Panneau ouvert à la place des commandes : "moves" (capacités), "items" (objets) ou null.
  panel() { return this.cmdzone.classList.contains("mv") ? this.mode : null; }
  openMoves() { this.mode = "moves"; this.cmdzone.classList.add("mv"); this.renderMoves(); }
  openItems() {
    const items = this.handlers && this.handlers.getItems ? this.handlers.getItems() : [];
    if (!items.length) { this.toast("Sac vide."); return; }
    this.mode = "items"; this.cmdzone.classList.add("mv"); this.renderItems(items);
  }
  closeMoves() { this.cmdzone.classList.remove("mv"); this.mode = null; }
  renderItems(items) {
    this.mvpanel.innerHTML = "";
    items.forEach((o, j) => this.mvpanel.appendChild(h("button", { class: "mcard item" + (o.ok ? "" : " off"), style: { "--c": o.color || "#ffc83a" }, onclick: () => this.handlers.onItem(o.id), title: o.desc },
      h("div", { class: "mc-txt" }, h("div", { class: "mc-h" }, h("em", null, "Objet")), h("b", null, o.name), h("small", null, o.desc)),
      h("div", { class: "mc-cost" }, h("b", null, "×" + o.n)),
      h("kbd", null, String(j + 1)))));
    this.mvpanel.appendChild(h("button", { class: "mvback", onclick: () => this.closeMoves() }, "← RETOUR  ", h("kbd", null, "Échap")));
  }
  renderMoves() {
    const opts = this.handlers.getOpts();
    this.mvpanel.innerHTML = "";
    opts.slice(1).forEach((o, j) => {
      const m = o.m, i = j + 1;
      this.mvpanel.appendChild(h("button", { class: "mcard" + (o.ok ? "" : " off"), style: { "--c": TYPE_COLOR[m.t] }, onclick: () => this.handlers.onPick(i), title: describe(m) },
        h("div", { class: "mc-txt" },
          h("div", { class: "mc-h" }, h("span", { class: "mc-type" }, m.t), h("em", null, SLOT_NAME[o.slot])),
          h("b", null, m.n),
          h("small", null, describe(m))),
        h("div", { class: "mc-cost" }, h("b", null, String(o.cost))),
        h("kbd", null, String(i))));
    });
    this.mvpanel.appendChild(h("button", { class: "mvback", onclick: () => this.closeMoves() }, "← RETOUR  ", h("kbd", null, "Échap")));
  }
  hideMoves() { this.cmdzone.classList.add("off"); this.closeMoves(); this.cmdUnit = null; }
  showMoves() {} // compatibilité

  // ───────── textes ─────────
  float(pos3, text, cls = "", color) {
    const s = this.stage.toScreen(pos3); if (s.behind) return;
    const el = h("div", { class: "float " + cls, style: { left: s.x + (Math.random() - 0.5) * 30 + "px", top: s.y + (Math.random() - 0.5) * 16 + "px", color: color || null } }, text);
    this.fxl.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
  banner(u, m, slot) {
    if (this._ban) { const b = this._ban; b.classList.add("out"); setTimeout(() => b.remove(), 260); }
    const d = this.disp[u];
    const el = h("div", { class: "banner " + d.side + (slot === "ult" ? " ult" : ""), style: { "--c": TYPE_COLOR[m.t] } },
      h("i", { style: { backgroundImage: `url(${this.pic(d.k)})` } }),
      h("div", null, h("small", null, (slot === "ult" ? "Ultime" : SLOT_NAME[slot] || "Attaque") + " · " + fr(d.k)), h("b", null, m.n)));
    this.root.appendChild(el); this._ban = el;
    clearTimeout(this._banT); this._banT = setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 260); if (this._ban === el) this._ban = null; }, 1600);
  }
  // Conseil bloquant (premiers combats) : se ferme avec le bouton, Entrée ou Espace.
  tip(title, text) {
    return new Promise((res) => {
      const done = (e) => { if (e && e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return; if (e) { e.preventDefault(); e.stopPropagation(); } removeEventListener("keydown", done, true); el.remove(); res(); };
      const el = h("div", { class: "tip", role: "dialog", "aria-label": title },
        h("small", null, "Conseil"), h("b", null, title), ...[].concat(text).map((t) => h("p", null, t)),
        h("button", { onclick: () => done() }, "Compris", h("kbd", null, "Entrée")));
      this.root.appendChild(el);
      addEventListener("keydown", done, true);
    });
  }
  toast(text, ms = 1800) { const el = h("div", { class: "toast" }, text); this.root.appendChild(el); setTimeout(() => el.remove(), ms); }
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
    const el = h("div", { class: "stamp " + cls, style: { left: s.x + "px", top: s.y - 80 + "px" } }, text);
    this.root.appendChild(el); setTimeout(() => el.remove(), 950);
  }

  // ───────── frappe rythmée : jauge ─────────
  // Un curseur traverse la jauge : zone verte (petite) = excellent, jaune = bien, rouge = rien.
  // Résout 2 (excellent), 1 (bien) ou 0.
  timing(getPos, { kind = "atk", D = 720 } = {}) {
    return new Promise((res) => {
      const dur = Math.max(900, D * 1.35);
      const c = 0.42 + Math.random() * 0.4;           // centre des zones
      const gw = 0.22, bw = 0.07;                       // largeurs : jaune, verte
      const cur = h("div", { class: "cur" });
      const track = h("div", { class: "track" },
        h("div", { class: "good", style: { left: (c - gw / 2) * 100 + "%", width: gw * 100 + "%" } }),
        h("div", { class: "best", style: { left: (c - bw / 2) * 100 + "%", width: bw * 100 + "%" } }),
        cur);
      const el = h("div", { class: "gauge " + kind },
        h("div", { class: "lbl" }, h("span", null, kind === "atk" ? "FRAPPE" : "PARADE"), h("small", null, "ESPACE OU CLIC")), track);
      this.root.appendChild(el);
      const t0 = performance.now();
      let done = false, x = 0;
      const tick = () => {
        if (done) return;
        x = (performance.now() - t0) / dur;
        cur.style.left = Math.min(1, x) * 100 + "%";
        if (x >= 1.02) finish(0); else requestAnimationFrame(tick);
      };
      const finish = (q) => {
        if (done) return; done = true;
        removeEventListener("keydown", onKey, true); removeEventListener("pointerdown", onTap, true);
        setTimeout(() => el.remove(), 180);
        this.stamp(getPos(), q === 2 ? (kind === "atk" ? "EXCELLENT !" : "PARADE !") : q === 1 ? "BIEN" : "RATÉ", q === 2 ? "" : q === 1 ? "good" : "miss");
        res(q);
      };
      const judge = () => { const d = Math.abs(x - c); finish(d <= bw / 2 ? 2 : d <= gw / 2 ? 1 : 0); };
      const onKey = (e) => { if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); e.stopPropagation(); judge(); } };
      const onTap = (e) => { if (e.button === 0) { e.stopPropagation(); judge(); } };
      addEventListener("keydown", onKey, true); addEventListener("pointerdown", onTap, true);
      this.qte = null;
      requestAnimationFrame(tick);
    });
  }

  result({ win, stats, onRetry }) {
    const el = h("div", { class: "result" + (win ? "" : " lose") },
      h("div", { class: "box" },
        h("h2", null, win ? "VICTOIRE !" : "K.O.…"),
        h("div", { class: "stats" }, ...stats.map(([v, l]) => h("div", null, h("b", null, String(v)), h("small", null, l)))),
        h("button", { onclick: () => { el.remove(); onRetry(); } }, "REJOUER")));
    this.root.appendChild(el);
  }
}
