// Effets visuels : particules (sprites additifs), ondes de choc, projectiles, rayons, éclairs.
// Tout avance avec l'horloge de jeu (ralenti et hitstop compris).
import * as THREE from "three";
import { Clock } from "../core.js";
import { TYPE_COLOR } from "../data/data.js";

const col = (c) => new THREE.Color(c);

// ───────── textures générées ─────────
function canvasTex(size, draw) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TEX = {};
function tex(name) {
  if (TEX[name]) return TEX[name];
  const S = 64;
  const draws = {
    glow: (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,0.6)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, s, s); },
    spark: (g, s) => { g.translate(s / 2, s / 2); g.fillStyle = "#fff"; for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(0, 0, s * 0.48, s * 0.07, (i * Math.PI) / 2, 0, Math.PI * 2); g.fill(); } const r = g.createRadialGradient(0, 0, 0, 0, 0, s * 0.2); r.addColorStop(0, "#fff"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(-s / 2, -s / 2, s, s); },
    smoke: (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, "rgba(255,255,255,0.8)"); r.addColorStop(0.6, "rgba(255,255,255,0.3)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, s, s); },
    shard: (g, s) => { g.fillStyle = "#fff"; g.beginPath(); g.moveTo(s / 2, 2); g.lineTo(s * 0.68, s / 2); g.lineTo(s / 2, s - 2); g.lineTo(s * 0.32, s / 2); g.closePath(); g.fill(); },
    leaf: (g, s) => { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(s / 2, s / 2, s * 0.42, s * 0.18, 0.6, 0, Math.PI * 2); g.fill(); },
    drop: (g, s) => { g.fillStyle = "#fff"; g.beginPath(); g.arc(s / 2, s * 0.62, s * 0.22, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(s / 2, s * 0.12); g.lineTo(s * 0.7, s * 0.58); g.lineTo(s * 0.3, s * 0.58); g.fill(); },
    rock: (g, s) => { g.fillStyle = "#fff"; g.beginPath(); const n = 7; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, r = s * (0.3 + ((i * 37) % 10) / 60); g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r); } g.closePath(); g.fill(); },
    star: (g, s) => { g.translate(s / 2, s / 2); g.fillStyle = "#fff"; g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? s * 0.18 : s * 0.46; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); },
    ring: (g, s) => { g.strokeStyle = "#fff"; g.lineWidth = s * 0.08; g.beginPath(); g.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2); g.stroke(); },
  };
  return (TEX[name] = canvasTex(S, draws[name]));
}

// Style des particules par type.
const STYLE = {
  Normal: { tex: "star", colors: ["#ffffff", "#f0e6c8"], g: 2, up: 1, spin: 4 },
  Feu: { tex: "glow", colors: ["#ffdc6a", "#ff8a2a", "#ff4a1a"], g: -3, up: 2.2, grow: 1.6 },
  Eau: { tex: "drop", colors: ["#9ad8ff", "#4a9cff", "#e0f6ff"], g: 9, up: 3.5 },
  Plante: { tex: "leaf", colors: ["#8be06a", "#4fb84a", "#d6f58a"], g: 1.5, up: 2, spin: 6 },
  Électrik: { tex: "spark", colors: ["#fff4a0", "#ffe14a", "#ffffff"], g: 0, up: 0.5, fast: 1.6, bolts: true },
  Glace: { tex: "shard", colors: ["#e8fbff", "#a8ecff", "#7ad0f0"], g: 6, up: 2.5, spin: 3 },
  Combat: { tex: "star", colors: ["#ffb08a", "#ff6a4a", "#fff0d0"], g: 4, up: 1.5, fast: 1.3, spin: 5 },
  Poison: { tex: "glow", colors: ["#c77ae8", "#9a3ec8", "#e0a8ff"], g: -1.5, up: 1, grow: 1.4 },
  Sol: { tex: "smoke", colors: ["#d8b878", "#a88450", "#e8d0a0"], g: 2, up: 1.4, normal: true, grow: 2 },
  Vol: { tex: "smoke", colors: ["#ffffff", "#d8f0ff"], g: -0.5, up: 0.8, fast: 1.4, grow: 2.2 },
  Psy: { tex: "ring", colors: ["#ff8ac8", "#ff5aa0", "#ffd0e8"], g: 0, up: 0.6, grow: 2.6 },
  Insecte: { tex: "glow", colors: ["#c8e04a", "#8ab828", "#f0ff9a"], g: 2, up: 1.6 },
  Roche: { tex: "rock", colors: ["#c8b480", "#8a7a58", "#e0d0a8"], g: 12, up: 4, normal: true, spin: 4 },
  Spectre: { tex: "smoke", colors: ["#9a7ae0", "#6a4ab8", "#c8a8ff"], g: -1.5, up: 1, grow: 1.8 },
  Dragon: { tex: "glow", colors: ["#9a6aff", "#6a3af0", "#ff7ad0"], g: -2, up: 2, grow: 1.5 },
  Ténèbres: { tex: "smoke", colors: ["#4a3a48", "#2a2030", "#7a5a6a"], g: -0.8, up: 1, normal: true, grow: 2 },
  Acier: { tex: "spark", colors: ["#ffffff", "#c8d0e0", "#a0b0c8"], g: 8, up: 3, fast: 1.5 },
  Fée: { tex: "star", colors: ["#ffc8e8", "#ff8ac8", "#ffffff"], g: -0.5, up: 1.2, spin: 3 },
};
export const typeColor = (t) => TYPE_COLOR[t] || "#ffffff";

