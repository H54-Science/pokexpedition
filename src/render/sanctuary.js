// Décor de combat : sanctuaire japonais construit dans Blender, repère glTF Y-up.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const MODEL = new URL("../../models/arenas/sakura-sanctuary.glb", import.meta.url).href;

// Le décor est statique : regrouper les primitives par matériau limite les draw calls.
// Les matrices monde sont conservées avant de retirer caméras et repères Blender.
function batchEnvironment(source, low) {
  source.updateMatrixWorld(true);
  const center = source.getObjectByName("ArenaCenter");
  if (!center) throw new Error("Repère ArenaCenter absent du sanctuaire");
  const floor = center.getWorldPosition(new THREE.Vector3());
  const root = new THREE.Group(); root.name = "SakuraSanctuary";
  root.position.copy(floor).multiplyScalar(-1);
  const batches = new Map(), originals = new Set();
  source.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    // Le GLB exporte un Mesh par primitive, avec un seul matériau.
    const distant = /^(Horizon|Moon)/.test(o.name) || /^(Mountain|Moon|Lake)/.test(m.name);
    const luminous = m.emissive && m.emissive.getHex() !== 0 && m.emissiveIntensity > 1;
    const casts = !low && !distant && !luminous && !/^(Water|Inlay|Limestone|Brass|Foundation)/.test(m.name);
    const receives = !low && !distant && !luminous;
    if (luminous) m.emissiveIntensity = Math.min(m.emissiveIntensity, 1.6);
    const key = `${m.uuid}:${casts}:${receives}`;
    if (!batches.has(key)) batches.set(key, { material: m, casts, receives, geometries: [] });
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    batches.get(key).geometries.push(g); originals.add(o.geometry);
  });
  for (const { material, casts, receives, geometries } of batches.values()) {
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) throw new Error("Géométrie incompatible dans le sanctuaire");
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `Sanctuary | ${material.name}`;
    mesh.castShadow = casts; mesh.receiveShadow = receives;
    root.add(mesh);
    for (const g of geometries) g.dispose();
  }
  for (const g of originals) g.dispose();
  return root;
}

export function createSanctuary(scene, updaters, low) {
  // Crépuscule doux : la brume masque la jonction du lac et des montagnes.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(160, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      zenith: { value: new THREE.Color("#66739e") },
      horizon: { value: new THREE.Color("#d7b2ab") },
      lower: { value: new THREE.Color("#b7a8bd") },
    },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `
      uniform vec3 zenith; uniform vec3 horizon; uniform vec3 lower; varying vec3 vP;
      void main(){
        vec3 c = mix(horizon, zenith, smoothstep(0.0, 0.65, vP.y));
        c = mix(c, lower, 1.0 - smoothstep(-0.22, 0.03, vP.y));
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.name = "Sanctuary sky"; scene.add(sky);
  scene.fog = new THREE.Fog("#b7a8bd", 36, 115);
  const hemi = new THREE.HemisphereLight("#e5e7ff", "#665451", 1.65);
  const sun = new THREE.DirectionalLight("#ffe0b5", 2.7);
  sun.position.set(-18, 26, 14); sun.target.position.set(0, 0, -5);
  sun.castShadow = !low; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 85 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.06;
  sun.shadow.camera.updateProjectionMatrix();
  const rim = new THREE.DirectionalLight("#ffc1ac", 0.85); rim.position.set(4, 14, -25);
  for (const light of [hemi, sun, rim]) { light.layers.enable(1); scene.add(light); }
  scene.add(sun.target);

  // Reste jouable pendant le chargement ou si le fichier n'est pas disponible.
  const fallback = new THREE.Mesh(new THREE.CylinderGeometry(9.35, 9.65, 0.3, 64),
    new THREE.MeshStandardMaterial({ color: "#c4c5b7", roughness: 0.9 }));
  fallback.name = "Sanctuary fallback floor"; fallback.position.y = -0.17;
  fallback.receiveShadow = !low; scene.add(fallback);

  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(16, 16, 7, 12, -0.55, 0, Math.PI * 2); ctx.fill();
  const petalTexture = new THREE.CanvasTexture(canvas);
  const count = low ? 28 : 80, positions = new Float32Array(count * 3), seeds = [];
  for (let i = 0; i < count; i++) seeds.push({ a: Math.random() * Math.PI * 2, r: 10 + Math.random() * 8, y: Math.random() * 8, speed: 0.3 + Math.random() * 0.25 });
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const petals = new THREE.Points(geometry, new THREE.PointsMaterial({ color: "#f2b8cd", map: petalTexture, size: 0.085, transparent: true, opacity: 0.72, depthWrite: false, alphaTest: 0.05 }));
  petals.name = "Drifting sakura petals"; petals.frustumCulled = false; scene.add(petals);
  updaters.add((dt, t) => {
    for (let i = 0; i < count; i++) {
      const p = seeds[i], time = t * 0.001;
      positions[i * 3] = Math.cos(p.a) * p.r + Math.sin(time * 0.35 + i) * 0.7;
      positions[i * 3 + 1] = ((p.y - time * p.speed) % 8 + 8) % 8;
      positions[i * 3 + 2] = Math.sin(p.a) * p.r - 3;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  const loader = new GLTFLoader();
  let pending = null, environment = null;
  return {
    sun,
    get model() { return environment; },
    load() {
      if (environment) return Promise.resolve(true);
      if (!pending) {
        pending = loader.loadAsync(MODEL).then((gltf) => {
          environment = batchEnvironment(gltf.scene, low);
          scene.add(environment);
          scene.remove(fallback); fallback.geometry.dispose(); fallback.material.dispose();
          return true;
        }).catch((error) => {
          console.warn("Sanctuaire indisponible, sol de secours conservé.", error);
          pending = null; // Une prochaine entrée en combat peut réessayer.
          return false;
        });
      }
      return pending;
    },
  };
}
