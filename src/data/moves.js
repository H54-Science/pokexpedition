// Capacités de combat : chaque Pokémon dispose de
//  · ATTAQUE (son attaque de base, gratuite, +1 charge d'énergie),
//  · 3 CAPACITÉS payées en charges : une technique (1), sa capacité signature (2), une attaque puissante (3),
//  · son ULTIME (jauge pleine).
// La technique vient de son 2e type (ou du 1er), l'attaque puissante de son 1er type.
import { SPECIES } from "./data.js";

// « n » dans les options = durée (tours) : rangée dans « dur » pour ne pas écraser le nom.
const M = (n, t, p, o) => { const m = Object.assign({ n, t, p }, o || {}); if (o && typeof o.n === "number") { m.dur = o.n; m.n = n; } return m; };

// Techniques : peu coûteuses, utilitaires ou rapides. Deux variantes par type (la 2e si le nom est déjà pris).
export const TECH = {
  Normal: [M("Vive-Attaque", "Normal", 45, { adv: 0.3 }), M("Danse-Lames", "Normal", 0, { tg: "self", buff: { atk: 0.4 }, n: 3 })],
  Feu: [M("Feu Follet", "Feu", 0, { st: { k: "burn", ch: 1, n: 3 } }), M("Nitrocharge", "Feu", 50, { selfBuff: { spd: 0.25 }, n: 3 })],
  Eau: [M("Vibraqua", "Eau", 60, { st: { k: "stun", ch: 0.2 } }), M("Aqua-Jet", "Eau", 40, { adv: 0.3 })],
  Plante: [M("Méga-Sangsue", "Plante", 50, { drain: 0.5 }), M("Poudre Dodo", "Plante", 0, { st: { k: "sleep", ch: 0.6 } })],
  Électrik: [M("Cage-Éclair", "Électrik", 0, { st: { k: "para", ch: 1, n: 2 } }), M("Change Éclair", "Électrik", 60, { adv: 0.2 })],
  Glace: [M("Vent Glace", "Glace", 40, { tg: "all", st: { k: "slow", ch: 0.7, n: 2 } }), M("Éclats Glace", "Glace", 40, { adv: 0.3 })],
  Combat: [M("Gonflette", "Combat", 0, { tg: "self", buff: { atk: 0.3, def: 0.2 }, n: 3 }), M("Mach Punch", "Combat", 40, { adv: 0.3 })],
  Poison: [M("Toxik", "Poison", 0, { st: { k: "poison", ch: 1, n: 3 } }), M("Direct Toxik", "Poison", 60, { st: { k: "poison", ch: 0.3, n: 3 } })],
  Sol: [M("Piétisol", "Sol", 45, { tg: "all", st: { k: "slow", ch: 0.4, n: 2 } }), M("Tir de Boue", "Sol", 55, { st: { k: "slow", ch: 1, n: 2 } })],
  Vol: [M("Vent Arrière", "Vol", 0, { tg: "allies", adv: 0.25 }), M("Aéropique", "Vol", 55, { crit: 0.15 })],
  Psy: [M("Hypnose", "Psy", 0, { st: { k: "sleep", ch: 0.6 } }), M("Plénitude", "Psy", 0, { tg: "self", buff: { atk: 0.25, def: 0.25 }, n: 3 })],
  Insecte: [M("Survinsecte", "Insecte", 45, { tg: "all", st: { k: "atkdown", ch: 0.3, n: 2 } }), M("Plaie-Croix", "Insecte", 60, { crit: 0.2 })],
  Roche: [M("Éboulement", "Roche", 45, { tg: "all", st: { k: "fear", ch: 0.3 } }), M("Pouvoir Antique", "Roche", 50, { selfBuff: { atk: 0.2 }, n: 3 })],
  Spectre: [M("Ombre Portée", "Spectre", 40, { adv: 0.3 }), M("Onde Folie", "Spectre", 0, { st: { k: "stun", ch: 0.5 } })],
  Dragon: [M("Danse Draco", "Dragon", 0, { tg: "self", buff: { atk: 0.25, spd: 0.25 }, n: 3 }), M("Draco-Souffle", "Dragon", 55, { st: { k: "para", ch: 0.3, n: 2 } })],
  Ténèbres: [M("Aboiement", "Ténèbres", 45, { tg: "all", st: { k: "atkdown", ch: 0.6, n: 2 } }), M("Coup Bas", "Ténèbres", 55, { adv: 0.2 })],
  Acier: [M("Mur de Fer", "Acier", 0, { tg: "self", shield: 0.2, buff: { def: 0.3 }, n: 3 }), M("Pisto-Poing", "Acier", 40, { adv: 0.3 })],
  Fée: [M("Vœu", "Fée", 0, { tg: "ally", heal: 0.3 }), M("Charme", "Fée", 0, { st: { k: "atkdown", ch: 1, n: 2 } })],
};

