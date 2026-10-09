// Zones d'expédition (reprises des biomes de Récolte ; gardien remplacé si le modèle 3D manque).
export const ZONES = [
 {
  "id": "foret",
  "name": "Forêt Luxuriante",
  "event": null,
  "banner": "foret-luxuriante.jpg",
  "danger": 1,
  "boss": "CELEBI",
  "pool": [
   "SLAKOTH",
   "BRELOOM",
   "PANSAGE",
   "EXEGGUTOR",
   "APPLIN",
   "RILLABOOM",
   "ROWLET"
  ],
  "fav": [
   "Plante",
   "Psy",
   "Normal"
  ],
  "sky": [
   "#e8f0b8",
   "#d4e8a0",
   "#bcd88a",
   "#a4c876",
   "#8cb864"
  ],
  "ground": [
   "#7cb050",
   "#6ea046",
   "#60903e",
   "#548236"
  ]
 },
 {
  "id": "plage",
  "name": "Plage isolée",
  "event": null,
  "banner": "plage-isolee.jpg",
  "danger": 2,
  "boss": "KYOGRE",
  "pool": [
   "SQUIRTLE",
   "GYARADOS",
   "AZUMARILL",
   "MUDKIP",
   "PELIPPER",
   "MILOTIC",
   "WOOPER"
  ],
  "fav": [
   "Eau",
   "Vol",
   "Fée"
  ],
  "sky": [
   "#6ab8ec",
   "#86c8f0",
   "#a2d6f4",
   "#bee4f6",
   "#d8f0f8"
  ],
  "ground": [
   "#f2e0a8",
   "#ecd696",
   "#e4ca86",
   "#dcbe78"
  ]
 },
 {
  "id": "volcan",
  "name": "Grotte Volcanique",
  "event": null,
  "banner": "grotte-volcanique.jpg",
  "danger": 3,
  "boss": "HEATRAN",
  "pool": [
   "ARCANINE",
   "SLUGMA",
   "BLAZIKEN",
   "SALANDIT",
   "CAMERUPT",
   "MAGMAR"
  ],
  "fav": [
   "Feu",
   "Combat",
   "Poison"
  ],
  "sky": [
   "#1e0e12",
   "#2a1214",
   "#381816",
   "#4a2018",
   "#5c2a1a"
  ],
  "ground": [
   "#4a2a1e",
   "#3e2218",
   "#341c14",
   "#2a160f"
  ]
 },
 {
  "id": "desert",
  "name": "Canyon Ocre",
  "event": null,
  "banner": null,
  "danger": 4,
  "boss": "GROUDON",
  "pool": [
   "TRAPINCH",
   "SANDILE",
   "CACNEA",
   "HIPPOWDON",
   "CLAYDOL",
   "CACTURNE",
   "KROOKODILE",
   "FLYGON"
  ],
  "fav": [
   "Sol",
   "Ténèbres",
   "Plante"
  ],
  "sky": [
   "#f6b25a",
   "#f8c46a",
   "#fad27c",
   "#fbe090",
   "#fcecae"
  ],
  "ground": [
   "#e8b46a",
   "#dea45c",
   "#d29450",
   "#c48446"
  ]
 },
 {
  "id": "prairie",
  "name": "Prairie Féerique",
  "event": null,
  "banner": "prairie-feerique.jpg",
  "danger": 5,
  "boss": "XERNEAS",
  "pool": [
   "BLISSEY",
   "BEAUTIFLY",
   "RALTS",
   "FLORGES",
   "SYLVEON",
   "RIBOMBEE",
   "STEENEE"
  ],
  "fav": [
   "Fée",
   "Insecte",
   "Normal"
  ],
  "sky": [
   "#f6d4ec",
   "#eed4f6",
   "#e0d8fc",
   "#d6e2fc",
   "#d4ecf8"
  ],
  "ground": [
   "#b0e4a4",
   "#a0d896",
   "#90ca88",
   "#82bc7c"
  ]
 },
 {
  "id": "automne",
  "name": "Automne nuageux",
  "event": null,
  "banner": "automne-nuageux.jpg",
  "danger": 6,
  "boss": "URSARING",
  "pool": [
   "KAKUNA",
   "URSARING",
   "DUSTOX",
   "LILEEP",
   "BANETTE",
   "SCOLIPEDE",
   "DEERLING"
  ],
  "fav": [
   "Insecte",
   "Poison",
   "Plante"
  ],
  "sky": [
   "#9a96a2",
   "#aaa2a6",
   "#bcaea6",
   "#ccb8a2",
   "#dcc4a0"
  ],
  "ground": [
   "#c08e52",
   "#b07e46",
   "#a06e3c",
   "#8e6034"
  ]
 },
 {
  "id": "usine",
  "name": "Usine Clandestine",
  "event": null,
  "banner": "usine-clandestine.jpg",
  "danger": 7,
  "boss": "XURKITREE",
  "pool": [
   "MACHAMP",
   "MAGNEMITE",
   "VOLTORB",
   "PLUSLE",
   "MINUN",
   "ELECTIVIRE",
   "KLANG",
   "WATCHOG"
  ],
  "fav": [
   "Électrik",
   "Acier",
   "Combat"
  ],
  "sky": [
   "#1e222c",
   "#262b38",
   "#2e3444",
   "#363e50",
   "#3e485c"
  ],
  "ground": [
   "#4c5262",
   "#444a5a",
   "#3c4252",
   "#363b4a"
  ]
 },
 {
  "id": "ciel",
  "name": "Pics Orageux",
  "event": null,
  "banner": null,
  "danger": 8,
  "boss": "RAYQUAZA",
  "pool": [
   "SWABLU",
   "NOIBAT",
   "EMOLGA",
   "STARAPTOR",
   "SKARMORY",
   "ALTARIA",
   "NOIVERN",
   "TOGEKISS"
  ],
  "fav": [
   "Vol",
   "Dragon",
   "Normal"
  ],
  "sky": [
   "#2a4a8a",
   "#3a64a8",
   "#5282c4",
   "#76a4dc",
   "#a6c8ee"
  ],
  "ground": [
   "#9aa4b4",
   "#8a94a6",
   "#7a8498",
   "#6c768a"
  ]
 },
 {
  "id": "tour",
  "name": "Tour de Combat",
  "event": null,
  "banner": "tour-de-combat.jpg",
  "danger": 9,
  "boss": "MEWTWO",
  "pool": [
   "CHARIZARD",
   "NIDOKING",
   "DRAGONITE",
   "LAPRAS",
   "ALAKAZAM",
   "GENGAR",
   "KANGASKHAN"
  ],
  "fav": [
   "Vol",
   "Poison",
   "Psy"
  ],
  "sky": [
   "#0e1430",
   "#161e44",
   "#1e285a",
   "#283470",
   "#323e84"
  ],
  "ground": [
   "#cab494",
   "#bca484",
   "#ae9474",
   "#a08666"
  ]
 },
 {
  "id": "halloween",
  "name": "Nuit des Citrouilles",
  "event": "halloween",
  "banner": null,
  "danger": 2,
  "boss": "DARKRAI",
  "pool": [
   "PUMPKABOO",
   "LITWICK",
   "MURKROW",
   "SABLEYE",
   "MISMAGIUS",
   "GOURGEIST",
   "MIMIKYU",
   "CHANDELURE"
  ],
  "fav": [
   "Spectre",
   "Ténèbres",
   "Plante"
  ],
  "sky": [
   "#140a24",
   "#1e0e34",
   "#2a1446",
   "#3a1c58",
   "#4c2668"
  ],
  "ground": [
   "#2e2a3a",
   "#282434",
   "#221e2e",
   "#1c1828"
  ]
 }
];
export const ZONE = Object.fromEntries(ZONES.map((z) => [z.id, z]));
