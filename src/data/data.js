// Types, réactions élémentaires et les 56 Pokémon (statistiques + kit de combat).

export const TYPES = ["Normal", "Feu", "Eau", "Plante", "Électrik", "Glace", "Combat", "Poison", "Sol", "Vol", "Psy", "Insecte", "Roche", "Spectre", "Dragon", "Ténèbres", "Acier", "Fée"];
export const TYPE_COLOR = {
  Normal: "#a8a77a", Feu: "#ee8130", Eau: "#6390f0", Plante: "#7ac74c", Électrik: "#f7d02c", Glace: "#96d9d6",
  Combat: "#c22e28", Poison: "#a33ea1", Sol: "#e2bf65", Vol: "#a98ff3", Psy: "#f95587", Insecte: "#a6b91a",
  Roche: "#b6a136", Spectre: "#735797", Dragon: "#6f35fc", Ténèbres: "#705746", Acier: "#b7b7ce", Fée: "#d685ad",
};

// Table des types (attaque → défense). Les immunités valent ×0,25 : jamais de combat bloqué.
const S = 2, H = 0.5, Z = 0.25;
const CH = {
  Normal: { Roche: H, Acier: H, Spectre: Z },
  Feu: { Plante: S, Glace: S, Insecte: S, Acier: S, Feu: H, Eau: H, Roche: H, Dragon: H },
  Eau: { Feu: S, Sol: S, Roche: S, Eau: H, Plante: H, Dragon: H },
  Plante: { Eau: S, Sol: S, Roche: S, Feu: H, Plante: H, Poison: H, Vol: H, Insecte: H, Dragon: H, Acier: H },
  Électrik: { Eau: S, Vol: S, Électrik: H, Plante: H, Dragon: H, Sol: Z },
  Glace: { Plante: S, Sol: S, Vol: S, Dragon: S, Feu: H, Eau: H, Glace: H, Acier: H },
  Combat: { Normal: S, Glace: S, Roche: S, Ténèbres: S, Acier: S, Poison: H, Vol: H, Psy: H, Insecte: H, Fée: H, Spectre: Z },
  Poison: { Plante: S, Fée: S, Poison: H, Sol: H, Roche: H, Spectre: H, Acier: Z },
  Sol: { Feu: S, Électrik: S, Poison: S, Roche: S, Acier: S, Plante: H, Insecte: H, Vol: Z },
  Vol: { Plante: S, Combat: S, Insecte: S, Électrik: H, Roche: H, Acier: H },
  Psy: { Combat: S, Poison: S, Psy: H, Acier: H, Ténèbres: Z },
  Insecte: { Plante: S, Psy: S, Ténèbres: S, Feu: H, Combat: H, Poison: H, Vol: H, Spectre: H, Acier: H, Fée: H },
  Roche: { Feu: S, Glace: S, Vol: S, Insecte: S, Combat: H, Sol: H, Acier: H },
  Spectre: { Psy: S, Spectre: S, Ténèbres: H, Normal: Z },
  Dragon: { Dragon: S, Acier: H, Fée: Z },
  Ténèbres: { Psy: S, Spectre: S, Combat: H, Ténèbres: H, Fée: H },
  Acier: { Glace: S, Roche: S, Fée: S, Feu: H, Eau: H, Électrik: H, Acier: H },
  Fée: { Combat: S, Dragon: S, Ténèbres: S, Feu: H, Poison: H, Acier: H },
};
export function effectiveness(atk, defTypes) {
  let m = 1; for (const d of defTypes) m *= (CH[atk] && CH[atk][d]) || 1; return m;
}
// Types qui battent une liste de types (pour les conseils de biome).
export function weaknessesOf(defTypes) {
  return TYPES.filter((a) => effectiveness(a, defTypes) > 1);
}

// ───────── éléments et réactions (inspiré de Genshin) ─────────
// Ces 5 types laissent une « aura » sur la cible. Le type suivant la déclenche.
export const ELEMENTS = ["Feu", "Eau", "Plante", "Électrik", "Glace"];
export const SWIRL = ["Vol"];            // Dispersion : propage l'aura à tous les ennemis
export const CRYSTAL = ["Roche", "Sol"]; // Cristallisation : consomme l'aura, boucliers pour l'équipe
const rk = (a, b) => [a, b].sort((x, y) => ELEMENTS.indexOf(x) - ELEMENTS.indexOf(y)).join("|");
export const REACTIONS = {
  [rk("Feu", "Eau")]: { id: "vapeur", name: "Vaporisation", color: "#9fe0ff", mult: 1.75, desc: "Dégâts ×1,75." },
  [rk("Feu", "Glace")]: { id: "fonte", name: "Fonte", color: "#ffb27a", mult: 1.75, desc: "Dégâts ×1,75." },
  [rk("Feu", "Plante")]: { id: "combustion", name: "Combustion", color: "#ff7a3a", desc: "La cible brûle pendant 3 tours." },
  [rk("Feu", "Électrik")]: { id: "surcharge", name: "Surcharge", color: "#ff5a8a", desc: "Explosion sur tous les ennemis, la cible recule dans l'ordre des tours." },
  [rk("Eau", "Électrik")]: { id: "electro", name: "Électrocharge", color: "#b48cff", desc: "Un arc électrique frappe la cible et 2 autres ennemis." },
  [rk("Eau", "Plante")]: { id: "floraison", name: "Floraison", color: "#7be08a", desc: "Explosion florale : gros dégâts et l'équipe récupère des PV." },
  [rk("Eau", "Glace")]: { id: "gel", name: "Gel", color: "#bff4ff", desc: "La cible est gelée et passe son prochain tour." },
  [rk("Électrik", "Glace")]: { id: "supra", name: "Supraconduction", color: "#c9b8ff", desc: "Défense de la cible −30 % pendant 2 tours." },
  [rk("Plante", "Électrik")]: { id: "catalyse", name: "Catalyse", color: "#c7ef4a", desc: "Pendant 2 tours, la cible subit +35 % des attaques Plante et Électrik." },
};
export const reactionFor = (a, b) => REACTIONS[rk(a, b)] || null;
export const SWIRL_RX = { id: "dispersion", name: "Dispersion", color: "#a8f0d8", desc: "Le Vol propage l'aura de la cible à tous les ennemis." };
export const CRYSTAL_RX = { id: "cristal", name: "Cristallisation", color: "#ffe08a", desc: "La Roche ou le Sol consomme l'aura et protège l'équipe d'un bouclier." };
// Dégâts « fixes » des réactions selon le niveau.
export const rxBase = (lvl) => 6 + lvl * 2.2;

