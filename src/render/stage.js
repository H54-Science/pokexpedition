// Scène 3D du combat : rendu, arène, lumières, post-traitement, caméra, placement des unités.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Clock, clamp, lerp } from "../core.js";
import { FX } from "./fx.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Stage {
  constructor(canvas, { quality = "high" } = {}) {
    this.canvas = canvas;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }));
    r.setPixelRatio(Math.min(devicePixelRatio, quality === "high" ? 2 : 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    this.low = quality === "low";
    r.shadowMap.enabled = !this.low; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.05, 200);
    this.fx = new FX(this.scene, this.camera);
    this.units = new Map(); // id → { P, home, face }
    this.updaters = new Set();
    this.buildArena();
    this.buildMarkers();
    // caméra : position et point visé courants / cibles, tremblement
    this.cam = { pos: V(0, 6, 14), look: V(0, 1, 0), tPos: V(0, 6, 14), tLook: V(0, 1, 0), k: 3.5, shake: 0, shakeT: 0, fov: 42, tFov: 42 };
    // post-traitement
    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // 2e passe : redessine l'unité mise en avant (ultime) par-dessus l'assombrissement
    this.overCam = new THREE.PerspectiveCamera(); this.overCam.layers.set(1);
    this.overPass = new RenderPass(this.scene, this.overCam); this.overPass.clear = false; this.overPass.clearDepth = true; this.overPass.enabled = false;
    this.composer.addPass(this.overPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.5, 0.82);
    if (!this.low) this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.resize();
    addEventListener("resize", () => this.resize());
    this.last = performance.now();
    this.ray = new THREE.Raycaster();
    r.setAnimationLoop(() => this.frame());
  }

  resize() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.W = w; this.H = h;
  }

  // ───────── arène ─────────
  buildArena() {
    const s = this.scene;
    // ciel : dégradé sur une sphère
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color("#1b2a55") }, mid: { value: new THREE.Color("#6a7fb8") }, bot: { value: new THREE.Color("#f0b48a") } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, h)) : mix(mid, bot, smoothstep(0.0, -0.25, h)); c = mix(c, bot, smoothstep(0.12, -0.02, h) * 0.85); gl_FragColor = vec4(c, 1.0); }",
    });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), skyMat));
    s.fog = new THREE.Fog("#8a8fb8", 26, 70);
    // lumières
    const hemi = new THREE.HemisphereLight("#d8e4ff", "#5a4a60", 1.5); s.add(hemi);
    const sun = (this.sun = new THREE.DirectionalLight("#fff0dc", 2.4));
    sun.position.set(-6, 12, 7); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
    s.add(sun);
    const rim = new THREE.DirectionalLight("#8ab0ff", 1.0); rim.position.set(5, 4, -9); s.add(rim);
    for (const l of [hemi, sun, rim]) l.layers.enable(1);
    // sol : grande dalle + arène gravée
    const groundTex = this.arenaTexture();
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 96), new THREE.MeshStandardMaterial({ color: "#3d4a6a", roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    const arena = new THREE.Mesh(new THREE.CircleGeometry(9, 96), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.8, emissive: "#7aa8ff", emissiveIntensity: 0.0 }));
    arena.rotation.x = -Math.PI / 2; arena.position.y = 0.01; arena.receiveShadow = true; s.add(arena);
    // anneau lumineux autour de l'arène
    const ringMat = new THREE.MeshBasicMaterial({ color: "#9ac4ff", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(8.85, 9.0, 128), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; s.add(ring);
    // piliers et rochers autour
    const rockMat = new THREE.MeshStandardMaterial({ color: "#5a5f78", roughness: 1, flatShading: true });
    const crystalMat = new THREE.MeshStandardMaterial({ color: "#8ab8ff", emissive: "#4a7cff", emissiveIntensity: 1.6, roughness: 0.3, flatShading: true });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2, d = 12 + (i % 3) * 3.5;
      const h = 1.2 + ((i * 7) % 5) * 0.9;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rockMat);
      m.scale.set(1.1 + (i % 2) * 0.6, h, 1.1); m.position.set(Math.cos(a) * d, h * 0.45, Math.sin(a) * d); m.rotation.y = i;
      m.castShadow = true; m.receiveShadow = true; s.add(m);
      if (i % 3 === 0) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), crystalMat);
        c.position.set(Math.cos(a) * (d - 1.3), 0.6, Math.sin(a) * (d - 1.3)); c.scale.y = 2; c.rotation.z = 0.3;
        s.add(c);
      }
    }
    // poussières en suspension
    const n = 160, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 30; pos[i * 3 + 1] = Math.random() * 7; pos[i * 3 + 2] = (Math.random() - 0.5) * 30; }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const motes = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#ffe8c0", size: 0.06, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.add(motes);
    this.updaters.add((dt, t) => { motes.rotation.y = t * 0.00002; motes.position.y = Math.sin(t * 0.0003) * 0.2; ringMat.opacity = 0.45 + Math.sin(t * 0.0015) * 0.12; });
    // assombrissement (ultime) : écran noir semi-transparent devant la caméra
    this.dim = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: "#06040c", transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    this.dim.renderOrder = 5; this.dim.frustumCulled = false;
  }
  arenaTexture() {
    const S = 1024, c = document.createElement("canvas"); c.width = c.height = S;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grd.addColorStop(0, "#6a7aa0"); grd.addColorStop(0.75, "#4e5c82"); grd.addColorStop(1, "#3d4a6a");
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    // dalles concentriques
    g.strokeStyle = "rgba(20,26,48,0.55)"; g.lineWidth = 3;
    for (let r = 1; r <= 5; r++) { g.beginPath(); g.arc(S / 2, S / 2, (r / 5.3) * (S / 2), 0, Math.PI * 2); g.stroke(); }
    for (let r = 1; r <= 5; r++) {
      const n = r * 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r * 0.3, r0 = ((r - 1) / 5.3) * (S / 2), r1 = (r / 5.3) * (S / 2);
        g.beginPath(); g.moveTo(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0); g.lineTo(S / 2 + Math.cos(a) * r1, S / 2 + Math.sin(a) * r1); g.stroke();
      }
    }
    // ligne médiane et cercle central (emblème)
    g.strokeStyle = "rgba(200,220,255,0.35)"; g.lineWidth = 5;
    g.beginPath(); g.moveTo(S * 0.06, S / 2); g.lineTo(S * 0.94, S / 2); g.stroke();
    g.beginPath(); g.arc(S / 2, S / 2, S * 0.09, 0, Math.PI * 2); g.stroke();
    // usure
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * 0.05})`; g.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 6, 2 + Math.random() * 6); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }

  // ───────── repères : tour actif, cible ─────────
  buildMarkers() {
    const mk = (color, r0, r1) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.visible = false; this.scene.add(m); return m;
    };
    this.activeRing = mk("#ffd76a", 0.9, 1.0);
    this.targetRing = mk("#ff6a5a", 0.85, 0.95);
    // flèche au-dessus de la cible
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), new THREE.MeshBasicMaterial({ color: "#ff8a6a" }));
    cone.rotation.x = Math.PI; cone.visible = false; this.scene.add(cone); this.arrow = cone;
    this.updaters.add((dt, t) => {
      for (const [m, u] of [[this.activeRing, this.activeId], [this.targetRing, this.targetId]]) {
        const U = u && this.units.get(u);
        if (!U || !U.alive) { m.visible = false; continue; }
        m.visible = true;
        const r = U.P.radius * 1.35 + 0.25;
        m.position.x = U.P.pivot.position.x; m.position.z = U.P.pivot.position.z;
        m.scale.setScalar(r * (1 + Math.sin(t * 0.005) * 0.04));
        m.rotation.z = t * 0.0008;
      }
      const T = this.targetId && this.units.get(this.targetId);
      this.arrow.visible = !!(T && T.alive && this.showArrow);
      if (this.arrow.visible) { const p = T.P.pivot.position; this.arrow.position.set(p.x, T.P.height + 0.45 + Math.abs(Math.sin(t * 0.004)) * 0.18, p.z); this.arrow.rotation.y = t * 0.002; }
    });
  }
  setActive(id) { this.activeId = id; }
  // Tour d'un allié (comme dans HSR) : seul l'allié actif reste visible côté joueur.
  solo(id) { for (const U of this.units.values()) if (U.side === "ally") U.opT = !id || U.id === id ? 1 : 0; }
  setTarget(id, arrow = true) { this.targetId = id; this.showArrow = arrow; }

  // ───────── unités ─────────
  addUnit(id, P, side) {
    this.scene.add(P.pivot);
    const U = { id, P, side, home: new THREE.Vector3(), face: side === "ally" ? Math.PI : 0, alive: true, flashT: 0, op: 1, opT: 1 };
    P.pivot.rotation.y = U.face;
    // volume invisible pour la sélection à la souris
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.5, P.radius), Math.max(0.5, P.radius), P.height * 1.05, 10), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = P.height / 2; hit.userData.unitId = id; P.pivot.add(hit); U.hit = hit;
    this.units.set(id, U);
    return U;
  }
  // Rangées : alliés devant la caméra (z > 0), ennemis en face (z < 0).
  layout(side, ids, anim = false) {
    const n = ids.length, z = side === "ally" ? 2.9 : -2.9;
    const gap = side === "ally" ? 2.3 : 2.7;
    ids.forEach((id, i) => {
      const U = this.units.get(id); if (!U) return;
      const big = U.P.radius > 1.3 ? 0.8 : 0;
      const x = (i - (n - 1) / 2) * (gap + big);
      const zz = z + (side === "enemy" ? -big * 0.8 - Math.abs(x) * 0.12 : Math.abs(x) * 0.08);
      U.home.set(x, 0, zz);
      if (!anim) U.P.pivot.position.copy(U.home);
      else U.moveTo = U.home.clone();
    });
  }
  pos(id) { return this.units.get(id).P.pivot.position; }
  // Point central (impacts) et point haut (textes).
  center(id) { const U = this.units.get(id); return U.P.pivot.position.clone().add(V(0, U.P.height * 0.5, 0)); }
  top(id) { const U = this.units.get(id); return U.P.pivot.position.clone().add(V(0, U.P.height + 0.15, 0)); }
  mouth(id) { const U = this.units.get(id); const f = U.side === "ally" ? -1 : 1; return U.P.pivot.position.clone().add(V(0, U.P.height * 0.62, f * U.P.radius * 0.6)); }

  // Projection écran (pixels CSS) d'un point 3D.
  toScreen(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.W, y: (-p.y * 0.5 + 0.5) * this.H, behind: p.z > 1 };
  }
  pick(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const m = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(m, this.camera);
    const hits = this.ray.intersectObjects([...this.units.values()].filter((u) => u.alive).map((u) => u.hit), false);
    return hits.length ? hits[0].object.userData.unitId : null;
  }

  // Éclair blanc ou coloré sur un modèle.
  flash(id, color = "#ffffff", ms = 110) {
    const U = this.units.get(id); if (!U) return;
    U.flashColor = new THREE.Color(color); U.flashT = ms; U.flashDur = ms;
  }

  // ───────── caméra ─────────
  // Plans prédéfinis. Les positions sont calculées à partir des unités.
  shot(name, o = {}) {
    const c = this.cam; let pos, look, fov = 42, k = o.k || 3.2;
    if (name === "wide") { pos = V(0, 5.2, 11.5); look = V(0, 1.1, -0.6); fov = 40; }
    else if (name === "intro") { pos = V(-8, 7.5, 15); look = V(0, 1.2, -2.5); fov = 36; }
    else if (name === "victory") { pos = V(4.5, 2.4, 8.2); look = V(0, 1.2, 2.6); fov = 38; }
    else if (name === "shoulder") {
      // derrière l'allié actif, légèrement décalé, regard vers la cible
      // derrière l'allié actif, décalé vers l'extérieur et en hauteur pour passer au-dessus des voisins
      const a = this.units.get(o.id), t = o.target ? this.units.get(o.target) : null;
      const ap = a.home.clone(), tp = t ? t.home.clone() : V(0, 0, -3);
      const H = a.P.height, sgn = ap.x >= 0 ? 1 : -1;
      pos = V(ap.x * 0.6 + sgn * (1.35 + H * 0.4), 1.2 + H * 0.6, ap.z + 1.7 + H * 0.85);
      look = ap.clone().lerp(tp, 0.62).add(V(0, 0.55 + (t ? t.P.height * 0.3 : 0.5), 0));
      fov = 50;
    } else if (name === "enemy") {
      // tour ennemi : vue depuis le camp allié vers l'ennemi actif
      const e = this.units.get(o.id);
      const ep = e.home.clone();
      pos = V(ep.x * 0.45 + 1.8, 3.6 + e.P.height * 0.45, 7.6);
      look = ep.clone().add(V(0, e.P.height * 0.5, 0));
      fov = 38;
    } else if (name === "closeup") {
      // gros plan de face (ultime)
      const u = this.units.get(o.id); const p = u.P.pivot.position.clone(); const f = u.side === "ally" ? -1 : 1, H = u.P.height;
      pos = p.clone().add(V(H * 0.55, H * 0.75, f * (H * 1.25 + 1.1)));
      look = p.clone().add(V(0, H * 0.62, 0));
      fov = 34; k = o.k || 6;
    } else if (name === "aoe") {
      const ys = o.side === "ally" ? 1 : -1;
      pos = V(-5.5, 3.6, ys * 7.5); look = V(0, 1, -ys * 1.8); fov = 44;
    }
    c.tPos.copy(pos); c.tLook.copy(look); c.tFov = fov; c.k = k;
    if (o.snap) { c.pos.copy(pos); c.look.copy(look); c.fov = fov; }
  }
  shake(amp, ms = 300) { this.cam.shake = Math.max(this.cam.shake, amp); this.cam.shakeT = Math.max(this.cam.shakeT, ms); this.cam.shakeD = ms; }
  setDim(v) {
    if (v > 0 && !this.dim.parent) { this.camera.add(this.dim); this.scene.add(this.camera); }
    this.dimTarget = v;
  }
  // Met une unité en avant : elle échappe à l'assombrissement.
  spotlight(id) {
    for (const U of this.units.values()) U.P.pivot.traverse((o) => { if (o.isMesh) { if (U.id === id) o.layers.enable(1); else o.layers.disable(1); } });
    this.overPass.enabled = !!id;
  }

  // ───────── boucle ─────────
  frame() {
    const now = performance.now();
    const real = Math.min(this.maxDt || 50, now - this.last); this.last = now;
    Clock.step(real);
    const frozen = now < Clock.freezeUntil;
    const dt = frozen ? 0 : real * Clock.scale;
    const t = now;
    // caméra (temps réel : la caméra reste fluide pendant le ralenti)
    const c = this.cam, a = 1 - Math.exp((-c.k * real) / 1000);
    c.pos.lerp(c.tPos, a); c.look.lerp(c.tLook, a); c.fov = lerp(c.fov, c.tFov, a);
    this.camera.position.copy(c.pos);
    this.camera.position.x += Math.sin(t * 0.00031) * 0.06; this.camera.position.y += Math.sin(t * 0.00023) * 0.04;
    if (c.shakeT > 0) {
      c.shakeT -= real; const s = c.shake * Math.max(0, c.shakeT / (c.shakeD || 300)) * 0.012;
      this.camera.position.add(V((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s));
      if (c.shakeT <= 0) c.shake = 0;
    }
    this.camera.lookAt(c.look);
    if (Math.abs(this.camera.fov - c.fov) > 0.01) { this.camera.fov = c.fov; this.camera.updateProjectionMatrix(); }
    if (this.overPass.enabled) { const o = this.overCam; o.position.copy(this.camera.position); o.quaternion.copy(this.camera.quaternion); o.fov = this.camera.fov; o.aspect = this.camera.aspect; o.near = this.camera.near; o.far = this.camera.far; o.updateProjectionMatrix(); }
    // assombrissement
    const dm = this.dim.material; const dt_ = this.dimTarget || 0;
    dm.opacity = lerp(dm.opacity, dt_, 1 - Math.exp(-real / 90));
    this.dim.position.set(0, 0, -0.2); this.dim.scale.set(2, 2, 1);
    this.dim.visible = dm.opacity > 0.01;
    // unités
    for (const U of this.units.values()) {
      U.P.mixer.update(dt / 1000);
      if (U.moveTo) { U.P.pivot.position.lerp(U.moveTo, 1 - Math.exp(-dt / 120)); if (U.P.pivot.position.distanceTo(U.moveTo) < 0.01) U.moveTo = null; }
      if (U.flashT > 0) {
        U.flashT -= real; const f = Math.max(0, U.flashT / U.flashDur);
        U.P.mats.forEach((m) => { if (!m._em) m._em = { c: m.emissive.clone(), map: m.emissiveMap, i: m.emissiveIntensity }; m.emissive.copy(U.flashColor); m.emissiveMap = null; m.emissiveIntensity = f * 1.6; m.needsUpdate = true; });
        if (U.flashT <= 0) U.P.mats.forEach((m) => { if (m._em) { m.emissive.copy(m._em.c); m.emissiveMap = m._em.map; m.emissiveIntensity = m._em.i; m._em = null; m.needsUpdate = true; } });
      }
      if (U.alive && Math.abs(U.op - U.opT) > 0.001) {
        U.op += (U.opT - U.op) * (1 - Math.exp(-real / 70)); if (Math.abs(U.op - U.opT) < 0.01) U.op = U.opT;
        U.P.mats.forEach((m) => { m.transparent = U.op < 1; m.opacity = U.op; m.depthWrite = U.op > 0.5; });
        U.P.pivot.visible = U.op > 0.02;
      }
      if (!U.P.clips || !Object.keys(U.P.clips).length) U.P.body.position.y = Math.sin(t * 0.003 + U.P.height) * 0.04; // sans animation : léger flottement
    }
    for (const f of this.updaters) f(dt, t);
    this.fx.update(dt);
    this.onFrame && this.onFrame(real);
    this.composer.render();
  }
}
