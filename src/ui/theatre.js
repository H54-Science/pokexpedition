import { h } from "../core.js";
import { fr, SPECIES, TYPE_COLOR } from "../data/data.js";

const ICONS = {
  star: '<path d="m24 3 5.8 14.7L45 24l-15.2 6.3L24 45l-5.8-14.7L3 24l15.2-6.3Z"/><path d="m24 13 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/>',
  book: '<path d="M24 12C18 6 9 6 4 8v30c8-3 14-1 20 5 6-6 12-8 20-5V8c-5-2-14-2-20 4v31"/><path d="m11 16 7 3m-7 5 7 3m12-8 7-3m-7 11 7-3"/>',
  crown: '<path d="m6 14 8 8L24 7l10 15 8-8-5 23H11Zm6 29h24M14 31h20"/><circle cx="24" cy="24" r="3"/>',
  moon: '<path d="M34 5C13 2 3 17 9 32c7 17 28 13 33 1-17 7-31-12-8-28Z"/><path d="m34 11 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/>',
  leaf: '<path d="M40 6C8 1 0 28 16 35c18 11 29-10 24-29ZM9 43l24-28M18 30l-2-9m7 4 10 1"/>',
  sword: '<path d="m30 6 12 0 0 12-22 21-11-11Z M10 23l15 15M6 36l7 7m-3-3 8-8"/>',
  flower: '<path d="M24 19C8 1 8 29 20 24 0 36 28 45 24 28c15 18 24-10 5-4C47 8 19 3 24 19Z"/><circle cx="24" cy="24" r="4"/>',
  back: '<path d="M30 10 16 24l14 14M16 24h26"/>',
  arrow: '<path d="M8 24h32M28 12l12 12-12 12"/>',
  gear: '<circle cx="24" cy="24" r="6"/><path d="M21 4h6l1 6 5 2 5-4 4 4-4 5 2 5 6 1v6l-6 1-2 5 4 5-4 4-5-4-5 2-1 6h-6l-1-6-5-2-5 4-4-4 4-5-2-5-6-1v-6l6-1 2-5-4-5 4-4 5 4 5-2Z"/>',
  refresh: '<path d="M39 19A16 16 0 0 0 10 13L5 20m0-11v11h11m-7 9a16 16 0 0 0 29 6l5-7m0 11V28H32"/>',
};
export function icon(name, cls = "") {
  return h("span", { class: "ex-icon " + cls, "aria-hidden": "true", html: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.star}</svg>` });
}
export function sprite(k, cls = "", decorative = false) {
  return h("img", { class: "ex-sprite " + cls, src: `assets/pokemon/${k}.png`, alt: decorative ? "" : fr(k), draggable: "false", decoding: "async" });
}
export const eyebrow = (text) => h("div", { class: "ex-eyebrow" }, text);
export const action = (text, fn, primary = false, disabled = false) => h("button", { class: "ex-button" + (primary ? " primary" : ""), onclick: fn, disabled }, h("span", null, text), icon(primary ? "arrow" : "star"));
export function shell(title, subtitle, body, { back, tools, footer, cls = "" } = {}) {
  return h("section", { class: "ex-screen " + cls },
    h("header", { class: "ex-header" }, icon("book"), h("div", { class: "ex-heading" }, h("h1", null, title), h("small", null, subtitle)),
      h("div", { class: "ex-header-tools" }, tools), back ? h("button", { class: "ex-circle", onclick: back, "aria-label": "Retour", title: "Retour" }, icon("back")) : null),
    h("div", { class: "ex-paper" }, h("div", { class: "ex-corner ex-corner-left", "aria-hidden": "true" }, "✦"), h("div", { class: "ex-corner ex-corner-right", "aria-hidden": "true" }, "✦"), body),
    footer ? h("footer", { class: "ex-footer" }, footer) : null);
}

// Illustrations vectorielles originales, sans dépendance à un service d'images.
export function scenery(kind = "night") {
  const colors = { forest: ["#174958", "#619d89", "#dae6aa"], water: ["#123454", "#54a9bb", "#e6ccab"], fire: ["#54284b", "#bc665a", "#edc58e"], night: ["#252953", "#776eae", "#ecd7a6"], boon: ["#434d6c", "#86acb0", "#f9e9b1"], rest: ["#5f3555", "#cd94ab", "#f3d4b1"] };
  const [dark, mid, gold] = colors[kind] || colors.night;
  const stars = Array.from({ length: 17 }, (_, i) => { const x = 17 + (i * 47) % 245, y = 17 + (i * 31) % 260; return `<path d="m${x} ${y-3} 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/>`; }).join("");
  return h("div", { class: "ex-scenery", "aria-hidden": "true", html: `<svg viewBox="0 0 280 350" preserveAspectRatio="xMidYMid slice"><rect width="280" height="350" fill="${dark}"/><circle cx="184" cy="90" r="68" fill="${mid}" opacity=".6"/><circle cx="180" cy="83" r="40" fill="${gold}"/><circle cx="163" cy="70" r="39" fill="${dark}"/><g fill="${gold}" opacity=".75">${stars}</g><path d="M0 237 38 180 93 231 139 163 200 229 254 185 280 215v140H0" fill="${mid}" opacity=".75"/><path d="M0 269q67-95 130-12t150-30v123H0" fill="${dark}"/><path d="M120 350q88-54 19-71t25-49q-111 44-34 60t-70 60" fill="${gold}" opacity=".26"/><g fill="${dark}" stroke="${mid}" stroke-width="2"><path d="M21 350V77l-30 80 22-4-30 67 30-3-36 69 39-3M255 350V60l40 103-30-7 30 72-29-5 38 76-42-4"/></g><g fill="none" stroke="${gold}" opacity=".65"><path d="M12 330V90Q12 12 140 7q128 5 128 83v240M22 319V92Q22 24 140 17q118 7 118 75v227"/><path d="m37 61 103 49L244 61M140 110v81" stroke-dasharray="2 6"/></g><path d="m140 134 8 17 19 7-19 8-8 19-8-19-19-8 19-7Z" fill="${gold}" opacity=".35"/></svg>` });
}

export function theatreArt() {
  const stars = Array.from({ length: 70 }, (_, i) => `<circle cx="${(i*173)%1000}" cy="${(i*97)%700}" r="${i%4===0?2:1}" fill="#efdab2" opacity="${.2+(i%5)*.15}"/>`).join("");
  return h("div", { class: "ex-theatre-art", "aria-hidden": "true", html: `<svg viewBox="0 0 1000 700"><defs><radialGradient id="portal"><stop stop-color="#b395d1"/><stop offset=".45" stop-color="#6d65b0"/><stop offset="1" stop-color="#1c244e"/></radialGradient></defs>${stars}<circle cx="540" cy="331" r="234" fill="url(#portal)"/><g fill="none" stroke="#b6a883"><ellipse cx="540" cy="331" rx="290" ry="207" transform="rotate(-29 540 331)" opacity=".35"/><circle cx="540" cy="331" r="250" stroke-width="2" opacity=".6"/><circle cx="540" cy="331" r="240" stroke-dasharray="2 14"/><path d="M330 551V253a210 210 0 0 1 420 0v298" stroke-width="12" stroke="#7370a9"/><path d="M351 552V255a189 189 0 0 1 378 0v297" stroke-width="2"/><path d="M368 536V260a172 172 0 0 1 344 0v276" stroke="#a0a1c6" opacity=".6"/></g><path d="M538 169 554 211 596 227 554 242 538 286 523 242 479 227 523 211Z" fill="#f3dfab"/><circle cx="540" cy="228" r="64" fill="none" stroke="#ecd7aa" opacity=".55"/><path d="M110 105q121 91 131 232l-44 166Q320 292 243 61Z" fill="#393761"/><path d="M937 27Q761 146 778 435l39 118Q681 299 761 70Z" fill="#393761"/><path d="M205 27Q316 175 250 315L219 427Q348 229 282 23Z" fill="#62538b"/><path d="M855 25Q720 211 811 408L838 473Q678 260 737 57Z" fill="#585c93"/><g fill="#787395" stroke="#c1b497" stroke-width="1"><path d="m120 478 190-80 72 14-190 87Zm36 29 185-78 73 13-185 81Zm36 32 184-77 69 13-182 80Zm35 31 181-76 71 13-181 80Z"/><path d="m680 444 182-64 44 17-182 64Zm31 28 182-64 44 17-182 64Zm32 28 182-64 44 17-182 64Z"/></g><path d="M256 560q130-85 279 5 115-82 266-6L704 645q-93-46-169-5-135-51-204-12Z" fill="#211f3c" stroke="#bda77a" stroke-width="3"/><path d="M278 554q147-71 257 22 120-95 246-22l-85 64q-75-41-161 9-136-61-190-20Z" fill="#c7bfae"/><path d="M535 576v50M302 565q130-42 213 29m-185-11q88-25 182 24m44-14q103-62 193-27m-191 43q93-55 169-28" fill="none" stroke="#82799a" stroke-width="2"/><g fill="#e5c78a"><path d="m301 166 7 18 17 7-17 7-7 18-7-18-17-7 17-7Zm475 108 6 15 15 6-15 6-6 15-6-15-15-6 15-6ZM431 96l5 11 11 5-11 5-5 11-5-11-11-5 11-5Z"/></g></svg>` },
    h("div", { class: "ex-floating-card one" }, pokerFace("CELEBI")),
    h("div", { class: "ex-floating-card two" }, pokerFace("GENGAR")),
    h("div", { class: "ex-floating-card three" }, pokerFace("LAPRAS")));
}
export function landing({ title, subtitle, primary, secondary, back, resume, best }) {
  return h("section", { class: "ex-screen ex-landing" },
    h("header", { class: "ex-header" }, icon("book"), h("div", { class: "ex-heading" }, h("h1", null, "PokeXpédition"), h("small", null, "LE THÉÂTRE DES POSSIBLES")), h("span", { class: "ex-edition" }, "✦  UNE NOUVELLE AVENTURE"), back ? h("button", { class: "ex-circle", onclick: back, "aria-label": "Retour au hall" }, icon("back")) : null),
    h("div", { class: "ex-landing-body" }, theatreArt(), h("div", { class: "ex-hero-copy" }, eyebrow("LES PORTES SONT OUVERTES"), h("h2", null, title), h("div", { class: "ex-rule" }, "✦"), h("p", null, subtitle), h("div", { class: "ex-hero-actions" }, action(primary.label, primary.fn, true), resume ? action("Reprendre la représentation", resume) : null, secondary ? action(secondary.label, secondary.fn) : null), best ? h("small", null, `Record infini · ${best} combats`) : null)),
    h("footer", { class: "ex-landing-footer" }, h("span", null, "01  /  L'APPEL DE L'AVENTURE"), h("span", null, "Une troupe. Mille histoires."), icon("star")));
}
// Red/black ink follows the primary Pokémon type; sprites retain their colors.
const RED_TYPES = new Set(["Feu", "Fée", "Combat", "Électrik", "Plante", "Dragon"]);
const TYPE_ICON = { Feu: "sword", Eau: "moon", Spectre: "moon", Fée: "star", Plante: "leaf", Électrik: "star", Combat: "sword", Acier: "crown", Dragon: "crown", Psy: "star" };
export function pokerFace(k, { content, kind = "star", unknown = false } = {}) {
  const type = SPECIES[k]?.t[0], symbol = type ? TYPE_ICON[type] || "star" : kind;
  const corner = () => [h("b", null, unknown ? "?" : "A"), icon(symbol)];
  return h("div", { class: "ex-poker-face" + (RED_TYPES.has(type) ? " ink-red" : "") + (unknown ? " unknown" : ""), style: { "--poker-accent": TYPE_COLOR[type] || "#ae99e1" } },
    h("span", { class: "ex-poker-corner", "aria-hidden": "true" }, corner()),
    content || (k ? sprite(k, "", true) : icon(kind, "ex-card-symbol")),
    h("span", { class: "ex-poker-emblem", "aria-hidden": "true", title: type || "Incident" }, icon(symbol)),
    h("span", { class: "ex-poker-corner bottom", "aria-hidden": "true" }, corner()));
}
export function encounterArt(kind, k) {
  return h("div", { class: "ex-card-art" }, pokerFace(k, { kind: kind === "boon" ? "star" : kind === "rest" ? "moon" : "leaf" }));
}
export const stat = (value, label) => h("div", { class: "ex-stat" }, h("b", null, value), h("small", null, label));
export const badge = (kind, label) => h("span", { class: "ex-badge" }, icon(kind), label);