// ───────── raretés ─────────
export const TIERS = {
  1: { name: "Commun", bst: 420, color: "#9aa7b0", capture: 0.75, xp: 1 },
  2: { name: "Peu commun", bst: 480, color: "#5fb36a", capture: 0.55, xp: 1.25 },
  3: { name: "Rare", bst: 530, color: "#4f8fe0", capture: 0.4, xp: 1.6 },
  4: { name: "Légendaire", bst: 600, color: "#e8a83a", capture: 0, xp: 2.4 },
};

// ───────── les 56 Pokémon ─────────
// b : stats réelles [PV, Atq, Déf, AtqSpé, DéfSpé, Vit] (normalisées ensuite selon la rareté)
// Kit : attaque de base (+1 charge d'énergie), capacité signature (2 charges), ultime (jauge pleine).
// La technique (1) et l'attaque puissante (3) viennent de moves.js.
// tg : one | all | blast (cible + voisins à 50 %) | rand (coups au hasard) | ally | allies | self
// « n » dans les options = durée (tours) : rangée dans « dur » pour ne pas écraser le nom.
const M = (n, t, p, o) => { const m = Object.assign({ n, t, p }, o || {}); if (o && typeof o.n === "number") { m.dur = o.n; m.n = n; } return m; };
export const SPECIES = {
  // ── Plage isolée ──
  SQUIRTLE: { fr: "Carapuce", t: ["Eau"], tier: 1, b: [44, 48, 65, 50, 64, 43], role: "Tank",
    basic: M("Pistolet à O", "Eau", 40),
    skill: M("Repli", "Eau", 0, { tg: "self", shield: 0.3, buff: { def: 0.4 }, n: 2, taunt: 2 }),
    ult: M("Hydrocanon", "Eau", 150) },
  GYARADOS: { fr: "Léviator", t: ["Eau", "Vol"], tier: 3, b: [95, 125, 79, 60, 100, 81], role: "Attaquant",
    basic: M("Cascade", "Eau", 45),
    skill: M("Hydro-Queue", "Eau", 90, { st: { k: "fear", ch: 0.3 } }),
    ult: M("Vent Violent", "Vol", 105, { tg: "all" }) },
  AZUMARILL: { fr: "Azumarill", t: ["Eau", "Fée"], tier: 2, b: [100, 100, 80, 60, 80, 50], role: "Attaquant",
    basic: M("Aqua-Jet", "Eau", 40, { adv: 0.2 }),
    skill: M("Poing Glace", "Glace", 80),
    ult: M("Câlinerie", "Fée", 150, { st: { k: "atkdown", ch: 1, n: 2 } }) },
  MUDKIP: { fr: "Gobou", t: ["Eau"], tier: 1, b: [50, 70, 50, 50, 50, 40], role: "Zone",
    basic: M("Pistolet à O", "Eau", 40),
    skill: M("Tir de Boue", "Sol", 70, { st: { k: "slow", ch: 1, n: 2 } }),
    ult: M("Surf", "Eau", 95, { tg: "all" }) },
  PELIPPER: { fr: "Bekipan", t: ["Eau", "Vol"], tier: 2, b: [60, 50, 100, 95, 70, 65], role: "Soutien",
    basic: M("Cru-Aile", "Vol", 40),
    skill: M("Bulles d'O", "Eau", 40, { tg: "all" }),
    ult: M("Vent Arrière", "Vol", 0, { tg: "allies", adv: 0.5, buff: { spd: 0.3 }, n: 3 }) },
  MILOTIC: { fr: "Milobellus", t: ["Eau"], tier: 3, b: [95, 60, 79, 100, 125, 81], role: "Soutien",
    basic: M("Ébullition", "Eau", 40, { st: { k: "burn", ch: 0.2 } }),
    skill: M("Anneau Hydro", "Eau", 0, { tg: "allies", heal: 0.16, regen: 0.06, n: 2 }),
    ult: M("Marée Bénie", "Eau", 0, { tg: "allies", heal: 0.38, cleanse: true }) },
  KYOGRE: { fr: "Kyogre", t: ["Eau"], tier: 4, b: [100, 100, 90, 150, 140, 90], role: "Zone",
    basic: M("Ébullition", "Eau", 45),
    skill: M("Laser Glace", "Glace", 90),
    ult: M("Onde Originelle", "Eau", 140, { tg: "all" }) },
  WOOPER: { fr: "Axoloto", t: ["Eau", "Sol"], tier: 1, b: [55, 45, 45, 25, 25, 15], role: "Tank",
    basic: M("Coud'Boue", "Sol", 40),
    skill: M("Bâillement", "Normal", 0, { st: { k: "sleep", ch: 0.7 } }),
    ult: M("Séisme", "Sol", 100, { tg: "all" }) },

  // ── Forêt Luxuriante ──
  SLAKOTH: { fr: "Parecool", t: ["Normal"], tier: 1, b: [60, 60, 60, 35, 35, 30], role: "Tank",
    basic: M("Griffe", "Normal", 45),
    skill: M("Paresse", "Normal", 0, { tg: "self", heal: 0.45, taunt: 1 }),
    ult: M("Giga Impact", "Normal", 190, { selfDelay: 0.5 }) },
  BRELOOM: { fr: "Chapignon", t: ["Plante", "Combat"], tier: 2, b: [60, 130, 80, 60, 60, 70], role: "Altération",
    basic: M("Mach Punch", "Combat", 40, { adv: 0.15 }),
    skill: M("Spore", "Plante", 0, { st: { k: "sleep", ch: 1 }, aura: true }),
    ult: M("Mitra-Poing", "Combat", 160, { crit: 0.3 }) },
  CELEBI: { fr: "Celebi", t: ["Psy", "Plante"], tier: 4, b: [100, 100, 100, 100, 100, 100], role: "Soutien",
    basic: M("Feuille Magik", "Plante", 45),
    skill: M("Giga-Sangsue", "Plante", 80, { drain: 0.5 }),
    ult: M("Retour Temporel", "Psy", 0, { tg: "allies", heal: 0.3, adv: 0.3, cleanse: true }) },
  PANSAGE: { fr: "Feuillajou", t: ["Plante"], tier: 1, b: [50, 53, 48, 53, 48, 64], role: "Zone",
    basic: M("Fouet Lianes", "Plante", 40),
    skill: M("Balle Graine", "Plante", 28, { tg: "rand", hits: 3 }),
    ult: M("Tempête Verte", "Plante", 95, { tg: "all" }) },
  EXEGGUTOR: { fr: "Noadkoko", t: ["Plante", "Psy"], tier: 2, b: [95, 95, 85, 125, 75, 55], role: "Attaquant",
    basic: M("Choc Mental", "Psy", 40),
    skill: M("Canon Graine", "Plante", 90),
    ult: M("Psyko", "Psy", 150, { st: { k: "defdown", ch: 1, n: 2 } }) },
  APPLIN: { fr: "Verpom", t: ["Plante", "Dragon"], tier: 1, b: [40, 40, 80, 40, 40, 20], role: "Tank",
    basic: M("Pomme Acide", "Plante", 40, { st: { k: "defdown", ch: 0.3, n: 2 } }),
    skill: M("Abri", "Normal", 0, { tg: "self", shield: 0.4, taunt: 2 }),
    ult: M("Draco-Météore", "Dragon", 170) },
  RILLABOOM: { fr: "Gorythmic", t: ["Plante"], tier: 3, b: [100, 125, 90, 60, 70, 85], role: "Soutien",
    basic: M("Tambour Battant", "Plante", 45, { delay: 0.1 }),
    skill: M("Rythme Sylvestre", "Plante", 65, { tg: "all" }),
    ult: M("Concert Sauvage", "Plante", 0, { tg: "allies", buff: { atk: 0.35 }, n: 3, charge: 15 }) },
  ROWLET: { fr: "Brindibou", t: ["Plante", "Vol"], tier: 1, b: [68, 55, 55, 50, 50, 42], role: "Attaquant",
    basic: M("Tranch'Herbe", "Plante", 40),
    skill: M("Lame-Feuille", "Plante", 85, { crit: 0.2 }),
    ult: M("Ouragan de Plumes", "Vol", 90, { tg: "all" }) },

  // ── Grotte Volcanique ──
  ARCANINE: { fr: "Arcanin", t: ["Feu"], tier: 3, b: [90, 110, 80, 100, 80, 95], role: "Attaquant",
    basic: M("Crocs Feu", "Feu", 45, { st: { k: "fear", ch: 0.15 } }),
    skill: M("Vitesse Extrême", "Normal", 80, { adv: 0.4 }),
    ult: M("Boutefeu", "Feu", 175, { recoil: 0.12 }) },
  SLUGMA: { fr: "Limagma", t: ["Feu"], tier: 1, b: [40, 40, 40, 70, 40, 20], role: "Tank",
    basic: M("Flammèche", "Feu", 40),
    skill: M("Carapace Magma", "Feu", 0, { tg: "self", shield: 0.35, taunt: 2, thorns: true }),
    ult: M("Éruption", "Feu", 110, { tg: "all" }) },
  BLAZIKEN: { fr: "Braségali", t: ["Feu", "Combat"], tier: 3, b: [80, 120, 70, 110, 70, 80], role: "Attaquant",
    basic: M("Poing Feu", "Feu", 45),
    skill: M("Pied Voltige", "Combat", 105, { recoil: 0.08 }),
    ult: M("Envol Brasier", "Feu", 165, { selfBuff: { spd: 0.3 }, n: 3 }) },
  SALANDIT: { fr: "Tritox", t: ["Poison", "Feu"], tier: 1, b: [48, 44, 40, 71, 40, 77], role: "Altération",
    basic: M("Flammèche", "Feu", 40),
    skill: M("Toxik", "Poison", 35, { st: { k: "poison", ch: 1, n: 3 } }),
    ult: M("Nuée Toxique", "Poison", 75, { tg: "all", st: { k: "poison", ch: 1, n: 3 } }) },
  CAMERUPT: { fr: "Camérupt", t: ["Feu", "Sol"], tier: 2, b: [70, 100, 70, 105, 75, 40], role: "Zone",
    basic: M("Flammèche", "Feu", 40),
    skill: M("Séisme", "Sol", 70, { tg: "all" }),
    ult: M("Éruption", "Feu", 145, { tg: "all" }) },
  MAGMAR: { fr: "Magmar", t: ["Feu"], tier: 2, b: [65, 95, 57, 100, 85, 93], role: "Attaquant",
    basic: M("Poing Feu", "Feu", 45),
    skill: M("Lance-Flammes", "Feu", 90, { st: { k: "burn", ch: 0.2 } }),
    ult: M("Déflagration", "Feu", 170) },
  HEATRAN: { fr: "Heatran", t: ["Feu", "Acier"], tier: 4, b: [91, 90, 106, 130, 106, 77], role: "Zone",
    basic: M("Tête de Fer", "Acier", 45),
    skill: M("Lance-Flammes", "Feu", 95),
    ult: M("Vortex Magma", "Feu", 115, { tg: "all", st: { k: "burn", ch: 1, n: 3 } }) },

  // ── Prairie Féerique ──
  BLISSEY: { fr: "Leuphorie", t: ["Normal"], tier: 3, b: [255, 10, 10, 75, 135, 55], role: "Soutien",
    basic: M("Écras'Face", "Normal", 40),
    skill: M("E-Coque", "Normal", 0, { tg: "ally", heal: 0.4, cleanse: true }),
    ult: M("Sérénité", "Fée", 0, { tg: "allies", heal: 0.5, shield: 0.12, cleanse: true }) },
  BEAUTIFLY: { fr: "Charmillon", t: ["Insecte", "Vol"], tier: 2, b: [60, 70, 50, 100, 50, 65], role: "Zone",
    basic: M("Tornade", "Vol", 40),
    skill: M("Papillodanse", "Insecte", 0, { tg: "self", buff: { atk: 0.4, spd: 0.2 }, n: 3, pts: 1 }),
    ult: M("Vent Argenté", "Insecte", 100, { tg: "all" }) },
  RALTS: { fr: "Tarsal", t: ["Psy", "Fée"], tier: 1, b: [28, 25, 25, 45, 35, 40], role: "Soutien",
    basic: M("Choc Mental", "Psy", 40),
    skill: M("Mur Lumière", "Psy", 0, { tg: "allies", shield: 0.15 }),
    ult: M("Prescience", "Psy", 155) },
  FLORGES: { fr: "Florges", t: ["Fée"], tier: 3, b: [78, 65, 68, 112, 154, 75], role: "Soutien",
    basic: M("Voix Enjôleuse", "Fée", 40),
    skill: M("Soin Floral", "Fée", 0, { tg: "ally", heal: 0.35, regen: 0.08, n: 2 }),
    ult: M("Jardin Floral", "Fée", 0, { tg: "allies", heal: 0.3, buff: { def: 0.3 }, n: 3 }) },
  SYLVEON: { fr: "Nymphali", t: ["Fée"], tier: 3, b: [95, 65, 65, 110, 130, 60], role: "Zone",
    basic: M("Voix Enjôleuse", "Fée", 40),
    skill: M("Éclat Magique", "Fée", 70, { tg: "all" }),
    ult: M("Rubans Féeriques", "Fée", 155, { st: { k: "atkdown", ch: 1, n: 2 } }) },
  XERNEAS: { fr: "Xerneas", t: ["Fée"], tier: 4, b: [126, 131, 95, 131, 98, 99], role: "Attaquant",
    basic: M("Voix Enjôleuse", "Fée", 45),
    skill: M("Pouvoir Lunaire", "Fée", 95, { st: { k: "atkdown", ch: 0.3, n: 2 } }),
    ult: M("Géo-Contrôle", "Fée", 0, { tg: "self", buff: { atk: 0.5, def: 0.5, spd: 0.3 }, n: 3, heal: 0.15 }) },
  RIBOMBEE: { fr: "Rubombelle", t: ["Insecte", "Fée"], tier: 2, b: [60, 55, 60, 95, 70, 124], role: "Soutien",
    basic: M("Piqûre", "Insecte", 40),
    skill: M("Boule Pollen", "Insecte", 0, { tg: "ally", heal: 0.28, buff: { spd: 0.2 }, n: 2 }),
    ult: M("Tourbi-Pollen", "Fée", 0, { tg: "allies", adv: 0.4, pts: 2 }) },
  STEENEE: { fr: "Candine", t: ["Plante"], tier: 1, b: [52, 40, 48, 40, 48, 62], role: "Zone",
    basic: M("Tranch'Herbe", "Plante", 40),
    skill: M("Ruse Sucrée", "Plante", 55, { selfBuff: { spd: 0.3 }, n: 2 }),
    ult: M("Tempête Florale", "Plante", 90, { tg: "all" }) },

  // ── Usine Clandestine ──
  MACHAMP: { fr: "Mackogneur", t: ["Combat"], tier: 3, b: [90, 130, 80, 65, 85, 55], role: "Attaquant",
    basic: M("Poing Karaté", "Combat", 45, { crit: 0.15 }),
    skill: M("Dynamopoing", "Combat", 100, { st: { k: "stun", ch: 0.25 } }),
    ult: M("Close Combat", "Combat", 195, { selfDebuff: { def: 0.25 }, n: 2 }) },
  MAGNEMITE: { fr: "Magnéti", t: ["Électrik", "Acier"], tier: 1, b: [25, 35, 70, 95, 55, 45], role: "Altération",
    basic: M("Éclair", "Électrik", 40),
    skill: M("Cage-Éclair", "Électrik", 30, { st: { k: "para", ch: 1, n: 2 } }),
    ult: M("Luminocanon", "Acier", 155) },
  VOLTORB: { fr: "Voltorbe", t: ["Électrik"], tier: 1, b: [40, 30, 50, 55, 55, 100], role: "Zone",
    basic: M("Étincelle", "Électrik", 40),
    skill: M("Boule Élek", "Électrik", 70, { adv: 0.25 }),
    ult: M("Explosion", "Normal", 210, { tg: "all", selfKO: true }) },
  PLUSLE: { fr: "Posipi", t: ["Électrik"], tier: 1, b: [60, 50, 40, 85, 75, 95], role: "Soutien",
    basic: M("Étincelle", "Électrik", 40),
    skill: M("Coup d'Main", "Normal", 0, { tg: "ally", buff: { atk: 0.35 }, n: 2, adv: 0.35 }),
    ult: M("Charge Positive", "Électrik", 0, { tg: "allies", charge: 30, pts: 1 }) },
  MINUN: { fr: "Négapi", t: ["Électrik"], tier: 1, b: [60, 40, 50, 75, 85, 95], role: "Soutien",
    basic: M("Étincelle", "Électrik", 40),
    skill: M("Mur Lumière", "Psy", 0, { tg: "allies", shield: 0.13 }),
    ult: M("Charge Négative", "Électrik", 0, { tg: "allies", heal: 0.32, cleanse: true }) },
  ELECTIVIRE: { fr: "Élekable", t: ["Électrik"], tier: 3, b: [75, 123, 67, 95, 85, 95], role: "Attaquant",
    basic: M("Poing Éclair", "Électrik", 45),
    skill: M("Fatal-Foudre", "Électrik", 110, { st: { k: "para", ch: 0.3, n: 2 } }),
    ult: M("Tempête Électrique", "Électrik", 110, { tg: "all" }) },
  KLANG: { fr: "Clic", t: ["Acier"], tier: 2, b: [60, 80, 95, 70, 85, 50], role: "Attaquant",
    basic: M("Lancécrou", "Acier", 24, { hits: 2 }),
    skill: M("Chgt Vitesse", "Acier", 0, { tg: "self", buff: { atk: 0.3, spd: 0.4 }, n: 3, pts: 1 }),
    ult: M("Engrenage Infernal", "Acier", 85, { tg: "all", st: { k: "defdown", ch: 1, n: 2 } }) },
  XURKITREE: { fr: "Câblifère", t: ["Électrik"], tier: 4, b: [83, 89, 71, 173, 71, 83], role: "Zone",
    basic: M("Étincelle", "Électrik", 45),
    skill: M("Toile Élek", "Électrik", 60, { tg: "all", st: { k: "slow", ch: 1, n: 2 } }),
    ult: M("Fatal-Foudre", "Électrik", 200) },
  WATCHOG: { fr: "Miradar", t: ["Normal"], tier: 1, b: [60, 85, 69, 60, 69, 77], role: "Altération",
    basic: M("Morsure", "Ténèbres", 40, { st: { k: "fear", ch: 0.15 } }),
    skill: M("Groz'Yeux", "Normal", 30, { st: { k: "defdown", ch: 1, n: 2 } }),
    ult: M("Croc de Mort", "Normal", 150, { crit: 0.25 }) },

  // ── Tour de Combat ──
  CHARIZARD: { fr: "Dracaufeu", t: ["Feu", "Vol"], tier: 3, b: [78, 84, 78, 109, 85, 100], role: "Zone",
    basic: M("Flammèche", "Feu", 45),
    skill: M("Lance-Flammes", "Feu", 95),
    ult: M("Rafale Feu", "Feu", 120, { tg: "all" }) },
  NIDOKING: { fr: "Nidoking", t: ["Poison", "Sol"], tier: 2, b: [81, 102, 77, 85, 75, 85], role: "Zone",
    basic: M("Dard-Venin", "Poison", 40, { st: { k: "poison", ch: 0.3, n: 3 } }),
    skill: M("Telluriforce", "Sol", 90),
    ult: M("Séisme", "Sol", 110, { tg: "all" }) },
  DRAGONITE: { fr: "Dracolosse", t: ["Dragon", "Vol"], tier: 3, b: [91, 134, 95, 100, 100, 80], role: "Attaquant",
    basic: M("Cru-Aile", "Vol", 45),
    skill: M("Danse Draco", "Dragon", 0, { tg: "self", buff: { atk: 0.4, spd: 0.3 }, n: 3, pts: 1 }),
    ult: M("Ultralaser", "Normal", 210, { selfDelay: 0.5 }) },
  LAPRAS: { fr: "Lokhlass", t: ["Eau", "Glace"], tier: 3, b: [130, 85, 80, 85, 95, 60], role: "Zone",
    basic: M("Éclats Glace", "Glace", 40, { adv: 0.1 }),
    skill: M("Surf", "Eau", 65, { tg: "all" }),
    ult: M("Blizzard", "Glace", 110, { tg: "all" }) },
  MEWTWO: { fr: "Mewtwo", t: ["Psy"], tier: 4, b: [106, 110, 90, 154, 90, 130], role: "Attaquant",
    basic: M("Choc Mental", "Psy", 45),
    skill: M("Ball'Ombre", "Spectre", 90, { st: { k: "defdown", ch: 0.3, n: 2 } }),
    ult: M("Frappe Psy", "Psy", 220) },
  ALAKAZAM: { fr: "Alakazam", t: ["Psy"], tier: 3, b: [55, 50, 45, 135, 95, 120], role: "Zone",
    basic: M("Choc Mental", "Psy", 40),
    skill: M("Psyko", "Psy", 95, { st: { k: "defdown", ch: 0.3, n: 2 } }),
    ult: M("Psycho Boost", "Psy", 120, { tg: "all" }) },
  GENGAR: { fr: "Ectoplasma", t: ["Spectre", "Poison"], tier: 3, b: [60, 65, 60, 130, 75, 110], role: "Altération",
    basic: M("Léchouille", "Spectre", 40, { st: { k: "fear", ch: 0.2 } }),
    skill: M("Bombe Beurk", "Poison", 90, { st: { k: "poison", ch: 0.5, n: 3 } }),
    ult: M("Cauchemar", "Spectre", 100, { tg: "all", st: { k: "fear", ch: 0.5 } }) },
  KANGASKHAN: { fr: "Kangourex", t: ["Normal"], tier: 2, b: [105, 95, 80, 40, 80, 90], role: "Attaquant",
    basic: M("Poing Comète", "Normal", 24, { hits: 2 }),
    skill: M("Coup Bas", "Ténèbres", 70, { adv: 0.25 }),
    ult: M("Furie Maternelle", "Normal", 65, { hits: 3 }) },

  // ── Automne nuageux ──
  KAKUNA: { fr: "Coconfort", t: ["Insecte", "Poison"], tier: 1, b: [45, 25, 50, 25, 25, 35], role: "Tank",
    basic: M("Dard-Venin", "Poison", 40, { st: { k: "poison", ch: 0.3, n: 3 } }),
    skill: M("Armure", "Insecte", 0, { tg: "self", buff: { def: 0.6 }, n: 3, taunt: 2, shield: 0.15 }),
    ult: M("Dard-Nuée", "Insecte", 32, { tg: "rand", hits: 5 }) },
  URSARING: { fr: "Ursaring", t: ["Normal"], tier: 2, b: [90, 130, 75, 75, 75, 55], role: "Attaquant",
    basic: M("Griffe", "Normal", 45),
    skill: M("Façade", "Normal", 80, { facade: true }),
    ult: M("Giga Impact", "Normal", 200, { selfDelay: 0.5 }) },
  DUSTOX: { fr: "Papinox", t: ["Insecte", "Poison"], tier: 2, b: [60, 50, 70, 50, 90, 65], role: "Altération",
    basic: M("Poudre Toxik", "Poison", 30, { st: { k: "poison", ch: 0.6, n: 3 } }),
    skill: M("Nuage Toxik", "Poison", 40, { tg: "all", st: { k: "poison", ch: 0.5, n: 3 } }),
    ult: M("Vent Argenté", "Insecte", 100, { tg: "all" }) },
  LILEEP: { fr: "Lilia", t: ["Roche", "Plante"], tier: 1, b: [66, 41, 77, 61, 87, 23], role: "Tank",
    basic: M("Jet-Pierres", "Roche", 40),
    skill: M("Racines", "Plante", 0, { tg: "self", heal: 0.25, regen: 0.08, n: 3, buff: { def: 0.3 }, taunt: 1 }),
    ult: M("Pouvoir Antique", "Roche", 90, { tg: "all", selfBuff: { atk: 0.2, def: 0.2 }, n: 3 }) },
  BANETTE: { fr: "Branette", t: ["Spectre"], tier: 2, b: [64, 115, 65, 83, 63, 65], role: "Altération",
    basic: M("Ombre Portée", "Spectre", 40, { adv: 0.15 }),
    skill: M("Malédiction", "Spectre", 0, { st: { k: "curse", ch: 1, n: 3 } }),
    ult: M("Rancune", "Spectre", 160) },
  SCOLIPEDE: { fr: "Brutapode", t: ["Insecte", "Poison"], tier: 2, b: [60, 100, 89, 55, 69, 112], role: "Attaquant",
    basic: M("Dard-Venin", "Poison", 40, { st: { k: "poison", ch: 0.3, n: 3 } }),
    skill: M("Mégacorne", "Insecte", 100),
    ult: M("Roulade Toxique", "Poison", 60, { tg: "rand", hits: 3, st: { k: "poison", ch: 1, n: 3 } }) },
  DEERLING: { fr: "Vivaldaim", t: ["Normal", "Plante"], tier: 1, b: [60, 60, 50, 40, 50, 75], role: "Soutien",
    basic: M("Tranch'Herbe", "Plante", 40),
    skill: M("Aromathérapie", "Plante", 0, { tg: "allies", heal: 0.12, cleanse: true }),
    ult: M("Cor Saisonnier", "Plante", 85, { tg: "all" }) },
  OGERPON: { fr: "Ogerpon", t: ["Plante"], tier: 4, b: [80, 120, 84, 60, 96, 110], role: "Attaquant",
    basic: M("Fouet Lianes", "Plante", 45),
    skill: M("Tranche-Masque", "Plante", 100, { crit: 0.2 }),
    ult: M("Massue Liane", "Plante", 200, { crit: 0.3 }) },

  // ── Canyon Ocre (désert) ──
  TRAPINCH: { fr: "Kraknoix", t: ["Sol"], tier: 1, b: [45, 100, 45, 45, 45, 10], role: "Attaquant",
    basic: M("Coud'Boue", "Sol", 40),
    skill: M("Piège de Sable", "Sol", 50, { st: { k: "slow", ch: 1, n: 3 }, delay: 0.2 }),
    ult: M("Abîme", "Sol", 200) },
  SANDILE: { fr: "Mascaïman", t: ["Sol", "Ténèbres"], tier: 1, b: [50, 72, 35, 35, 35, 65], role: "Attaquant",
    basic: M("Morsure", "Ténèbres", 40, { st: { k: "fear", ch: 0.15 } }),
    skill: M("Tunnel", "Sol", 80),
    ult: M("Croc Fatal", "Ténèbres", 150, { crit: 0.25 }) },
  CACNEA: { fr: "Cacnea", t: ["Plante"], tier: 1, b: [50, 85, 40, 85, 40, 35], role: "Altération",
    basic: M("Tranch'Herbe", "Plante", 40),
    skill: M("Para-Spore", "Plante", 0, { st: { k: "para", ch: 1, n: 2 }, aura: true }),
    ult: M("Aiguilles Cactus", "Plante", 30, { tg: "rand", hits: 5 }) },
  HIPPOWDON: { fr: "Hippodocus", t: ["Sol"], tier: 2, b: [108, 112, 118, 68, 72, 47], role: "Tank",
    basic: M("Coud'Boue", "Sol", 40),
    skill: M("Tempête de Sable", "Roche", 40, { tg: "all", selfBuff: { def: 0.3 }, n: 2 }),
    ult: M("Séisme", "Sol", 110, { tg: "all" }) },
  CLAYDOL: { fr: "Kaorine", t: ["Sol", "Psy"], tier: 2, b: [60, 70, 105, 70, 120, 75], role: "Soutien",
    basic: M("Choc Mental", "Psy", 40),
    skill: M("Mur Lumière", "Psy", 0, { tg: "allies", shield: 0.16 }),
    ult: M("Rempart Antique", "Sol", 0, { tg: "allies", buff: { def: 0.4 }, n: 3, shield: 0.1, cleanse: true }) },
  CACTURNE: { fr: "Cacturne", t: ["Plante", "Ténèbres"], tier: 2, b: [70, 115, 60, 115, 60, 55], role: "Attaquant",
    basic: M("Feinte", "Ténèbres", 40, { crit: 0.1 }),
    skill: M("Lame-Feuille", "Plante", 85, { crit: 0.2 }),
    ult: M("Assaut Nocturne", "Ténèbres", 170) },
  KROOKODILE: { fr: "Crocorible", t: ["Sol", "Ténèbres"], tier: 3, b: [95, 117, 80, 65, 70, 92], role: "Attaquant",
    basic: M("Mâchouille", "Ténèbres", 45, { st: { k: "defdown", ch: 0.2, n: 2 } }),
    skill: M("Séisme", "Sol", 70, { tg: "all" }),
    ult: M("Fureur des Sables", "Sol", 190) },
  FLYGON: { fr: "Libégon", t: ["Sol", "Dragon"], tier: 3, b: [80, 100, 80, 80, 80, 100], role: "Zone",
    basic: M("Draco-Souffle", "Dragon", 40, { st: { k: "para", ch: 0.2, n: 2 } }),
    skill: M("Tunnel", "Sol", 85),
    ult: M("Chant du Désert", "Sol", 115, { tg: "all", delay: 0.15 }) },
  GROUDON: { fr: "Groudon", t: ["Sol"], tier: 4, b: [100, 150, 140, 100, 90, 90], role: "Attaquant",
    basic: M("Lame de Roc", "Roche", 45, { crit: 0.15 }),
    skill: M("Lance-Flammes", "Feu", 90),
    ult: M("Lame Pangéenne", "Sol", 150, { tg: "all" }) },

  // ── Pics Orageux (ciel) ──
  SWABLU: { fr: "Tylton", t: ["Normal", "Vol"], tier: 1, b: [45, 40, 60, 40, 75, 50], role: "Soutien",
    basic: M("Picpic", "Vol", 40),
    skill: M("Aile de Coton", "Vol", 0, { tg: "allies", shield: 0.13 }),
    ult: M("Mélodie Céleste", "Normal", 0, { tg: "allies", heal: 0.32, cleanse: true }) },
  NOIBAT: { fr: "Sonistrelle", t: ["Vol", "Dragon"], tier: 1, b: [40, 30, 35, 45, 40, 55], role: "Zone",
    basic: M("Cru-Aile", "Vol", 40),
    skill: M("Onde Sonore", "Dragon", 45, { tg: "all" }),
    ult: M("Ouragan", "Vol", 90, { tg: "all" }) },
  EMOLGA: { fr: "Emolga", t: ["Électrik", "Vol"], tier: 1, b: [55, 75, 60, 75, 60, 103], role: "Altération",
    basic: M("Étincelle", "Électrik", 40),
    skill: M("Acrobatie", "Vol", 70, { adv: 0.3 }),
    ult: M("Vol-Volt", "Électrik", 150, { st: { k: "para", ch: 0.5, n: 2 } }) },
  STARAPTOR: { fr: "Étouraptor", t: ["Normal", "Vol"], tier: 2, b: [85, 120, 70, 50, 60, 100], role: "Attaquant",
    basic: M("Vive-Attaque", "Normal", 40, { adv: 0.2 }),
    skill: M("Rapace", "Vol", 100, { recoil: 0.1 }),
    ult: M("Close Combat", "Combat", 170, { selfDebuff: { def: 0.25 }, n: 2 }) },
  SKARMORY: { fr: "Airmure", t: ["Acier", "Vol"], tier: 2, b: [65, 80, 140, 40, 70, 70], role: "Tank",
    basic: M("Aile d'Acier", "Acier", 40, { selfBuff: { def: 0.1 }, n: 2 }),
    skill: M("Plumes d'Acier", "Acier", 0, { tg: "self", shield: 0.35, taunt: 2, thorns: true }),
    ult: M("Tornade d'Acier", "Acier", 90, { tg: "all" }) },
  ALTARIA: { fr: "Altaria", t: ["Dragon", "Vol"], tier: 2, b: [75, 70, 90, 70, 105, 80], role: "Soutien",
    basic: M("Draco-Souffle", "Dragon", 40),
    skill: M("Chant Céleste", "Vol", 0, { tg: "allies", heal: 0.18, cleanse: true }),
    ult: M("Rafale Nuageuse", "Vol", 110, { tg: "all" }) },
  NOIVERN: { fr: "Bruyverne", t: ["Vol", "Dragon"], tier: 3, b: [85, 70, 80, 97, 80, 123], role: "Zone",
    basic: M("Lame d'Air", "Vol", 45, { st: { k: "fear", ch: 0.15 } }),
    skill: M("Draco-Choc", "Dragon", 90),
    ult: M("Ouragan Sonique", "Vol", 125, { tg: "all" }) },
  TOGEKISS: { fr: "Togekiss", t: ["Fée", "Vol"], tier: 3, b: [85, 50, 95, 120, 115, 80], role: "Soutien",
    basic: M("Lame d'Air", "Vol", 45, { st: { k: "fear", ch: 0.25 } }),
    skill: M("Vœu", "Fée", 0, { tg: "ally", heal: 0.45, regen: 0.06, n: 2 }),
    ult: M("Bénédiction", "Fée", 0, { tg: "allies", heal: 0.35, buff: { atk: 0.25 }, n: 3 }) },
  RAYQUAZA: { fr: "Rayquaza", t: ["Dragon", "Vol"], tier: 4, b: [105, 150, 90, 150, 90, 95], role: "Attaquant",
    basic: M("Cru-Aile", "Vol", 45),
    skill: M("Draco-Ascension", "Vol", 100, { selfDebuff: { def: 0.15 }, n: 2 }),
    ult: M("Tempête Céleste", "Dragon", 150, { tg: "all" }) },

  // ── Événement : Nuit des Citrouilles (Halloween) ──
  PUMPKABOO: { fr: "Pitrouille", t: ["Spectre", "Plante"], tier: 1, b: [49, 66, 70, 44, 55, 51], role: "Altération", ev: "halloween",
    basic: M("Étonnement", "Spectre", 40, { st: { k: "fear", ch: 0.2 } }),
    skill: M("Vampigraine", "Plante", 0, { st: { k: "curse", ch: 1, n: 3 }, aura: true }),
    ult: M("Pluie de Citrouilles", "Plante", 75, { tg: "all", st: { k: "fear", ch: 0.3 } }) },
  LITWICK: { fr: "Funécire", t: ["Spectre", "Feu"], tier: 1, b: [50, 30, 55, 65, 55, 20], role: "Altération", ev: "halloween",
    basic: M("Flammèche", "Feu", 40),
    skill: M("Feu Follet", "Feu", 0, { st: { k: "burn", ch: 1, n: 3 }, aura: true }),
    ult: M("Châtiment", "Spectre", 120, { hex: true }) },
  MURKROW: { fr: "Cornèbre", t: ["Ténèbres", "Vol"], tier: 1, b: [60, 85, 42, 85, 42, 91], role: "Attaquant", ev: "halloween",
    basic: M("Cru-Aile", "Vol", 40),
    skill: M("Coup Bas", "Ténèbres", 70, { adv: 0.25 }),
    ult: M("Nuée de Corbeaux", "Ténèbres", 34, { tg: "rand", hits: 4 }) },
  SABLEYE: { fr: "Ténéfix", t: ["Ténèbres", "Spectre"], tier: 2, b: [50, 75, 75, 65, 65, 50], role: "Altération", ev: "halloween",
    basic: M("Griffe Ombre", "Spectre", 40, { crit: 0.15 }),
    skill: M("Chapardage", "Ténèbres", 60, { pts: 1 }),
    ult: M("Gemme Maudite", "Roche", 105, { tg: "all" }) },
  MISMAGIUS: { fr: "Magirêve", t: ["Spectre"], tier: 2, b: [60, 60, 60, 105, 105, 105], role: "Zone", ev: "halloween",
    basic: M("Vent Mauvais", "Spectre", 40),
    skill: M("Ball'Ombre", "Spectre", 85, { st: { k: "defdown", ch: 0.3, n: 2 } }),
    ult: M("Danse Mystique", "Fée", 100, { tg: "all", st: { k: "atkdown", ch: 0.5, n: 2 } }) },
  MIMIKYU: { fr: "Mimiqui", t: ["Spectre", "Fée"], tier: 3, b: [55, 90, 80, 50, 105, 96], role: "Attaquant", ev: "halloween", passive: { startShield: 0.25 }, pdesc: "Déguisement : commence chaque combat avec un bouclier de 25 %.",
    basic: M("Griffe Ombre", "Spectre", 40, { crit: 0.15 }),
    skill: M("Câlinerie", "Fée", 90, { st: { k: "atkdown", ch: 0.3, n: 2 } }),
    ult: M("Câlin Éternel", "Fée", 190) },
  GOURGEIST: { fr: "Banshitrouye", t: ["Spectre", "Plante"], tier: 2, b: [65, 90, 122, 58, 75, 84], role: "Tank", ev: "halloween",
    basic: M("Étonnement", "Spectre", 40, { st: { k: "fear", ch: 0.2 } }),
    skill: M("Chant Funèbre", "Spectre", 0, { tg: "self", shield: 0.35, taunt: 2 }),
    ult: M("Des Bonbons ou un Sort !", "Spectre", 100, { tg: "all", st: { k: "curse", ch: 0.5, n: 3 } }) },
  CHANDELURE: { fr: "Lugulabre", t: ["Spectre", "Feu"], tier: 3, b: [60, 55, 90, 145, 90, 80], role: "Zone", ev: "halloween",
    basic: M("Flammèche", "Feu", 45),
    skill: M("Danse Flammes", "Feu", 55, { tg: "all", st: { k: "burn", ch: 0.3, n: 3 } }),
    ult: M("Lumière des Âmes", "Spectre", 130, { tg: "all", hex: true }) },
  DARKRAI: { fr: "Darkrai", t: ["Ténèbres"], tier: 4, b: [70, 90, 90, 135, 90, 125], role: "Altération", ev: "halloween",
    basic: M("Vibrobscur", "Ténèbres", 45, { st: { k: "fear", ch: 0.2 } }),
    skill: M("Trou Noir", "Ténèbres", 0, { tg: "all", st: { k: "sleep", ch: 0.45 } }),
    ult: M("Cauchemar Éternel", "Ténèbres", 130, { tg: "all", hex: true }) },
};
export const SPRITE_FILE = { XERNEAS: "XERNEAS_1" };
export const ALL = Object.keys(SPECIES);
export const fr = (k) => (SPECIES[k] ? SPECIES[k].fr : k);

