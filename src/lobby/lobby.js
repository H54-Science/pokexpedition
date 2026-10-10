// Hall : le décor du théâtre-bibliothèque (models/lobby/hall.glb) sert de fond animé au menu principal.
// Plus de dresseur ni de déplacement : une caméra cinématique lente, et les Pokémon choisis par le joueur
// (réglage « Pokémon du hall ») exposés sur le tapis et dans l'allée. La navigation se fait par icônes (main.js).
// Partage le renderer de la scène de combat : pendant le hall, Stage délègue son rendu via stage.override.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { makePokemon } from "../render/assets.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Hauteur du sol (repère three : Blender (x, y, z) → (x, z, −y)).
export function groundAt(x, z) {
  const ax = Math.abs(x);
  if (z >= 19.45 && ax < 6) return 1.0;
  if (ax < 2 && z >= 17.77 && z < 19.45) return z < 18.23 ? 0.33 : z < 18.68 ? 0.66 : 0.99;
  if (z >= -8 && z <= 22) { if (ax >= 6) return 0.6; if (ax >= 5.5) return 0.4; if (ax >= 5) return 0.2; }
  if (Math.hypot(x, z + 6.5) < 4.3) return 0.22;
  return 0;
}

// Emplacements d'exposition (6 max) : le 1er au centre du tapis rond, puis en V vers la scène.
export const SLOTS = [[0, -4.4], [-2.3, -3.5], [2.3, -3.5], [-1.3, -0.6], [1.3, -0.6], [0, 2.2]];
export const SHOWCASE_MAX = SLOTS.length;
const CAM_Z = -11.3;

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

