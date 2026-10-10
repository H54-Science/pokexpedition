// Boucle de progression : TOUS les chiffres réglables sont ici.
// Modifier ce fichier ne demande pas de toucher au code (src/meta/*.js).
export const CONFIG = {
  save: { key: "pokeimpact.meta", version: 3 },

  // Départ : 6 Pokémon faibles niveau 20 (assez pour la difficulté 1), quelques vœux.
  start: { voeux: 20, starters: ["MUDKIP", "SQUIRTLE", "LITWICK", "PUMPKABOO", "TRAPINCH", "RALTS"], level: 20 },

  // ───── expédition (unique mode de run) ─────
  // Difficulté D = adversaires niveau levels[D-1] ; accès si au moins minRoster Pokémon ont ce niveau.
  // Le joueur choisit un set ; 5 actes ; à chaque acte il engage teamSize Pokémon ; chacun combat `uses` fois par run.
  run: { levels: [20, 40, 60, 80, 100], acts: 5, teamSize: 3, uses: 3, minRoster: 6 },

  expedition: {
    cost: 0,                          // vœux pour partir (0 = gratuit)
    voeuxPerAct: [2, 4, 7, 11, 16],   // par combat gagné, selon la difficulté (servent aux bénédictions)
    firstClearBonus: 10,              // premier run complet de chaque difficulté
    matMain: 2,                       // run complet : matériau de palier D ×2
    matPrev: 1,                       // et matériau de palier D-1 ×1
    order: ["weak", "weak", "nice", "weak", "legend"],
    foeHp: { weak: 4, nice: 6, legend: 6 },
    foePow: { weak: 0.55, nice: 0.62, legend: 0.62 },
    shinyRate: 1 / 300,
    shinyRateLegend: 1 / 30,
    // capture du légendaire : 0 % sous le seuil, puis interpolation linéaire
    legend: { minLevel: 30, rateAtMin: 0.03, rateAtMax: 0.30, maxLevel: 100 },
    pityStep: 0.05,                   // +5 points par tentative ratée (par set), remis à 0 après capture
    legendDoneReward: { mat: 5, n: 1 }, // légendaire déjà complet (normal + chromatique)
    fragments: { weak: 1, nice: 3, legend: 10 },   // captures non gardées
    shardPerShiny: 1,
  },

  // ───── bénédictions (cartes entre les actes, cohérentes avec le set) ─────
  buffs: {
    shopSize: 3,                      // cartes proposées
    rerolls: 2,                       // relances par run
    freeFirst: true,                  // la 1re carte (avant l'acte 1) est offerte
    cost: [3, 5, 8],                  // prix de base selon la rareté (commune, rare, épique)
    diffScale: [1, 2, 3.5, 5.5, 8],   // × selon la difficulté (suit le gain de vœux par acte)
    weight: [0.55, 0.35, 0.10],       // probabilité d'apparition selon la rareté
    legendPerLure: 0.05, legendLureMax: 0.10,
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
};
