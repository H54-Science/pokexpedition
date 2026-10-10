// Écran Collection (entraînement, élévation, étoiles, chromatiques, partenaire). Les runs sont dans runScreens.js.
// Volontairement sobres (même style que les écrans du Théâtre) ; la logique est dans src/meta.
import { h } from "../core.js";
import { SPECIES, TYPE_COLOR, fr } from "../data/data.js";
import * as M from "../meta/index.js";

const { CONFIG } = M;
const RF = { weak: "Faible", nice: "Sympa", legend: "Légendaire" };
const tchip = (t) => h("span", { class: "s-t", style: { background: TYPE_COLOR[t] } }, t);
const types = (k) => h("span", null, ...SPECIES[k].t.map(tchip));

// Barre de ressources commune.
export function resBar(save) {
  return h("div", { class: "m-res" },
    h("span", null, "Vœux ", h("b", null, save.voeux)),
    h("span", null, "Matériaux ", ...[1, 2, 3, 4, 5].map((t) => h("span", { class: "m-mat" }, `P${t} `, h("b", null, save.mats[t])))),
    h("span", null, "Fragments ", ...M.SETS.map((s) => h("span", { class: "m-mat" }, `${s.name} `, h("b", null, save.frags[s.id])))),
    h("span", null, "Éclats chroma ", h("b", null, save.shards)));
}

export class MetaScreens {
  constructor(scr) { this.scr = scr; }
  show(...kids) { this.scr.show(...kids); }

  // ───────── collection : équipe, entraînement, élévation, étoiles, chromatiques ─────────
  collection({ save, hall = [], onAct, onBack, msg = "" }) {
    const S = CONFIG.stars;
    const rows = Object.entries(save.coll).sort((a, b) => b[1].L - a[1].L || a[0].localeCompare(b[0])).map(([k, e]) => {
      const r = M.roleOf(k), c = M.elevationCost(save, k), form = M.formOf(k, e.elev), cap = M.levelCap(e.elev);
      const shardCost = r && r.role === "legend" ? CONFIG.shards.costLegend : CONFIG.shards.cost;
      const b = (label, act, dis, title) => h("button", { class: "s-btn sm", disabled: !!dis, title: title || "", onclick: () => onAct(act, k) }, label);
      return h("tr", null,
        h("td", null, h("b", null, fr(form)), form !== k ? h("small", { class: "s-mute" }, ` (${fr(k)})`) : null, e.shiny ? h("span", { class: "m-sh" }, " ✦") : null, " ", types(form)),
        h("td", null, r ? `${M.SET[r.set].name} · ${RF[r.role]}` : "—"),
        h("td", null, `N.${e.L} / ${cap}`),
        h("td", null, `Élév. ${e.elev}`),
        h("td", { class: "m-star" }, "★".repeat(e.stars) + "☆".repeat(S.max - e.stars)),
        h("td", { class: "m-acts" },
          b("Entraîner", "train", e.L >= cap),
          b("→ plafond", "trainMax", e.L >= cap, "Entraîner jusqu'au plafond de niveau"),
          b("Élever" + (c ? ` (${c.frags} fr. + ${c.mats} P${c.mat})` : ""), "elev", !c || e.L < cap || save.frags[c.set] < c.frags || save.mats[c.mat] < c.mats, c && e.L < cap ? `Niveau ${cap} requis` : ""),
          b("Étoile" + (e.stars < S.max ? ` (${S.cost[e.stars]} fr.)` : ""), "star", e.stars >= S.max || !r || save.frags[r.set] < S.cost[e.stars]),
          e.shiny ? null : b(`✦ (${shardCost} éclats)`, "shards", !e.normal || save.shards < shardCost),
          b(hall.includes(k) ? "Hall ✓" : "Hall", "hall", !hall.includes(k) && hall.length >= 6, "Exposer dans le hall (6 max)")));
    });
    this.show(h("div", { class: "s-box" },
      h("div", { class: "s-top" }, h("h1", null, "Collection"), resBar(save)),
      h("p", { class: "s-mute" }, `Entraînement illimité jusqu'au plafond de niveau (20/40/60/80/100 selon l'élévation). Difficulté d'un run accessible avec 6 Pokémon au niveau requis (20/40/60/80/100). L'élévation demande des fragments du set et un matériau de palier (expéditions). Certaines espèces évoluent à l'élévation 1.`),
      msg ? h("p", { class: "m-msg" }, msg) : null,
      h("table", { class: "m-table" }, h("tr", null, ...["Pokémon", "Set", "Niveau", "Élévation", "Étoiles", ""].map((t) => h("th", null, t))), ...rows),
      h("div", { class: "s-row" }, h("button", { class: "s-btn", onclick: onBack }, "Retour"))));
  }

  // ───────── réglage : Pokémon exposés dans le hall ─────────
  hallSettings({ save, chosen, max, onToggle, onBack }) {
    const grid = h("div", { class: "m-hall" });
    for (const k of Object.keys(save.coll).sort((a, b) => save.coll[b].L - save.coll[a].L || a.localeCompare(b))) {
      const form = M.formOf(k, save.coll[k].elev), i = chosen.indexOf(k);
      grid.append(h("button", { class: "m-hall-p" + (i >= 0 ? " on" : ""), disabled: i < 0 && chosen.length >= max, onclick: () => onToggle(k) },
        i >= 0 ? h("span", { class: "m-hall-n" }, i + 1) : null,
        h("img", { src: `assets/pokemon/${form}.png`, alt: "", draggable: "false" }), h("b", null, fr(form)), h("small", null, `N.${save.coll[k].L}`)));
    }
    this.show(h("div", { class: "s-box" },
      h("div", { class: "s-top" }, h("h1", null, "Pokémon du hall")),
      h("p", { class: "s-mute" }, `Choisis jusqu'à ${max} Pokémon à exposer dans le hall (dans l'ordre : le 1er au centre du tapis). ${chosen.length}/${max}`),
      grid,
      h("div", { class: "s-row" }, h("button", { class: "s-btn main", onclick: onBack }, "Terminé"))));
  }
}
