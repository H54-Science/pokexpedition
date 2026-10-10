// Écrans hors expédition : Collection (élévation, étoiles, chromatiques, exposition au hall) et Réglages.
// Même cadre et même habillage que les écrans d'expédition (RunUI.frame) ; la logique reste dans src/meta.
import { h } from "../core.js";
import { SPECIES, TYPE_COLOR, fr } from "../data/data.js";
import * as M from "../meta/index.js";
import { RunUI, RF, face } from "./runScreens.js";
import { icon, pokerFace } from "./theatre.js";

const { CONFIG } = M;
const tchip = (t) => h("span", { class: "rs-type", style: { "--c": TYPE_COLOR[t] } }, t);
const types = (k) => h("span", { class: "rs-types" }, ...SPECIES[k].t.map(tchip));
const pips = (n, max) => h("span", { class: "rs-pips" }, ...Array.from({ length: max }, (_, i) => h("i", { class: "rs-pip" + (i < n ? " on" : "") })));

export const CONTROLS = [
  ["1 à 3", "Menu du hall"], ["H / ?", "Comment jouer (en combat)"], ["Entrée", "Valider"], ["Échap", "Retour / fermer"], ["← →", "Changer de difficulté, de set ou de cible"],
  ["Q", "Attaque (+1 énergie)"], ["E", "Capacités, puis 1 à 3"], ["I", "Objets, puis 1 à 5"], ["U", "Ultime de l'allié actif"],
  ["1 à 3", "Ultime d'un allié (jauge pleine)"], ["Espace / clic", "Frappe rythmée"], ["A", "Combat automatique"], ["X", "Vitesse ×2"],
];

export class MetaScreens extends RunUI {
  // ───────── collection : toutes les espèces des sets, fiche détaillée de l'espèce choisie ─────────
  collection(args) {
    const { save, hall = [], onAct, onBack, msg = "" } = args;
    this.save = save;
    const again = () => this.collection({ ...args, msg: "" });
    const inSets = M.SETS.flatMap((S) => M.speciesOf(S));
    const all = [...inSets, ...Object.keys(save.coll).filter((k) => !inSets.includes(k))];
    const f = this.collFilter === "own" || M.SET[this.collFilter] ? this.collFilter : "all";
    const shown = all.filter((k) => f === "all" || (f === "own" ? save.coll[k] : M.roleOf(k)?.set === f));
    let sel = this.collSel && all.includes(this.collSel) ? this.collSel : shown.find((k) => save.coll[k]) || shown[0];
    this.collSel = sel;
    const owned = all.filter((k) => M.owns(save, k)).length, shinies = all.filter((k) => M.owns(save, k, true)).length;

    const chip = (id, label) => h("button", { class: "cl-filter" + (f === id ? " on" : ""), "aria-pressed": String(f === id), onclick: () => { this.collFilter = id; again(); } }, label);
    const filters = h("div", { class: "cl-filters" }, chip("all", "Tous"), chip("own", "Possédés"),
      ...M.SETS.map((S) => h("span", { class: "cl-filter-set", style: { "--c": S.color || "#888" } }, chip(S.id, `${S.name} · ${save.frags[S.id] || 0} fr.`))));
    const grid = h("div", { class: "rs-roster cl-grid" }, ...shown.map((k) => {
      const e = save.coll[k], form = e ? M.formOf(k, e.elev) : k, r = M.roleOf(k);
      return h("button", { class: "rs-mon cl-card" + (e ? "" : " unknown") + (k === sel ? " on" : ""), "aria-pressed": String(k === sel), onclick: () => { this.collSel = k; again(); } },
        pokerFace(form, { content: face(form, "rs-face" + (e ? "" : " cl-shadow")) }),
        h("b", null, fr(form)),
        h("small", null, e ? `N.${e.L}${e.stars ? " · " + "★".repeat(e.stars) : ""}` : r ? RF[r.role] : "—"),
        h("span", { class: "cl-own", "aria-label": `${e?.normal ? "normal possédé" : "normal manquant"}, ${e?.shiny ? "chromatique possédé" : "chromatique manquant"}` },
          h("i", { class: e?.normal ? "on" : "" }), h("i", { class: "sh" + (e?.shiny ? " on" : "") })));
    }));

    this.frame({ title: "Collection", kicker: "Hall", key: "collection", onBack, cls: "rs-collection",
      body: [
        h("div", { class: "cl-top" },
          h("div", { class: "cl-progress" }, h("b", null, `${owned}/${all.length}`), h("small", null, "espèces"), h("b", { class: "sh" }, `✦ ${shinies}/${all.length}`), h("small", null, "chromatiques"), h("b", null, save.shards), h("small", null, "éclats chroma")),
          filters),
        h("div", { class: "cl-layout" }, h("div", { class: "cl-detail-wrap" }, this.detail(save, sel, hall, onAct, msg, again)), grid)],
      actions: [h("button", { class: "rs-go", onclick: onBack }, "Retour au hall", h("kbd", null, "Échap"))] });
    this.keys({ Escape: onBack });
  }

