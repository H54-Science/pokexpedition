// Écrans de l'expédition : Difficulté → Set → [Bénédiction → Équipe → combat] × actes → Choix final → Bilan.
// Structure pensée pour l'habillage : chaque bloc a une classe stable (rs-*) et ses images viennent de src/ui/art.js.
import { h } from "../core.js";
import { SPECIES, TYPE_COLOR, fr } from "../data/data.js";
import { portrait } from "../render/assets.js";
import * as M from "../meta/index.js";
import { ART, paint } from "./art.js";
import { icon, pokerFace } from "./theatre.js";

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
// Carte de bénédiction (boutique) ; rareté 1..3 → classe r1..r3.
function buffCard(c, { onClick, afford }) {
  return h("button", { class: `rs-buff r${c.rarity}` + (c.bought ? " bought" : "") + (afford ? "" : " poor"), style: { "--c": c.color }, disabled: !onClick || !afford, onclick: onClick },
    h("div", { class: "rs-buff-ic" }, icon(c.icon || "star")),
    h("small", null, ["Commune", "Rare", "Épique"][c.rarity - 1]), h("b", null, c.name), h("p", null, c.desc),
    h("em", null, c.bought ? "Acquise" : c.cost ? `${c.cost} vœux` : "Offerte"));
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

  // ───────── 1. difficulté ─────────
  difficulty({ save, onPick, onBack, onCollection }) {
    this.save = save;
    const D = DIFFS.map((_, i) => i + 1);
    let sel = this.lastDiff && M.access(save, this.lastDiff).ok ? this.lastDiff : [...D].reverse().find((d) => M.access(save, d).ok) || 1;
    const need = CONFIG.run.minRoster, lf = M.legendFrom();
    const detail = h("div", { class: "rs-detail" });
    const cards = D.map((d) => {
      const a = M.access(save, d), A = DIFFS[d - 1];
      const el = h("button", { class: "rs-diff" + (a.ok ? "" : " lock"), onclick: () => { if (sel === d && a.ok) go(); else { sel = d; render(); } }, ondblclick: () => a.ok && go() },
        h("div", { class: "rs-diff-art" }, icon(A.icon || "star")),
        h("div", { class: "rs-diff-num" }, h("small", null, `DIFFICULTÉ ${roman(d)}`), h("b", null, A.name)),
        h("div", { class: "rs-diff-lv" }, h("small", null, "Adversaires niveau"), h("b", null, a.level)),
        a.ok ? null : h("div", { class: "rs-lock" }, h("b", null, "Verrouillé"), h("small", null, `${a.have}/${need} Pokémon niveau ${a.level}`)));
      paint(el.querySelector(".rs-diff-art"), A.img, A.color || "#8a6aff"); el.style.setProperty("--accent", A.color || "#8a6aff");
      return { d, el };
    });
    const go = () => { if (!M.access(save, sel).ok) return; this.lastDiff = sel; onPick(sel); };
    const render = () => {
      cards.forEach(({ d, el }) => { el.classList.toggle("sel", d === sel); el.setAttribute("aria-pressed", String(d === sel)); });
      const a = M.access(save, sel), r = M.expeditionRewards(save, sel), Dn = DIFFS[sel - 1].name;
      detail.replaceChildren(...[a.ok ? howTo() : lockedPanel(save, sel, a, onCollection),
        h("h3", { class: "ex-section-title" }, `Récompenses · ${Dn}`),
        h("div", { class: "ex-rewards" },
          h("div", { class: "ex-reward" }, icon("star"), h("div", null, h("b", null, `+${r.perAct}`), h("small", null, "vœux par combat gagné"))),
          ...Object.entries(r.clearMats).map(([t, n]) => h("div", { class: "ex-reward" }, h("i", { class: "rs-gem", style: { "--c": DIFFS[t - 1].color } }), h("div", null, h("b", null, `×${n}`), h("small", null, `${M.matName(+t)} · si tu gagnes les ${r.acts} combats`)))),
          h("div", { class: "ex-reward" }, icon("crown"), h("div", null, h("b", null, r.legend > 0 ? `${Math.round(r.legend * 100)} %` : "—"), h("small", null, r.legend > 0 ? "chance de capturer le légendaire" : lf ? `légendaire capturable à partir de ${lf.name}` : "légendaire non capturable")))),
        r.firstClear ? h("p", { class: "ex-note" }, `Première victoire complète en ${Dn} : +${r.firstClear} vœux.`) : null,
        a.ok ? h("h3", { class: "ex-section-title" }, `Tes Pokémon niveau ${a.level}+ (${a.have})`) : null,
        a.ok ? h("div", { class: "rs-mini" }, ...M.eligible(save, sel).slice(0, 12).map((k) => h("div", { class: "rs-mini-p" }, face(M.formOf(k, save.coll[k].elev)), h("small", null, `N.${save.coll[k].L}`))),
          a.have > 12 ? h("div", { class: "rs-mini-more" }, `+${a.have - 12}`) : null) : null].filter(Boolean));
      btn.disabled = !a.ok;
    };
    const btn = h("button", { class: "rs-go", onclick: go }, "Choisir le set", h("kbd", null, "Entrée"));
    this.frame({ step: 0, title: "Choisis ta difficulté", bg: ART.bg.expedition, onBack,
      body: [h("div", { class: "rs-diffs", style: { "--n": D.length } }, ...cards.map((c) => c.el)), detail], actions: [btn] });
    const move = (dx) => { const d = sel + dx; if (d >= 1 && d <= D.length) { sel = d; render(); } };
    this.keys({ ArrowLeft: () => move(-1), ArrowRight: () => move(1), ArrowUp: () => move(-1), ArrowDown: () => move(1), Enter: go, Escape: onBack });
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

  // ───────── 3a. bénédiction avant l'acte (étape à part, pour ne pas surcharger le choix de l'équipe) ─────────
  blessings({ save, last, onBuy, onReroll, onContinue, onLeave }) {
    this.save = save;
    const run = save.run, sv = M.shopView(save), act = run.foes[run.i];
    const head = sv.free
      ? "Une bénédiction t'est offerte : choisis-en une. Elle dure jusqu'à la fin de l'expédition."
      : `Dépense tes vœux (${save.voeux}) en bénédictions pour le reste de l'expédition, ou garde-les pour plus tard.`;
    const banner = last ? h("div", { class: "rs-banner " + (last.win ? "win" : "lose") }, last.text) : null;
    this.frame({ step: 2, title: `Avant l'acte ${run.i + 1} — ${fr(act.k)}`, kicker: `${M.SET[run.set].name} · ${DIFFS[run.diff - 1].name}`, key: `bless|${run.i}`, bg: ART.bg.expedition, onBack: onLeave,
      body: [banner, h("div", { class: "rs-blessings" },
        h("div", { class: "rs-bl-head" }, h("small", { class: "rs-label" }, sv.free ? "Bénédiction offerte" : "Bénédictions"),
          !sv.free ? h("button", { class: "rs-sub sm", disabled: !sv.rerolls, onclick: onReroll }, icon("refresh"), `Relancer (${sv.rerolls})`) : null),
        h("p", { class: "rs-hint left" }, head),
        h("div", { class: "rs-buffs" }, ...sv.cards.map((c) => buffCard(c, { onClick: c.bought ? null : () => onBuy(c.i), afford: save.voeux >= c.cost }))),
        activeBuffs(save))],
      actions: [h("button", { class: "rs-go", onclick: onContinue }, sv.free ? "Passer" : "Continuer", h("kbd", null, "Entrée"))] });
    this.keys({ Enter: onContinue, Escape: onLeave });
  }

  // ───────── 3b. équipe de l'acte ─────────
  board({ save, last, onFight, onStop, onLeave }) {
    this.save = save;
    const run = M.publicRun(save.run), N = CONFIG.run.teamSize, U = CONFIG.run.uses;
    let team = (this.team || []).filter((k) => save.run.uses[k] > 0);
    if (!team.length) team = M.autoTeam(save);
    const act = run.foes[run.i], lchance = M.legendChance(save, run.set, run.level, save.run.legendBonus), lf = M.legendFrom();
    // chemin des actes
    const path = h("div", { class: "rs-path", style: { "--n": run.foes.length } }, ...run.foes.map((f, i) => {
      const r = save.run.results[i];
      const st = r ? (r.win ? "win" : "lose") : i === run.i ? "now" : "next";
      const ic = h("i", { class: "rs-node-ic" }, !ART.role[f.role] ? face(f.k, "rs-face node") : null); paint(ic, ART.role[f.role]);
      return h("div", { class: `rs-node ${st} ${f.role}` }, ic, h("small", null, `Acte ${i + 1}`), h("b", null, fr(f.k)),
        h("em", null, r ? (r.win ? (r.captured ? "capturé" : r.legend ? (r.legend.chance ? "échappé" : "vaincu") : "vaincu") : "défaite") : RF[f.role]));
    }));
    // adversaire
    const foe = h("div", { class: `rs-foe ${act.role}` }, h("div", { class: "rs-foe-portrait" }, pokerFace(act.k, { content: face(act.k, "rs-face big") })),
      h("div", null, h("small", null, `Acte ${run.i + 1} · ${RF[act.role]}`), h("b", null, fr(act.k)), types(act.k), h("p", null, `Niveau ${run.level}`),
        act.role === "legend" ? h("p", { class: "rs-chance" }, lchance ? `Capture si victoire : ${(lchance * 100).toFixed(1)} %` : `Non capturable à ce niveau${lf ? ` (à partir de ${lf.name})` : ""} : bats-le pour finir l'expédition.`)
          : h("p", { class: "rs-chance soft" }, "Capturé si tu gagnes.")));
    // équipe (3 emplacements : gauche, centre, droite)
    const slots = h("div", { class: "rs-slots" });
    const roster = h("div", { class: "rs-roster" });
    const fightBtn = h("button", { class: "rs-go", onclick: () => team.length && go() }, "Entrer en combat", h("kbd", null, "Entrée"));
    const go = () => { this.team = team.slice(); onFight(team.slice()); };
    const render = () => {
      slots.innerHTML = "";
      ["Gauche", "Centre", "Droite"].slice(0, N).forEach((pos, i) => {
        const k = team[i];
        slots.append(k ? h("button", { class: "rs-slot full", onclick: () => { team.splice(i, 1); render(); }, title: "Retirer" },
          face(M.formOf(k, save.coll[k].elev), "rs-face big"), h("b", null, fr(M.formOf(k, save.coll[k].elev))), h("small", null, `N.${save.coll[k].L} · ${pos}`), pips(save.run.uses[k], U))
          : h("div", { class: "rs-slot" }, h("small", null, pos), h("b", null, "+")));
      });
      roster.innerHTML = "";
      Object.keys(save.run.uses).sort((a, b) => save.coll[b].L - save.coll[a].L || a.localeCompare(b)).forEach((k) => {
        const left = save.run.uses[k], on = team.includes(k), form = M.formOf(k, save.coll[k].elev);
        roster.append(h("button", { class: "rs-mon" + (on ? " on" : "") + (left ? "" : " out"), "aria-pressed": String(on), disabled: !left, title: left ? `${left} combat${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}` : "Plus de combat pour cette expédition",
          onclick: () => { if (on) team = team.filter((x) => x !== k); else if (team.length < N) team.push(k); else team[N - 1] = k; render(); } },
          pokerFace(form, { content: face(form) }), h("b", null, fr(form)), h("small", null, `N.${save.coll[k].L}`), types(form), pips(left, U)));
      });
      fightBtn.disabled = !team.length;
    };
    const bag = M.itemBag(save.run.items || {});
    const side = h("div", { class: "rs-bag" },
      h("small", null, "Captures"), ...(save.run.captures.length ? save.run.captures.map((c) => h("span", { class: "rs-bag-p" }, face(c.k, "rs-face xs"), fr(c.k))) : [h("em", null, "aucune")]),
      h("small", null, "Objets (utilisables en combat)"), ...(Object.keys(bag).length ? Object.values(bag).map((it) => h("span", { class: "rs-bag-item", title: it.desc, style: { "--c": it.color } }, h("i"), `${it.name} ×${it.n}`)) : [h("em", null, "sac vide")]),
      activeBuffs(save));
    let armed = false;
    const stop = h("button", { class: "rs-sub", onclick: () => { if (armed) return onStop(); armed = true; stop.textContent = "Confirmer : finir maintenant"; stop.classList.add("armed"); } }, "Finir l'expédition ici");
    const banner = last ? h("div", { class: "rs-banner " + (last.win ? "win" : "lose") }, last.text) : null;
    this.frame({ step: 2, title: `Acte ${run.i + 1} — ton équipe`, kicker: `${M.SET[run.set].name} · ${DIFFS[run.diff - 1].name}`, key: `board|${run.i}`,
      bg: ART.bg.expedition, onBack: onLeave,
      body: [banner, path, h("div", { class: "rs-stage" }, foe, h("div", { class: "rs-team" }, h("small", { class: "rs-label" }, `Ton équipe : jusqu'à ${N} Pokémon`), slots), side),
        h("div", { class: "rs-roster-wrap" }, h("small", { class: "rs-label" }, `Tes Pokémon · chacun peut combattre ${U} fois par expédition`), roster)],
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

// Le déroulé d'une expédition, en 4 étapes (affiché au choix de la difficulté).
function howTo() {
  const C = CONFIG, n = C.expedition.order.length;
  const steps = [
    ["Choisis un set", "Un thème, avec son légendaire au dernier combat."],
    [`${n} combats`, `Avant chacun, choisis jusqu'à ${C.run.teamSize} Pokémon. Chacun peut combattre ${C.run.uses} fois par expédition ; les PV reviennent entre les combats.`],
    ["Bénédictions", "Chaque victoire rapporte des vœux. Entre les combats, dépense-les en bonus qui durent toute l'expédition."],
    ["Garde un Pokémon", "Chaque Pokémon battu est capturé. À la fin tu en gardes un nouveau ; les autres deviennent des fragments pour élever tes Pokémon."],
  ];
  return h("div", { class: "rs-how" }, h("h3", { class: "ex-section-title" }, "Comment se déroule une expédition"),
    h("ol", null, ...steps.map(([t, d]) => h("li", null, h("b", null, t), h("span", null, d)))));
}
// Difficulté verrouillée : pourquoi, et quoi faire (même calcul que l'objectif du hall).
function lockedPanel(save, d, a, onCollection) {
  const goal = M.nextGoal(save), D = DIFFS[d - 1];
  return h("div", { class: "rs-locked" },
    h("h3", { class: "ex-section-title" }, `${D.name} est verrouillée`),
    h("p", null, `Il faut ${a.need} Pokémon niveau ${a.level} : tu en as ${a.have}.`),
    h("p", null, "Tes Pokémon gagnent des niveaux en s'élevant dans la Collection. Une élévation coûte des fragments de leur set (captures non gardées) et des cristaux (expéditions gagnées)."),
    goal.unlock === d ? h("p", { class: "rs-goal-line" }, h("b", null, "À faire : "), goal.text) : null,
    onCollection ? h("button", { class: "rs-sub", onclick: onCollection }, icon("crown"), "Ouvrir la Collection") : null);
}
function activeBuffs(save) {
  return h("div", { class: "rs-active" }, h("small", null, "Bénédictions actives"),
    ...(save.run.buffs.length ? save.run.buffs.map((id) => { const b = M.buffDef(save.run.set, id); return h("span", { class: "rs-chip", title: b.desc, style: { "--c": b.color } }, b.name); }) : [h("em", null, "aucune")]));
}