// Attaques puissantes : chères, gros dégâts, souvent avec une contrepartie.
export const HEAVY = {
  Normal: [M("Damoclès", "Normal", 140, { recoil: 0.25 }), M("Ultralaser", "Normal", 150, { selfDelay: 0.5 })],
  Feu: [M("Déflagration", "Feu", 125, { st: { k: "burn", ch: 0.3, n: 3 } }), M("Boutefeu", "Feu", 135, { recoil: 0.25 })],
  Eau: [M("Hydrocanon", "Eau", 130), M("Aqua-Brèche", "Eau", 120, { st: { k: "defdown", ch: 0.5, n: 2 } })],
  Plante: [M("Lance-Soleil", "Plante", 130), M("Tempête Florale", "Plante", 90, { tg: "all" })],
  Électrik: [M("Fatal-Foudre", "Électrik", 125, { st: { k: "para", ch: 0.3, n: 2 } }), M("Électacle", "Électrik", 135, { recoil: 0.3 })],
  Glace: [M("Blizzard", "Glace", 90, { tg: "all", st: { k: "frozen", ch: 0.1 } }), M("Laser Glace", "Glace", 120, { st: { k: "frozen", ch: 0.15 } })],
  Combat: [M("Close Combat", "Combat", 140, { selfDebuff: { def: 0.3 }, n: 2 }), M("Poing Dynamo", "Combat", 120, { st: { k: "stun", ch: 0.35 } })],
  Poison: [M("Bombe Beurk", "Poison", 120, { st: { k: "poison", ch: 0.4, n: 3 } }), M("Détricanon", "Poison", 130)],
  Sol: [M("Séisme", "Sol", 95, { tg: "all" }), M("Telluriforce", "Sol", 120, { st: { k: "defdown", ch: 0.3, n: 2 } })],
  Vol: [M("Rapace", "Vol", 135, { recoil: 0.25 }), M("Vent Violent", "Vol", 120, { st: { k: "stun", ch: 0.2 } })],
  Psy: [M("Psyko", "Psy", 125, { st: { k: "defdown", ch: 0.3, n: 2 } }), M("Psykoud'Boul", "Psy", 120, { st: { k: "stun", ch: 0.2 } })],
  Insecte: [M("Mégacorne", "Insecte", 130), M("Bourdon", "Insecte", 110, { st: { k: "defdown", ch: 0.3, n: 2 } })],
  Roche: [M("Lame de Roc", "Roche", 125, { crit: 0.25 }), M("Fracass'Tête", "Roche", 145, { recoil: 0.3 })],
  Spectre: [M("Ball'Ombre", "Spectre", 120, { st: { k: "defdown", ch: 0.3, n: 2 } }), M("Revenant", "Spectre", 130)],
  Dragon: [M("Draco-Météore", "Dragon", 145, { selfDebuff: { atk: 0.3 }, n: 2 }), M("Colère", "Dragon", 130)],
  Ténèbres: [M("Mâchouille", "Ténèbres", 120, { st: { k: "defdown", ch: 0.3, n: 2 } }), M("Vibrobscur", "Ténèbres", 115, { st: { k: "fear", ch: 0.3 } })],
  Acier: [M("Luminocanon", "Acier", 125, { st: { k: "defdown", ch: 0.2, n: 2 } }), M("Tête de Fer", "Acier", 120, { st: { k: "fear", ch: 0.3 } })],
  Fée: [M("Pouvoir Lunaire", "Fée", 125, { st: { k: "atkdown", ch: 0.3, n: 2 } }), M("Câlinerie", "Fée", 120, { st: { k: "atkdown", ch: 0.3, n: 2 } })],
};

export const MAX_EN = 5;
export const SLOT_NAME = { basic: "Attaque", tech: "Technique", skill: "Signature", heavy: "Puissante", ult: "Ultime" };

const cache = {};
// Les 3 capacités d'un Pokémon, par coût croissant.
export function movesOf(k) {
  if (cache[k]) return cache[k];
  const sp = SPECIES[k];
  const t1 = sp.t[0], t2 = sp.t[1] || sp.t[0];
  const used = new Set([sp.basic.n, sp.skill.n, sp.ult.n]);
  const pick = (lib) => { const m = lib.find((x) => !used.has(x.n)) || lib[0]; used.add(m.n); return m; };
  const tech = pick(TECH[t2]);
  const heavy = pick(HEAVY[t1]);
  return (cache[k] = [
    { slot: "tech", m: tech, cost: 1 },
    { slot: "skill", m: sp.skill, cost: 2 },
    { slot: "heavy", m: heavy, cost: 3 },
  ]);
}
// Charge d'ultime gagnée selon l'action.
export const CHARGE_GAIN = { basic: 20, tech: 22, skill: 30, heavy: 35 };
