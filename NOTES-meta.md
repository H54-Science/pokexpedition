# Boucle de progression — notes d'implémentation

Code : `src/meta/` (logique pure, sans DOM). Dans le jeu : stations du hall (Expéditions, Vœux = runs de capture, Collection, Entraînement), écrans dans `src/ui/metaScreens.js`. Page de debug sans 3D : `meta.html`. Tests : `tests/meta.test.js` (dans `npm test`).
Chiffres : `src/meta/config.js`. Sets : `src/meta/sets.js`, générés par `node tools/gen_sets.mjs` puis à corriger à la main.
Taux de victoire indicatifs : `node tools/balance_meta.mjs [n]`.

## Ce qui est codé (boucle minimale viable)
Expéditions (vœux + matériaux) → run de capture (10 vœux) → un Pokémon gardé, reste en fragments / éclats → entraînement → élévation (+ évolution) → expéditions et runs plus hauts.

## Volontairement pas codé (reporté)
- **Cartes de buffs et monnaie de run** (3 cartes, relances, achats). La boucle tient sans : le pity sert de levier sur le légendaire. À ajouter quand le run aura un rendu ; les buffs de combat pourront passer par `mods` du moteur, qui existe déjà.
- **Buff « prochain adversaire = espèce choisie »** et **buffs d'économie** : idem.

## Runs (expéditions et vœux) — règles actuelles
- Difficulté I à V = adversaires niveau 20/40/60/80/100. Accès si **6 Pokémon** au moins ont ce niveau (`run.minRoster`).
- 5 actes ; à chaque acte on choisit 1 à 3 Pokémon parmi ceux au niveau ; chacun combat **3 fois** max par run (`run.uses`).
- Expédition : vœux à chaque acte gagné ; matériaux (P D ×2, P D-1 ×1) et bonus de premier clear seulement pour un run complet.
- Vœux (capture) : difficulté puis set ; le niveau du run = niveau de la difficulté (le légendaire n'est capturable qu'à partir de la difficulté II).
- Interface : `src/ui/runScreens.js` + `src/ui/run.css` ; toutes les images à fournir sont déclarées dans `src/ui/art.js` (voir `assets/ui/README.md`).

## Choix par défaut (à valider)
- **Départ** : 20 vœux et 6 Pokémon faibles niveau 20 (Gobou, Carapuce, Funécire, Pitrouille, Kraknoix, Tarsal), répartis dans les 4 sets.
- **Expédition** : 5 actes (faible, faible, sympa, faible, sympa) tirés dans tous les sets. Le légendaire n'apparaît que dans les runs de capture.
- **Niveau d'un Pokémon capturé** : min(niveau du run, 20).
- **Progression partagée** : la copie normale et la copie chromatique d'une espèce ont le même niveau, la même élévation et les mêmes étoiles (une seule fiche par espèce, comme le modèle de données demandé).
- **Pity par set** et non global. Il monte seulement quand le jet de capture est tenté (victoire contre le légendaire, niveau ≥ 30) et raté.
- **Défaite pendant un run** : le run s'arrête et on passe à la fin avec ce qui est acquis (captures, vœux des actes gagnés).
- **Sauvegarde v2** : migration depuis v1 (ajoute les starters manquants, supprime l'équipe fixe et le run en cours).
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
