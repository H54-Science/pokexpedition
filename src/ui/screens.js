// Présentation du Théâtre : la logique et les sauvegardes restent dans game/run.js.
import { h } from "../core.js";
import { SPECIES, TYPES, TYPE_COLOR, fr } from "../data/data.js";
import { ZONES, ZONE } from "../data/zones.js";
import { BOON } from "../data/boons.js";
import { DIFF, TROUPE_MIN, TROUPE_MAX, VIGOR, isKeyAct } from "../game/run.js";
import { icon, sprite, eyebrow, action, shell, landing, scenery, encounterArt, stat, badge } from "./theatre.js";

const tchip = (t) => h("span", { class: "s-t", style: { background: TYPE_COLOR[t] } }, t);
const vig = (n) => h("span", { class: "ex-vigor", "aria-label": `${n} vigueur sur ${VIGOR}` }, ...Array.from({ length: VIGOR }, (_, i) => h("i", { class: i < n ? "full" : "" })));
const artKind = (z) => ({ foret: "forest", plage: "water", volcan: "fire", desert: "fire", prairie: "rest", automne: "rest", ciel: "water" }[z] || "night");
const diffIcon = { facile: "leaf", normal: "moon", difficile: "crown", infini: "star" };
const difficultyCard = (key, selected, pick) => h("button", { class: "ex-difficulty" + (selected ? " selected" : ""), "aria-pressed": String(selected), onclick: pick }, h("span", null, h("small", null, "REPRÉSENTATION"), h("b", null, DIFF[key].name), h("em", null, isFinite(DIFF[key].acts) ? `${DIFF[key].acts} actes` : "Sans limite")), icon(diffIcon[key]));

export class Screens {
  constructor(root) { this.root = root; }
  show(...kids) { this.root.innerHTML = ""; this.root.classList.toggle("theatre-mode", kids.some(k => k?.classList?.contains("ex-screen"))); this.root.append(...kids); this.root.style.display = ""; }
  hide() { this.root.style.display = "none"; this.root.innerHTML = ""; this.root.classList.remove("theatre-mode"); }

  welcome({ hasRun, onPrepare, onBack }) {
    this.show(landing({ title: "Le Théâtre\ndes expéditions", subtitle: "Choisis ta difficulté, rassemble tes partenaires et écris le prochain chapitre de votre aventure.", primary: { label: hasRun ? "Reprendre l'aventure" : "Préparer une expédition", fn: onPrepare }, back: onBack }));
  }

  hub({ hasRun, best, onNew, onResume, onQuick, onBack }) {
    this.show(landing({ title: "Le Théâtre\ndes expéditions", subtitle: "Compose ta troupe, choisis ton destin. Derrière chaque carte, une nouvelle histoire attend ses héros.", primary: { label: "Préparer une représentation", fn: onNew }, secondary: onQuick ? { label: "Combat rapide", fn: onQuick } : null, resume: hasRun ? onResume : null, back: onBack, best }));
  }

  // Garde-robe : conserve le fonctionnement du hall.
  wardrobe({ skins, current, thumb, onPick, onBack }) {
    const grid = h("div", { class: "s-grid" });
    for (const n of skins) {
      const img = h("img", { alt: n }); thumb(n).then(u => img.src = u).catch(() => {});
      grid.append(h("button", { class: "s-skin" + (n === current ? " on" : ""), onclick: () => onPick(n) }, img, n.replace(/^trainer_gym_/, "").replace(/^leader_gym_/, "champion ").replace(/_/g, " ")));
    }
    this.show(h("div", { class: "s-box" }, h("h2", null, "Garde-robe"), grid, h("div", { class: "s-row" }, action("Retour", onBack))));
  }
  partner({ list, current, onPick, onBack }) {
    const grid = h("div", { class: "s-grid" });
    for (const k of list) grid.append(h("button", { class: "s-skin" + (k === current ? " on" : ""), onclick: () => onPick(k) }, sprite(k), h("b", null, fr(k)), h("span", null, ...SPECIES[k].t.map(tchip))));
    this.show(h("div", { class: "s-box" }, h("h2", null, "Partenaire"), grid, action("Retour", onBack)));
  }

