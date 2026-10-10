// Boucle de progression : TOUS les chiffres réglables sont ici.
// Modifier ce fichier ne demande pas de toucher au code (src/meta/*.js). Guide : CONTENU.md.
export const CONFIG = {
  save: { key: "pokeimpact.meta", version: 3 },

  // Départ : 6 Pokémon faibles niveau 20 (assez pour la difficulté 1), quelques vœux.
  start: { voeux: 20, starters: ["MUDKIP", "SQUIRTLE", "LITWICK", "PUMPKABOO", "TRAPINCH", "RALTS"], level: 20 },

  // ───── difficultés d'expédition : une ligne par difficulté (on peut en ajouter ou en retirer) ─────
  // level : niveau des adversaires (et niveau requis pour y accéder) ; voeux : vœux par combat gagné ;
  // buffScale : multiplicateur du prix des bénédictions ; color / icon : habillage (icônes : leaf, moon, sword, crown, star, book, flower).
  // La difficulté n donne le matériau de palier n (×matMain) et n-1 (×matPrev) quand les actes sont tous gagnés.
  difficulties: [
    { name: "Découverte", level: 20, voeux: 2, buffScale: 1, color: "#5fd08a", icon: "leaf" },
    { name: "Aventure", level: 40, voeux: 4, buffScale: 2, color: "#4fa8ff", icon: "moon" },
    { name: "Épreuve", level: 60, voeux: 7, buffScale: 3.5, color: "#a46bff", icon: "sword" },
    { name: "Maîtrise", level: 80, voeux: 11, buffScale: 5.5, color: "#ff8a3d", icon: "crown" },
    { name: "Légende", level: 100, voeux: 16, buffScale: 8, color: "#ff4d6d", icon: "star" },
  ],

  // ───── expédition ─────
  // Accès à une difficulté si au moins minRoster Pokémon ont son niveau. À chaque acte le joueur engage
  // 1 à teamSize Pokémon ; chacun combat `uses` fois par run.
  run: { teamSize: 3, uses: 3, minRoster: 6 },

  expedition: {
    cost: 0,                          // vœux pour partir (0 = gratuit)
    firstClearBonus: 10,              // premier run complet de chaque difficulté
    matMain: 2,                       // run complet : matériau de palier D ×2
    matPrev: 1,                       // et matériau de palier D-1 ×1
    // Déroulé par défaut (un set peut avoir le sien : champ `order` dans sets.js). Les faibles sont tirés sans remise.
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
    cost: [3, 5, 8],                  // prix de base selon la rareté (commune, rare, épique), × buffScale de la difficulté
    weight: [0.55, 0.35, 0.10],       // probabilité d'apparition selon la rareté
    legendPerLure: 0.05, legendLureMax: 0.10,
  },

  // ───── objets de combat ─────
  // Sac donné au départ de chaque expédition ; ce qui n'est pas utilisé est perdu à la fin du run.
  // En combat : bouton Objets pendant le tour d'un allié, sans consommer le tour (perTurn par tour au maximum).
  // fx : heal (part des PV max), shield (part des PV max), charge (jauge d'ultime), pts (charges d'énergie),
  //      cleanse (retire les altérations) ; target : "lowest" (allié le plus blessé) ou "all" (toute l'équipe).
  items: {
    start: { potion: 2, elixir: 1, totalsoin: 1 },
    perTurn: 1,
    list: {
      potion: { name: "Potion", desc: "Soigne 35 % des PV de l'allié le plus blessé.", color: "#7fe0a0", fx: { heal: 0.35, target: "lowest" } },
      elixir: { name: "Élixir", desc: "+2 charges d'énergie.", color: "#6ad0ff", fx: { pts: 2 } },
      totalsoin: { name: "Total Soin", desc: "Retire les altérations de toute l'équipe et soigne 10 % de ses PV.", color: "#ffd36a", fx: { cleanse: true, heal: 0.1, target: "all" } },
      bouclier: { name: "Garde spéciale", desc: "Bouclier de 20 % des PV pour toute l'équipe.", color: "#8ad8ff", fx: { shield: 0.2, target: "all" } },
      cristal: { name: "Cristal d'ultime", desc: "+50 de jauge d'ultime pour toute l'équipe.", color: "#c58bff", fx: { charge: 50, target: "all" } },
    },
  },

  // éclats chroma → chromatique d'une espèce déjà possédée (en normal)
  shards: { cost: 5, costLegend: 15 },

  // ───── progression ─────
  levelCaps: [20, 40, 60, 80, 100],     // plafond selon l'élévation 0..4 ; élévation 5 = 100
  trainXp: 400,                         // XP par séance d'entraînement (illimitée, sans énergie)
  // élévation N (de N-1 vers N), N = 1..5 : fragments du set + matériau de palier N
  elevation: {
    fragments: [5, 10, 20, 35, 60],
    mats: [3, 5, 8, 12, 18],
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
