// Sets d'expédition : un set = un thème, un légendaire, des Pokémon « sympa » et des faibles. Guide : CONTENU.md.
// Format : { id, name, color, arena, legend, nice: [...], weak: [...], order? }
//  · id : identifiant unique, sans espace (sert dans la sauvegarde : ne pas le renommer après coup) ;
//  · nice : au moins 1 ; weak : au moins autant que de combats « weak » dans le déroulé (3 par défaut) ;
//  · order (facultatif) : déroulé propre au set, sinon CONFIG.expedition.order ;
//  · une espèce n'apparaît que dans un seul set. Vérification : npm run check.
export default [
  {
    id: "abysses", arena: "underwater", name: "Abysses", color: "#3aa0ff",
    legend: "KYOGRE",
    nice: ["LAPRAS", "GYARADOS", "MILOTIC"],
    weak: ["MUDKIP", "SQUIRTLE", "WOOPER", "SWABLU"],
  },
  {
    id: "terres", arena: "volcano", name: "Terres brûlées", color: "#ff7a3a",
    legend: "GROUDON",
    nice: ["KROOKODILE", "FLYGON", "ARCANINE"],
    weak: ["TRAPINCH", "SANDILE", "SLUGMA", "SALANDIT"],
  },
  {
    id: "nuit", arena: "graveyard", name: "Nuit sans fin", color: "#8a5cff",
    legend: "DARKRAI",
    nice: ["GENGAR", "MIMIKYU", "CHANDELURE"],
    weak: ["LITWICK", "PUMPKABOO", "MURKROW", "KAKUNA"],
  },
  {
    id: "feerie", arena: "enchanted", name: "Féerie", color: "#ff7ad9",
    legend: "XERNEAS",
    nice: ["SYLVEON", "TOGEKISS", "RILLABOOM"],
    weak: ["RALTS", "CACNEA", "PANSAGE", "APPLIN"],
  },
  {
    id: "bosquet", arena: "forest", name: "Bosquet éternel", color: "#59db8c",
    legend: "CELEBI",
    nice: ["BRELOOM", "EXEGGUTOR", "BEAUTIFLY", "URSARING"],
    weak: ["SLAKOTH", "ROWLET", "DEERLING"],
  },
  {
    id: "fournaise", arena: "volcano", name: "Cœur de la fournaise", color: "#ff5232",
    legend: "HEATRAN",
    nice: ["CHARIZARD", "BLAZIKEN", "MAGMAR"],
    weak: ["CAMERUPT", "NIDOKING", "SCOLIPEDE"],
  },
  {
    id: "orage", arena: "storm", name: "Sanctuaire de l’orage", color: "#ffe24c",
    legend: "XURKITREE",
    nice: ["ELECTIVIRE", "KLANG", "MACHAMP"],
    weak: ["MAGNEMITE", "VOLTORB", "PLUSLE", "MINUN"],
  },
  {
    id: "esprit", arena: "psychic", name: "Palais de l’esprit", color: "#bb83ff",
    legend: "MEWTWO",
    nice: ["ALAKAZAM", "DRAGONITE", "BLISSEY"],
    weak: ["CLAYDOL", "KANGASKHAN", "WATCHOG", "HIPPOWDON"],
  },
  {
    id: "masques", arena: "sakura", name: "Jardin des masques", color: "#89df5b",
    legend: "OGERPON",
    nice: ["FLORGES", "RIBOMBEE", "GOURGEIST", "SABLEYE", "MISMAGIUS"],
    weak: ["STEENEE", "LILEEP", "CACTURNE", "DUSTOX", "BANETTE"],
  },
  {
    id: "cimes", arena: "snow", name: "Cimes célestes", color: "#64d8ed",
    legend: "RAYQUAZA",
    nice: ["NOIVERN", "ALTARIA", "SKARMORY", "AZUMARILL", "PELIPPER"],
    weak: ["NOIBAT", "EMOLGA", "STARAPTOR"],
  },
];
