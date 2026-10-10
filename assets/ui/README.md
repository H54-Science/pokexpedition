# Images de l'interface

Les écrans de run (expéditions, vœux, préparation, choix final) lisent leurs images dans `src/ui/art.js`.
Déposer les PNG ici puis renseigner leur chemin dans `ART` :

| Entrée | Où elle apparaît | Taille conseillée |
|---|---|---|
| `bg.expedition`, `bg.capture`, `bg.choice` | fond plein écran | 1920×1080 |
| `diff[0..4].img` | cartes de difficulté I à V | 360×640 (portrait) |
| `set.<id>.img` | bannières des sets | 480×720 (portrait) |
| `role.weak / nice / legend` | icônes sur le chemin des actes | 64×64 |
| `poke.<ESPECE>` | portraits (sinon rendu 3D) | 256×256 |

Les couleurs `color` restent utilisées pour les liserés et les lueurs, même avec une image.