export class FX {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.parts = []; this.objs = [];
    this.pool = [];
    this.root = new THREE.Group(); scene.add(this.root);
  }

  // ───────── particules ─────────
  spawn(o) {
    let s = this.pool.pop();
    if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ depthWrite: false, transparent: true })); }
    const m = s.material;
    m.map = tex(o.tex || "glow"); m.color.set(o.color || "#ffffff");
    m.blending = o.normal ? THREE.NormalBlending : THREE.AdditiveBlending;
    m.rotation = o.rot ?? Math.random() * Math.PI * 2; m.opacity = o.a0 ?? 1; m.needsUpdate = true;
    s.position.copy(o.pos); s.scale.setScalar(o.s0 ?? 0.3); s.renderOrder = 10;
    this.root.add(s);
    this.parts.push({ s, v: o.vel ? o.vel.clone() : new THREE.Vector3(), g: o.g ?? 0, drag: o.drag ?? 0, life: o.life ?? 600, t: 0,
      s0: o.s0 ?? 0.3, s1: o.s1 ?? 0, a0: o.a0 ?? 1, a1: o.a1 ?? 0, vr: o.vr ?? 0 });
  }
  // Gerbe d'impact typée.
  burst(type, pos, k = 1, o = {}) {
    const st = STYLE[type] || STYLE.Normal;
    const n = Math.round((o.n || 22) * Math.min(2.2, 0.6 + k));
    const sp = (o.spread || 2.6) * (st.fast || 1) * (0.7 + k * 0.4);
    for (let i = 0; i < n; i++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 - 0.1 + st.up * 0.15, Math.random() - 0.5).normalize();
      const sz = (0.12 + Math.random() * 0.18) * (o.size || 1) * (0.8 + k * 0.4);
      this.spawn({ tex: st.tex, color: st.colors[i % st.colors.length], pos, vel: dir.multiplyScalar(sp * (0.4 + Math.random() * 0.8)), g: st.g, drag: 1.2,
        life: 450 + Math.random() * 450, s0: sz, s1: sz * (st.grow || 0.3), a0: st.normal ? 0.85 : 1, a1: 0, vr: (st.spin || 0) * (Math.random() - 0.5) * 2, normal: st.normal });
    }
    // éclat central
    this.spawn({ tex: "glow", color: st.colors[0], pos, life: 260, s0: 0.5 * k + 0.4, s1: 1.6 * k + 1.2, a0: st.normal ? 0.5 : 0.95, a1: 0 });
    if (!o.noFlare) this.spawn({ tex: "spark", color: "#ffffff", pos, life: 180, s0: 0.6 * k + 0.6, s1: 1.4 * k + 0.8, a0: 0.9, a1: 0 });
    if (st.bolts) for (let i = 0; i < 3; i++) this.bolt(pos, pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.6, (Math.random() - 0.5) * 2)), st.colors[1], 180);
  }
  // Petites particules qui montent (soin, bonus, chargement).
  rise(pos, color, n = 14, radius = 0.6, height = 1.2, texName = "spark") {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = radius * Math.sqrt(Math.random());
      const p = pos.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.random() * height * 0.4, Math.sin(a) * r));
      this.spawn({ tex: texName, color, pos: p, vel: new THREE.Vector3(0, 0.8 + Math.random() * 1.2, 0), life: 700 + Math.random() * 500, s0: 0.12 + Math.random() * 0.1, s1: 0.02, a0: 1, a1: 0 });
    }
  }
  // Traînée continue (projectiles).
  trail(pos, type) {
    const st = STYLE[type] || STYLE.Normal;
    this.spawn({ tex: st.tex === "rock" || st.tex === "drop" ? "glow" : st.tex, color: st.colors[(Math.random() * st.colors.length) | 0], pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15)),
      vel: new THREE.Vector3(0, st.g < 0 ? 0.4 : -0.2, 0), life: 320, s0: 0.28, s1: 0.04, a0: 0.9, a1: 0, normal: st.normal });
  }

  // ───────── objets animés ─────────
  add(obj, life, update) { this.root.add(obj); this.objs.push({ obj, life, t: 0, update }); }

  // Onde de choc au sol (ou verticale).
  shock(pos, color, radius = 2.5, life = 500, { vertical = false, width = 0.12 } = {}) {
    const geo = new THREE.RingGeometry(1 - width, 1, 64);
    const mat = new THREE.MeshBasicMaterial({ color: col(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos); if (!vertical) m.rotation.x = -Math.PI / 2; else m.lookAt(this.camera.position);
    m.position.y += 0.03;
    this.add(m, life, (t) => { const e = 1 - Math.pow(1 - t, 3); m.scale.setScalar(0.1 + radius * e); mat.opacity = 1 - t; });
  }
  // Colonne de lumière (ultime, soin de groupe).
  pillar(pos, color, height = 5, life = 700, radius = 0.8) {
    const geo = new THREE.CylinderGeometry(radius, radius * 1.2, height, 32, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color: col(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat); m.position.copy(pos); m.position.y += height / 2;
    this.add(m, life, (t) => { mat.opacity = Math.sin(t * Math.PI) * 0.55; m.scale.set(1 + t * 0.6, 1, 1 + t * 0.6); });
  }
  // Rayon entre deux points.
  beam(a, b, color, life = 380, width = 0.22) {
    const len = a.distanceTo(b);
    const geo = new THREE.CylinderGeometry(width, width, len, 12, 1, true); geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: col(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const core = new THREE.Mesh(geo, mat);
    const g2 = new THREE.CylinderGeometry(width * 0.35, width * 0.35, len, 8, 1, true); g2.rotateX(Math.PI / 2);
    const m2 = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    core.add(new THREE.Mesh(g2, m2));
    core.position.copy(a).lerp(b, 0.5); core.lookAt(b);
    this.add(core, life, (t) => { const w = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8; core.scale.set(w, w, 1); mat.opacity = w * 0.9; m2.opacity = w; });
  }
  // Éclair en zigzag.
  bolt(a, b, color, life = 220) {
    const pts = []; const n = 9;
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n);
      if (i > 0 && i < n) p.add(new THREE.Vector3((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35));
      pts.push(p);
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: col(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const l = new THREE.Line(geo, mat);
    this.add(l, life, (t) => { mat.opacity = Math.random() < 0.3 ? 0.2 : 1 - t; });
  }
  // Projectile : orbe qui suit un arc, avec traînée. Résout à l'arrivée.
  projectile(type, a, b, { dur = 320, arc = 0.8, size = 0.35 } = {}) {
    const st = STYLE[type] || STYLE.Normal;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex("glow"), color: col(st.colors[0]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.setScalar(size * 1.8);
    const c2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(st.tex === "rock" ? "rock" : "glow"), color: 0xffffff, blending: st.tex === "rock" ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    c2.scale.setScalar(size); s.add(c2); c2.scale.setScalar(0.5);
    return new Promise((res) => {
      this.add(s, dur, (t) => {
        s.position.copy(a).lerp(b, t); s.position.y += Math.sin(t * Math.PI) * arc;
        this.trail(s.position, type); this.trail(s.position, type);
        if (t >= 1) res();
      });
    });
  }

  // Avance d'un pas (dt en ms de jeu).
  update(dt) {
    const k = dt / 1000;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt; const u = Math.min(1, p.t / p.life);
      p.v.y -= p.g * k; if (p.drag) p.v.multiplyScalar(Math.max(0, 1 - p.drag * k));
      p.s.position.addScaledVector(p.v, k);
      p.s.scale.setScalar(p.s0 + (p.s1 - p.s0) * u);
      p.s.material.opacity = p.a0 + (p.a1 - p.a0) * u;
      p.s.material.rotation += p.vr * k;
      if (u >= 1) { this.root.remove(p.s); this.pool.push(p.s); this.parts.splice(i, 1); }
    }
    for (let i = this.objs.length - 1; i >= 0; i--) {
      const o = this.objs[i];
      o.t += dt; const u = Math.min(1, o.t / o.life);
      o.update && o.update(u);
      if (u >= 1) {
        this.root.remove(o.obj);
        o.obj.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
        this.objs.splice(i, 1);
      }
    }
  }
}
export { Clock };
