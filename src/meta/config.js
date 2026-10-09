// Boucle de progression : TOUS les chiffres réglables sont ici.
// Modifier ce fichier ne demande pas de toucher au code (src/meta/*.js).
export const CONFIG = {
  save: { key: "pokeimpact.meta", version: 1 },

  // Départ : 3 Pokémon faibles (pris dans des sets différents pour avoir leurs fragments), quelques vœux.
  start: { voeux: 20, starters: ["MUDKIP", "LITWICK", "TRAPINCH"], level: 20 },

  // ───── expéditions (source de vœux et de matériaux) ─────
  expedition: {
    // difficulté 1..5
    voeux: [2, 4, 8, 14, 24],
    firstClearBonus: 10,
    matMain: 2,          // matériau de palier D
    matPrev: 1,          // matériau de palier D-1
    foeLevel: [12, 30, 50, 70, 88],
    foeHp: [7, 8, 9, 10, 11],      // multiplicateur de PV du boss (raid 1 contre 3)
    foePow: [0.6, 0.64, 0.68, 0.72, 0.76],
    foeRole: ["weak", "nice", "nice", "nice", "nice"],   // rôle (dans les sets) de l'adversaire tiré
  },

  // ───── run de capture ─────
  capture: {
    cost: 10,                       // vœux
    levelMin: 1, levelMax: 100,
    order: ["weak", "weak", "nice", "weak", "legend"],
    foeHp: { weak: 4, nice: 6, legend: 6 },
    foePow: { weak: 0.55, nice: 0.62, legend: 0.62 },
    shinyRate: 1 / 300,
    shinyRateLegend: 1 / 30,
    // capture du légendaire : 0 % sous le seuil, puis interpolation linéaire
    legend: { minLevel: 30, rateAtMin: 0.03, rateAtMax: 0.30, maxLevel: 100 },
    pityStep: 0.05,                 // +5 points par tentative ratée (par set), remis à 0 après capture
    // légendaire déjà possédé en normal ET chromatique : combat pour des matériaux rares
    legendDoneReward: { mat: 5, n: 1 },
    // conversion des captures non gardées
    fragments: { weak: 1, nice: 3, legend: 10 },
    shardPerShiny: 1,
  },

  // éclats chroma → chromatique d'une espèce déjà possédée (en normal)
  shards: { cost: 5, costLegend: 15 },

  // ───── progression ─────
  levelCaps: [20, 40, 60, 80, 100],     // plafond selon l'élévation 0..4 ; élévation 5 = 100
  trainXp: 400,                         // XP par séance d'entraînement (illimitée, sans énergie)
  // élévation N (de N-1 vers N), N = 1..5
  elevation: {
    fragments: [5, 10, 20, 35, 60],
    mats: [3, 5, 8, 12, 18],            // matériau de palier N
  },
  evolveAt: [1, 3],                     // élévations qui font évoluer (si une évolution existe)
  // étoiles : achat en fragments du set, bonus de stats par étoile
  stars: { max: 5, cost: [10, 20, 35, 55, 80], bonusPerStar: 0.04 },

  // Lignées évolutives disponibles (les deux modèles existent). Clé = forme de base.
  evolutions: {
    LITWICK: ["CHANDELURE"], TRAPINCH: ["FLYGON"], SWABLU: ["ALTARIA"], CACNEA: ["CACTURNE"],
    PUMPKABOO: ["GOURGEIST"], SANDILE: ["KROOKODILE"], NOIBAT: ["NOIVERN"],
  },

  // qualité de frappe rythmée utilisée par les combats simulés (0 rien, 1 bien, 2 excellent)
  simQuality: 1,
  team: { size: 3 },
};
