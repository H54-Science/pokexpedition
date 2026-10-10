# Boucle de progression — notes d'implémentation

Code : `src/meta/` (logique pure, sans DOM). Dans le jeu : menu du hall (Expédition, Collection, Hall, Réglages), écrans dans `src/ui/runScreens.js` et `src/ui/metaScreens.js`. Page de debug sans 3D : `meta.html`. Tests : `tests/meta.test.js` (dans `npm test`).
Chiffres et difficultés : `src/meta/config.js`. Sets : `src/meta/sets.js`, édités à la main. Guide : `CONTENU.md` ; vérification : `npm run check`.
Taux de victoire indicatifs : `node tools/balance_meta.mjs [n]`.

## Ce qui est codé (boucle minimale viable)
Expéditions (vœux + matériaux) → run de capture (10 vœux) → un Pokémon gardé, reste en fragments / éclats → entraînement → élévation (+ évolution) → expéditions et runs plus hauts.

## Volontairement pas codé (reporté)
- **Buff « prochain adversaire = espèce choisie »** : pas codé.

## Expédition (mode unique, expéditions et vœux fusionnés)
- Difficultés : liste `CONFIG.difficulties` (par défaut I à V = adversaires niveau 20/40/60/80/100). Accès si **6 Pokémon** au moins ont ce niveau (`run.minRoster`).
- Puis choix du **set** ; 5 actes par défaut (faible, faible, sympa, faible, légendaire ; un set peut avoir son propre `order`) ; à chaque acte 1 à 3 Pokémon, chacun combat **3 fois** max par run.
- **Objets** : sac de départ (`CONFIG.items.start`, 2 Potions, 1 Élixir, 1 Total Soin), utilisables en combat pendant le tour d'un allié sans consommer le tour (1 par tour). Le reste est perdu en fin de run. Les combats simulés n'en utilisent pas.
- Départ gratuit (`expedition.cost`). Vœux gagnés à chaque acte gagné ; matériaux (P D ×2, P D-1 ×1) et bonus de premier clear si les 5 actes sont gagnés ; captures → on en garde une, le reste en fragments / éclats.
- **Bénédictions** (`src/meta/buffs.js`, réglages `buffs` dans config.js) : 1re carte offerte avant l'acte 1, puis 3 cartes à acheter en vœux après chaque acte gagné, 2 relances par run.
  Catalogue calculé pour chaque set : types offensifs super efficaces contre lui, les 3 réactions les plus adaptées (bonus si elles utilisent l'élément du légendaire : Floraison / Électrocharge / Catalyse contre Abysses), bénédictions générales, et de capture (prisme chromatique, appât légendaire +5 pts, bourse de vœux).
  Le moteur a un nouveau bonus par réaction (`rxOf`).
- Interface : `src/ui/runScreens.js` + `src/ui/run.css` (thème papier dans `src/ui/theatre.css`) ; images dans `src/ui/art.js`.
- Hall : décor seul avec caméra cinématique et menu à icônes ; jusqu'à 6 Pokémon exposés (réglage « Hall » ou bouton dans la Collection).

## Choix par défaut (à valider)
- **Départ** : 20 vœux et 6 Pokémon faibles niveau 20 (Gobou, Carapuce, Funécire, Pitrouille, Kraknoix, Tarsal), répartis dans les 4 sets.
- **Expédition** : 5 actes (faible, faible, sympa, faible, sympa) tirés dans tous les sets. Le légendaire n'apparaît que dans les runs de capture.
- **Niveau d'un Pokémon capturé** : min(niveau du run, 20).
- **Progression partagée** : la copie normale et la copie chromatique d'une espèce ont le même niveau, la même élévation et les mêmes étoiles (une seule fiche par espèce, comme le modèle de données demandé).
- **Pity par set** et non global. Il monte seulement quand le jet de capture est tenté (victoire contre le légendaire, niveau ≥ 30) et raté.
- **Défaite pendant un run** : le run s'arrête et on passe à la fin avec ce qui est acquis (captures, vœux des actes gagnés).
- **Sauvegarde v3** : migrations v1 → v2 (starters, plus d'équipe fixe) et v2 → v3 (run en cours abandonné).
- **Combats 1, 2, 4** : 3 faibles différents, tirés sans remise parmi les 4 du set.
- **Évolution** : seulement pour les lignées dont les deux modèles existent (Funécire→Lugulabre, Kraknoix→Libégon, Tylton→Altaria, Cacnea→Cacturne, Pitrouille→Banshitrouye, Mascaïman→Crocorible, Sonistrelle→Bruyverne). Avec 2 stades, l'évolution a lieu à l'élévation 1. L'espèce de la fiche reste la forme de base.
- **Élévation** : il faut être au plafond de niveau actuel. Coût : fragments du set de l'espèce + matériau de palier N.
- **Étoiles** : +4 % de stats par étoile (champ `bonus` du moteur), 5 au maximum.
- **Légendaire complet** (normal + chromatique) : la victoire donne 1 matériau P5.
- **Combat simulé** : frappe rythmée « bien » (q = 1) partout.
- **Sauvegarde** : clé `pokeimpact.meta.v1`, migrations dans `src/meta/save.js` (`MIGRATIONS[n]` passe de v n à v n+1).

## Ce que montrent les tests (joueur automatique, 400 étapes)
- Aucune impasse : la boucle progresse jusqu'aux 32 espèces et aux 4 légendaires.
- Mais c'est **trop rapide** : environ 200 runs suffisent pour tout compléter, car les expéditions D4-D5 rapportent beaucoup de vœux. À régler (vœux, coût du run, coûts d'élévation) une fois le temps réel d'un run mesuré.
- Les combats du moteur sont très binaires selon le niveau et la rareté : une équipe de faibles a environ 20 % de victoire contre un légendaire de même niveau, une équipe de « sympa » environ 90 %.
