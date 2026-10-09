// Bénédictions d'expédition (reprises des reliques de Récolte, déjà comprises par le moteur de combat).
export const BOONS = [
 {
  "id": "charbon",
  "n": "Charbon",
  "d": "Attaques Feu +25 %.",
  "r": 1,
  "c": "#ee8130",
  "g": "♨",
  "mods": {
   "type": {
    "Feu": 0.25
   }
  }
 },
 {
  "id": "eaumyst",
  "n": "Eau Mystique",
  "d": "Attaques Eau +25 %.",
  "r": 1,
  "c": "#6390f0",
  "g": "≈",
  "mods": {
   "type": {
    "Eau": 0.25
   }
  }
 },
 {
  "id": "grain",
  "n": "Grain Miracle",
  "d": "Attaques Plante +25 %.",
  "r": 1,
  "c": "#7ac74c",
  "g": "❦",
  "mods": {
   "type": {
    "Plante": 0.25
   }
  }
 },
 {
  "id": "aimant",
  "n": "Aimant",
  "d": "Attaques Électrik +25 %.",
  "r": 1,
  "c": "#f7d02c",
  "g": "ϟ",
  "mods": {
   "type": {
    "Électrik": 0.25
   }
  }
 },
 {
  "id": "glace",
  "n": "Glace Éternelle",
  "d": "Attaques Glace +30 %.",
  "r": 1,
  "c": "#96d9d6",
  "g": "❄",
  "mods": {
   "type": {
    "Glace": 0.3
   }
  }
 },
 {
  "id": "bec",
  "n": "Bec Pointu",
  "d": "Attaques Vol +20 %. Dispersion +50 %.",
  "r": 1,
  "c": "#a98ff3",
  "g": "➶",
  "mods": {
   "type": {
    "Vol": 0.2
   },
   "swirl": 0.5
  }
 },
 {
  "id": "pierre",
  "n": "Pierre Dure",
  "d": "Attaques Roche et Sol +20 %. Boucliers de Cristallisation +50 %.",
  "r": 1,
  "c": "#b6a136",
  "g": "◆",
  "mods": {
   "type": {
    "Roche": 0.2,
    "Sol": 0.2
   },
   "crystal": 0.5
  }
 },
 {
  "id": "pic",
  "n": "Pic Venin",
  "d": "Le poison inflige +60 %.",
  "r": 1,
  "c": "#a33ea1",
  "g": "☠",
  "mods": {
   "poison": 0.6
  }
 },
 {
  "id": "restes",
  "n": "Restes",
  "d": "Chaque allié récupère 4 % de ses PV au début de son tour.",
  "r": 2,
  "c": "#7aa060",
  "g": "✚",
  "mods": {
   "regen": 0.04
  }
 },
 {
  "id": "orbevie",
  "n": "Orbe Vie",
  "d": "Dégâts +30 %, mais −5 % de PV à chaque attaque.",
  "r": 2,
  "c": "#e04a6a",
  "g": "●",
  "mods": {
   "dmg": 0.3,
   "lifeorb": 0.05
  }
 },
 {
  "id": "ceinture",
  "n": "Ceinture Force",
  "d": "Une fois par combat, un allié survit à un coup fatal avec 1 PV.",
  "r": 2,
  "c": "#d0a040",
  "g": "▬",
  "mods": {
   "endure": 1
  }
 },
 {
  "id": "scope",
  "n": "Lentilscope",
  "d": "Chances de critique +15 %.",
  "r": 1,
  "c": "#5ac8e8",
  "g": "◎",
  "mods": {
   "crit": 0.15
  }
 },
 {
  "id": "griffe",
  "n": "Griffe Rasoir",
  "d": "Dégâts critiques ×2 au lieu de ×1,5.",
  "r": 2,
  "c": "#c8c8d8",
  "g": "⟋",
  "mods": {
   "critDmg": 0.5
  }
 },
 {
  "id": "mouchoir",
  "n": "Mouchoir Choix",
  "d": "Vitesse de l'équipe +15 %.",
  "r": 2,
  "c": "#e8d050",
  "g": "»",
  "mods": {
   "spd": 0.15
  }
 },
 {
  "id": "bandeau",
  "n": "Bandeau Choix",
  "d": "Attaques de base +35 %.",
  "r": 1,
  "c": "#e85050",
  "g": "◢",
  "mods": {
   "basic": 0.35
  }
 },
 {
  "id": "lunettes",
  "n": "Lunettes Choix",
  "d": "Capacités +25 %.",
  "r": 1,
  "c": "#5a7ae8",
  "g": "∞",
  "mods": {
   "skill": 0.25
  }
 },
 {
  "id": "herbe",
  "n": "Herbe Mental",
  "d": "Toutes les réactions +40 %.",
  "r": 2,
  "c": "#c7ef4a",
  "g": "✿",
  "mods": {
   "rx": 0.4
  }
 },
 {
  "id": "eclat",
  "n": "Pierre Éclat",
  "d": "Vaporisation et Fonte ×2,25 au lieu de ×1,75.",
  "r": 3,
  "c": "#ff9ad0",
  "g": "✦",
  "mods": {
   "amp": 0.5
  }
 },
 {
  "id": "poudre",
  "n": "Poudre Vive",
  "d": "Chaque combat commence avec +1 charge d'énergie.",
  "r": 1,
  "c": "#ffd890",
  "g": "∴",
  "mods": {
   "startPts": 1
  }
 },
 {
  "id": "grelot",
  "n": "Grelot Coque",
  "d": "Soigne 10 % des dégâts infligés.",
  "r": 2,
  "c": "#f0c8a0",
  "g": "♪",
  "mods": {
   "lifesteal": 0.1
  }
 },
 {
  "id": "amulette",
  "n": "Pièce Rune",
  "d": "₽ gagnés +50 %.",
  "r": 1,
  "c": "#f5c542",
  "g": "₽",
  "mods": {
   "gold": 0.5
  }
 },
 {
  "id": "multiexp",
  "n": "Multi Exp",
  "d": "Expérience +35 %.",
  "r": 1,
  "c": "#60c0a0",
  "g": "✚",
  "mods": {
   "xp": 0.35
  }
 },
 {
  "id": "casque",
  "n": "Casque Brut",
  "d": "Les ennemis qui frappent perdent 8 % de leurs PV max.",
  "r": 2,
  "c": "#9a8a7a",
  "g": "▲",
  "mods": {
   "helmet": 0.08
  }
 },
 {
  "id": "pendule",
  "n": "Pendule Stase",
  "d": "Les ultimes commencent chaque combat chargés à 50 % minimum.",
  "r": 3,
  "c": "#b48cff",
  "g": "◷",
  "mods": {
   "startCharge": 50
  }
 },
 {
  "id": "ruban",
  "n": "Ceinture Pro",
  "d": "Coups super efficaces ×2,4 au lieu de ×2.",
  "r": 2,
  "c": "#e8a03a",
  "g": "✕",
  "mods": {
   "superEff": 0.2
  }
 },
 {
  "id": "tempo",
  "n": "Grelot Tempo",
  "d": "Déclencher une réaction recharge l'ultime du lanceur de +15.",
  "r": 2,
  "c": "#ff70a0",
  "g": "⟳",
  "mods": {
   "rxCharge": 15
  }
 },
 {
  "id": "plume",
  "n": "Plume Vive",
  "d": "Au premier tour, toute l'équipe agit avant les ennemis.",
  "r": 2,
  "c": "#e8f0ff",
  "g": "❧",
  "mods": {
   "firstStrike": 1
  }
 },
 {
  "id": "bougie",
  "n": "Bougie Maudite",
  "d": "Attaques Spectre +25 %.",
  "r": 1,
  "c": "#735797",
  "g": "♆",
  "mods": {
   "type": {
    "Spectre": 0.25
   }
  }
 },
 {
  "id": "lunettesn",
  "n": "Lunettes Noires",
  "d": "Attaques Ténèbres +25 %.",
  "r": 1,
  "c": "#4a3a3e",
  "g": "◐",
  "mods": {
   "type": {
    "Ténèbres": 0.25
   }
  }
 },
 {
  "id": "dragon",
  "n": "Croc Dragon",
  "d": "Attaques Dragon +25 %.",
  "r": 1,
  "c": "#6f35fc",
  "g": "♦",
  "mods": {
   "type": {
    "Dragon": 0.25
   }
  }
 },
 {
  "id": "lanterne",
  "n": "Lanterne Citrouille",
  "d": "Au début de chaque combat, maudit tous les ennemis (3 tours).",
  "r": 3,
  "c": "#ff8a2a",
  "g": "☗",
  "mods": {
   "lantern": 1
  }
 },
 {
  "id": "cloche",
  "n": "Cloche Bouclier",
  "d": "Chaque combat commence avec un bouclier de 12 % des PV.",
  "r": 1,
  "c": "#8ab8e8",
  "g": "◖",
  "mods": {
   "startShield": 0.12
  }
 }
];
export const BOON = Object.fromEntries(BOONS.map((b) => [b.id, b]));
