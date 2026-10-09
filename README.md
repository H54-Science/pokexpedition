# PokeImpact

Jeu 3D (navigateur PC + PWA mobile) en three.js. Le combat est inspiré de Honkai Star Rail et repris de Récolte. Les modèles viennent de Pixelmon, convertis en glTF.

## Contenu
- `models/` : 82 espèces de Récolte en `.glb` compressé (meshopt + WebP), 11 Mo au total
  - `models/index.json` : animations disponibles, taille, chromatique oui/non
  - `models/shiny/<espece>.webp` : texture chromatique, à appliquer sur le même maillage
- `viewer.html` : visualiseur (choix de l'espèce, de l'animation, chromatique)
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
- L'échelle varie selon l'espèce : il faut normaliser par la hauteur (c'est ce que fait `viewer.html`).
- La pose de liaison n'est pas jouable (Léviator est à l'horizontale, les lianes de Bulbizarre sont sorties) : toujours jouer une animation.
- Kakuna n'a pas d'animation : il lui faudra un mouvement procédural.
- Ogerpon n'a pas de modèle dans Pixelmon. Florges n'a pas de texture chromatique dans la forme utilisée (`red`).
