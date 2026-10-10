import { SPECIES } from "../data/data.js";
// Habillage des écrans de run : TOUTES les images sont déclarées ici.
// Pour habiller : déposer le PNG dans assets/ui/ et remplacer null par son chemin (ex. "assets/ui/diff-1.png").
// Tant qu'une entrée vaut null, l'écran utilise un dégradé de la couleur indiquée.
export const ART = {
  // fonds plein écran
  bg: { expedition: null, capture: null, choice: null },
  // Couleurs, noms et icônes des difficultés : CONFIG.difficulties (src/meta/config.js), champ `img` facultatif.
  // Couleurs des sets : champ `color` dans src/meta/sets.js (la carte du set montre le légendaire).
  // icônes de rôle des adversaires sur le chemin des actes
  role: { weak: null, nice: null, legend: null },
  // portraits de Pokémon : "assets/ui/poke/<espece>.png" si présent dans cette liste, sinon rendu 3D automatique
  poke: Object.fromEntries(Object.keys(SPECIES).map(k => [k, `assets/pokemon/${k}.png`])),
};

// Applique une image (si déclarée) en fond d'un élément, par-dessus un dégradé de secours.
export function paint(el, img, color = "#6a4fb0") {
  el.style.setProperty("--accent", color);
  if (img) el.style.backgroundImage = `url("${img}")`;
  return el;
}
