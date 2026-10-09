# PokeImpact

Jeu 3D (navigateur PC + PWA mobile) en three.js. Le combat est inspiré de Honkai Star Rail et repris de Récolte. Les modèles viennent de Pixelmon, convertis en glTF.

## Jouer (prototype de combat raid)
`index.html` : combat 3D sur PC, **3 alliés contre 1 boss**. Par défaut : Dracaufeu, Lokhlass et Ectoplasma (N.20) contre Groudon.
Le niveau du boss dépend de sa rareté (légendaire −4, rare −3, peu commun +6, commun +8). Le boss a 12 fois plus de PV et 70 % de puissance, et enrage sous 50 % de PV.

| Touche | Action |
|---|---|
| Q | Attaque (+1 énergie) |
| E | Ouvrir / fermer les capacités, puis 1 à 3 pour choisir |
| U | Ultime de l'allié actif |
| 1 à 3 (menu fermé) ou clic sur une carte | Ultime de cet allié (jauge pleine, ne coûte pas le tour) |
| Échap | Fermer le menu des capacités |
| Espace ou clic | Frappe rythmée : arrêter le curseur de la jauge. Vert = excellent (+30 % de dégâts ou −55 % subis), jaune = bien, rouge = rien |
| A / X | Auto / vitesse ×2 |

Paramètres d'URL :
- `?team=CHARIZARD,LAPRAS,GENGAR` pour l'équipe
- `&boss=GYARADOS` pour le boss
- `&lv=20` pour le niveau de l'équipe
- `&flv=16` pour forcer le niveau du boss
- `&hp=12&pow=0.7` pour les PV et la puissance du boss
- `&seed=123` pour rejouer le même combat
- `&ult=1` pour commencer avec les ultimes chargés
- `&q=low` pour la qualité réduite

## Code
- `src/combat/engine.js` : **moteur de combat pur et déterministe**. Ce sont les règles de Récolte, sans affichage ni `Math.random`. Il renvoie des événements que la scène rejoue. Même graine + mêmes actions = même combat, ce qui le rend prêt pour le multijoueur (serveur ou hôte).
- `src/data/` : `data.js` et `moves.js`, repris de Récolte sans modification (83 espèces, capacités, réactions).
- `src/render/` : `stage.js` (scène three.js, arène, caméras, bloom), `fx.js` (particules, ondes, projectiles, rayons), `assets.js` (modèles, portraits).
- `src/game/director.js` : mise en scène (élans, impacts, ultimes) et commandes du joueur.
- `src/ui/hud.js` + `src/style.css` : interface de raid (barre du boss et son intention, frise, cartes d'équipe, pile de commandes Ultime / Objets / Capacités / Attaque, énergie, frappes rythmées). Polices : Pixelify Sans et Nunito (`fonts/`).
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
