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