  detail(save, k, hall, onAct, msg, again) {
    if (!k) return h("div", { class: "cl-detail" }, h("p", { class: "rs-hint" }, "Aucune espèce."));
    const e = save.coll[k], r = M.roleOf(k), S = r && M.SET[r.set];
    const where = S ? `${S.name} · ${RF[r.role]}` : "Hors set";
    if (!e) return h("div", { class: "cl-detail" },
      h("div", { class: "cl-face" }, pokerFace(k, { content: face(k, "rs-face big cl-shadow") })),
      h("div", { class: "cl-head" }, h("small", null, where), h("b", { class: "cl-name" }, fr(k)), types(k)),
      h("p", { class: "cl-note" }, S ? `Pas encore capturé. Il apparaît dans les expéditions du set ${S.name}${r.role === "legend" ? ` (au dernier combat, capturable à partir de la difficulté ${M.legendFrom()?.name || "—"})` : ""}.` : "Pas encore capturé."));

    const form = M.formOf(k, e.elev), c = M.elevationCost(save, k), St = CONFIG.stars, maxElev = CONFIG.elevation.fragments.length;
    const shiny = e.shiny && (!e.normal || this.collShiny);
    const shardCost = r && r.role === "legend" ? CONFIG.shards.costLegend : CONFIG.shards.cost;
    const chain = CONFIG.evolutions[k], nextEvo = chain && CONFIG.evolveAt.find((x) => x > e.elev);
    const evoNote = chain && nextEvo != null && CONFIG.evolveAt.indexOf(nextEvo) < chain.length ? `Évolue en ${fr(chain[CONFIG.evolveAt.indexOf(nextEvo)])} à l'élévation ${nextEvo}.` : null;
    const act = (label, id, disabled, sub, main) => h("button", { class: "cl-act" + (main ? " main" : ""), disabled: !!disabled, onclick: () => onAct(id, k) }, h("b", null, label), sub ? h("small", null, sub) : null);
    const elevSub = !c ? "maximum atteint" : `${c.frags} fragments + ${c.mats} ${M.matName(c.mat)}`;
    const elevOk = c && save.frags[c.set] >= c.frags && save.mats[c.mat] >= c.mats;
    const inHall = hall.includes(k);
    return h("div", { class: "cl-detail" + (shiny ? " shiny" : "") },
      h("div", { class: "cl-face" }, pokerFace(form, { content: face(form, "rs-face big", shiny) }), shiny ? h("span", { class: "rs-shiny-tag" }, "✦ CHROMATIQUE") : null),
      e.shiny && e.normal ? h("button", { class: "cl-filter cl-swap", onclick: () => { this.collShiny = !this.collShiny; again(); } }, shiny ? "Voir la forme normale" : "✦ Voir le chromatique") : null,
      h("div", { class: "cl-head" }, h("small", null, where), h("b", { class: "cl-name" }, fr(form)), form !== k ? h("small", null, `forme évoluée de ${fr(k)}`) : null, types(form)),
      h("div", { class: "cl-stats" },
        h("div", null, h("small", null, "Niveau"), h("b", null, `${e.L}`), h("small", null, c ? `${M.levelCap(c.n)} après élévation` : "maximum")),
        h("div", null, h("small", null, "Élévation"), h("b", null, `${e.elev}`, h("em", null, ` / ${maxElev}`)), pips(e.elev, maxElev)),
        h("div", null, h("small", null, "Étoiles"), h("b", { class: "cl-stars" }, "★".repeat(e.stars), h("em", null, "★".repeat(St.max - e.stars))), h("small", null, `+${Math.round(e.stars * St.bonusPerStar * 100)} % de stats`))),
      evoNote ? h("p", { class: "cl-note" }, evoNote) : null,
      msg ? h("p", { class: "cl-msg" }, msg) : null,
      c ? h("p", { class: "cl-note" }, `Élever fait passer ${fr(form)} au niveau ${M.levelCap(c.n)}. Fragments : captures ${S ? S.name : ""} non gardées. ${M.matName(c.mat)} : expéditions ${M.DIFFS[c.mat - 1] ? M.DIFFS[c.mat - 1].name : ""} gagnées.`) : null,
      h("div", { class: "cl-acts" },
        act(c ? `Élever → niv. ${M.levelCap(c.n)}` : "Élever", "elev", !elevOk, elevSub, elevOk),
        act("Étoile", "star", e.stars >= St.max || !r || save.frags[r.set] < St.cost[e.stars], e.stars >= St.max ? "maximum atteint" : `${St.cost[e.stars]} fragments`),
        e.shiny ? null : act("Chromatique", "shards", !e.normal || save.shards < shardCost, `${shardCost} éclats chroma`),
        act(inHall ? "Retirer du hall" : "Exposer au hall", "hall", !inHall && hall.length >= 6, `${hall.length}/6 exposés`)),
      h("p", { class: "cl-wallet" }, S ? h("span", null, `Fragments ${S.name} : `, h("b", null, save.frags[S.id] || 0)) : null,
        c ? h("span", null, `${M.matName(c.mat)} : `, h("b", null, save.mats[c.mat] || 0)) : null));
  }

