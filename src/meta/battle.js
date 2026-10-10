// Combat simulé avec le moteur existant (règles inchangées) : l'équipe du joueur contre un boss de raid.
import { Combat } from "../combat/engine.js";
import { CONFIG } from "./config.js";
import { formOf } from "./state.js";

// Alliés du moteur à partir de l'équipe (forme évoluée, niveau, bonus d'étoiles).
export function alliesOf(save, team) {
  return team.filter((k) => save.coll[k]).map((k) => {
    const e = save.coll[k];
    return { k: formOf(k, e.elev), L: e.L, bonus: e.stars * CONFIG.stars.bonusPerStar };
  });
}

// Configuration du moteur (même format que la scène 3D / Director).
export function combatConfig({ seed, allies, foe, mods = [] }) {
  return { seed, allies, enemies: [{ k: foe.k, L: foe.L, boss: true }], pool: [], bossHp: foe.hp, bossPow: foe.pow, mods };
}

// foe : { k, L, hp, pow } ; renvoie { win, turns }
export function simulate({ seed, allies, foe, mods = [], q = CONFIG.simQuality }) {
  const b = new Combat(combatConfig({ seed, allies, foe, mods }));
  b.begin();
  let g = 0;
  while (!b.over && g++ < 600) {
    const t = b.nextTurn();
    if (!t.skipped) {
      const u = b.unit(t.actor);
      if (u.side === "ally") {
        for (const a of b.living("ally")) if (b.canUlt(a.id)) b.ult(a.id, { target: b.living("enemy")[0]?.id, q });
        if (!b.over && u.alive) { const p = b.autoPlan(u); if (p) b.act(u.id, { ...p, q }); }
      } else b.enemyAct({ q });
    }
    b.endTurn();
  }
  return { win: !!(b.over && b.win), turns: g };
}
