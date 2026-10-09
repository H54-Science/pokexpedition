# PokeImpact

Jeu 3D (navigateur PC + PWA mobile) en three.js. Le combat est inspiré de Honkai Star Rail et repris de Récolte. Les modèles viennent de Pixelmon, convertis en glTF.

## Jouer (prototype de combat, étape 1)
`index.html` : un combat 3D jouable sur PC. Les Pokémon actuels sont 4 alliés niveau 20 contre 3 ennemis niveau 28, dont un élite.

| Touche | Action |
|---|---|
| Q | Attaque (+1 énergie) |
| W / E / R | Capacités (1, 2 ou 3 énergies) |
| 1 à 4 | Ultime de l'allié n° (jauge pleine, ne coûte pas le tour) |
| ← → ou clic | Changer de cible |
| Espace ou clic | Frappe rythmée : quand l'anneau se referme, PARFAIT = +30 % de dégâts, PARADE = −55 % subis |
| A / X | Auto / vitesse ×2 |

Paramètres d'URL pour tester :
- `?team=CHARIZARD,LAPRAS,GENGAR,BLISSEY` et `&foes=MACHAMP,NIDOKING,ARCANINE` pour choisir les équipes
- `&lv=20&flv=28` pour les niveaux
- `?boss=GROUDON` pour un gardien en 2 phases avec renforts
- `&seed=123` pour rejouer exactement le même combat
- `&ult=1` pour commencer avec les ultimes chargés
- `&q=low` pour désactiver le bloom et les ombres

## Code
- `src/combat/engine.js` : **moteur de combat pur et déterministe**. Ce sont les règles de Récolte, sans affichage ni `Math.random`. Il renvoie des événements que la scène rejoue. Même graine + mêmes actions = même combat, ce qui le rend prêt pour le multijoueur (serveur ou hôte).
- `src/data/` : `data.js` et `moves.js`, repris de Récolte sans modification (83 espèces, capacités, réactions).
- `src/render/` : `stage.js` (scène three.js, arène, caméras, bloom), `fx.js` (particules, ondes, projectiles, rayons), `assets.js` (modèles, portraits).
- `src/game/director.js` : mise en scène (élans, impacts, ultimes) et commandes du joueur.
- `src/ui/hud.js` + `src/style.css` : interface HTML (frise des tours, plaques, cartes, actions, frappes rythmées).
- `src/core.js`, `src/audio.js` : horloge et tweens, sons générés (repris de Récolte).
- `tests/combat.test.js` : `npm test` lance 300 combats automatiques, vérifie le déterminisme, joue un gardien et fait combattre les 83 espèces.

## Modèles
- `models/` : 82 espèces de Récolte en `.glb` compressé (meshopt + WebP), 11 Mo au total
  - `models/index.json` : animations disponibles, taille, chromatique oui/non
  - `models/shiny/<espece>.webp` : texture chromatique, à appliquer sur le même maillage
- `viewer.html` : visualiseur de modèles (choix de l'espèce, de l'animation, chromatique)
- `tools/` : chaîne de conversion

## Regénérer ou ajouter des modèles
1. Extraire le jar Pixelmon (c'est un zip) hors du dépôt.
2. Ajouter l'espèce dans `tools/sources.json` (`"CLE": "<num>_<nom>/all/base/none"`).
3. Lancer :
   ```
   pip install numpy pillow
   python tools/build_models.py <jar_extrait>/assets/pixelmon/textures/pokemon [CLE ...]
   ```
   Il faut Node.js : `npx` installe `@gltf-transform/cli` au premier lancement.

`tools/batch.py` convertit tout le catalogue (1020 espèces, 487 Mo non compressé). Ne pas committer ce résultat.

## Format `.bmd` (Pixelmon 9.3.16)
C'est du SMD Valve en binaire big-endian. Le 1er octet vaut 1 (brut) ou 2 (flux XZ). Le fichier contient :
- les os : index, parent, nom en UTF-16 ;
- les images : os, position, Euler XYZ, de façon clairsemée (les animations ont nf+1 images) ;
- les triangles : liste des matériaux, puis par triangle un index de matériau et 3 sommets pondérés.

Le repère source est celui de Blender (Z en haut) ; la racine est tournée de −90° sur X.

## Points connus
- Images par seconde des animations : 24 supposé, pas vérifié.
- L'échelle varie selon l'espèce : il faut normaliser par la hauteur (c'est ce que fait le jeu, à partir de la taille réelle en jeu, champ `h` de `index.json`).
- La pose de liaison n'est pas jouable (Léviator est à l'horizontale, les lianes de Bulbizarre sont sorties) : toujours jouer une animation.
- Kakuna n'a pas d'animation : il lui faudra un mouvement procédural.
- Ogerpon n'a pas de modèle dans Pixelmon. Florges n'a pas de texture chromatique dans la forme utilisée (`red`).
