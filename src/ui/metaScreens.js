// Écrans de la boucle de progression dans le jeu : expéditions D1-5, runs de capture, choix final, collection.
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
const teamLine = (save) => save.team.map((k) => `${fr(M.formOf(k, save.coll[k].elev))} N.${save.coll[k].L}`).join(" · ");

export class MetaScreens {
  constructor(scr) { this.scr = scr; }
  show(...kids) { this.scr.show(...kids); }

  // ───────── expéditions D1-5 ─────────
  expeditions({ save, onPlay, onTheatre, onTeam, onBack }) {
    const E = CONFIG.expedition;
    const rows = [1, 2, 3, 4, 5].map((d) => {
      const r = M.rewardsOf(save, d);
      return h("button", { class: "s-card combat", onclick: () => onPlay(d) },
        h("small", null, `Difficulté ${d}`), h("b", null, `Adversaire niv. ${E.foeLevel[d - 1]}`),
        h("p", null, Object.entries(r.mats).map(([t, n]) => `Matériau P${t} ×${n}`).join(" · ")),
        h("p", { class: "s-gain" }, `+${r.voeux} vœux${save.firstClear[d] ? "" : " (1er clear)"}`));
    });
    this.show(h("div", { class: "s-box" },
      h("div", { class: "s-top" }, h("h1", null, "Expéditions"), resBar(save)),
      h("p", { class: "s-mute" }, "Un combat de raid. La victoire rapporte des vœux (pour les runs de capture) et des matériaux de palier (pour l'élévation)."),
      h("p", null, "Équipe : ", h("b", null, teamLine(save)), " ", h("button", { class: "s-btn sm", onclick: onTeam }, "Modifier")),
      h("div", { class: "s-cards" }, ...rows),
      h("div", { class: "s-row" }, h("button", { class: "s-btn", onclick: onBack }, "Retour au hall"), onTheatre ? h("button", { class: "s-btn", onclick: onTheatre }, "Théâtre (ancien mode)") : null)));
  }

  // ───────── run de capture : préparation ─────────
  captureSetup({ save, onStart, onTeam, onBack }) {
    let set = this.lastSet || M.SETS[0].id;
    let level = Math.max(1, Math.min(...save.team.map((k) => save.coll[k].L)));
    const info = h("div", { class: "s-panel" });
    const lvl = h("input", { type: "number", min: 1, max: 100, value: level, class: "m-num", oninput: (e) => { level = Math.max(1, Math.min(100, +e.target.value || 1)); render(); } });
    const tabs = h("div", { class: "s-row" });
    const render = () => {
      const S = M.SET[set];
      tabs.innerHTML = ""; tabs.append(...M.SETS.map((s) => h("button", { class: "s-btn" + (s.id === set ? " on" : ""), onclick: () => { set = s.id; this.lastSet = set; render(); } }, `${s.name} — ${fr(s.legend)}`)));
      const own = (k) => (M.owns(save, k) ? " ●" : "") + (M.owns(save, k, true) ? " ✦" : "");
      const ch = M.legendChance(save, set, level);
      info.innerHTML = "";
      info.append(
        h("h2", null, S.name),
        h("p", null, h("b", null, "Légendaire : "), fr(S.legend) + own(S.legend), " ", types(S.legend)),
        h("p", null, h("b", null, "Sympa : "), S.nice.map((k) => fr(k) + own(k)).join(", ")),
        h("p", null, h("b", null, "Faibles : "), S.weak.map((k) => fr(k) + own(k)).join(", ")),
        h("p", null, `Combats : faible, faible, sympa, faible, ${fr(S.legend)}. Chaque victoire capture le Pokémon.`),
        h("p", null, h("b", null, `Capture de ${fr(S.legend)} au niveau ${level} : ${(ch * 100).toFixed(1)} %`),
          level < CONFIG.capture.legend.minLevel ? ` (incapturable sous le niveau ${CONFIG.capture.legend.minLevel})` : save.pity[set] ? ` (dont pity +${Math.round(save.pity[set] * 100)})` : ""),
        h("p", { class: "s-mute" }, "● possédé · ✦ chromatique possédé. À la fin, tu gardes UN Pokémon nouveau ; le reste devient fragments du set."));
    };
    render();
    this.show(h("div", { class: "s-box" },
      h("div", { class: "s-top" }, h("h1", null, "Run de capture"), resBar(save)),
      tabs, info,
      h("div", { class: "s-row" }, "Niveau du run (1 à 100) : ", lvl),
      h("p", null, "Équipe : ", h("b", null, teamLine(save)), " ", h("button", { class: "s-btn sm", onclick: onTeam }, "Modifier")),
      h("div", { class: "s-row" },
        h("button", { class: "s-btn", onclick: onBack }, "Retour au hall"),
        h("button", { class: "s-btn main", disabled: save.voeux < CONFIG.capture.cost, onclick: () => onStart(set, level) }, `Lancer (${CONFIG.capture.cost} vœux)`))));
  }

