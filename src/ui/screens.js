// Écrans d'expédition (volontairement simples : l'habillage viendra plus tard).
import { h } from "../core.js";
import { SPECIES, TYPES, TYPE_COLOR, fr } from "../data/data.js";
import { ZONES, ZONE } from "../data/zones.js";
import { BOON } from "../data/boons.js";
import { DIFF, TROUPE_MIN, TROUPE_MAX, VIGOR, isKeyAct, isFinal, favored } from "../game/run.js";

const tchip = (t) => h("span", { class: "s-t", style: { background: TYPE_COLOR[t] } }, t);
const vig = (n) => h("span", { class: "s-vig" }, "●".repeat(n) + "○".repeat(Math.max(0, VIGOR - n)));

export class Screens {
  constructor(root) { this.root = root; }
  show(...kids) { this.root.innerHTML = ""; this.root.append(...kids); this.root.style.display = ""; }
  hide() { this.root.style.display = "none"; this.root.innerHTML = ""; }

  // ───────── accueil ─────────
  hub({ hasRun, best, onNew, onResume, onQuick }) {
    this.show(h("div", { class: "s-box s-center" },
      h("h1", null, "POKEIMPACT"),
      h("p", null, "Théâtre des expéditions"),
      hasRun ? h("button", { class: "s-btn main", onclick: onResume }, "Reprendre l'expédition") : null,
      h("button", { class: "s-btn" + (hasRun ? "" : " main"), onclick: onNew }, "Nouvelle expédition"),
      h("button", { class: "s-btn", onclick: onQuick }, "Combat rapide (test)"),
      best ? h("p", { class: "s-mute" }, `Record en mode infini : ${best} combats`) : null));
  }

  // ───────── zone + difficulté ─────────
  zone({ unlocked, onPick, onBack }) {
    let zone = ZONES[0].id, diff = "normal";
    const detail = h("div", { class: "s-panel" });
    const render = () => {
      const z = ZONE[zone], D = DIFF[diff];
      detail.innerHTML = "";
      detail.append(
        h("h2", null, z.name),
        h("p", null, isFinite(D.acts) ? `${D.acts} actes, gardien au dernier : ${fr(z.boss)}` : "Actes sans fin, difficulté croissante"),
        h("p", null, "Types favorisés (+15 % de stats) : ", ...z.fav.map(tchip)),
        h("p", { class: "s-mute" }, "Pokémon de la zone : " + z.pool.map(fr).join(", ")),
        h("div", { class: "s-row" }, ...Object.keys(DIFF).map((d) => h("button", { class: "s-btn" + (d === diff ? " on" : ""), onclick: () => { diff = d; render(); } }, DIFF[d].name))),
        h("p", { class: "s-mute" }, `Rappels (retentatives après défaite) : ${D.encores}`),
        h("div", { class: "s-row" }, h("button", { class: "s-btn", onclick: onBack }, "Retour"), h("button", { class: "s-btn main", onclick: () => onPick(zone, diff) }, "Choisir la troupe →")));
    };
    const list = h("div", { class: "s-list" }, ...ZONES.map((z, i) => {
      const lock = !z.event && i >= unlocked;
      return h("button", { class: "s-item" + (lock ? " lock" : ""), disabled: lock, onclick: () => { zone = z.id; render(); } },
        h("b", null, (lock ? "🔒 " : "") + z.name), h("small", null, " · gardien " + fr(z.boss)));
    }));
    render();
    this.show(h("div", { class: "s-box" }, h("h1", null, "Choisir la zone"), h("div", { class: "s-cols" }, list, detail)));
  }