  // ───────── réglages : son, combat, graphismes, sauvegarde, commandes ─────────
  // prefs : { sound, music, qte, speed2, auto, low } ; onSet(clé, valeur)
  settings({ save, prefs, onSet, onReload, onExport, onImport, onReset, onHelp, onResetTips, onBack, msg = "" }) {
    this.save = save;
    const toggle = (key, label, sub) => h("button", { class: "st-row" + (prefs[key] ? " on" : ""), role: "switch", "aria-checked": String(!!prefs[key]), onclick: () => onSet(key, !prefs[key]) },
      h("span", null, h("b", null, label), sub ? h("small", null, sub) : null), h("i", { class: "st-switch" }, h("em")));
    const panel = (title, ic, ...kids) => h("section", { class: "st-panel" }, h("h3", null, icon(ic), title), ...kids);
    const file = h("input", { type: "file", accept: "application/json,.json", hidden: true, onchange: (e) => { const f = e.target.files[0]; if (f) f.text().then(onImport); } });
    let armed = false;
    const reset = h("button", { class: "cl-act danger", onclick: () => { if (!armed) { armed = true; reset.firstChild.textContent = "Confirmer : tout effacer"; reset.classList.add("armed"); return; } onReset(); } },
      h("b", null, "Réinitialiser la partie"), h("small", null, "collection, vœux et matériaux effacés"));
    this.frame({ title: "Réglages", kicker: "Hall", key: "settings", onBack, cls: "rs-settings",
      body: [msg ? h("div", { class: "rs-banner win" }, msg) : null, h("div", { class: "st-grid" },
        panel("Comment jouer", "book", h("p", { class: "cl-note" }, "Le but, les expéditions, le combat, les réactions élémentaires et la progression, en une page."),
          h("div", { class: "cl-acts" }, h("button", { class: "cl-act main", onclick: onHelp }, h("b", null, "Ouvrir le guide"), h("small", null, "aussi en combat : bouton ?")),
            h("button", { class: "cl-act", onclick: onResetTips }, h("b", null, "Revoir les conseils"), h("small", null, "au prochain combat")))),
        panel("Son", "star", toggle("sound", "Effets sonores"), toggle("music", "Musique")),
        panel("Combat", "sword", toggle("qte", "Frappes rythmées", "Jauge à arrêter au bon moment : plus de dégâts, moins de dégâts subis"),
          toggle("speed2", "Vitesse ×2 par défaut"), toggle("auto", "Combat automatique par défaut")),
        panel("Graphismes", "moon", toggle("low", "Qualité réduite", "Sans ombres, moins de particules : plus fluide sur mobile"),
          prefs.reload ? h("button", { class: "cl-act main", onclick: onReload }, h("b", null, "Appliquer"), h("small", null, "recharge le jeu")) : null),
        panel("Sauvegarde", "book", h("p", { class: "cl-note" }, "La partie est enregistrée dans ce navigateur. Exporte-la pour la garder ou la transférer."),
          h("div", { class: "cl-acts" }, h("button", { class: "cl-act", onclick: onExport }, h("b", null, "Exporter"), h("small", null, "fichier .json")),
            h("button", { class: "cl-act", onclick: () => file.click() }, h("b", null, "Importer"), h("small", null, "remplace la partie actuelle")), file),
          reset),
        panel("Commandes", "crown", h("dl", { class: "st-keys" }, ...CONTROLS.flatMap(([k, d]) => [h("dt", null, h("kbd", null, k)), h("dd", null, d)]))))],
      actions: [h("button", { class: "rs-go", onclick: onBack }, "Retour au hall", h("kbd", null, "Échap"))] });
    this.keys({ Escape: onBack });
  }
}
