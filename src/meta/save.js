// Sauvegarde versionnée. serialize/deserialize sont purs ; localStore est l'adaptateur navigateur.
import { CONFIG } from "./config.js";
import { newSave } from "./state.js";

// Migrations : MIGRATIONS[n] transforme une sauvegarde v n en v n+1.
const MIGRATIONS = {
  // v1 → v2 : runs à 5 actes avec accès par difficulté (6 Pokémon au niveau) ; plus d'équipe fixe.
  1: (s) => {
    s.run = null; delete s.team;
    for (const k of CONFIG.start.starters) if (!s.coll[k]) s.coll[k] = { normal: true, shiny: false, L: CONFIG.start.level, xp: 0, elev: 0, stars: 0 };
    s.v = 2; return s;
  },
};

export const serialize = (save) => JSON.stringify(save);

export function deserialize(text) {
  let s = JSON.parse(text);
  if (!s || typeof s.v !== "number") throw new Error("Sauvegarde illisible.");
  while (s.v < CONFIG.save.version) {
    const m = MIGRATIONS[s.v];
    if (!m) throw new Error(`Pas de migration depuis la version ${s.v}.`);
    s = m(s);
  }
  if (s.v > CONFIG.save.version) throw new Error("Sauvegarde d'une version plus récente.");
  return s;
}

// Adaptateur localStorage (clé + version dans la clé, pour garder les anciennes en cas de souci).
export const localStore = {
  key: () => `${CONFIG.save.key}.v${CONFIG.save.version}`,
  load(seed) {
    try {
      const raw = localStorage.getItem(this.key()) || this.findOlder();
      return raw ? deserialize(raw) : newSave(seed);
    } catch (e) { console.warn("Sauvegarde méta ignorée :", e); return newSave(seed); }
  },
  findOlder() {
    for (let v = CONFIG.save.version - 1; v >= 1; v--) { const r = localStorage.getItem(`${CONFIG.save.key}.v${v}`); if (r) return r; }
    return null;
  },
  save(s) { try { localStorage.setItem(this.key(), serialize(s)); } catch (e) {} },
  reset() { try { localStorage.removeItem(this.key()); } catch (e) {} },
};