  // ───────── troupe ─────────
  troupe({ zone, available, onStart, onBack, preset = [] }) {
    const z = ZONE[zone];
    const sel = new Set(preset);
    let filter = null;
    const grid = h("div", { class: "s-grid" }), side = h("div", { class: "s-panel" });
    const keys = Object.keys(SPECIES).filter(available);
    const render = () => {
      grid.innerHTML = "";
      for (const k of keys) {
        if (filter && !SPECIES[k].t.includes(filter)) continue;
        const fav = SPECIES[k].t.some((t) => z.fav.includes(t));
        grid.appendChild(h("button", { class: "s-poke" + (sel.has(k) ? " on" : "") + (fav ? " fav" : ""), onclick: () => { if (sel.has(k)) sel.delete(k); else if (sel.size < TROUPE_MAX) sel.add(k); render(); } },
          h("b", null, fr(k)), h("div", null, ...SPECIES[k].t.map(tchip)), h("small", null, "★".repeat(SPECIES[k].tier) + (fav ? " · favorisé" : ""))));
      }
      side.innerHTML = "";
      side.append(
        h("h2", null, `Troupe ${sel.size}/${TROUPE_MAX}`),
        h("p", { class: "s-mute" }, `Au moins ${TROUPE_MIN}. Chaque Pokémon a ${VIGOR} vigueur : un combat en coûte 1.`),
        h("div", { class: "s-sel" }, ...[...sel].map((k) => h("span", { class: "s-chip" }, fr(k)))),
        h("p", null, "Favorisés : ", ...z.fav.map(tchip)),
        h("div", { class: "s-row" },
          h("button", { class: "s-btn", onclick: onBack }, "Retour"),
          h("button", { class: "s-btn", onclick: () => { sel.clear(); const favs = keys.filter((k) => SPECIES[k].t.some((t) => z.fav.includes(t))).sort((a, b) => SPECIES[b].tier - SPECIES[a].tier); [...favs, ...keys].forEach((k) => sel.size < 8 && sel.add(k)); render(); } }, "Sélection auto"),
          h("button", { class: "s-btn main", disabled: sel.size < TROUPE_MIN, onclick: () => onStart([...sel]) }, "Lancer l'expédition →")));
    };
    const filters = h("div", { class: "s-row wrap" }, h("button", { class: "s-btn sm", onclick: () => { filter = null; render(); } }, "Tous"), ...TYPES.map((t) => h("button", { class: "s-btn sm", style: { borderColor: TYPE_COLOR[t] }, onclick: () => { filter = t; render(); } }, t)));
    render();
    this.show(h("div", { class: "s-box" }, h("h1", null, "Troupe — " + z.name), filters, h("div", { class: "s-cols" }, grid, side)));
  }

  // ───────── acte (cartes d'incident) ─────────
  act({ state, onCard, onReroll, onQuit }) {
    const z = ZONE[state.zone], D = DIFF[state.diff];
    const path = [];
    const n = isFinite(state.nActs) ? state.nActs : state.act + 3;
    for (let a = 1; a <= n; a++) path.push(h("span", { class: "s-step" + (a === state.act ? " now" : a < state.act ? " done" : "") + (isKeyAct(state, a) ? " key" : "") },
      state.keys[a] ? fr(state.keys[a]) : isKeyAct(state, a) ? "Clé" : String(a)));
    const card = (c, i) => {
      const done = state.bought.includes(i);
      if (c.kind === "combat") {
        const lbl = { normal: "Combat : normal", hard: "Combat : difficile", key: "Adversaire principal", final: "Gardien de la zone" }[c.tier];
        return h("button", { class: "s-card combat " + c.tier, onclick: () => onCard(i) },
          h("small", null, lbl), h("b", null, fr(c.foe.k)), h("div", null, ...SPECIES[c.foe.k].t.map(tchip)),
          h("p", null, `N.${c.foe.L} · PV ×${c.foe.hp}`), h("p", { class: "s-gain" }, `+${c.reward} ✿`));
      }
      const t = { recruit: `Recrue : ${c.type}`, boon: "Bénédiction", rest: "Entracte" }[c.kind];
      const d = { recruit: c.got ? `${fr(c.got)} rejoint la troupe !` : `Un Pokémon ${c.type} rejoint la troupe.`, boon: "Choisis 1 bénédiction parmi 3.", rest: "+1 vigueur à toute la troupe." }[c.kind];
      return h("button", { class: "s-card shop" + (done ? " done" : ""), disabled: done || state.fleurs < c.cost, onclick: () => onCard(i) },
        h("small", null, done ? "Acheté" : "Incident"), h("b", null, t), h("p", null, d), h("p", { class: "s-cost" }, `−${c.cost} ✿`));
    };
    this.show(h("div", { class: "s-box" },
      h("div", { class: "s-top" },
        h("h1", null, `${z.name} — Acte ${state.act}${isFinite(state.nActs) ? "/" + state.nActs : ""}`),
        h("span", { class: "s-res" }, `✿ ${state.fleurs}`), h("span", { class: "s-res" }, `Rappels ${state.encores}`), h("span", { class: "s-res" }, D.name)),
      h("div", { class: "s-path" }, ...path),
      h("div", { class: "s-cards" }, ...state.cards.map(card)),
      h("div", { class: "s-cols" },
        h("div", { class: "s-panel" }, h("h2", null, "Troupe"), h("div", { class: "s-tr" }, ...state.troupe.map((t) => h("div", { class: "s-trp" + (t.vig ? "" : " out") }, h("b", null, fr(t.k)), vig(t.vig), favored(state, t.k) ? h("small", null, " favorisé") : null)))),
        h("div", { class: "s-panel" }, h("h2", null, `Bénédictions (${state.boons.length})`), ...state.boons.map((id) => h("p", null, h("b", null, BOON[id].g + " " + BOON[id].n), " — ", BOON[id].d)))),
      h("div", { class: "s-row" },
        h("button", { class: "s-btn", onclick: onQuit }, "Abandonner"),
        h("button", { class: "s-btn", disabled: state.rerolls <= 0, onclick: onReroll }, `Relancer les incidents (${state.rerolls})`))));
  }

