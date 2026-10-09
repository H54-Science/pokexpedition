// Dresseur au format « skin » 64×64 (textures de PNJ Pixelmon, models/skins/*.png).
// Corps en 6 boîtes (tête, buste, 2 bras, 2 jambes) + couche externe ; animation de marche procédurale.
import * as THREE from "three";

export const PX = 1.8 / 32;           // 32 pixels de haut = 1,80 m
const loader = new THREE.TextureLoader();
const texCache = new Map();

export function skinTexture(name) {
  if (!texCache.has(name)) {
    texCache.set(name, loader.loadAsync(`models/skins/${name}.png`).then((t) => {
      t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }));
  }
  return texCache.get(name);
}

// Boîte w×h×d (pixels) avec les UV de la disposition Minecraft à partir de (ox, oy).
function partGeo(w, h, d, ox, oy, grow = 0) {
  const g = new THREE.BoxGeometry((w + grow) * PX, (h + grow) * PX, (d + grow) * PX);
  // ordre des faces de BoxGeometry : +x (gauche du perso), −x (droite), +y, −y, +z (face), −z (dos)
  const rects = [
    [ox + d + w, oy + d, d, h], [ox, oy + d, d, h],
    [ox + d, oy, w, d], [ox + d + w, oy, w, d],
    [ox + d, oy + d, w, h], [ox + 2 * d + w, oy + d, w, h],
  ];
  const uv = g.attributes.uv;
  rects.forEach(([x, y, ww, hh], f) => {
    const u0 = x / 64, u1 = (x + ww) / 64, v0 = 1 - y / 64, v1 = 1 - (y + hh) / 64;
    [[u0, v0], [u1, v0], [u0, v1], [u1, v1]].forEach((p, i) => uv.setXY(f * 4 + i, p[0], p[1]));
  });
  return g;
}

const PARTS = {
  head: { s: [8, 8, 8], uv: [0, 0], over: [32, 0], at: [0, 24, 0], pivot: [0, 0, 0], off: [0, 4, 0] },
  body: { s: [8, 12, 4], uv: [16, 16], over: [16, 32], at: [0, 12, 0], pivot: [0, 0, 0], off: [0, 6, 0] },
  armR: { s: [4, 12, 4], uv: [40, 16], over: [40, 32], at: [-6, 22, 0], off: [0, -4, 0] },
  armL: { s: [4, 12, 4], uv: [32, 48], over: [48, 48], at: [6, 22, 0], off: [0, -4, 0] },
  legR: { s: [4, 12, 4], uv: [0, 16], over: [0, 32], at: [-2, 12, 0], off: [0, -6, 0] },
  legL: { s: [4, 12, 4], uv: [16, 48], over: [0, 48], at: [2, 12, 0], off: [0, -6, 0] },
};

