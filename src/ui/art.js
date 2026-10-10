// Habillage des écrans de run : TOUTES les images sont déclarées ici.
// Pour habiller : déposer le PNG dans assets/ui/ et remplacer null par son chemin (ex. "assets/ui/diff-1.png").
// Tant qu'une entrée vaut null, l'écran utilise un dégradé de la couleur indiquée.
export const ART = {
  // fonds plein écran
  bg: { expedition: null, capture: null, choice: null },
  // cartes de difficulté (1 à 5) : illustration + couleur d'accent
  diff: [
    { img: null, color: "#5fd08a", name: "I" },
    { img: null, color: "#4fa8ff", name: "II" },
    { img: null, color: "#a46bff", name: "III" },
    { img: null, color: "#ff8a3d", name: "IV" },
    { img: null, color: "#ff4d6d", name: "V" },
  ],
  // bannières des sets (clé = id du set dans src/meta/sets.js)
  set: {
    abysses: { img: null, color: "#3aa0ff" },
    terres: { img: null, color: "#ff7a3a" },
    nuit: { img: null, color: "#8a5cff" },
    feerie: { img: null, color: "#ff7ad9" },
  },
  // icônes de rôle des adversaires sur le chemin des actes
  role: { weak: null, nice: null, legend: null },
  // portraits de Pokémon : "assets/ui/poke/<espece>.png" si présent dans cette liste, sinon rendu 3D automatique
  poke: {},
};

// Applique une image (si déclarée) en fond d'un élément, par-dessus un dégradé de secours.
export function paint(el, img, color = "#6a4fb0") {
  el.style.setProperty("--accent", color);
  if (img) el.style.backgroundImage = `url("${img}")`;
  return el;
}
