// Chargement des modèles Pokémon (models/*.glb), copies indépendantes, portraits.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const texLoader = new THREE.TextureLoader();
const cache = new Map();
let INDEX = null;

export async function loadIndex() {
  if (!INDEX) INDEX = await (await fetch("models/index.json")).json();
  return INDEX;
}

// Taille affichée (mètres de scène) à partir de la taille réelle : compressée pour que
// Pikachu reste lisible à côté de Groudon.
export function displayHeight(key, boss) {
  const h = (INDEX && INDEX[key] && INDEX[key].h) || 1;
  const v = Math.min(3.1, Math.max(0.85, 0.9 * Math.pow(h, 0.45) + 0.35));
  return boss ? Math.min(5.2, v * 1.9) : v;
}

function loadGltf(key) {
  if (!cache.has(key)) cache.set(key, loader.loadAsync(`models/${key}.glb`));
  return cache.get(key);
}

// Instance prête à placer : groupe racine (pieds à y = 0, hauteur normalisée), mixeur, clips.
export async function makePokemon(k, { boss = false, shiny = false } = {}) {
  const key = k.toLowerCase();
  await loadIndex();
  const g = await loadGltf(key);
  const model = cloneSkinned(g.scene);
  const mats = [];
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
      o.material = o.material.clone();
      mats.push(o.material);
    }
  });
  const mixer = new THREE.AnimationMixer(model);
  const clips = Object.fromEntries(g.animations.map((c) => [c.name, c]));
  const idle = clips.idle || clips.fly || clips.swim || Object.values(clips)[0] || null;
  // mesure sur la 1re image de l'animation de repos (la pose de liaison est souvent fausse)
  if (idle) { mixer.clipAction(idle).play(); mixer.update(0); }
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model, true);
  const H = displayHeight(key, boss);
  const s = H / Math.max(1e-3, box.max.y - box.min.y);
  model.scale.setScalar(s);
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  model.position.set(-cx * s, -box.min.y * s, -cz * s);
  const pivot = new THREE.Group(); // tourne / se déplace
  const body = new THREE.Group();  // reçoit les déformations procédurales (écrasement, inclinaison)
  pivot.add(body); body.add(model);
  const radius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * s * 0.5;
  const P = { k, key, pivot, body, model, mixer, clips, mats, height: H, radius: Math.max(0.35, Math.min(radius, H * 0.8)), action: null, baseMaps: mats.map((m) => m.map) };
  P.play = (name, { fade = 0.25, speed = 1 } = {}) => {
    const c = clips[name] || idle; if (!c) return;
    const a = mixer.clipAction(c);
    a.timeScale = speed;
    if (P.action === a) return;
    a.reset().play();
    if (P.action) P.action.crossFadeTo(a, fade, false);
    P.action = a;
  };
  if (idle) { mixer.stopAllAction(); P.play(idle.name, { fade: 0 }); mixer.setTime(Math.random() * idle.duration); }
  if (shiny && INDEX[key] && INDEX[key].shiny) {
    const t = await texLoader.loadAsync(`models/shiny/${key}.webp`);
    t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter;
    mats.forEach((m) => { m.map = t; m.needsUpdate = true; });
  }
  return P;
}

// Portrait carré (data URL) : tête et haut du corps, de face.
let pr = null;
const portraitCache = new Map();
// full = true : corps entier cadré (cartes des menus) ; sinon tête et haut du corps.
export async function portrait(k, size = 128, full = false, shiny = false) {
  const ck = k + (full ? ":full" : "") + (shiny ? ":shiny" : "");
  if (portraitCache.has(ck)) return portraitCache.get(ck);
  if (!pr) {
    pr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    pr.setSize(size, size); pr.outputColorSpace = THREE.SRGBColorSpace;
  }
  const P = await makePokemon(k, { shiny });
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 2.4));
  const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(1, 2, 3); scene.add(d);
  scene.add(P.pivot);
  P.pivot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(P.pivot, true);
  const top = box.max.y, h = top - box.min.y;
  const fy = top - h * 0.3; // un peu sous le sommet
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  if (full) {
    const w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z), cy = (box.max.y + box.min.y) / 2;
    const d = (Math.max(h, w) * 0.56) / Math.tan((15 * Math.PI) / 180) + (box.max.z - box.min.z) * 0.5;
    cam.position.set(d * 0.32, cy + h * 0.08, d); cam.lookAt(0, cy, 0);
  } else {
    const dist = Math.max(h * 0.62, (box.max.x - box.min.x) * 0.5) / Math.tan((15 * Math.PI) / 180) * 0.75;
    cam.position.set(dist * 0.25, fy + h * 0.05, dist); cam.lookAt(0, fy, 0);
  }
  pr.render(scene, cam);
  const url = pr.domElement.toDataURL("image/png");
  portraitCache.set(ck, url);
  return url;
}