export class Trainer {
  constructor() {
    this.root = new THREE.Group();        // position au sol, orientation (regarde +z)
    this.rig = new THREE.Group(); this.root.add(this.rig);
    this.base = new THREE.MeshStandardMaterial({ roughness: 0.85, alphaTest: 0.1 });
    this.over = new THREE.MeshStandardMaterial({ roughness: 0.85, alphaTest: 0.5, transparent: false });
    this.parts = {};
    for (const [k, p] of Object.entries(PARTS)) {
      const pivot = new THREE.Group(); pivot.position.set(p.at[0] * PX, p.at[1] * PX, p.at[2] * PX);
      const inner = new THREE.Mesh(partGeo(...p.s, ...p.uv), this.base);
      const outer = new THREE.Mesh(partGeo(...p.s, ...p.over, k === "head" ? 1 : 0.5), this.over);
      for (const m of [inner, outer]) { m.position.set(p.off[0] * PX, p.off[1] * PX, p.off[2] * PX); m.castShadow = true; pivot.add(m); }
      this.rig.add(pivot); this.parts[k] = pivot;
    }
    this.phase = 0; this.speed = 0;
  }
  async setSkin(name) {
    const t = await skinTexture(name);
    this.base.map = t; this.over.map = t; this.base.needsUpdate = this.over.needsUpdate = true;
    this.skin = name;
  }
  land(k) { this.squash = 0.12 + 0.18 * k; }
  // speed : m/s ; t : ms ; vy : vitesse verticale si en l'air (sinon null)
  animate(dt, speed, t, vy = null) {
    this.speed += (speed - this.speed) * (1 - Math.exp(-dt / 90));
    const k = Math.min(1, this.speed / 5);
    this.phase += (dt / 1000) * (2.2 + this.speed * 1.5);
    const s = Math.sin(this.phase) * 0.9 * k;
    const P = this.parts;
    P.armR.rotation.x = s; P.armL.rotation.x = -s;
    P.legR.rotation.x = -s; P.legL.rotation.x = s;
    const idle = Math.sin(t * 0.002) * 0.04 * (1 - k);
    P.armR.rotation.z = -0.06 - idle; P.armL.rotation.z = 0.06 + idle;
    this.rig.position.y = Math.abs(Math.cos(this.phase)) * 0.05 * k;
    P.head.rotation.x = Math.sin(t * 0.0013) * 0.03;
    // pose en l'air : bras levés vers l'avant, une jambe pliée
    this.airK = (this.airK || 0) + ((vy !== null ? 1 : 0) - (this.airK || 0)) * (1 - Math.exp(-dt / 60));
    const a = this.airK;
    if (a > 0.01) {
      const up = vy !== null ? Math.max(-1, Math.min(1, vy / 7)) : 0;
      P.armR.rotation.x = P.armR.rotation.x * (1 - a) + (-1.9 - up * 0.5) * a; P.armL.rotation.x = P.armL.rotation.x * (1 - a) + (-1.6 - up * 0.5) * a;
      P.armR.rotation.z = P.armR.rotation.z * (1 - a) - 0.35 * a; P.armL.rotation.z = P.armL.rotation.z * (1 - a) + 0.35 * a;
      P.legR.rotation.x = P.legR.rotation.x * (1 - a) - 0.6 * a; P.legL.rotation.x = P.legL.rotation.x * (1 - a) + 0.25 * a;
      this.rig.position.y *= 1 - a;
    }
    // écrasement à l'atterrissage
    this.squash = Math.max(0, (this.squash || 0) - dt / 1000 * 1.2);
    const q = this.squash;
    this.rig.scale.set(1 + q * 0.5, 1 - q, 1 + q * 0.5);
  }
}

// Vignette de face (canvas) pour les menus.
export async function skinThumb(name, scale = 4) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = `models/skins/${name}.png`; });
  const c = document.createElement("canvas"); c.width = 16 * scale; c.height = 32 * scale;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  const b = (sx, sy, w, h, dx, dy) => g.drawImage(img, sx, sy, w, h, dx * scale, dy * scale, w * scale, h * scale);
  b(8, 8, 8, 8, 4, 0); b(40, 8, 8, 8, 4, 0);
  b(20, 20, 8, 12, 4, 8); b(20, 36, 8, 12, 4, 8);
  b(44, 20, 4, 12, 0, 8); b(36, 52, 4, 12, 12, 8);
  b(4, 20, 4, 12, 4, 20); b(20, 52, 4, 12, 8, 20);
  return c.toDataURL();
}

export const SKINS = [
  "trainer_gym_ice_3", "trainer_gym_grass_2", "trainer_gym_ice_1", "trainer_gym_ice_5", "trainer_gym_grass_1", "trainer_gym_fire_1",
  "trainer_gym_fire_5", "trainer_gym_water_1", "trainer_gym_water_4", "trainer_gym_fairy_1", "trainer_gym_electric_1", "trainer_gym_dragon_5",
  "trainer_gym_ghost_2", "trainer_gym_ground_2", "trainer_gym_steel_1", "leader_gym_fire_1", "leader_gym_ice_1", "leader_gym_water_1",
  "leader_gym_dragon_1", "leader_gym_electric_1", "leader_gym_steel_1", "hairdresser_star", "hairdresser_heart",
];