  zone({ unlocked, onPick, onBack }) {
    let zone = ZONES[0].id, diff = "normal";
    const tabs = h("nav", { class: "ex-zone-tabs", "aria-label": "Zones" }), levels = h("div", { class: "ex-difficulties" }), detail = h("div", { class: "ex-zone-detail" });
    const render = () => {
      const z = ZONE[zone], D = DIFF[diff];
      tabs.replaceChildren(...ZONES.map((item, i) => h("button", { class: "ex-zone-tab" + (zone === item.id ? " selected" : ""), disabled: !item.event && i >= unlocked, "aria-pressed": String(zone === item.id), onclick: () => { zone = item.id; render(); } }, sprite(item.boss, "", true), h("span", null, item.name), !item.event && i >= unlocked ? h("small", null, "À débloquer") : null)));
      levels.replaceChildren(eyebrow("CHOISIR LA DIFFICULTÉ"), ...Object.keys(DIFF).map(d => difficultyCard(d, d === diff, () => { diff = d; render(); })));
      detail.replaceChildren(
        h("div", { class: "ex-zone-banner" }, scenery(artKind(zone)), h("div", null, eyebrow("LE DÉCOR DE VOTRE HISTOIRE"), h("h2", null, z.name), h("p", null, isFinite(D.acts) ? `Traverse ${D.acts} actes et affronte le gardien.` : "Une représentation sans fin. Jusqu'où iras-tu ?")), sprite(z.boss, "ex-guardian", true)),
        h("div", { class: "ex-stats" }, stat(isFinite(D.acts) ? D.acts : "∞", "Actes"), stat(D.encores, "Rappels"), stat("6–10", "Pokémon dans la troupe")),
        h("h3", { class: "ex-section-title" }, "Les forces de cette représentation"), h("p", null, "Types favorisés · +15 % de statistiques"), h("div", null, ...z.fav.map(tchip)),
        h("h3", { class: "ex-section-title" }, "Rencontres possibles"), h("div", { class: "ex-cast-row" }, ...z.pool.map(k => h("div", { title: fr(k) }, sprite(k), h("small", null, fr(k))))),
        h("p", { class: "ex-note" }, icon("crown"), `Gardien final : ${fr(z.boss)}. Les PV sont restaurés entre les combats.`));
    };
    render();
    this.show(shell("Préparation de la représentation", "LE THÉÂTRE / DESTINATION & DIFFICULTÉ", h("div", { class: "ex-zone-layout" }, tabs, h("div", { class: "ex-zone-columns" }, levels, detail)), { back: onBack, footer: [h("span", { class: "ex-footer-note" }, "01 · Destination", h("span", null, " — 02 · Troupe — 03 · Lever de rideau")), action("Choisir la troupe", () => onPick(zone, diff), true)] }));
  }

