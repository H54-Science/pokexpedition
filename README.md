# PokeImpact

Jeu 3D (navigateur PC + PWA mobile) en three.js. Le combat est inspiré de Honkai Star Rail et repris de Récolte. Les modèles viennent de Pixelmon, convertis en glTF.

## Jouer
`index.html` s'ouvre sur le **hall** (lobby 3D) : un théâtre-bibliothèque où l'on se déplace avec son dresseur et son Pokémon partenaire.
- Commandes : ZQSD ou flèches pour se déplacer, Maj pour courir, Espace pour sauter (on peut monter sur la scène d'un bond), glisser la souris pour la caméra, molette pour le zoom, F (ou E / Entrée, ou clic sur l'étiquette) pour interagir.
- Stations :
  - la **scène** ouvre les expéditions ;
  - **Garde-robe** : tenue du dresseur (skins de PNJ Pixelmon) ;
  - **Partenaire** : Pokémon qui suit le dresseur ;
  - **Entraînement** : combat rapide ;
  - **Vœux** (gacha) et **Coop** : à venir.
- Code : `src/lobby/lobby.js` (salle, caméra, collisions, stations) et `src/lobby/trainer.js` (dresseur en boîtes texturées par un skin 64×64, marche procédurale). Pendant le lobby, `Stage` délègue son rendu via `stage.override`.
- Modèle : `models/lobby/hall.glb`, construit par script dans Blender (fichier source `hall.blend` hors dépôt), exporté puis compressé avec `gltf-transform optimize --compress meshopt --texture-compress webp`. Les lumières sont recréées dans three.js et ne viennent pas du .glb.

Depuis le hall, **expédition** (choix de la zone et de la difficulté → troupe de 6 à 10 Pokémon → actes) ou **combat rapide**.

### Expédition (inspirée du Théâtre de Genshin) — `src/game/run.js`, logique pure et déterministe
- Difficulté : Facile (6 actes), Normal (7), Difficile (8), Infini (sans fin, record enregistré). Le gardien de la zone est au dernier acte, et deux « adversaires principaux » arrivent vers 40 % et 70 % du parcours.
- À chaque acte, des cartes d'incident : 2 combats (normal ou difficile), ou le combat clé, et 2 incidents de boutique payés en fleurs ✿ :
  - recrue d'un type : un Pokémon rejoint la troupe ;
  - bénédiction : 1 au choix parmi 3, reprises des reliques de Récolte ;
  - entracte : +1 vigueur à toute la troupe.
- 2 relances des incidents par expédition.
- Combat : on choisit 3 Pokémon de la troupe (1 = gauche, 2 = centre, 3 = droite). Chacun perd 1 vigueur, sur 4 au départ. Les PV sont restaurés à chaque combat et les adversaires montent d'acte en acte.
- Types favorisés de la zone : +15 % de stats. Bénédiction offerte après un adversaire principal.
- Défaite : on retente tant qu'il reste des rappels (3, 2 ou 1 selon la difficulté).
- Sauvegarde automatique dans le navigateur : l'expédition peut être reprise, et chaque victoire débloque la zone suivante.
- `npm test` simule aussi des expéditions complètes avec un joueur automatique. Taux de victoire : Facile ~97 %, Normal ~73 %, Difficile ~10 %.

### Combat
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
- `?quick=1` lance directement un combat rapide ; ensuite `&team=CHARIZARD,LAPRAS,GENGAR` pour l'équipe
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
