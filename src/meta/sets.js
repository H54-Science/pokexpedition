// Sets d'expédition : un set = un thème, un légendaire, des Pokémon « sympa » et des faibles. Guide : CONTENU.md.
// Format : { id, name, color, legend, nice: [...], weak: [...], order? }
//  · id : identifiant unique, sans espace (sert dans la sauvegarde : ne pas le renommer après coup) ;
//  · nice : au moins 1 ; weak : au moins autant que de combats « weak » dans le déroulé (3 par défaut) ;
//  · order (facultatif) : déroulé propre au set, sinon CONFIG.expedition.order ;
//  · une espèce n'apparaît que dans un seul set. Vérification : npm run check.
export default [
  {
    id: "abysses", name: "Abysses", color: "#3aa0ff",
    legend: "KYOGRE",
    nice: ["LAPRAS", "GYARADOS", "MILOTIC"],
    weak: ["MUDKIP", "SQUIRTLE", "WOOPER", "SWABLU"],
  },
  {
    id: "terres", name: "Terres brûlées", color: "#ff7a3a",
    legend: "GROUDON",
    nice: ["KROOKODILE", "FLYGON", "ARCANINE"],
    weak: ["TRAPINCH", "SANDILE", "SLUGMA", "SALANDIT"],
  },
  {
    id: "nuit", name: "Nuit sans fin", color: "#8a5cff",
    legend: "DARKRAI",
    nice: ["GENGAR", "MIMIKYU", "CHANDELURE"],
    weak: ["LITWICK", "PUMPKABOO", "MURKROW", "KAKUNA"],
  },
  {
    id: "feerie", name: "Féerie", color: "#ff7ad9",
    legend: "XERNEAS",
    nice: ["SYLVEON", "TOGEKISS", "RILLABOOM"],
    weak: ["RALTS", "CACNEA", "PANSAGE", "APPLIN"],
  },
];