  // ───────── run de capture : déroulé ─────────
  runStatus({ save, onNext, onStop, onBack }) {
    const run = M.publicRun(save.run);
    const steps = run.foes.map((f, i) => {
      const r = save.run.results[i];
      const st = r ? (r.win ? (r.captured ? "capturé" : r.legend ? `raté (${Math.round(r.legend.chance * 100)} %)` : r.reward ? "matériau rare" : "gagné") : "défaite") : i === run.i ? "prochain" : "";
      return h("div", { class: "s-step" + (i === run.i ? " now" : i < run.i ? " done" : "") + (f.role === "legend" ? " key" : "") }, h("b", null, fr(f.k)), h("small", null, ` ${RF[f.role]}${st ? " · " + st : ""}`));
    });
    const next = run.foes[run.i];
    this.show(h("div", { class: "s-box" },
      h("div", { class: "s-top" }, h("h1", null, `${M.SET[run.set].name} — niveau ${run.level}`), resBar(save)),
      h("div", { class: "s-path" }, ...steps),
      h("p", null, `Captures : ${save.run.captures.length ? save.run.captures.map((c) => fr(c.k)).join(", ") : "aucune pour l'instant"}`),
      next ? h("p", null, h("b", null, `Combat ${run.i + 1}/5 : ${fr(next.k)}`), " ", types(next.k),
        next.role === "legend" ? ` — capture ${(M.legendChance(save, run.set, run.level) * 100).toFixed(1)} % en cas de victoire` : "") : null,
      h("p", null, "Équipe : ", h("b", null, teamLine(save))),
      h("div", { class: "s-row" },
        h("button", { class: "s-btn", onclick: onBack }, "Retour au hall (le run reste en cours)"),
        h("button", { class: "s-btn", onclick: onStop }, "Arrêter et choisir"),
        h("button", { class: "s-btn main", onclick: onNext }, "Combattre"))));
  }

  // ───────── choix final (révélation des chromatiques) ─────────
  runChoice({ save, onKeep }) {
    const list = M.choices(save);
    const F = CONFIG.capture.fragments;
    const cards = list.map((c) => h("button", { class: "s-card" + (c.shiny ? " m-shiny" : ""), disabled: !c.isNew, onclick: () => onKeep(c.i) },
      h("small", null, RF[c.role] + (c.isNew ? " · nouveau" : " · déjà possédé")),
      h("b", null, fr(c.k) + (c.shiny ? " ✦" : "")), types(c.k),
      c.shiny ? h("p", { class: "s-gain" }, "CHROMATIQUE !") : null,
      h("p", null, c.isNew ? "Garder" : `→ ${F[c.role]} fragment${F[c.role] > 1 ? "s" : ""}${c.shiny ? " + 1 éclat" : ""}`)));
    this.show(h("div", { class: "s-box" },
      h("div", { class: "s-top" }, h("h1", null, "Choix final"), resBar(save)),
      h("p", null, "Garde UN seul Pokémon nouveau. Les autres deviennent des fragments du set (faible 1, sympa 3, légendaire 10) ; un chromatique non gardé donne 1 éclat."),
      list.length ? h("div", { class: "s-cards" }, ...cards) : h("p", { class: "s-mute" }, "Aucune capture."),
      h("div", { class: "s-row" }, h("button", { class: "s-btn", onclick: () => onKeep(null) }, list.some((c) => c.isNew) ? "Ne rien garder" : "Continuer"))));
  }