export class Lobby {
  constructor(stage) {
    this.stage = stage; this.r = stage.renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#1a1018");
    this.scene.fog = new THREE.FogExp2("#1c1220", 0.006);
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 120);
    this.camera.position.set(0, 3.1, CAM_Z);
    this.composer = new EffectComposer(this.r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.42, 0.45, 0.92);
    if (!stage.low) this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.mons = [];
    this.mouse = { x: 0, y: 0 };
    this.active = false; this.t = 0;
    addEventListener("resize", () => this.resize());
    addEventListener("pointermove", (e) => { this.mouse.x = (e.clientX / innerWidth) * 2 - 1; this.mouse.y = (e.clientY / innerHeight) * 2 - 1; });
  }

  async load(onProgress) {
    const g = await loader.loadAsync("models/lobby/hall.glb", (e) => onProgress && e.total && onProgress(e.loaded / e.total));
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.receiveShadow = true;
      const m = o.material;
      if (m.map) m.map.anisotropy = 8;
      if (m.emissive && m.emissive.getHex()) { m.emissiveIntensity = Math.min(m.emissiveIntensity, 1.6); o.castShadow = false; }
    });
    this.scene.add(g.scene);
    this.buildLights();
    this.buildDust();
    this.resize();
  }

  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight("#ffd9b8", "#3a2230", 0.55));
    s.add(new THREE.AmbientLight("#ffe8d6", 0.1));
    for (const z of [-1, 7, 15]) { const l = new THREE.PointLight("#ffc88c", 30, 26, 1.6); l.position.set(0, 9.3, z); s.add(l); }
    for (const x of [-3.6, 3.6]) for (const z of [-2.5, 3.5, 9.5, 15.5]) { const l = new THREE.PointLight("#ffb46b", 2.2, 7, 1.6); l.position.set(x, 2.6, z); s.add(l); }
    for (const x of [-8, 8]) { const l = new THREE.PointLight("#ffa860", 10, 22, 1.4); l.position.set(x, 5.2, 7); s.add(l); }
    const rug = new THREE.PointLight("#b070ff", 5, 9, 1.6); rug.position.set(0, 2.4, -6.5); s.add(rug);
    const win = new THREE.SpotLight("#c890ff", 45, 50, 0.75, 0.6, 1.2); win.position.set(0, 11, 25.4); win.target.position.set(0, 0, 12); s.add(win, win.target);
    const st = new THREE.SpotLight("#ffd2a0", 22, 30, 0.6, 0.5, 1.3); st.position.set(0, 9, 16.5); st.target.position.set(0, 1, 22.5); s.add(st, st.target);
    // projecteur sur les Pokémon exposés (avec ombres)
    const key = new THREE.SpotLight("#fff0dc", 70, 30, 0.6, 0.6, 1.2); key.position.set(0, 9, -11); key.target.position.set(0, 0, -3);
    key.castShadow = !this.stage.low; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0006;
    s.add(key, key.target);
  }

  buildDust() {
    const n = 500, p = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * 18; p[i * 3 + 1] = Math.random() * 11 + 0.3; p[i * 3 + 2] = -11 + Math.random() * 36; seed[i] = Math.random() * 100; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    this.dustBase = p.slice(); this.dustSeed = seed;
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const m = new THREE.PointsMaterial({ size: 0.07, map: new THREE.CanvasTexture(c), color: "#ffd9a8", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 });
    this.dust = new THREE.Points(g, m); this.scene.add(this.dust);
  }

  // Pokémon exposés : liste d'espèces (formes déjà résolues), 6 max.
  async setShowcase(keys) {
    keys = keys.slice(0, SHOWCASE_MAX);
    if (keys.length === this.mons.length && keys.every((k, i) => this.mons[i].k === k)) return;
    const loaded = await Promise.all(keys.map((k) => makePokemon(k).catch(() => null)));
    for (const m of this.mons) this.scene.remove(m.P.pivot);
    this.mons = [];
    loaded.forEach((P, i) => {
      if (!P) return;
      const [x, z] = SLOTS[i];
      P.pivot.scale.setScalar(Math.min(1, 1.7 / P.height));   // les très grands sont réduits pour tenir dans le cadre
      P.pivot.position.set(x, groundAt(x, z), z);
      P.pivot.rotation.y = Math.atan2(-x, CAM_Z - z);            // tournés vers la caméra
      P.pivot.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(P.pivot);
      this.mons.push({ k: keys[i], P, phase: Math.random() * 6 });
    });
  }

  resize() {
    const w = this.r.domElement.clientWidth || innerWidth, h_ = this.r.domElement.clientHeight || innerHeight;
    this.composer.setSize(w, h_); this.camera.aspect = w / h_; this.camera.updateProjectionMatrix();
  }

  // à chaque retour au hall, la caméra glisse doucement vers sa place (léger travelling avant)
  enter() {
    if (!this.active) { this.camera.position.set(0, 4.4, CAM_Z - 0.3); this.glide = 1; }
    this.active = true; this.stage.override = (real) => this.frame(real); this.resize();
  }
  leave() { this.active = false; this.stage.override = null; }

  frame(real) {
    const dt = Math.min(real, 50) / 1000; this.t += dt;
    // caméra : légère dérive + parallaxe à la souris, cadrée sur les Pokémon et la scène au fond
    const tx = Math.sin(this.t * 0.12) * 0.6 + this.mouse.x * 0.5;
    const ty = 3.0 + Math.sin(this.t * 0.17) * 0.12 - this.mouse.y * 0.25;
    this.glide = Math.max(0, (this.glide || 0) - dt * 0.8);
    const g = this.glide * this.glide;   // travelling d'arrivée : part de plus haut et plus loin
    this.camera.position.lerp(V(tx, ty + g * 1.4, CAM_Z - g * 0.3), 1 - Math.exp(-dt * 2.4));
    this.camera.lookAt(this.mouse.x * 0.7, 2.0 - this.mouse.y * 0.35, 12);
    for (const m of this.mons) {
      m.P.mixer.update(dt);
      if (!Object.keys(m.P.clips).length) m.P.body.position.y = Math.sin(this.t * 2 + m.phase) * 0.05;
    }
    const p = this.dust.geometry.attributes.position, b = this.dustBase, sd = this.dustSeed, t = this.t;
    for (let i = 0; i < sd.length; i++) {
      p.array[i * 3] = b[i * 3] + Math.sin(t * 0.3 + sd[i]) * 0.4;
      p.array[i * 3 + 1] = 0.3 + ((b[i * 3 + 1] + t * 0.15 + sd[i]) % 11);
      p.array[i * 3 + 2] = b[i * 3 + 2] + Math.cos(t * 0.25 + sd[i]) * 0.4;
    }
    p.needsUpdate = true;
    this.composer.render();
  }
}
