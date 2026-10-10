// Écrans de l'expédition : Difficulté → Set → [Bénédiction → Équipe → combat] × actes → Choix final → Bilan.
// Structure pensée pour l'habillage : chaque bloc a une classe stable (rs-*) et ses images viennent de src/ui/art.js.
import { h } from "../core.js";
import { SPECIES, TYPE_COLOR, fr } from "../data/data.js";
import { portrait } from "../render/assets.js";
import * as M from "../meta/index.js";
import { ART, paint } from "./art.js";
import { icon, pokerFace } from "./theatre.js";
import { openHelp } from "./help.js";

const { CONFIG, DIFFS } = M;
export const RF = { weak: "Faible", nice: "Élite", legend: "Légendaire" };
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
export const roman = (d) => ROMAN[d - 1] || String(d);
const orderText = (order) => order.map((r) => RF[r].toLowerCase()).join(", ");
const tchip = (t) => h("span", { class: "rs-type", style: { "--c": TYPE_COLOR[t] } }, t);
const types = (k) => h("span", { class: "rs-types" }, ...SPECIES[k].t.map(tchip));

// Portrait : PNG déclaré dans ART.poke, sinon (ou si le PNG manque) rendu 3D (asynchrone, mis en cache).
export function face(k, cls = "rs-face", shiny = false) {
  const img = h("img", { class: cls, alt: fr(k), draggable: "false" });
  const render3d = () => portrait(k, 160, true, shiny).then((u) => (img.src = u)).catch(() => {});
  if (ART.poke[k] && !shiny) { img.addEventListener("error", render3d, { once: true }); img.src = ART.poke[k]; }
  else render3d();
  return img;
}
// Illustration d'une bénédiction (assets/ui/blessings) : une par bénédiction commune, une par famille (affinité, réaction…).
const BUFF_ART = { restes: "restes", poudre: "poudre", cloche: "cloche", scope: "lentille", grelot: "grelot", pendule: "pendule", ruban: "ruban", tempo: "metronome",
  herbe: "herbe", prisme: "prisme", appat: "appat", bourse: "bourse", rx_swirl: "dispersion", rx_crystal: "cristal" };
export const buffArt = (id) => `assets/ui/blessings/${BUFF_ART[id] || (id.startsWith("type_") ? "affinite" : id.startsWith("rx_") ? "reaction" : "herbe")}.webp`;
// Grande carte de bénédiction : image, nom, effet, prix. Rareté 1..3 → bordure.
function blessCard(c, { onClick, afford }) {
  const type = c.id.startsWith("type_") ? c.id.slice(5) : null;
  return h("button", { class: `bl-card r${c.rarity}` + (c.bought ? " bought" : "") + (afford ? "" : " poor"), style: { "--c": c.color }, disabled: !onClick || !afford, onclick: onClick },
    h("div", { class: "bl-art" }, h("img", { src: buffArt(c.id), alt: "", draggable: "false" }), type ? h("span", { class: "rs-type bl-type", style: { "--c": TYPE_COLOR[type] } }, type) : null),
    h("b", null, c.name.replace(/^Maîtrise : /, "")), h("p", null, c.desc),
    h("em", null, c.bought ? "Acquis ✓" : c.cost ? `${c.cost} vœux` : "Gratuit"));
}
// Aperçu des bénédictions propres au set (types et réactions efficaces).
const setBuffChips = (setId) => M.buffPool(setId).filter((b) => /^(type|rx)_/.test(b.id)).map((b) => h("span", { class: "rs-chip", title: b.desc, style: { "--c": b.color } }, b.name.replace(/^(Affinité|Maîtrise) : ?/, "").replace(/^Affinité /, "")));
const pips = (n, max, cls = "rs-pip") => h("span", { class: "rs-pips" }, ...Array.from({ length: max }, (_, i) => h("i", { class: cls + (i < n ? " on" : "") })));

export class RunUI {
  constructor(scr) { this.scr = scr; this.onKey = null; }

