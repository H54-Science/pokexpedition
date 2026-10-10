# Images de l'interface

Les écrans de run (expéditions, vœux, préparation, choix final) lisent leurs images dans `src/ui/art.js`.
Déposer les PNG ici puis renseigner leur chemin dans `ART` :

| Entrée | Où elle apparaît | Taille conseillée |
|---|---|---|
| `bg.expedition`, `bg.capture`, `bg.choice` | fond plein écran | 1920×1080 |
| `img` d'une difficulté (`CONFIG.difficulties`, src/meta/config.js) | cartes de difficulté | 360×640 (portrait) |
| `role.weak / nice / legend` | icônes sur le chemin des actes | 64×64 |
| `poke.<ESPECE>` | portraits (sinon rendu 3D) | 256×256 |

Les couleurs (`color` des difficultés dans config.js, des sets dans sets.js) restent utilisées pour les liserés et les lueurs, même avec une image.

## Habillage poker gaming

`expedition-night.jpg` : décor japonais nocturne original généré pour cette interface (pixel art, torii, pagodes, cerisiers et lanternes, sans texte ni boutons intégrés). Version JPEG optimisée pour les menus.

`src/ui/gaming.css` applique les panneaux inclinés et les cartes poker aux écrans d'expédition. Les sprites viennent de `assets/pokemon`. L'encre rouge suit le type principal Feu, Fée, Combat, Électrik, Plante ou Dragon ; les autres types utilisent une encre noire. Les cadres sélectionnés sont bleus. Les portraits shiny du choix final conservent leur rendu existant.

<<<<<<< Updated upstream
## Bénédictions

`blessings/*.webp` : illustrations des cartes de bénédiction (pixel art), générées en une planche 4×4 avec gpt-image-2 (ElevenLabs) puis découpées en 300×180. Correspondance bénédiction → image : `BUFF_ART` dans `src/ui/runScreens.js` (les affinités de type et les réactions partagent une image par famille).
=======
## Logo et cadres colorés

`pokexpedition-logo.png` : logo extrait/reconstruit de la référence fournie par le propriétaire avec l’outil ImageGen intégré, PNG RGBA 2145 × 733 avec fond transparent. Il apparaît au chargement, dans le hall et dans les menus. Ne pas confondre le logo avec le bandeau « Expédition » adjacent dans la référence.

`src/ui/vivid.css` et `cardTheme()` dans `src/ui/theatre.js` appliquent une palette saturée selon le type principal de chaque Pokémon : cadres, emblèmes et bandeaux assortis, faces crème et encre rouge/noire conservées. La sélection garde une bordure cyan et son état accessible. La logique de jeu et les sauvegardes sont inchangées.

Prompt utilisé : “Extract the POKEXPÉDITION game logo in the upper-left corner of the supplied reference. Deliver only that logo as a clean high-resolution transparent PNG with actual alpha transparency, tightly framed with modest transparent margins. Preserve the exact spelling POKEXPÉDITION, the white and cyan italic beveled letters, thick navy outlines, purple electric glow, Pokéball on the left, icy crystal and mountain silhouette behind the word. Remove the adjacent EXPÉDITION banner, all scenery, cards, and all other interface elements. Faithfully match this logo's original proportions and gaming pixel-art aesthetic. No new text or background.”
>>>>>>> Stashed changes