  // ───────── choix de bénédiction ─────────
  boon({ ids, onPick, onSkip }) {
    this.show(h("div", { class: "s-box s-center" },
      h("h1", null, "Bénédiction"),
      h("div", { class: "s-cards" }, ...ids.map((id) => { const b = BOON[id]; return h("button", { class: "s-card shop", style: { borderColor: b.c }, onclick: () => onPick(id) }, h("b", null, b.g + " " + b.n), h("p", null, b.d)); })),
      h("button", { class: "s-btn", onclick: onSkip }, "Passer")));
  }

  // ───────── équipe du combat (3 parmi la troupe) ─────────
  team({ state, card, onGo, onBack, last = [] }) {
    const sel = [];
    for (const k of last) if (sel.length < 3 && state.troupe.some((t) => t.k === k && t.vig > 0)) sel.push(k);
    for (const t of [...state.troupe].sort((x, y) => y.vig - x.vig)) if (sel.length < 3 && t.vig > 0 && !sel.includes(t.k)) sel.push(t.k);
    const foe = card.foe;
    const body = h("div", { class: "s-grid" }), side = h("div", { class: "s-panel" });
    const render = () => {
      body.innerHTML = "";
      for (const t of state.troupe) {
        const on = sel.includes(t.k);
        body.appendChild(h("button", { class: "s-poke" + (on ? " on" : "") + (t.vig ? "" : " out"), disabled: !t.vig, onclick: () => { if (on) sel.splice(sel.indexOf(t.k), 1); else if (sel.length < 3) sel.push(t.k); render(); } },
          h("b", null, (on ? sel.indexOf(t.k) + 1 + ". " : "") + fr(t.k)), h("div", null, ...SPECIES[t.k].t.map(tchip)), vig(t.vig)));
      }
      side.innerHTML = "";
      side.append(
        h("h2", null, "Adversaire : " + fr(foe.k)), h("div", null, ...SPECIES[foe.k].t.map(tchip)), h("p", null, `N.${foe.L} · PV ×${foe.hp}`),
        h("p", { class: "s-mute" }, "Ordre : 1 = gauche, 2 = centre, 3 = droite."),
        h("div", { class: "s-row" }, h("button", { class: "s-btn", onclick: onBack }, "Retour"),
          h("button", { class: "s-btn main", disabled: !sel.length, onclick: () => onGo(sel.slice()) }, `Combattre (${sel.length}/3) →`)));
    };
    render();
    this.show(h("div", { class: "s-box" }, h("h1", null, "Choisir 3 Pokémon"), h("div", { class: "s-cols" }, body, side)));
  }

  // ───────── fin de combat / d'expédition ─────────
  message({ title, lines = [], btn = "Continuer", onOk }) {
    this.show(h("div", { class: "s-box s-center" }, h("h1", null, title), ...lines.map((l) => h("p", null, l)), h("button", { class: "s-btn main", onclick: onOk }, btn)));
  }
  loading(text) { this.show(h("div", { class: "s-box s-center" }, h("h1", null, text))); }
}