  // Cadre commun : fond, barre du haut (retour, titre, étapes, ressources), contenu, barre d'actions.
  frame({ step, title, body, actions = [], onBack, bg, kicker = "Expédition", key, cls = "" }) {
    if (this.onKey) removeEventListener("keydown", this.onKey);
    this.onKey = null;
    const steps = ["Difficulté", "Set", "Combats", "Choix final"];
    const save = this.save;
    const root = h("div", { class: `rs ex-screen rs-expedition ${cls}`, "data-key": key || `${step}|${title}` },
      h("div", { class: "rs-top" },
        onBack ? h("button", { class: "rs-back", onclick: onBack, title: "Retour (Échap)", "aria-label": "Retour" }, "‹") : null,
        h("div", { class: "rs-title" }, h("small", null, kicker), h("b", null, title)),
        step == null ? h("span", { class: "rs-spacer" }) : h("ol", { class: "rs-steps" }, ...steps.map((s, i) => h("li", { class: i === step ? "now" : i < step ? "done" : "" }, h("i", null, i + 1), s))),
        save ? h("div", { class: "rs-res" },
          h("span", { class: "rs-cur voeux", title: "Vœux : gagnés à chaque combat d'expédition, dépensés en bénédictions" }, h("i"), save.voeux),
          // cristaux affichés seulement une fois gagnés (pas de monnaie mystère au départ)
          ...DIFFS.map((D, i) => save.mats[i + 1] ? h("span", { class: "rs-cur mat", title: `${M.matName(i + 1)} : sert à l'élévation ${i + 1}` }, h("i", { style: { background: D.color } }), save.mats[i + 1]) : null)) : null),
      h("div", { class: "rs-body" }, body),
      actions.length ? h("div", { class: "rs-actions" }, ...actions) : null);
    paint(root, bg);
    this.scr.show(root);
    return root;
  }
  keys(map) {
    this.onKey = (e) => { if (e.target.tagName === "INPUT") return; const f = map[e.key]; if (f) { e.preventDefault(); f(e); } };
    addEventListener("keydown", this.onKey);
  }
  close() { if (this.onKey) removeEventListener("keydown", this.onKey); this.onKey = null; }

  // ───────── 1. difficulté : une grande carte au centre, les autres de chaque côté (glisser, flèches) ─────────
  difficulty({ save, onPick, onBack, onCollection }) {
    this.save = save;
    const n = DIFFS.length, need = CONFIG.run.minRoster, lf = M.legendFrom();
    let sel = this.lastDiff && M.access(save, this.lastDiff).ok ? this.lastDiff : DIFFS.map((_, i) => i + 1).reverse().find((d) => M.access(save, d).ok) || 1;
    const track = h("div", { class: "dc-track" }), dots = h("div", { class: "dc-dots" });
    const below = h("div", { class: "dc-below" });
    const btn = h("button", { class: "rs-go", onclick: () => go() }, "Choisir le set", h("kbd", null, "Entrée"));
    const go = () => { if (!M.access(save, sel).ok) return; this.lastDiff = sel; onPick(sel); };
    const move = (dx) => { const d = sel + dx; if (d >= 1 && d <= n) { sel = d; render(); } };
    const card = (d) => {
      const a = M.access(save, d), D = DIFFS[d - 1], r = M.expeditionRewards(save, d);
      const el = h("button", { class: "dc-card" + (a.ok ? "" : " lock") + (d === sel ? " sel" : ""), style: { "--accent": D.color || "#8a6aff", "--o": d - sel }, "aria-label": `${D.name}, niveau ${a.level}${a.ok ? "" : ", verrouillée"}`,
        onclick: () => (d === sel ? go() : ((sel = d), render())) },
        h("div", { class: "dc-art" }, icon(D.icon || "star")),
        h("small", null, `Difficulté ${roman(d)}`), h("b", null, D.name),
        h("div", { class: "dc-lv" }, h("span", null, "Niveau"), h("strong", null, a.level)),
        a.ok ? h("div", { class: "dc-rew" },
            h("span", { title: "vœux par combat gagné" }, icon("star"), `+${r.perAct}`),
            ...Object.entries(r.clearMats).map(([t, k]) => h("span", { title: M.matName(+t) }, h("i", { class: "rs-gem", style: { "--c": DIFFS[t - 1].color } }), `×${k}`)),
            h("span", { title: "capture du légendaire" }, icon("crown"), r.legend > 0 ? `${Math.round(r.legend * 100)} %` : "—"))
          : h("div", { class: "dc-lock" }, h("span", { class: "dc-padlock", "aria-hidden": "true" }, "🔒"), `${a.have}/${need} Pokémon niv. ${a.level}`));
      if (D.img) el.querySelector(".dc-art").style.backgroundImage = `url("${D.img}")`;
      return el;
    };
    const render = () => {
      track.replaceChildren(...DIFFS.map((_, i) => card(i + 1)));
      dots.replaceChildren(...DIFFS.map((_, i) => h("i", { class: i + 1 === sel ? "on" : "" })));
      const a = M.access(save, sel), goal = M.nextGoal(save);
      below.replaceChildren(...(a.ok
        ? [h("p", null, `${CONFIG.expedition.order.length} combats · garde 1 Pokémon à la fin`, lf && M.levelOf(sel) < lf.level ? ` · légendaire capturable à partir de ${lf.name}` : "")]
        : [h("p", { class: "dc-why" }, goal.unlock === sel ? goal.text : `Il faut ${need} Pokémon niveau ${a.level} : élève-les dans la Collection.`),
           onCollection ? h("button", { class: "rs-sub", onclick: onCollection }, "Ouvrir la Collection") : null].filter(Boolean)));
      btn.disabled = !a.ok;
      prev.disabled = sel <= 1; next.disabled = sel >= n;
    };
    const prev = h("button", { class: "dc-nav prev", "aria-label": "Difficulté précédente", onclick: () => move(-1) }, icon("back"));
    const next = h("button", { class: "dc-nav next", "aria-label": "Difficulté suivante", onclick: () => move(1) }, icon("arrow"));
    // glisser au doigt ou à la souris
    let x0 = null;
    const stage = h("div", { class: "dc-stage", onpointerdown: (e) => { x0 = e.clientX; }, onpointerup: (e) => { if (x0 != null && Math.abs(e.clientX - x0) > 40) move(e.clientX < x0 ? 1 : -1); x0 = null; } }, prev, track, next);
    this.frame({ step: 0, title: "Choisis ta difficulté", bg: ART.bg.expedition, onBack, cls: "rs-dcar",
      body: [stage, dots, below,
        h("button", { class: "dc-help", onclick: () => openHelp() }, "? Comment se déroule une expédition")],
      actions: [btn] });
    this.keys({ ArrowLeft: () => move(-1), ArrowRight: () => move(1), Enter: go, Escape: onBack });
    render();
  }