  troupe({ zone, available, onStart, onBack, preset = [] }) {
    const z = ZONE[zone], keys = Object.keys(SPECIES).filter(available), sel = new Set(preset.filter(k => keys.includes(k)).slice(0, TROUPE_MAX));
    let filter = null;
    const grid = h("div", { class: "ex-roster-grid" }), side = h("aside", { class: "ex-roster-side" }), filters = h("nav", { class: "ex-type-filters", "aria-label": "Filtrer les types" }), footer = h("div", { class: "ex-footer-inner" });
    const render = () => {
      filters.replaceChildren(...[null, ...TYPES].map(t => h("button", { class: filter === t ? "selected" : "", "aria-pressed": String(filter === t), onclick: () => { filter = t; render(); }, style: t ? { "--type": TYPE_COLOR[t] } : {} }, t || "Tous")));
      grid.replaceChildren(...keys.filter(k => !filter || SPECIES[k].t.includes(filter)).map(k => {
        const isFav = SPECIES[k].t.some(t => z.fav.includes(t));
        return h("button", { class: "ex-pokemon-card" + (sel.has(k) ? " selected" : "") + (isFav ? " favored" : ""), "aria-pressed": String(sel.has(k)), "aria-label": fr(k), disabled: !sel.has(k) && sel.size >= TROUPE_MAX, style: { "--rarity": SPECIES[k].tier }, onclick: () => { sel.has(k) ? sel.delete(k) : sel.add(k); render(); } }, h("span", { class: "ex-pokemon-art" }, sprite(k, "", true), isFav ? h("i", { class: "ex-favored", title: "Type favorisé" }, "✦") : null, sel.has(k) ? h("i", { class: "ex-check" }, "✓") : null), h("b", null, fr(k)), h("small", null, "★".repeat(SPECIES[k].tier)), h("span", { class: "ex-pokemon-types" }, ...SPECIES[k].t.map(tchip)));
      }));
      side.replaceChildren(eyebrow("LE DERNIER ACTE"), h("div", { class: "ex-boss-medallion" }, sprite(z.boss)), h("h2", null, fr(z.boss)), h("p", { class: "ex-muted" }, "Gardien de " + z.name), h("div", { class: "ex-rule" }, "✦"), h("h3", { "aria-live": "polite" }, `Votre troupe · ${sel.size}/${TROUPE_MAX}`),
        h("div", { class: "ex-selected-slots" }, ...Array.from({ length: TROUPE_MAX }, (_, i) => { const k = [...sel][i]; return k ? h("button", { title: "Retirer " + fr(k), "aria-label": "Retirer " + fr(k), onclick: () => { sel.delete(k); render(); } }, sprite(k, "", true)) : h("span", { class: "empty" }, "✧"); })),
        h("p", { class: "ex-note" }, `Réunis au moins ${TROUPE_MIN} Pokémon. Chaque membre dispose de ${VIGOR} points de vigueur ; un combat en consomme un.`), h("div", null, ...z.fav.map(tchip)));
      footer.replaceChildren(action("Sélection automatique", () => { sel.clear(); const favs = keys.filter(k => SPECIES[k].t.some(t => z.fav.includes(t))).sort((a, b) => SPECIES[b].tier - SPECIES[a].tier); [...favs, ...keys].forEach(k => sel.size < 8 && sel.add(k)); render(); }), h("span", { class: "ex-footer-note", "aria-live": "polite" }, sel.size < TROUPE_MIN ? `Encore ${TROUPE_MIN - sel.size} Pokémon à choisir` : "La troupe est prête à entrer en scène"), action("Lever de rideau", () => onStart([...sel]), true, sel.size < TROUPE_MIN));
    };
    render();
    this.show(shell("Composer la troupe", z.name.toUpperCase() + " / SÉLECTION DES POKÉMON", h("div", { class: "ex-roster-layout" }, h("div", { class: "ex-roster-main" }, h("h2", { class: "ex-section-title" }, "Les acteurs de votre aventure"), filters, grid), side), { back: onBack, footer }));
  }

