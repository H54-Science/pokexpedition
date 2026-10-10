// Écrans de l'expédition : Difficulté → Set → Actes (équipe + bénédictions) → Choix final → Bilan.
// Structure pensée pour l'habillage : chaque bloc a une classe stable (rs-*) et ses images viennent de src/ui/art.js.
import { h } from "../core.js";
import { SPECIES, TYPE_COLOR, fr } from "../data/data.js";
import { portrait } from "../render/assets.js";
import * as M from "../meta/index.js";
import { ART, paint } from "./art.js";
import { icon, scenery, eyebrow, stat, pokerFace } from "./theatre.js";

const { CONFIG } = M;
const RF = { weak: "Faible", nice: "Sympa", legend: "Légendaire" };
const tchip = (t) => h("span", { class: "rs-type", style: { "--c": TYPE_COLOR[t] } }, t);
const types = (k) => h("span", { class: "rs-types" }, ...SPECIES[k].t.map(tchip));

// Portrait : PNG déclaré dans ART.poke, sinon rendu 3D (asynchrone, mis en cache).
function face(k, cls = "rs-face", shiny = false) {
  const img = h("img", { class: cls, alt: fr(k), draggable: "false" });
  if (ART.poke[k] && !shiny) img.src = ART.poke[k];
  else portrait(k, 160, true, shiny).then((u) => (img.src = u)).catch(() => {});
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
  frame({ step, title, body, actions = [], onBack, bg }) {
    if (this.onKey) removeEventListener("keydown", this.onKey);
    const steps = ["Difficulté", "Set", "Actes"];
    const save = this.save;
    const root = h("div", { class: "rs ex-screen rs-expedition", "data-key": `${step}|${title}` },
      h("div", { class: "rs-top" },
        onBack ? h("button", { class: "rs-back", onclick: onBack, title: "Retour (Échap)", "aria-label": "Retour" }, "‹") : null,
        h("div", { class: "rs-title" }, h("small", null, "Expédition"), h("b", null, title)),
        h("ol", { class: "rs-steps" }, ...steps.map((s, i) => h("li", { class: i === step ? "now" : i < step ? "done" : "" }, h("i", null, i + 1), s))),
        h("div", { class: "rs-res" },
          h("span", { class: "rs-cur voeux", title: "Vœux" }, h("i"), save.voeux),
          ...[1, 2, 3, 4, 5].map((t) => h("span", { class: `rs-cur mat mat${t}`, title: `Matériau de palier ${t}` }, h("i", null, t), save.mats[t])))),
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
  difficulty({ save, onPick, onBack }) {
    this.save = save;
    const D = [1, 2, 3, 4, 5];
    let sel = this.lastDiff && M.access(save, this.lastDiff).ok ? this.lastDiff : [...D].reverse().find((d) => M.access(save, d).ok) || 1;
    const need = CONFIG.run.minRoster;
    const detail = h("div", { class: "rs-detail" });
    const cards = D.map((d) => {
      const a = M.access(save, d), A = ART.diff[d - 1];
      const r = M.expeditionRewards(save, d);
      const reward = [`${r.perAct} vœux par acte`, `Run complet : ${Object.entries(r.clearMats).map(([t, n]) => `P${t}×${n}`).join(" ")}`,
        r.legend > 0 ? `Légendaire : ${Math.round(r.legend * 100)} % de base` : "Légendaire incapturable", r.firstClear ? `1er clear : +${r.firstClear} vœux` : null];
      const el = h("button", { class: "rs-diff" + (a.ok ? "" : " lock"), "aria-disabled": String(!a.ok), onclick: () => { if (!a.ok) return; if (sel === d) go(); else { sel = d; render(); } }, ondblclick: () => a.ok && go() },
        h("div", { class: "rs-diff-art" }, icon(["leaf", "moon", "sword", "crown", "star"][d - 1])),
        h("div", { class: "rs-diff-num" }, h("small", null, `REPRÉSENTATION ${A.name}`), h("b", null, ["Découverte", "Aventure", "Épreuve", "Maîtrise", "Légende"][d - 1])),
        h("div", { class: "rs-diff-lv" }, h("small", null, "Niveau"), h("b", null, a.level)),
        h("div", { class: "rs-diff-req" }, pips(Math.min(a.have, need), need), h("small", null, `${Math.min(a.have, need)}/${need} Pokémon niv. ${a.level}+`)),
        h("ul", { class: "rs-diff-rew" }, ...reward.filter(Boolean).map((x) => h("li", null, x))),
        a.ok ? null : h("div", { class: "rs-lock" }, h("b", null, "Verrouillé"), h("small", null, `Il manque ${need - a.have} Pokémon niveau ${a.level}`)));
      paint(el.querySelector(".rs-diff-art"), A.img, A.color); el.style.setProperty("--accent", A.color);
      return { d, el };
    });
    const go = () => { this.lastDiff = sel; onPick(sel); };
    const render = () => {
      cards.forEach(({ d, el }) => { el.classList.toggle("sel", d === sel); el.setAttribute("aria-pressed", String(d === sel)); });
      const list = M.eligible(save, sel), a = M.access(save, sel);
      detail.innerHTML = "";
      const rewards = M.expeditionRewards(save, sel);
      detail.append(
        h("div", { class: "ex-zone-banner" }, scenery("night"), h("div", null, eyebrow("LE PROCHAIN CHAPITRE VOUS ATTEND"), h("h2", null, "Une troupe. Mille histoires."), h("p", null, "Cinq actes, des bénédictions à saisir, un nouveau partenaire à la clé."))),
        h("div", { class: "ex-stats" }, stat(CONFIG.run.acts, "Actes"), stat(CONFIG.run.teamSize, "Pokémon par combat"), stat(CONFIG.run.uses, "Combats par Pokémon")),
        h("h3", { class: "ex-section-title" }, "Les promesses de l'aventure"),
        h("div", { class: "ex-rewards" },
          h("div", { class: "ex-reward" }, icon("star"), h("div", null, h("b", null, `+${rewards.perAct}`), h("small", null, "Vœux par acte · bénédictions"))),
          ...Object.entries(rewards.clearMats).map(([t, n]) => h("div", { class: "ex-reward" }, icon("crown"), h("div", null, h("b", null, `×${n}`), h("small", null, `Matériaux P${t} · run complet`)))),
          h("div", { class: "ex-reward" }, icon("moon"), h("div", null, h("b", null, rewards.legend > 0 ? `${Math.round(rewards.legend * 100)} %` : "0 %"), h("small", null, "Capture du légendaire · base")))),
        rewards?.firstClear ? h("p", { class: "ex-note" }, `Première représentation réussie · +${rewards.firstClear} vœux supplémentaires.`) : null,
        h("h3", { class: "ex-section-title" }, "Les acteurs disponibles"),
        h("div", { class: "rs-detail-head" }, h("b", null, `Difficulté ${ART.diff[sel - 1].name} — adversaires niveau ${a.level}`),
          h("small", null, `${CONFIG.run.acts} actes · ${CONFIG.run.teamSize} Pokémon par combat · ${CONFIG.run.uses} combats max par Pokémon`)),
        h("div", { class: "rs-mini" }, ...list.slice(0, 12).map((k) => h("div", { class: "rs-mini-p" }, face(k), h("small", null, `N.${save.coll[k].L}`))),
          list.length > 12 ? h("div", { class: "rs-mini-more" }, `+${list.length - 12}`) : null,
          list.length < need ? h("div", { class: "rs-mini-miss" }, `Entraîne ou élève ${need - list.length} Pokémon de plus jusqu'au niveau ${a.level}.`) : null));
      btn.disabled = !a.ok;
    };
    const btn = h("button", { class: "rs-go", onclick: go }, "Choisir le set", h("kbd", null, "Entrée"));
    this.frame({ step: 0, title: "Choisis ta difficulté", bg: ART.bg.expedition, onBack,
      body: [h("div", { class: "rs-diffs" }, ...cards.map((c) => c.el)), detail], actions: [btn] });
    const move = (dx) => { let d = sel; do { d += dx; } while (d >= 1 && d <= 5 && !M.access(save, d).ok); if (d >= 1 && d <= 5) { sel = d; render(); } };
    this.keys({ ArrowLeft: () => move(-1), ArrowRight: () => move(1), Enter: () => !btn.disabled && go(), Escape: onBack });
    render();
  }

  // ───────── 2. set ─────────
  sets({ save, diff, onPick, onBack }) {
    this.save = save;
    const level = M.levelOf(diff);
    let sel = this.lastSet && M.SET[this.lastSet] ? this.lastSet : M.SETS[0].id;
    const cards = M.SETS.map((S) => {
      const all = [S.legend, ...S.nice, ...S.weak];
      const own = all.filter((k) => M.owns(save, k)).length, sh = all.filter((k) => M.owns(save, k, true)).length;
      const ch = M.legendChance(save, S.id, level), A = ART.set[S.id] || {};
      const el = h("button", { class: "rs-set", onclick: () => { if (sel === S.id) go(); else { sel = S.id; render(); } }, ondblclick: () => go() },
        h("div", { class: "rs-set-art" }, scenery({ abysses: "water", terres: "fire", nuit: "night", feerie: "rest" }[S.id])),
        h("div", { class: "rs-set-legend" }, pokerFace(S.legend, { content: face(S.legend, "rs-face big") })),
        h("div", { class: "rs-set-name" }, h("small", null, "Set"), h("b", null, S.name)),
        h("div", { class: "rs-set-leg" }, h("b", null, fr(S.legend)), types(S.legend)),
        h("div", { class: "rs-set-chance" + (ch ? "" : " zero") }, ch ? `${(ch * 100).toFixed(1)} %` : "0 %", h("small", null, ch ? (save.pity[S.id] ? `capture (pity +${Math.round(save.pity[S.id] * 100)})` : "capture du légendaire") : `capturable dès le niveau ${CONFIG.expedition.legend.minLevel}`)),
        h("div", { class: "rs-set-buffs" }, h("small", null, "Bénédictions du set"), ...setBuffChips(S.id)),
        h("div", { class: "rs-set-roster" }, ...all.map((k) => h("span", { class: "rs-set-p" + (M.owns(save, k) ? " own" : "") + (M.owns(save, k, true) ? " shiny" : ""), title: `${fr(k)} · ${RF[M.roleOf(k).role]}` }, face(k, "rs-face xs")))),
        h("div", { class: "rs-set-prog" }, `${own}/${all.length} possédés`, sh ? h("span", { class: "rs-shiny" }, ` · ✦ ${sh}`) : null));
      paint(el.querySelector(".rs-set-art"), A.img, A.color); el.style.setProperty("--accent", A.color || "#888");
      return { id: S.id, el };
    });
    const go = () => { this.lastSet = sel; onPick(sel); };
    const cost = CONFIG.expedition.cost;
    const btn = h("button", { class: "rs-go", onclick: go, disabled: save.voeux < cost }, cost ? `Partir — ${cost} vœux` : "Partir", h("kbd", null, "Entrée"));
    const render = () => cards.forEach(({ id, el }) => { el.classList.toggle("sel", id === sel); el.setAttribute("aria-pressed", String(id === sel)); });
    this.frame({ step: 1, title: `Choisis ton set — difficulté ${ART.diff[diff - 1].name}`, bg: ART.bg.expedition, onBack,
      body: [h("div", { class: "rs-sets" }, ...cards.map((c) => c.el)),
        h("p", { class: "rs-hint" }, `5 actes : faible, faible, sympa, faible, légendaire. Chaque victoire capture le Pokémon et rapporte des vœux ; entre les actes, des bénédictions adaptées au set. À la fin tu gardes un seul Pokémon nouveau.`)],
      actions: [save.voeux < cost ? h("span", { class: "rs-warn" }, `Il te faut ${cost} vœux.`) : null, btn].filter(Boolean) });
    const ids = M.SETS.map((s) => s.id);
    const move = (dx) => { sel = ids[(ids.indexOf(sel) + dx + ids.length) % ids.length]; render(); };
    this.keys({ ArrowLeft: () => move(-1), ArrowRight: () => move(1), Enter: () => !btn.disabled && go(), Escape: onBack });
    render();
  }

  // ───────── 3. préparation de l'acte ─────────
  board({ save, last, onFight, onStop, onLeave, onBuy, onReroll }) {
    this.save = save;
    const run = M.publicRun(save.run), N = CONFIG.run.teamSize, U = CONFIG.run.uses;
    let team = (this.team || []).filter((k) => save.run.uses[k] > 0);
    if (!team.length) team = M.autoTeam(save);
    const act = run.foes[run.i];
    // chemin des actes
    const path = h("div", { class: "rs-path" }, ...run.foes.map((f, i) => {
      const r = save.run.results[i];
      const st = r ? (r.win ? "win" : "lose") : i === run.i ? "now" : "next";
      const known = true;
      const ic = h("i", { class: "rs-node-ic" }, !ART.role[f.role] && known ? face(f.k, "rs-face node") : !known ? icon("star") : null); paint(ic, ART.role[f.role]);
      return h("div", { class: `rs-node ${st} ${f.role}` }, ic, h("small", null, `Acte ${i + 1}`), h("b", null, known ? fr(f.k) : "?"),
        h("em", null, r ? (r.win ? (r.captured ? "capturé" : r.legend ? "échappé" : r.voeux ? `+${r.voeux} vœux` : "gagné") : "défaite") : RF[f.role]));
    }));
    // adversaire
    const foe = h("div", { class: `rs-foe ${act.role}` }, h("div", { class: "rs-foe-portrait" }, pokerFace(act.k, { content: face(act.k, "rs-face big") })),
      h("div", null, h("small", null, `Acte ${run.i + 1} · ${RF[act.role]}`), h("b", null, fr(act.k)), types(act.k), h("p", null, `Niveau ${run.level}`),
        act.role === "legend" ? h("p", { class: "rs-chance" }, `Capture si victoire : ${(M.legendChance(save, run.set, run.level, save.run.legendBonus) * 100).toFixed(1)} %`) : null));
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
        roster.append(h("button", { class: "rs-mon" + (on ? " on" : "") + (left ? "" : " out"), "aria-pressed": String(on), disabled: !left,
          onclick: () => { if (on) team = team.filter((x) => x !== k); else if (team.length < N) team.push(k); else team[N - 1] = k; render(); } },
          pokerFace(form, { content: face(form) }), h("b", null, fr(form)), h("small", null, `N.${save.coll[k].L}`), types(form), pips(left, U)));
      });
      fightBtn.disabled = !team.length;
    };
    const side = h("div", { class: "rs-bag" },
      h("small", null, "Captures"), ...(save.run.captures.length ? save.run.captures.map((c) => h("span", { class: "rs-bag-p" }, face(c.k, "rs-face xs"), fr(c.k))) : [h("em", null, "aucune")]),
      h("small", null, "Gagné"), h("b", null, `${save.run.voeux} vœux`), h("em", null, "Run complet : matériaux"));
    // bénédictions : boutique (ou carte offerte) + actives
    const sv = M.shopView(save);
    const blessings = h("div", { class: "rs-blessings" },
      h("div", { class: "rs-bl-head" }, h("small", { class: "rs-label" }, sv ? (sv.free ? "Bénédiction offerte — choisis-en une" : "Bénédictions — à acheter avec tes vœux") : "Bénédictions"),
        sv && !sv.free ? h("button", { class: "rs-sub sm", disabled: !sv.rerolls, onclick: onReroll }, icon("refresh"), `Relancer (${sv.rerolls})`) : null),
      sv ? h("div", { class: "rs-buffs" }, ...sv.cards.map((c) => buffCard(c, { onClick: c.bought ? null : () => onBuy(c.i), afford: save.voeux >= c.cost }))) : null,
      h("div", { class: "rs-active" }, h("small", null, "Actives :"), ...(save.run.buffs.length ? save.run.buffs.map((id) => { const b = M.buffDef(save.run.set, id); return h("span", { class: "rs-chip", title: b.desc, style: { "--c": b.color } }, b.name); }) : [h("em", null, "aucune")])));
    const banner = last ? h("div", { class: "rs-banner " + (last.win ? "win" : "lose") }, last.text) : null;
    this.frame({ step: 2, title: `${M.SET[run.set].name} — ${ART.diff[run.diff - 1].name}`,
      bg: ART.bg.expedition, onBack: onLeave,
      body: [banner, path, sv ? blessings : null, h("div", { class: "rs-stage" }, foe, h("div", { class: "rs-team" }, h("small", { class: "rs-label" }, "Ton équipe pour cet acte"), slots), side), sv ? null : blessings,
        h("div", { class: "rs-roster-wrap" }, h("small", { class: "rs-label" }, `Tes Pokémon (chacun ${U} combats par run)`), roster)],
      actions: [h("button", { class: "rs-sub", onclick: () => { team = M.autoTeam(save); render(); } }, "Équipe auto"),
        h("button", { class: "rs-sub", onclick: onStop }, "Arrêter et choisir"), fightBtn] });
    this.keys({ Enter: () => team.length && go(), Escape: onLeave });
    render();
  }

  // ───────── 4. fin : choix ─────────
  choice({ save, onKeep }) {
    this.save = save;
    const list = M.choices(save), F = CONFIG.expedition.fragments;
    let sel = list.find((c) => c.isNew)?.i ?? null;
    const cards = list.map((c) => h("button", { class: "rs-pick" + (c.shiny ? " shiny" : "") + (c.isNew ? "" : " dup"), disabled: !c.isNew, onclick: () => { sel = c.i; render(); }, ondblclick: () => c.isNew && keep() },
      pokerFace(c.k, { content: face(c.k, "rs-face big", c.shiny) }), c.shiny ? h("div", { class: "rs-shiny-tag" }, "✦ CHROMATIQUE") : null,
      h("small", null, RF[c.role]), h("b", null, fr(c.k)), types(c.k),
      h("em", null, c.isNew ? "Nouveau" : `Déjà possédé → ${F[c.role]} fragment${F[c.role] > 1 ? "s" : ""}${c.shiny ? " + 1 éclat" : ""}`)));
    const keep = () => onKeep(sel);
    const btn = h("button", { class: "rs-go", onclick: keep });
    const render = () => {
      list.forEach((c, i) => cards[i].classList.toggle("sel", c.i === sel));
      btn.textContent = sel === null ? "Terminer" : `Garder ${fr(list[sel].k)}`; btn.append(h("kbd", null, "Entrée"));
    };
    this.frame({ step: 2, title: "Garde un seul Pokémon", bg: ART.bg.choice,
      body: [list.length ? h("div", { class: "rs-picks" }, ...cards) : h("p", { class: "rs-hint" }, "Aucune capture cette fois."),
        h("p", { class: "rs-hint" }, `Les autres deviennent des fragments du set (faible ${F.weak}, sympa ${F.nice}, légendaire ${F.legend}) ; un chromatique non gardé donne 1 éclat.`)],
      actions: [list.some((c) => c.isNew) ? h("button", { class: "rs-sub", onclick: () => onKeep(null) }, "Ne rien garder") : null, btn].filter(Boolean) });
    this.keys({ Enter: keep });
    render();
  }

  // ───────── 5. bilan ─────────
  summary({ save, sum, onOk }) {
    this.save = save;
    const lines = [sum.cleared ? "Expédition réussie !" : "Expédition interrompue",
      sum.kept ? `${fr(sum.kept.k)}${sum.kept.shiny ? " ✦" : ""} rejoint ta collection !` : "Aucun Pokémon gardé",
      `+${sum.frags} fragments (${M.SET[sum.set].name})`, sum.shards ? `+${sum.shards} éclat chroma` : null,
      `+${sum.voeux} vœux gagnés${sum.firstClear ? ` (dont ${sum.firstClear} de premier clear)` : ""}`,
      ...Object.entries(sum.mats).map(([t, n]) => `Matériau P${t} ×${n}`), sum.cleared ? null : "Les matériaux ne sont donnés que pour un run complet."];
    const btn = h("button", { class: "rs-go", onclick: onOk }, "Retour au hall", h("kbd", null, "Entrée"));
    this.frame({ step: 2, title: "Bilan", bg: ART.bg.expedition,
      body: h("div", { class: "rs-summary" }, sum.kept ? face(sum.kept.k, "rs-face big", sum.kept.shiny) : null, ...lines.filter(Boolean).map((l, i) => (i ? h("p", null, l) : h("h2", null, l)))),
      actions: [btn] });
    this.keys({ Enter: onOk, Escape: onOk });
  }
}