  // ───────── 2. set ─────────
  sets({ save, diff, onPick, onBack }) {
    this.save = save;
    const level = M.levelOf(diff), lf = M.legendFrom();
    let sel = this.lastSet && M.SET[this.lastSet] ? this.lastSet : M.SETS[0].id;
    const cards = M.SETS.map((S) => {
      const all = M.speciesOf(S);
      const own = all.filter((k) => M.owns(save, k)).length, sh = all.filter((k) => M.owns(save, k, true)).length;
      const ch = M.legendChance(save, S.id, level);
      const el = h("button", { class: "rs-set", onclick: () => { if (sel === S.id) go(); else { sel = S.id; render(); } }, ondblclick: () => go() },
        h("div", { class: "rs-set-legend" }, pokerFace(S.legend, { content: face(S.legend, "rs-face big") })),
        h("div", { class: "rs-set-name" }, h("small", null, "Set"), h("b", null, S.name)),
        h("div", { class: "rs-set-leg" }, h("b", null, fr(S.legend)), types(S.legend)),
        h("div", { class: "rs-set-chance" + (ch ? "" : " zero") }, ch ? `${(ch * 100).toFixed(1)} %` : "Non capturable",
          h("small", null, ch ? (save.pity[S.id] ? `capture du légendaire (bonus +${Math.round(save.pity[S.id] * 100)} pts des essais ratés)` : "capture du légendaire") : lf ? `à ce niveau — à partir de ${lf.name}` : "")),
        h("div", { class: "rs-set-buffs" }, h("small", null, "Bénédictions efficaces ici"), ...setBuffChips(S.id)),
        h("div", { class: "rs-set-roster" }, ...all.map((k) => h("span", { class: "rs-set-p" + (M.owns(save, k) ? " own" : "") + (M.owns(save, k, true) ? " shiny" : ""), title: `${fr(k)} · ${RF[M.roleOf(k).role]}` }, face(k, "rs-face xs")))),
        h("div", { class: "rs-set-prog" }, `${own}/${all.length} dans ta collection`, sh ? h("span", { class: "rs-shiny" }, ` · ✦ ${sh}`) : null));
      el.style.setProperty("--accent", S.color || "#888");
      return { id: S.id, el };
    });
    const go = () => { this.lastSet = sel; onPick(sel); };
    const cost = CONFIG.expedition.cost;
    const btn = h("button", { class: "rs-go", onclick: go, disabled: save.voeux < cost }, cost ? `Partir — ${cost} vœux` : "Partir", h("kbd", null, "Entrée"));
    const hint = h("p", { class: "rs-hint" });
    const render = () => {
      cards.forEach(({ id, el }) => { el.classList.toggle("sel", id === sel); el.setAttribute("aria-pressed", String(id === sel)); });
      const order = M.orderOf(sel);
      hint.textContent = `${M.SET[sel].name} : ${order.length} combats (${orderText(order)}). Les Pokémon battus sont capturés ; tu en gardes un à la fin.`;
    };
    this.frame({ step: 1, title: `Choisis ton set — ${DIFFS[diff - 1].name}`, bg: ART.bg.expedition, onBack,
      body: [h("div", { class: "rs-sets", style: { "--n": M.SETS.length } }, ...cards.map((c) => c.el)), hint],
      actions: [save.voeux < cost ? h("span", { class: "rs-warn" }, `Il te faut ${cost} vœux.`) : null, btn].filter(Boolean) });
    const ids = M.SETS.map((s) => s.id);
    const move = (dx) => { sel = ids[(ids.indexOf(sel) + dx + ids.length) % ids.length]; render(); };
    this.keys({ ArrowLeft: () => move(-1), ArrowRight: () => move(1), Enter: () => !btn.disabled && go(), Escape: onBack });
    render();
  }

