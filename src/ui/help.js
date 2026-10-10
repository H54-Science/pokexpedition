// Guide du jeu : fenêtre « Comment jouer » (bouton ? en combat, Réglages). Les chiffres viennent de la config et des données.
import { h } from "../core.js";
import { REACTIONS, SWIRL_RX, CRYSTAL_RX, ELEMENTS, STATUS, TYPE_COLOR } from "../data/data.js";
import { MAX_EN } from "../data/moves.js";
import { CONFIG, DIFFS, matName, legendFrom } from "../meta/index.js";

const sec = (title, ...kids) => h("section", { class: "hp-sec" }, h("h3", null, title), ...kids);
const ul = (...items) => h("ul", null, ...items.map((x) => h("li", null, ...[].concat(x))));
const b = (t) => h("b", null, t);
const chip = (t) => h("span", { class: "rs-type", style: { "--c": TYPE_COLOR[t] } }, t);

function content() {
  const C = CONFIG, lf = legendFrom();
  return [
    sec("Le but",
      h("p", null, "Partir en expédition, capturer des Pokémon, les faire progresser pour affronter des difficultés plus hautes, et compléter la collection : chaque espèce en normal et en chromatique."),
      h("ol", { class: "hp-loop" },
        h("li", null, b("Expédition"), " : des combats d'affilée contre les Pokémon d'un set."),
        h("li", null, b("Capture"), " : à la fin, tu gardes un Pokémon nouveau."),
        h("li", null, b("Élévation"), " : dans la Collection, tes Pokémon montent de niveau."),
        h("li", null, b("Difficulté suivante"), ` : il faut ${C.run.minRoster} Pokémon à son niveau.`))),
    sec("Une expédition",
      ul([b("Difficulté"), ` : ${DIFFS.map((d) => `${d.name} (niv. ${d.level})`).join(", ")}.`],
        [b("Set"), " : un thème et son légendaire, affronté au dernier combat", lf ? ` (capturable à partir de ${lf.name}).` : "."],
        [b("Équipe"), ` : avant chaque combat, jusqu'à ${C.run.teamSize} Pokémon. Chacun combat ${C.run.uses} fois au maximum par expédition. Les PV reviennent entre les combats.`],
        [b("Vœux"), " : gagnés à chaque victoire, dépensés en bénédictions (bonus jusqu'à la fin de l'expédition). Ils se gardent d'une expédition à l'autre."],
        [b("Défaite"), " : l'expédition s'arrête, tu gardes ce qui est capturé."],
        [b("Fin"), " : tu gardes un Pokémon que tu n'as pas encore. Les autres deviennent des fragments de leur set ; un chromatique non gardé donne un éclat chroma."])),
    sec("Le combat",
      ul([b("Attaque"), " (Q) : coup simple, rapporte 1 énergie."],
        [b("Capacités"), ` (E) : plus fortes, elles coûtent 1 à 3 énergies (jauge bleue, ${MAX_EN} au maximum, partagée par l'équipe).`],
        [b("Objets"), " (I) : soins et bonus, un par tour, sans perdre ton tour. Le sac est rempli au départ de chaque expédition."],
        [b("Ultime"), " : quand l'anneau d'un Pokémon est plein, touche sa carte (ou U). Il ne coûte pas le tour."],
        [b("Frappe rythmée"), " : arrête le curseur sur la zone verte (Espace ou clic). Attaque : +15 % (jaune) ou +30 % (vert). Parade quand l'ennemi frappe : −28 % ou −55 % de dégâts subis."],
        [b("Intention"), " : sous la barre du boss, sa prochaine attaque et sa cible. Sous 50 % de PV, il enrage."],
        [b("Types"), " : un coup super efficace fait ×2, une attaque du même type que le Pokémon ×1,5."])),
    sec("Éléments et réactions",
      h("p", null, "Les attaques ", ...ELEMENTS.flatMap((t, i) => [chip(t), i < ELEMENTS.length - 1 ? " " : ""]), " laissent une aura sur la cible. Un autre élément la déclenche :"),
      h("div", { class: "hp-rx" }, ...Object.entries(REACTIONS).map(([k, rx]) => h("div", { style: { "--c": rx.color } },
        h("span", null, ...k.split("|").flatMap((t, i) => [chip(t), i ? "" : " + "])), h("b", null, rx.name), h("small", null, rx.desc))),
        ...[[["Vol"], SWIRL_RX], [["Roche", "Sol"], CRYSTAL_RX]].map(([ts, rx]) => h("div", { style: { "--c": rx.color } },
          h("span", null, ...ts.flatMap((t, i) => [chip(t), i < ts.length - 1 ? " ou " : ""]), " + aura"), h("b", null, rx.name), h("small", null, rx.desc))))),
    sec("Altérations",
      h("div", { class: "hp-status" }, ...Object.values(STATUS).map((st) => h("span", { style: { color: st.color } }, h("i", null, st.icon), " ", st.name)))),
    sec("Progression",
      ul([b("Niveau"), ` : un Pokémon est toujours au niveau maximum de son élévation (${C.levelCaps.join(" / ")}).`],
        [b("Élévation"), ` : fragments de son set + cristaux. ${DIFFS.map((d, i) => `${matName(i + 1)} : expéditions ${d.name} gagnées en entier`).join(" ; ")}.`],
        [b("Évolution"), " : certaines espèces évoluent en s'élevant."],
        [b("Étoiles"), ` : fragments du set, +${Math.round(C.stars.bonusPerStar * 100)} % de stats chacune (${C.stars.max} au maximum).`],
        [b("Chromatiques"), " : rares en expédition (révélés au choix final), ou achetés avec des éclats chroma dans la Collection."])),
  ];
}

// Ouvre le guide par-dessus l'écran courant ; Échap ou le bouton ferment.
export function openHelp() {
  if (document.querySelector(".hp-overlay")) return;
  const close = () => { removeEventListener("keydown", onKey, true); el.remove(); };
  const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } };
  const el = h("div", { class: "hp-overlay ex-screen", role: "dialog", "aria-modal": "true", "aria-label": "Comment jouer", onclick: (e) => e.target === el && close() },
    h("div", { class: "hp-box" },
      h("header", null, h("b", null, "Comment jouer"), h("button", { class: "rs-back", onclick: close, "aria-label": "Fermer" }, "×")),
      h("div", { class: "hp-body" }, ...content())));
  addEventListener("keydown", onKey, true);
  document.body.append(el);
  el.querySelector(".hp-box button").focus();
}