// ───────── statistiques ─────────
// Stats de base normalisées selon la rareté : un Pokémon « faible » reste jouable.
const baseCache = {};
export function baseStats(k) {
  if (baseCache[k]) return baseCache[k];
  const s = SPECIES[k], [hp, at, df, sa, sd, sp] = s.b;
  const kk = TIERS[s.tier].bst / (hp + at + df + sa + sd + sp);
  return (baseCache[k] = { hp: hp * kk, pow: Math.max(at, sa) * kk, def: ((df + sd) / 2) * kk, spe: sp * kk });
}
// Stats réelles au niveau L (formules proches des jeux, sans IV/EV).
export function statsAt(k, L, mult = 1) {
  const b = baseStats(k);
  return {
    hp: Math.floor(((2 * b.hp * L) / 100 + L + 10) * mult),
    pow: Math.floor(((2 * b.pow * L) / 100 + 5) * mult),
    def: Math.floor(((2 * b.def * L) / 100 + 5) * mult),
    spd: 70 + b.spe * 0.5, // vitesse « timeline » compressée : écart max ≈ ×1,6
  };
}
export const xpToNext = (L) => 18 + L * 6;

// Description lisible d'une capacité.
export function describe(m) {
  const tgt = { one: "une cible", all: "tous les ennemis", blast: "la cible (et 50 % aux voisins)", rand: "des ennemis au hasard", ally: "un allié", allies: "toute l'équipe", self: "lui-même" }[m.tg || "one"];
  const parts = [];
  if (m.p) parts.push(`Puissance ${m.p}${m.hits ? " ×" + m.hits : ""} sur ${tgt}.`);
  else parts.push(`Cible : ${tgt}.`);
  if (m.heal) parts.push(`Soigne ${Math.round(m.heal * 100)} % des PV.`);
  if (m.regen) parts.push(`Régénère ${Math.round(m.regen * 100)} % par tour.`);
  if (m.shield) parts.push(`Bouclier de ${Math.round(m.shield * 100)} % des PV.`);
  if (m.buff) parts.push("Bonus : " + Object.entries(m.buff).map(([k, v]) => `${STATN[k]} +${Math.round(v * 100)} %`).join(", ") + ` (${m.dur || 2} tours).`);
  if (m.selfBuff) parts.push("Puis : " + Object.entries(m.selfBuff).map(([k, v]) => `${STATN[k]} +${Math.round(v * 100)} %`).join(", ") + ".");
  if (m.selfDebuff) parts.push("Contrecoup : " + Object.entries(m.selfDebuff).map(([k, v]) => `${STATN[k]} −${Math.round(v * 100)} %`).join(", ") + ".");
  if (m.st) parts.push(`${m.st.ch >= 1 ? "Effet" : Math.round(m.st.ch * 100) + " % de chances"} : ${STATUS[m.st.k].name.toLowerCase()}.`);
  if (m.adv) parts.push(`Avance ${m.tg === "allies" || m.tg === "ally" ? "le tour de la cible" : "son prochain tour"} de ${Math.round(m.adv * 100)} %.`);
  if (m.delay) parts.push(`Recule la cible de ${Math.round(m.delay * 100)} %.`);
  if (m.taunt) parts.push(`Provoque les ennemis (${m.taunt} tour${m.taunt > 1 ? "s" : ""}).`);
  if (m.cleanse) parts.push("Retire les altérations.");
  if (m.pts) parts.push(`+${m.pts} charge${m.pts > 1 ? "s" : ""} d'énergie.`);
  if (m.charge) parts.push(`+${m.charge} d'ultime aux alliés.`);
  if (m.drain) parts.push(`Récupère ${Math.round(m.drain * 100)} % des dégâts.`);
  if (m.recoil) parts.push(`Subit ${Math.round(m.recoil * 100)} % de contrecoup.`);
  if (m.crit) parts.push(`Critique +${Math.round(m.crit * 100)} %.`);
  if (m.selfDelay) parts.push("Doit récupérer ensuite.");
  if (m.selfKO) parts.push("Le lanceur tombe à 1 PV.");
  if (m.thorns) parts.push("Brûle ceux qui l'attaquent.");
  if (m.facade) parts.push("×1,5 si le lanceur subit une altération.");
  if (m.hex) parts.push("×1,6 contre une cible altérée.");
  if (m.aura) parts.push("Laisse une aura Plante.");
  return parts.join(" ");
}
export const STATN = { atk: "Attaque", def: "Défense", spd: "Vitesse", crit: "Critique" };
export const STATUS = {
  poison: { name: "Poison", icon: "☠", color: "#b65cd6" },
  burn: { name: "Brûlure", icon: "♨", color: "#ff7a3a" },
  sleep: { name: "Sommeil", icon: "z", color: "#9aa8c8" },
  frozen: { name: "Gel", icon: "❄", color: "#bff4ff" },
  stun: { name: "Étourdi", icon: "✦", color: "#ffe066" },
  para: { name: "Paralysie", icon: "ϟ", color: "#f7d02c" },
  fear: { name: "Peur", icon: "!", color: "#b48cff" },
  slow: { name: "Ralenti", icon: "↓", color: "#8fb3d9" },
  defdown: { name: "Défense baissée", icon: "▼", color: "#e0705a" },
  atkdown: { name: "Attaque baissée", icon: "▽", color: "#e0705a" },
  curse: { name: "Malédiction", icon: "✝", color: "#8a6ad0" },
  quicken: { name: "Catalyse", icon: "✧", color: "#c7ef4a" },
};