  // ───────── 3a. bénédiction avant l'acte : grandes cartes illustrées ─────────
  blessings({ save, last, onBuy, onReroll, onContinue, onLeave }) {
    this.save = save;
    const run = save.run, sv = M.shopView(save), act = run.foes[run.i];
    const banner = last ? h("div", { class: "rs-banner " + (last.win ? "win" : "lose") }, last.text) : null;
    this.frame({ step: 2, title: sv.free ? "Choisis un bonus gratuit" : "Bonus à acheter", kicker: `${M.SET[run.set].name} · avant l'acte ${run.i + 1} (${fr(act.k)})`, key: `bless|${run.i}`, bg: ART.bg.expedition, onBack: onLeave, cls: "rs-bless",
      body: [banner,
        h("p", { class: "bl-intro" }, sv.free ? "Il dure jusqu'à la fin de l'expédition." : h("span", null, "Tu as ", h("b", null, `${save.voeux} vœux`), ". Chaque bonus dure jusqu'à la fin de l'expédition.")),
        h("div", { class: "bl-cards" }, ...sv.cards.map((c) => blessCard(c, { onClick: c.bought ? null : () => onBuy(c.i), afford: save.voeux >= c.cost }))),
        save.run.buffs.length ? h("div", { class: "bl-owned" }, h("small", null, "Déjà actifs"), ...save.run.buffs.map((id) => { const b = M.buffDef(run.set, id); return h("img", { src: buffArt(id), alt: b.name, title: `${b.name} : ${b.desc}` }); })) : null],
      actions: [!sv.free ? h("button", { class: "rs-sub", disabled: !sv.rerolls, onclick: onReroll }, `Autres bonus (${sv.rerolls})`) : null,
        h("button", { class: "rs-go", onclick: onContinue }, sv.free ? "Passer" : "Continuer", h("kbd", null, "Entrée"))].filter(Boolean) });
    this.keys({ Enter: onContinue, Escape: onLeave, 1: () => pick(0), 2: () => pick(1), 3: () => pick(2) });
    const pick = (i) => { const c = sv.cards[i]; if (c && !c.bought && save.voeux >= c.cost) onBuy(c.i); };
  }

