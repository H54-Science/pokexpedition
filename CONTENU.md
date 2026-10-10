# Ajouter ou modifier du contenu

Tout le contenu éditable tient dans deux fichiers : `src/meta/sets.js` pour les sets, et `src/meta/config.js` pour les difficultés, les objets, les récompenses et la progression. Aucun autre fichier n'est à toucher pour un set ou une difficulté.

Après chaque modification, lance :

```
npm run check
```

La commande liste les sets et les difficultés, signale les erreurs (espèce inconnue, Pokémon présent dans deux sets, pas assez de faibles…) et les fichiers manquants (modèle 3D, sprite, texture chromatique). Le jeu fait la même vérification au chargement : en cas d'erreur, l'écran de chargement affiche la liste au lieu de lancer la partie.

## Ajouter ou modifier un set

Un set est une expédition thématique : un légendaire, des Pokémon « sympa » et des faibles. Exemple dans `src/meta/sets.js` :

```js
{
  id: "orage", name: "Ciel d'orage", color: "#f7d02c",
  legend: "XURKITREE",
  nice: ["ELECTIVIRE", "KLANG"],
  weak: ["MAGNEMITE", "VOLTORB", "PLUSLE", "MINUN"],
  order: ["weak", "nice", "weak", "nice", "legend"],   // facultatif
},
```

| Champ | Rôle |
|---|---|
| `id` | Identifiant unique, sans espace. Il est enregistré dans la sauvegarde (fragments, pity) : ne le renomme pas une fois des joueurs dessus. |
| `name` | Nom affiché. |
| `color` | Couleur d'accent : bordure de la carte du set et filtre de la collection. |
| `legend` | Le légendaire du dernier acte. |
| `nice` | Pokémon « sympa », au moins un. Pour chaque combat `nice`, l'un d'eux est tiré au hasard. |
| `weak` | Pokémon faibles. Ils sont tirés sans remise : il en faut au moins autant que de combats `weak` dans le déroulé. |
| `order` | Déroulé propre au set. Sans ce champ, c'est `CONFIG.expedition.order` (faible, faible, sympa, faible, légendaire). |

Règles :
- une espèce n'appartient qu'à un seul set, car ses fragments et son élévation dépendent de son set ;
- toutes les espèces doivent exister dans `src/data/data.js` ; pour une nouvelle espèce, voir plus bas ;
- les bénédictions du set (affinités de type, réactions) sont calculées automatiquement à partir des types de ses Pokémon ;
- un nouveau set apparaît tout de suite à l'écran de choix du set et dans la collection. Les sauvegardes existantes sont complétées automatiquement (fragments et pity à zéro).

Retirer un set : supprime son entrée. Les Pokémon déjà capturés restent dans la collection, mais ils ne peuvent plus être élevés ni recevoir d'étoiles tant qu'ils ne sont dans aucun set. Un run en cours sur ce set est abandonné au chargement.

## Ajouter ou modifier une difficulté

Dans `src/meta/config.js`, `difficulties` contient une ligne par difficulté, de la plus facile à la plus dure :

```js
{ name: "Découverte", level: 20, voeux: 2, buffScale: 1, color: "#5fd08a", icon: "leaf" },
```

| Champ | Rôle |
|---|---|
| `name` | Nom affiché (le numéro romain est ajouté automatiquement). |
| `level` | Niveau des adversaires. C'est aussi le niveau requis : il faut `run.minRoster` Pokémon (6) à ce niveau pour y accéder. |
| `voeux` | Vœux gagnés par combat gagné. |
| `buffScale` | Multiplicateur du prix des bénédictions (à garder proportionnel à `voeux`). |
| `color`, `icon` | Habillage de la carte. Icônes disponibles : `leaf`, `moon`, `sword`, `crown`, `star`, `book`, `flower`, `gear`. |
| `img` | Facultatif : illustration de la carte (`assets/ui/…png`). |

Un run complet à la difficulté n donne le matériau de palier n (×`matMain`) et n-1 (×`matPrev`), plus un bonus de premier clear. Les matériaux servent à l'élévation : l'élévation N coûte le matériau N. Si tu ajoutes une 6e difficulté, ses matériaux P6 n'ont pas d'usage tant que `elevation` n'a pas 6 paliers et `levelCaps` un plafond de plus.

Les autres réglages de l'expédition sont dans `expedition` : PV et puissance des adversaires par rôle (`foeHp`, `foePow`), taux chromatiques, capture du légendaire (`legend`, `pityStep`), fragments, coût de départ.

## Objets de combat

`CONFIG.items` :
- `start` : le sac donné au départ de chaque expédition, par exemple `{ potion: 2, elixir: 1, totalsoin: 1 }` ;
- `perTurn` : nombre d'objets utilisables par tour d'allié (un objet ne consomme pas le tour) ;
- `list` : le catalogue. Chaque objet a un `name`, une `desc`, une `color` et un effet `fx` :

| `fx` | Effet |
|---|---|
| `heal: 0.35` | soigne 35 % des PV max |
| `shield: 0.2` | bouclier de 20 % des PV max |
| `charge: 50` | +50 de jauge d'ultime |
| `pts: 2` | +2 charges d'énergie (pour l'équipe) |
| `cleanse: true` | retire les altérations |
| `target: "all"` | sur toute l'équipe (sinon l'allié le plus blessé) |

Les effets se combinent : `{ cleanse: true, heal: 0.1, target: "all" }`. Les objets non utilisés sont perdus à la fin du run. Les combats simulés (tests, page de debug) n'utilisent pas d'objets.

## Ajouter une nouvelle espèce

1. **Données de combat** : ajouter l'espèce dans `SPECIES` (`src/data/data.js`), sur le modèle des autres : nom français, types, rang (`tier` 1 à 4), statistiques de base, `basic`, `skill`, `ult`.
2. **Modèle 3D** : suivre « Regénérer ou ajouter des modèles » dans le README (`tools/sources.json` puis `tools/build_models.py`). Le modèle apparaît dans `models/index.json`, avec la texture chromatique si elle existe.
3. **Sprite** : déposer `assets/pokemon/<CLE>.png` (pixel art, fond transparent). Sans sprite, le jeu utilise un portrait rendu en 3D.
4. **Évolution** (facultatif) : `CONFIG.evolutions`, par exemple `TRAPINCH: ["FLYGON"]`. La forme évoluée doit aussi exister.
5. L'ajouter à un set, puis `npm run check`.

## Bénédictions

Les bénédictions communes (soin, énergie, bouclier…) et de capture sont dans `src/meta/buffs.js` (`GENERIC`, `CAPTURE`). Les prix et les probabilités par rareté sont dans `CONFIG.buffs`. Les affinités et les réactions propres à un set n'ont pas besoin d'être écrites : elles sont déduites des types du set.

## Ce qui ne demande pas de code

| Je veux… | Où |
|---|---|
| changer le sac de départ | `CONFIG.items.start` |
| rendre l'expédition payante | `CONFIG.expedition.cost` |
| changer les Pokémon de départ | `CONFIG.start.starters` |
| changer le nombre de Pokémon par combat ou de combats par Pokémon | `CONFIG.run.teamSize`, `CONFIG.run.uses` |
| changer le nombre de Pokémon requis par difficulté | `CONFIG.run.minRoster` |
| changer les coûts d'élévation ou d'étoiles | `CONFIG.elevation`, `CONFIG.stars` |
