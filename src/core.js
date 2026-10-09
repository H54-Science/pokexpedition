// Outils de base : DOM, maths, hasard, horloge de jeu, tweens.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// h("div", { class: "x", onclick }, enfants…)
export function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "style" && typeof v === "object") { for (const sk in v) { if (sk.startsWith("--")) e.style.setProperty(sk, v[sk]); else e.style[sk] = v[sk]; } }
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else e.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return e;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// Hasard reproductible (mulberry32) : la carte d'une expédition dépend de sa graine.
export function RNG(seed) {
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.int = (a, b) => a + Math.floor(r() * (b - a + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  r.shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  r.weighted = (pairs) => { const tot = pairs.reduce((s, p) => s + p[1], 0); let x = r() * tot; for (const [v, w] of pairs) { if ((x -= w) <= 0) return v; } return pairs[pairs.length - 1][0]; };
  r.state = () => s;
  return r;
}
export const rand = RNG((Math.random() * 2 ** 32) >>> 0);

// ───────── horloge de jeu ─────────
// Le temps de jeu peut ralentir (ralenti) ou s'arrêter (hitstop). Les tweens et
// les attentes suivent ce temps-là, pas l'horloge réelle.
export const Clock = {
  t: 0, scale: 1, freezeUntil: 0, _jobs: new Set(),
  step(dtMs) {
    const now = performance.now();
    const d = now < this.freezeUntil ? 0 : dtMs * this.scale;
    this.t += d;
    for (const j of [...this._jobs]) j(d);
  },
  hitstop(ms) { this.freezeUntil = Math.max(this.freezeUntil, performance.now() + ms); },
  add(fn) { this._jobs.add(fn); return () => this._jobs.delete(fn); },
};

export function wait(ms) {
  return new Promise((res) => {
    let left = ms;
    const off = Clock.add((d) => { left -= d; if (left <= 0) { off(); res(); } });
  });
}
// Attente en temps réel (indépendante du ralenti).
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outBounce: (t) => { const n1 = 7.5625, d1 = 2.75; if (t < 1 / d1) return n1 * t * t; if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75; if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375; return n1 * (t -= 2.625 / d1) * t + 0.984375; },
};

// tween(objet, { x: 10, "scale.x": 2 }, durée, easing) → Promise
export function tween(obj, props, dur = 300, ease = Ease.outQuad, opts = {}) {
  const keys = Object.keys(props);
  const get = (k) => k.split(".").reduce((o, p) => o[p], obj);
  const set = (k, v) => { const ps = k.split("."); const last = ps.pop(); const o = ps.reduce((o, p) => o[p], obj); o[last] = v; };
  const from = keys.map(get), to = keys.map((k) => props[k]);
  return new Promise((res) => {
    let t = 0;
    if (dur <= 0) { keys.forEach((k, i) => set(k, to[i])); return res(); }
    const real = opts.real; let last = performance.now();
    const tick = (d) => {
      if (obj.destroyed) { off(); return res(); }
      if (real) { const n = performance.now(); d = n - last; last = n; }
      t = Math.min(1, t + d / dur);
      const e = ease(t);
      keys.forEach((k, i) => set(k, from[i] + (to[i] - from[i]) * e));
      opts.onUpdate && opts.onUpdate(t);
      if (t >= 1) { off(); res(); }
    };
    const off = Clock.add(tick);
  });
}

export const fmt = (n) => Math.round(n).toLocaleString("fr-FR");
export const pct = (v) => Math.round(v * 100) + "%";
export const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
