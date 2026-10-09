// Lobby : le hall-théâtre (modélisé dans Blender, models/lobby/hall.glb), le dresseur en 3e personne,
// le Pokémon partenaire qui le suit, et des stations (expéditions sur la scène, vœux, garde-robe…).
// Partage le renderer de la scène de combat : pendant le lobby, Stage délègue son rendu via stage.override.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { h } from "../core.js";
import { makePokemon } from "../render/assets.js";
import { Trainer } from "./trainer.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ───────── géométrie jouable (repère three : Blender (x, y, z) → (x, z, −y)) ─────────
const BOUNDS = { x0: -9.2, x1: 9.2, z0: -11.5, z1: 25.1 };
const BLOCKERS = [];
for (const x of [-6, 6]) for (const z of [-5, 1, 7, 13, 19]) BLOCKERS.push([x, z, 0.75]);   // colonnes
for (const x of [-3.6, 3.6]) for (const z of [-2.5, 3.5, 9.5, 15.5]) BLOCKERS.push([x, z, 0.38]); // lampadaires
for (const x of [-2.6, -1.7, 1.7, 2.6]) for (const z of [15.2, 16.5]) BLOCKERS.push([x, z, 0.42]); // fauteuils

export function groundAt(x, z) {
  const ax = Math.abs(x);
  if (z >= 19.45 && ax < 6) return 1.0;                                     // scène
  if (ax < 2 && z >= 17.77 && z < 19.45) return z < 18.23 ? 0.33 : z < 18.68 ? 0.66 : 0.99; // marches de la scène
  if (z >= -8 && z <= 22) { if (ax >= 6) return 0.6; if (ax >= 5.5) return 0.4; if (ax >= 5) return 0.2; } // galeries
  if (Math.hypot(x, z + 6.5) < 4.3) return 0.22;                            // estrade du tapis rond
  return 0;
}

// Stations : position au sol, rayon d'activation, couleur.
export const STATIONS = [
  { id: "expedition", label: "Expéditions", sub: "Monter sur scène", pos: [0, 21.6], r: 2.2, color: "#ffcf6a" },
  { id: "gacha", label: "Vœux", sub: "Bientôt", pos: [0, -6.5], r: 1.5, color: "#c58bff" },
  { id: "wardrobe", label: "Garde-robe", sub: "Tenue du dresseur", pos: [-8, 2.5], r: 1.5, color: "#7fe0ff" },
  { id: "partner", label: "Partenaire", sub: "Pokémon qui te suit", pos: [-8, 13.5], r: 1.5, color: "#8dff9a" },
  { id: "coop", label: "Coop", sub: "Bientôt", pos: [8, 2.5], r: 1.5, color: "#ff8fb3" },
  { id: "training", label: "Entraînement", sub: "Combat rapide", pos: [8, 13.5], r: 1.5, color: "#ff9a5a" },
];

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