  // ───────── 3b. équipe de l'acte : l'adversaire en grand, ton équipe en dessous, ta réserve à gauche ─────────
  board({ save, last, onFight, onStop, onLeave }) {
    this.save = save;
    const run = M.publicRun(save.run), N = CONFIG.run.teamSize, U = CONFIG.run.uses;
    let team = (this.team || []).filter((k) => save.run.uses[k] > 0);
    if (!team.length) team = M.autoTeam(save);
    const act = run.foes[run.i], lchance = M.legendChance(save, run.set, run.level, save.run.legendBonus), lf = M.legendFrom();
    const formK = (k) => M.formOf(k, save.coll[k].elev);
    // chemin des actes (petit, en haut à droite)
    const path = h("div", { class: "tb-path", "aria-label": "Progression de l'expédition" }, ...run.foes.map((f, i) => {
      const r = save.run.results[i], st = r ? (r.win ? "win" : "lose") : i === run.i ? "now" : "next";
      return h("div", { class: `tb-node ${st} ${f.role}`, title: `Acte ${i + 1} · ${fr(f.k)} · ${RF[f.role]}` }, face(f.k, "rs-face"), h("small", null, i + 1));
    }));
    // adversaire (grand, au centre)
    const note = act.role === "legend" ? (lchance ? `${(lchance * 100).toFixed(0)} % de chance de le capturer` : `Non capturable ici${lf ? ` (à partir de ${lf.name})` : ""}`) : "Capturé si tu gagnes";
    const foe = h("div", { class: `tb-foe ${act.role}` },
      h("div", { class: "tb-foe-card" }, pokerFace(act.k, { content: face(act.k, "rs-face big") })),
      h("div", { class: "tb-foe-txt" }, h("small", null, `Acte ${run.i + 1} sur ${run.foes.length} · ${RF[act.role]}`), h("b", null, fr(act.k)), types(act.k), h("span", null, `Niveau ${run.level}`), h("em", null, note)));
    const slots = h("div", { class: "tb-slots" });
    const roster = h("div", { class: "tb-roster-grid" });
    const fightBtn = h("button", { class: "rs-go", onclick: () => team.length && go() }, "Combattre", h("kbd", null, "Entrée"));
    const go = () => { this.team = team.slice(); onFight(team.slice()); };
    const render = () => {
      slots.replaceChildren(...Array.from({ length: N }, (_, i) => {
        const k = team[i];
        return k ? h("button", { class: "tb-slot full", onclick: () => { team.splice(i, 1); render(); }, title: "Retirer de l'équipe" },
            pokerFace(formK(k), { content: face(formK(k), "rs-face big") }), h("b", null, fr(formK(k))), h("small", null, `N.${save.coll[k].L}`), pips(save.run.uses[k], U), h("i", { class: "tb-x", "aria-hidden": "true" }, "×"))
          : h("div", { class: "tb-slot" }, h("b", null, "+"), h("small", null, "Choisis un Pokémon dans ta réserve"));
      }));
      roster.replaceChildren(...Object.keys(save.run.uses).sort((a, b) => save.coll[b].L - save.coll[a].L || a.localeCompare(b)).map((k) => {
        const left = save.run.uses[k], on = team.includes(k);
        return h("button", { class: "tb-mon" + (on ? " on" : "") + (left ? "" : " out"), "aria-pressed": String(on), disabled: !left, title: left ? `${fr(formK(k))} · ${left} combat${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}` : "Plus de combat pour cette expédition",
          onclick: () => { if (on) team = team.filter((x) => x !== k); else if (team.length < N) team.push(k); else team[N - 1] = k; render(); } },
          face(formK(k)), h("b", null, fr(formK(k))), pips(left, U));
      }));
      fightBtn.disabled = !team.length;
    };
    let armed = false;
    const stop = h("button", { class: "rs-sub", onclick: () => { if (armed) return onStop(); armed = true; stop.textContent = "Confirmer : finir maintenant"; stop.classList.add("armed"); } }, "Finir ici");
    const banner = last ? h("div", { class: "rs-banner " + (last.win ? "win" : "lose") }, last.text) : null;
    this.frame({ step: 2, title: `Acte ${run.i + 1} — ton équipe`, kicker: `${M.SET[run.set].name} · ${DIFFS[run.diff - 1].name}`, key: `board|${run.i}`, cls: "rs-tb",
      bg: ART.bg.expedition, onBack: onLeave,
      body: [banner, h("div", { class: "tb" },
        h("aside", { class: "tb-roster" }, h("small", { class: "rs-label" }, "Ta réserve"), roster, h("p", { class: "tb-hint" }, `Chaque Pokémon combat ${U} fois par expédition.`)),
        h("section", { class: "tb-main" }, path, foe, h("small", { class: "rs-label tb-label" }, `Ton équipe (${N} max)`), slots))],
      actions: [h("button", { class: "rs-sub", onclick: () => { team = M.autoTeam(save); render(); } }, "Équipe auto"), stop, fightBtn] });
    this.keys({ Enter: () => team.length && go(), Escape: onLeave });
    render();
  }