  act({ state, onCard, onReroll, onQuit }) {
    const z = ZONE[state.zone], D = DIFF[state.diff];
    const n = isFinite(state.nActs) ? state.nActs : state.act + 3;
    const path = h("div", { class: "ex-act-path", "aria-label": "Progression" }, ...Array.from({ length: n }, (_, i) => { const a = i + 1; return h("div", { class: "ex-path-node" + (a === state.act ? " current" : a < state.act ? " completed" : ""), title: `Acte ${a}${state.keys[a] ? " · " + fr(state.keys[a]) : ""}`, "aria-current": a === state.act ? "step" : null }, state.keys[a] ? sprite(state.keys[a], "", true) : icon(isKeyAct(state, a) ? "crown" : "star"), h("small", null, a)); }));
    const cards = state.cards.map((c, i) => {
      const done = state.bought.includes(i), combat = c.kind === "combat", poor = !combat && state.fleurs < c.cost;
      const label = combat ? { normal: "Combat · Normal", hard: "Combat · Difficile", key: "Adversaire principal", final: "Gardien de la zone" }[c.tier] : { recruit: "Compagnonnage", boon: "Bénédiction", rest: "Entracte" }[c.kind];
      const title = combat ? fr(c.foe.k) : c.kind === "recruit" ? (c.got ? fr(c.got) : c.type) : c.kind === "boon" ? "Un don du destin" : "Une pause sous les étoiles";
      const desc = combat ? `Niv. ${c.foe.L} · PV ×${c.foe.hp}` : c.kind === "recruit" ? (c.got ? "A rejoint votre troupe" : "Un nouveau Pokémon rejoint la troupe") : c.kind === "boon" ? "Choisir parmi trois bénédictions" : "+1 vigueur à toute la troupe";
      return h("button", { class: "ex-encounter " + (combat ? c.tier : c.kind) + (done ? " acquired" : ""), disabled: done || poor, onclick: () => onCard(i), "aria-label": `${label} : ${title}${combat ? "" : `, ${c.cost} fleurs${poor ? ", fleurs insuffisantes" : ""}`}` },
        encounterArt(combat ? artKind(state.zone) : c.kind === "boon" ? "boon" : c.kind === "rest" ? "rest" : "forest", combat ? c.foe.k : c.got),
        h("div", { class: "ex-card-caption" }, h("span", { class: "ex-card-price" }, icon("flower"), done ? "Acquis" : combat ? `+${c.reward}` : `−${c.cost}`), h("small", null, label), h("h3", null, title), h("p", null, desc), poor ? h("span", { class: "ex-unavailable" }, "Fleurs insuffisantes") : null));
    });
    const troupe = h("details", { class: "ex-run-details" }, h("summary", null, icon("book"), `Troupe · ${state.troupe.length} Pokémon`, h("span", null, `${state.boons.length} bénédiction${state.boons.length > 1 ? "s" : ""} ⌃`)), h("div", { class: "ex-run-drawer" }, h("div", { class: "ex-troupe-strip" }, ...state.troupe.map(t => h("div", { class: t.vig ? "" : "exhausted", title: fr(t.k) }, sprite(t.k), h("small", null, fr(t.k)), vig(t.vig)))), h("div", { class: "ex-boon-list" }, state.boons.length ? state.boons.map(id => h("p", null, h("b", null, BOON[id].n), " · ", BOON[id].d)) : h("p", null, "Les bénédictions acquises apparaîtront ici."))));
    this.show(shell("Le Théâtre des expéditions", `${z.name.toUpperCase()} / ${D.name.toUpperCase()}`, h("div", { class: "ex-acts-body" }, eyebrow("LE DESTIN ATTEND VOTRE CHOIX"), h("h2", { class: "ex-act-title" }, "Quel sera le prochain chapitre ?"), h("div", { class: "ex-encounters" }, ...cards), h("div", { class: "ex-act-progress" }, h("h3", null, `Acte ${state.act}${isFinite(state.nActs) ? " / " + state.nActs : ""}`), path), troupe), { cls: "ex-act-screen", tools: [badge("flower", state.fleurs), badge("star", `${state.encores} rappels`)], footer: [action("Abandonner la représentation", onQuit), h("span", { class: "ex-footer-note" }, "Les combats font avancer l'acte. Les incidents enrichissent la troupe."), h("button", { class: "ex-button", disabled: state.rerolls <= 0, onclick: onReroll }, icon("refresh"), `Relancer les incidents · ${state.rerolls}`)] }));
  }