  // ───────── collection : équipe, entraînement, élévation, étoiles, chromatiques ─────────
  collection({ save, partner, onAct, onBack, msg = "" }) {
    const S = CONFIG.stars;
    const rows = Object.entries(save.coll).sort((a, b) => b[1].L - a[1].L || a[0].localeCompare(b[0])).map(([k, e]) => {
      const r = M.roleOf(k), c = M.elevationCost(save, k), form = M.formOf(k, e.elev), cap = M.levelCap(e.elev);
      const inTeam = save.team.includes(k);
      const shardCost = r && r.role === "legend" ? CONFIG.shards.costLegend : CONFIG.shards.cost;
      const b = (label, act, dis, title) => h("button", { class: "s-btn sm", disabled: !!dis, title: title || "", onclick: () => onAct(act, k) }, label);
      return h("tr", { class: inTeam ? "m-team" : "" },
        h("td", null, h("b", null, fr(form)), form !== k ? h("small", { class: "s-mute" }, ` (${fr(k)})`) : null, e.shiny ? h("span", { class: "m-sh" }, " ✦") : null, " ", types(form)),
        h("td", null, r ? `${M.SET[r.set].name} · ${RF[r.role]}` : "—"),
        h("td", null, `N.${e.L} / ${cap}`),
        h("td", null, `Élév. ${e.elev}`),
        h("td", { class: "m-star" }, "★".repeat(e.stars) + "☆".repeat(S.max - e.stars)),
        h("td", { class: "m-acts" },
          b(inTeam ? "Retirer" : "Équipe", "team", !inTeam && save.team.length >= CONFIG.team.size, "Équipe de combat (3 max)"),
          b("Entraîner", "train", e.L >= cap),
          b("→ plafond", "trainMax", e.L >= cap, "Entraîner jusqu'au plafond de niveau"),
          b("Élever" + (c ? ` (${c.frags} fr. + ${c.mats} P${c.mat})` : ""), "elev", !c || e.L < cap || save.frags[c.set] < c.frags || save.mats[c.mat] < c.mats, c && e.L < cap ? `Niveau ${cap} requis` : ""),
          b("Étoile" + (e.stars < S.max ? ` (${S.cost[e.stars]} fr.)` : ""), "star", e.stars >= S.max || !r || save.frags[r.set] < S.cost[e.stars]),
          e.shiny ? null : b(`✦ (${shardCost} éclats)`, "shards", !e.normal || save.shards < shardCost),
          b(partner === k ? "Partenaire ✓" : "Partenaire", "partner", partner === k)));
    });
    this.show(h("div", { class: "s-box" },
      h("div", { class: "s-top" }, h("h1", null, "Collection"), resBar(save)),
      h("p", { class: "s-mute" }, `Entraînement illimité jusqu'au plafond de niveau (20/40/60/80/100 selon l'élévation). L'élévation demande des fragments du set et un matériau de palier (expéditions). Certaines espèces évoluent à l'élévation 1.`),
      msg ? h("p", { class: "m-msg" }, msg) : null,
      h("table", { class: "m-table" }, h("tr", null, ...["Pokémon", "Set", "Niveau", "Élévation", "Étoiles", ""].map((t) => h("th", null, t))), ...rows),
      h("div", { class: "s-row" }, h("button", { class: "s-btn", onclick: onBack }, "Retour"))));
  }
}