export class Lobby {
  constructor(stage, { onAction } = {}) {
    this.stage = stage; this.r = stage.renderer; this.onAction = onAction;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#1a1018");
    this.scene.fog = new THREE.FogExp2("#1c1220", 0.006);
    this.camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 120);
    this.composer = new EffectComposer(this.r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.42, 0.45, 0.92);
    if (!stage.low) this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.keys = new Set();
    this.cam = { yaw: 0, pitch: 0.2, dist: 6.2, tDist: 6.2, look: V(0, 1.4, -10) };
    this.pos = V(0, 0, -1.2); this.vel = V(); this.face = 0;
    this.active = false; this.near = null; this.t = 0;
    this.onResize = () => this.resize();
    addEventListener("resize", this.onResize);
    this.ui = document.getElementById("lobby-ui");
  }

  async load(onProgress) {
    const g = await loader.loadAsync("models/lobby/hall.glb", (e) => onProgress && e.total && onProgress(e.loaded / e.total));
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.receiveShadow = true;
      const m = o.material;
      if (m.map) { m.map.anisotropy = 8; }
      if (m.emissive && m.emissive.getHex()) { m.emissiveIntensity = Math.min(m.emissiveIntensity, 1.6); o.castShadow = false; }
    });
    this.scene.add(g.scene);
    this.hall = g.scene;
    this.buildLights();
    this.buildStations();
    this.buildDust();
    this.trainer = new Trainer();
    this.scene.add(this.trainer.root);
    this.blob = this.makeBlob(0.55); this.scene.add(this.blob);
    this.resize();
  }

  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight("#ffd9b8", "#3a2230", 0.55));
    s.add(new THREE.AmbientLight("#ffe8d6", 0.1));
    // lustres
    for (const z of [-1, 7, 15]) { const l = new THREE.PointLight("#ffc88c", 30, 26, 1.6); l.position.set(0, 9.3, z); s.add(l); }
    // lampadaires de l'allée
    for (const x of [-3.6, 3.6]) for (const z of [-2.5, 3.5, 9.5, 15.5]) { const l = new THREE.PointLight("#ffb46b", 2.2, 7, 1.6); l.position.set(x, 2.6, z); s.add(l); }
    // galeries (lumière chaude rasante)
    for (const x of [-8, 8]) { const l = new THREE.PointLight("#ffa860", 10, 22, 1.4); l.position.set(x, 5.2, 7); s.add(l); }
    // tapis rond
    const rug = new THREE.PointLight("#b070ff", 5, 9, 1.6); rug.position.set(0, 2.4, -6.5); s.add(rug);
    // vitrail : grande lumière violette vers la salle + projecteur sur la scène
    const win = new THREE.SpotLight("#c890ff", 45, 50, 0.75, 0.6, 1.2); win.position.set(0, 11, 25.4); win.target.position.set(0, 0, 12); s.add(win, win.target);
    const st = new THREE.SpotLight("#ffd2a0", 22, 30, 0.6, 0.5, 1.3); st.position.set(0, 9, 16.5); st.target.position.set(0, 1, 22.5);
    st.castShadow = !this.stage.low; st.shadow.mapSize.set(1024, 1024); st.shadow.bias = -0.0008;
    s.add(st, st.target);
    // ombre douce du dresseur : directionnelle légère venant du vitrail
    const key = (this.key = new THREE.DirectionalLight("#e8c8ff", 0.6)); key.position.set(0, 14, 30); key.target.position.set(0, 0, 0);
    s.add(key, key.target);
  }

  buildStations() {
    this.markers = [];
    const ringTex = radialTexture(true);
    for (const st of STATIONS) {
      const y = groundAt(st.pos[0], st.pos[1]);
      const grp = new THREE.Group(); grp.position.set(st.pos[0], y + 0.02, st.pos[1]);
      const c = new THREE.Color(st.color);
      const ring = new THREE.Mesh(new THREE.PlaneGeometry(st.r * 2.2, st.r * 2.2), new THREE.MeshBasicMaterial({ map: ringTex, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
      ring.rotation.x = -Math.PI / 2; grp.add(ring);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.3 }));
      gem.position.y = 2.3; grp.add(gem);
      this.scene.add(grp);
      const el = h("div", { class: "lb-label", style: { "--c": st.color }, onclick: () => this.trigger(st) }, h("b", null, st.label), h("small", null, st.sub));
      this.ui.querySelector(".lb-labels").append(el);
      this.markers.push({ st, grp, ring, gem, el, y });
    }
  }

  buildDust() {
    const n = 500, p = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * 18; p[i * 3 + 1] = Math.random() * 11 + 0.3; p[i * 3 + 2] = -11 + Math.random() * 36; seed[i] = Math.random() * 100; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    this.dustBase = p.slice(); this.dustSeed = seed;
    const m = new THREE.PointsMaterial({ size: 0.07, map: radialTexture(false), color: "#ffd9a8", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 });
    this.dust = new THREE.Points(g, m); this.scene.add(this.dust);
  }

  makeBlob(r) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: radialTexture(false), color: "#000", transparent: true, opacity: 0.45, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; return m;
  }

  async setSkin(name) { await this.trainer.setSkin(name); }

  async setPartner(k) {
    if (this.partner) { this.scene.remove(this.partner.pivot); this.scene.remove(this.partner.blob); }
    this.partner = null;
    if (!k) return;
    const P = await makePokemon(k);
    const target = Math.min(P.height, 1.25);
    P.pivot.scale.setScalar(target / P.height);
    P.blob = this.makeBlob(Math.max(0.35, P.radius * (target / P.height)));
    P.pivot.position.copy(this.pos).add(V(1.2, 0, -1));
    P.walkClip = P.clips.walk ? "walk" : P.clips.fly ? "fly" : null;
    this.scene.add(P.pivot, P.blob);
    this.partner = P; this.partnerKey = k;
  }

  resize() {
    const w = this.r.domElement.clientWidth || innerWidth, h_ = this.r.domElement.clientHeight || innerHeight;
    this.composer.setSize(w, h_); this.camera.aspect = w / h_; this.camera.updateProjectionMatrix();
  }

  // ───────── entrée / sortie ─────────
  enter({ spawn = "door" } = {}) {
    if (spawn === "door" || !this.placed) { this.pos.set(0, 0, 1.2); this.face = 0; this.cam.yaw = 0; this.placed = true; }
    else if (spawn === "stage") { this.pos.set(0, 1, 20.2); this.face = Math.PI; this.cam.yaw = Math.PI; }
    this.pos.y = groundAt(this.pos.x, this.pos.z);
    this.cam.look.copy(this.pos).add(V(0, 1.4, 0));
    if (this.partner) this.partner.pivot.position.copy(this.pos).add(V(1.1, 0, -0.8));
    this.active = true; this.pause(false);
    this.ui.style.display = "";
    this.stage.override = (real, now) => this.frame(real, now);
    this.bind();
    this.resize();
  }
  leave() {
    this.active = false; this.keys.clear();
    this.ui.style.display = "none";
    this.stage.override = null;
    this.unbind();
  }
  pause(p) { this.paused = p; this.keys.clear(); this.ui.classList.toggle("dim", p); }

  bind() {
    if (this.bound) return; this.bound = true;
    const cv = this.r.domElement;
    this.kd = (e) => {
      if (!this.active || this.paused) return;
      this.keys.add(e.code);
      if (e.code === "Space") { e.preventDefault(); if (!e.repeat) this.jumpBuf = 0.15; }
      if ((e.code === "KeyF" || e.code === "KeyE" || e.code === "Enter") && this.near) { e.preventDefault(); this.trigger(this.near.st); }
    };
    this.ku = (e) => this.keys.delete(e.code);
    this.pd = (e) => { if (!this.active || this.paused) return; this.drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); };
    this.pm = (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; this.drag = { x: e.clientX, y: e.clientY };
      this.cam.yaw -= dx * 0.0055; this.cam.pitch = Math.min(1.15, Math.max(-0.15, this.cam.pitch + dy * 0.004));
    };
    this.pu = () => { this.drag = null; };
    this.wh = (e) => { if (!this.active || this.paused) return; this.cam.tDist = Math.min(9, Math.max(2.4, this.cam.tDist * (e.deltaY > 0 ? 1.1 : 0.9))); };
    this.blur = () => this.keys.clear();
    addEventListener("keydown", this.kd); addEventListener("keyup", this.ku); addEventListener("blur", this.blur);
    cv.addEventListener("pointerdown", this.pd); addEventListener("pointermove", this.pm); addEventListener("pointerup", this.pu);
    cv.addEventListener("wheel", this.wh, { passive: true });
  }
  unbind() {
    if (!this.bound) return; this.bound = false;
    const cv = this.r.domElement;
    removeEventListener("keydown", this.kd); removeEventListener("keyup", this.ku); removeEventListener("blur", this.blur);
    cv.removeEventListener("pointerdown", this.pd); removeEventListener("pointermove", this.pm); removeEventListener("pointerup", this.pu);
    cv.removeEventListener("wheel", this.wh);
  }

  trigger(st) {
    if (!this.active || this.paused) return;
    this.onAction && this.onAction(st.id);
  }

  // ───────── boucle ─────────
  frame(real) {
    const dt = Math.min(real, 50) / 1000; this.t += real;
    const K = this.keys;
    let ix = 0, iz = 0;
    if (!this.paused) {
      if (K.has("KeyW") || K.has("ArrowUp")) iz += 1;
      if (K.has("KeyS") || K.has("ArrowDown")) iz -= 1;
      if (K.has("KeyA") || K.has("ArrowLeft")) ix -= 1;
      if (K.has("KeyD") || K.has("ArrowRight")) ix += 1;
    }
    const yaw = this.cam.yaw, f = V(Math.sin(yaw), 0, Math.cos(yaw)), rt = V(-Math.cos(yaw), 0, Math.sin(yaw));
    const want = f.multiplyScalar(iz).add(rt.multiplyScalar(ix));
    const run = K.has("ShiftLeft") || K.has("ShiftRight");
    if (want.lengthSq() > 0) want.normalize().multiplyScalar(run ? 8.5 : 4.6);
    this.vel.lerp(want, 1 - Math.exp(-dt * 12));
    this.move(this.vel.x * dt, this.vel.z * dt);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > 0.3) { const tgt = Math.atan2(this.vel.x, this.vel.z); this.face = angLerp(this.face, tgt, 1 - Math.exp(-dt * 14)); }
    const gy = groundAt(this.pos.x, this.pos.z);
    this.updateJump(dt, gy);
    const T = this.trainer;
    T.root.position.copy(this.pos); T.root.rotation.y = this.face;
    T.animate(real, sp, this.t, this.air ? this.vy : null);
    const hgt = Math.max(0, this.pos.y - gy);
    this.blob.position.set(this.pos.x, gy + 0.015, this.pos.z);
    this.blob.scale.setScalar(Math.max(0.45, 1 - hgt * 0.45)); this.blob.material.opacity = 0.45 * Math.max(0.3, 1 - hgt * 0.5);
    this.updatePartner(dt, real);
    this.updateCamera(dt);
    this.updateStations(dt);
    this.updateDust();
    this.composer.render();
  }

  // Saut : impulsion, gravité, atterrissage. On peut monter sur la scène d'un bond.
  updateJump(dt, gy) {
    const G = 22, V0 = 7.2;
    this.jumpBuf = Math.max(0, (this.jumpBuf || 0) - dt);
    if (!this.air) {
      if (this.jumpBuf > 0) {
        this.jumpBuf = 0; this.air = true; this.vy = V0;
        if (this.partner) this.partner.hopDelay = 0.14;
      } else if (gy < this.pos.y - 0.25) { this.air = true; this.vy = 0; }   // chute d'une marche haute
      else { this.pos.y += (gy - this.pos.y) * (1 - Math.exp(-dt * 18)); return; }
    }
    this.vy -= G * dt; this.pos.y += this.vy * dt;
    if (this.pos.y <= gy && this.vy <= 0) {
      this.pos.y = gy; this.air = false;
      this.trainer.land(Math.min(1, -this.vy / 9));
      if (this.jumpBuf > 0) this.updateJump(0, gy);   // rebond si Espace pressé juste avant l'atterrissage
    }
  }

  move(dx, dz) {
    const R = 0.32;
    const tryPos = (x, z) => {
      if (x < BOUNDS.x0 || x > BOUNDS.x1 || z < BOUNDS.z0 || z > BOUNDS.z1) return false;
      const top = Math.max(groundAt(x, z), groundAt(x + R, z), groundAt(x - R, z), groundAt(x, z + R), groundAt(x, z - R));
      if (top - this.pos.y > 0.45) return false;
      for (const [bx, bz, br] of BLOCKERS) if (Math.hypot(x - bx, z - bz) < br + R) return false;
      return true;
    };
    const nx = this.pos.x + dx, nz = this.pos.z + dz;
    if (tryPos(nx, nz)) { this.pos.x = nx; this.pos.z = nz; return; }
    if (tryPos(nx, this.pos.z)) { this.pos.x = nx; this.vel.z *= 0.5; return; }   // glisse le long de l'obstacle
    if (tryPos(this.pos.x, nz)) { this.pos.z = nz; this.vel.x *= 0.5; return; }
    this.vel.multiplyScalar(0.3);
  }

  updatePartner(dt, real) {
    const P = this.partner; if (!P) return;
    const back = V(Math.sin(this.face), 0, Math.cos(this.face)).multiplyScalar(-1.5);
    const side = V(Math.cos(this.face), 0, -Math.sin(this.face)).multiplyScalar(0.9);
    const goal = this.pos.clone().add(back).add(side);
    const cur = P.pivot.position, d = V(goal.x - cur.x, 0, goal.z - cur.z), dist = d.length();
    const speed = dist > 0.25 ? Math.min(9, dist * 3.2) : 0;
    if (speed > 0) {
      d.normalize().multiplyScalar(speed * dt);
      cur.x += d.x; cur.z += d.z;
      P.pivot.rotation.y = angLerp(P.pivot.rotation.y, Math.atan2(d.x, d.z), 1 - Math.exp(-dt * 10));
    } else {
      const look = Math.atan2(this.pos.x - cur.x, this.pos.z - cur.z);
      P.pivot.rotation.y = angLerp(P.pivot.rotation.y, look, 1 - Math.exp(-dt * 3));
    }
    const gy = groundAt(cur.x, cur.z);
    P.baseY = (P.baseY ?? gy) + (gy - (P.baseY ?? gy)) * (1 - Math.exp(-dt * 14));
    // petit saut du partenaire, juste après le dresseur
    if (P.hopDelay > 0) { P.hopDelay -= dt; if (P.hopDelay <= 0) { P.hopV = 5.2; P.hopY = P.hopY || 0; } }
    if (P.hopV !== undefined) { P.hopV -= 22 * dt; P.hopY += P.hopV * dt; if (P.hopY <= 0) { P.hopY = 0; P.hopV = undefined; } }
    cur.y = P.baseY + (P.hopY || 0);
    if (P.walkClip) P.play(speed > 0.8 ? P.walkClip : "idle", { speed: speed > 0.8 ? Math.min(1.8, 0.7 + speed * 0.2) : 1 });
    P.mixer.update(real / 1000);
    if (!Object.keys(P.clips).length) P.body.position.y = Math.sin(this.t * 0.003) * 0.04;
    P.blob.position.set(cur.x, gy + 0.012, cur.z);
  }

  updateCamera(dt) {
    const c = this.cam;
    c.dist += (c.tDist - c.dist) * (1 - Math.exp(-dt * 8));
    const tgt = this.pos.clone().add(V(0, 1.75, 0));
    c.look.lerp(tgt, 1 - Math.exp(-dt * 10));
    const cp = Math.cos(c.pitch);
    const off = V(-Math.sin(c.yaw) * cp, Math.sin(c.pitch), -Math.cos(c.yaw) * cp).multiplyScalar(c.dist);
    const p = c.look.clone().add(off);
    // reste dans la salle
    p.x = Math.min(9.4, Math.max(-9.4, p.x)); p.z = Math.min(25.3, Math.max(-11.8, p.z)); p.y = Math.min(12.4, Math.max(groundAt(p.x, p.z) + 0.35, p.y));
    this.camera.position.copy(p);
    this.camera.lookAt(c.look);
  }

  updateStations(dt) {
    let best = null, bd = 1e9;
    const W = this.r.domElement.clientWidth || innerWidth, H = this.r.domElement.clientHeight || innerHeight;
    for (const M of this.markers) {
      const { st, grp, ring, gem, el } = M;
      const d = Math.hypot(this.pos.x - st.pos[0], this.pos.z - st.pos[1]);
      const inside = d < st.r && Math.abs(this.pos.y - M.y) < 0.5;
      if (inside && d < bd) { best = M; bd = d; }
      gem.rotation.y += dt * 1.4; gem.position.y = 2.3 + Math.sin(this.t * 0.002 + st.pos[0]) * 0.12;
      ring.material.opacity = inside ? 1 : 0.55 + Math.sin(this.t * 0.003) * 0.15;
      ring.scale.setScalar(inside ? 1.08 : 1);
      // étiquette au-dessus du cristal
      const wp = grp.position.clone().add(V(0, 2.75, 0));
      const front = wp.clone().applyMatrix4(this.camera.matrixWorldInverse).z < -0.5;
      const v = wp.project(this.camera);
      const camD = this.camera.position.distanceTo(grp.position);
      gem.visible = this.camera.position.distanceTo(grp.position.clone().add(gem.position)) > 1.8;
      const vis = front && camD < 26 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      el.style.display = vis && M !== this.near ? "" : "none";
      if (vis) {
        el.style.transform = `translate(-50%,-100%) translate(${((v.x + 1) / 2) * W}px, ${((1 - v.y) / 2) * H}px) scale(${Math.max(0.6, Math.min(1.1, 9 / camD))})`;
        el.classList.toggle("on", M === best);
      }
    }
    if (best !== this.near) {
      this.near = best;
      const pr = this.ui.querySelector(".lb-prompt");
      pr.innerHTML = "";
      if (best) pr.append(h("kbd", null, "F"), " ", best.st.label);
      pr.classList.toggle("show", !!best);
    }
  }

  updateDust() {
    const p = this.dust.geometry.attributes.position, b = this.dustBase, s = this.dustSeed, t = this.t * 0.001;
    for (let i = 0; i < s.length; i++) {
      p.array[i * 3] = b[i * 3] + Math.sin(t * 0.3 + s[i]) * 0.4;
      p.array[i * 3 + 1] = 0.3 + ((b[i * 3 + 1] + t * 0.15 + s[i]) % 11);
      p.array[i * 3 + 2] = b[i * 3 + 2] + Math.cos(t * 0.25 + s[i]) * 0.4;
    }
    p.needsUpdate = true;
  }
}

function angLerp(a, b, k) { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; }

// Texture radiale (disque doux, ou anneau lumineux).
function radialTexture(ring) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  if (ring) {
    const gr = g.createRadialGradient(64, 64, 30, 64, 64, 63);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.55, "rgba(255,255,255,0.15)"); gr.addColorStop(0.82, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  } else {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