  boon({ ids, onPick, onSkip }) {
    this.show(shell("Une bénédiction vous est offerte", "LE THÉÂTRE / UN DON DU DESTIN", h("div", { class: "ex-acts-body" }, eyebrow("CHOISISSEZ VOTRE ÉTOILE"), h("h2", { class: "ex-act-title" }, "Un peu de magie pour la suite"), h("div", { class: "ex-encounters ex-boon-cards" }, ...ids.map(id => { const b = BOON[id]; return h("button", { class: "ex-encounter boon", onclick: () => onPick(id) }, encounterArt("boon"), h("div", { class: "ex-card-caption" }, h("small", null, "Bénédiction"), h("h3", null, b.n), h("p", null, b.d))); }))), { footer: [h("span", { class: "ex-footer-note" }, "Un effet permanent pour cette représentation."), action("Passer", onSkip)] }));
  }

  team({ state, card, onGo, onBack, last = [] }) {
    const sel = [];
    for (const k of last) if (sel.length < 3 && state.troupe.some(t => t.k === k && t.vig > 0)) sel.push(k);
    for (const t of [...state.troupe].sort((a, b) => b.vig - a.vig)) if (sel.length < 3 && t.vig > 0 && !sel.includes(t.k)) sel.push(t.k);
    const grid = h("div", { class: "ex-roster-grid" }), side = h("aside", { class: "ex-roster-side" }), footer = h("div", { class: "ex-footer-inner" });
    const render = () => {
      grid.replaceChildren(...state.troupe.map(t => h("button", { class: "ex-pokemon-card" + (sel.includes(t.k) ? " selected" : "") + (!t.vig ? " exhausted" : ""), "aria-label": fr(t.k), "aria-pressed": String(sel.includes(t.k)), disabled: !t.vig || (!sel.includes(t.k) && sel.length === 3), onclick: () => { sel.includes(t.k) ? sel.splice(sel.indexOf(t.k), 1) : sel.push(t.k); render(); } }, h("span", { class: "ex-pokemon-art" }, sprite(t.k, "", true), sel.includes(t.k) ? h("i", { class: "ex-check" }, sel.indexOf(t.k) + 1) : null), h("b", null, fr(t.k)), vig(t.vig), h("span", { class: "ex-pokemon-types" }, ...SPECIES[t.k].t.map(tchip)))));
      side.replaceChildren(eyebrow("VOTRE ADVERSAIRE"), h("div", { class: "ex-boss-medallion" }, sprite(card.foe.k)), h("h2", null, fr(card.foe.k)), h("p", null, `Niv. ${card.foe.L} · PV ×${card.foe.hp}`), h("div", null, ...SPECIES[card.foe.k].t.map(tchip)), h("div", { class: "ex-rule" }, "✦"), h("h3", null, "En scène"), h("div", { class: "ex-battle-slots" }, ...["Gauche", "Centre", "Droite"].map((label, i) => h("div", null, sel[i] ? sprite(sel[i]) : icon("star"), h("small", null, label)))), h("p", { class: "ex-note" }, "Chaque participant dépense 1 vigueur. Les PV sont restaurés avant le combat."));
      footer.replaceChildren(h("span", { class: "ex-footer-note", "aria-live": "polite" }, `${sel.length} / 3 Pokémon sélectionnés`), action("Entrer dans l'arène", () => onGo(sel.slice()), true, !sel.length));
    };
    render(); this.show(shell("L'heure d'entrer en scène", `ACTE ${state.act} / ÉQUIPE DE COMBAT`, h("div", { class: "ex-roster-layout" }, h("div", { class: "ex-roster-main" }, h("h2", { class: "ex-section-title" }, "Choisir jusqu'à trois Pokémon"), grid), side), { back: onBack, footer }));
  }

  message({ title, lines = [], btn = "Continuer", onOk }) {
    this.show(shell("Le Théâtre des expéditions", "LE RÉCIT CONTINUE", h("div", { class: "ex-message" }, icon("star"), h("h2", null, title), ...lines.map(l => h("p", null, l)), action(btn, onOk, true))));
  }
  loading(text) { this.show(shell("Préparation de la scène", "POKEXPÉDITION", h("div", { class: "ex-message" }, icon("star", "ex-spinner"), h("h2", null, text)))); }
}