  // ───────── 4. fin : choix ─────────
  choice({ save, onKeep }) {
    this.save = save;
    const list = M.choices(save), F = CONFIG.expedition.fragments, setName = M.SET[save.run.set].name;
    let sel = list.find((c) => c.isNew)?.i ?? null;
    const cards = list.map((c) => h("button", { class: "rs-pick" + (c.shiny ? " shiny" : "") + (c.isNew ? "" : " dup"), disabled: !c.isNew, onclick: () => { sel = c.i; render(); }, ondblclick: () => c.isNew && keep() },
      pokerFace(c.k, { content: face(c.k, "rs-face big", c.shiny) }), c.shiny ? h("div", { class: "rs-shiny-tag" }, "✦ CHROMATIQUE") : null,
      h("small", null, RF[c.role]), h("b", null, fr(c.k)), types(c.k),
      h("em", null, c.isNew ? "Nouveau !" : `Déjà possédé → ${F[c.role]} fragment${F[c.role] > 1 ? "s" : ""}${c.shiny ? " + 1 éclat chroma" : ""}`)));
    const keep = () => onKeep(sel);
    const btn = h("button", { class: "rs-go", onclick: keep });
    const render = () => {
      list.forEach((c, i) => cards[i].classList.toggle("sel", c.i === sel));
      btn.textContent = sel === null ? "Terminer" : `Garder ${fr(list[sel].k)}`; btn.append(h("kbd", null, "Entrée"));
    };
    this.frame({ step: 3, title: "Garde un seul Pokémon", bg: ART.bg.choice,
      body: [list.length ? h("div", { class: "rs-picks" }, ...cards) : h("p", { class: "rs-hint" }, "Aucune capture cette fois."),
        h("p", { class: "rs-hint" }, `Les autres deviennent des fragments ${setName} (faible ${F.weak}, élite ${F.nice}, légendaire ${F.legend}) : ils servent à élever et à étoiler les Pokémon de ce set. Un chromatique non gardé donne 1 éclat chroma.`)],
      actions: [list.some((c) => c.isNew) ? h("button", { class: "rs-sub", onclick: () => onKeep(null) }, "Ne rien garder") : null, btn].filter(Boolean) });
    this.keys({ Enter: keep });
    render();
  }

  // ───────── 5. bilan ─────────
  summary({ save, sum, goal, onOk }) {
    this.save = save;
    const lines = [sum.cleared ? "Expédition réussie !" : "Expédition terminée",
      sum.kept ? `${fr(sum.kept.k)}${sum.kept.shiny ? " ✦" : ""} rejoint ta collection !` : "Aucun Pokémon gardé",
      `+${sum.frags} fragments ${M.SET[sum.set].name}`, sum.shards ? `+${sum.shards} éclat chroma` : null,
      `+${sum.voeux} vœux${sum.firstClear ? ` (dont ${sum.firstClear} de première victoire)` : ""}`,
      ...Object.entries(sum.mats).map(([t, n]) => `+${n} ${M.matName(+t)}`), sum.cleared ? null : "Les cristaux ne sont donnés que si tu gagnes tous les combats."];
    const btn = h("button", { class: "rs-go", onclick: onOk }, "Retour au hall", h("kbd", null, "Entrée"));
    this.frame({ step: 3, title: "Bilan", bg: ART.bg.expedition,
      body: h("div", { class: "rs-summary" }, sum.kept ? face(sum.kept.k, "rs-face big", sum.kept.shiny) : null, ...lines.filter(Boolean).map((l, i) => (i ? h("p", null, l) : h("h2", null, l))),
        goal ? h("div", { class: "rs-next" }, h("small", null, "Prochain objectif"), h("b", null, goal.title), h("p", null, goal.text)) : null),
      actions: [btn] });
    this.keys({ Enter: onOk, Escape: onOk });
  }
}

