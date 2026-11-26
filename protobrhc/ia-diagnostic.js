/* Version C 1.0 — 14/11/2026 · IA du diagnostic · historique : VERSIONS.md */
/* ==============================================================
   IA DU PARCOURS — page Diagnostic (version C du test A/B, protobrhc)
   S'appuie sur les fonctions de diagnostic.html du socle (state, calculateFiscalGain,
   onPriority, updateGain, submitLead…) sans les modifier : chaque apport
   de l'IA est ajouté en surcouche.
     Étape 2 — Priorités : « Inspirez-vous des entreprises similaires »
     Étape 3 — Estimation : « Comprendre mon estimation » + scénarios « Et si… »
     Étape 4 — Solutions : « Par où commencer ? » 2 à 3 pistes justifiées et ordonnées
     Étape 6 — Contact : routage, e-mail de prise en charge, aperçu de la synthèse expert
   ============================================================== */
(function () {
  'use strict';
  var IA = window.BRH_IA; if (!IA || typeof state === 'undefined' || typeof calculateFiscalGain !== 'function') return;
  var $ = function (id) { return document.getElementById(id); };
  var v = function (id) { var e = $(id); return e ? String(e.value || '').trim() : ''; };
  var dep = function () { return typeof depValide === 'function' ? depValide() : v('departement'); };
  var prof = function () { try { return JSON.parse(sessionStorage.getItem('brhProfil') || '{}'); } catch (e) { return {}; } };
  var chat = function () { try { return JSON.parse(sessionStorage.getItem('brhProfilChat') || '{}'); } catch (e) { return {}; } };
  var esc = IA.esc, eur = IA.eur;

  /* ============ 1. INSPIRATION « ENTREPRISES SIMILAIRES » ============ */
  var intro = document.querySelector('#block2 .prio-intro');
  if (intro) {
    var box = document.createElement('div'); box.className = 'ia-box ia-compact'; box.id = 'ia-inspire';
    box.innerHTML = '<div class="ia-head">' + IA.badge() + '<h4>Vous hésitez ?</h4></div>'
      + '<p class="ia-lede">Inspirez-vous de ce que priorisent les entreprises qui vous ressemblent (secteur, taille, région).</p>'
      + '<button type="button" class="ia-btn pri" id="ia-inspire-btn">' + IA.SPARK + 'M’inspirer des entreprises similaires</button><div class="ia-out" id="ia-inspire-out"></div>';
    intro.appendChild(box);
    $('ia-inspire-btn').addEventListener('click', inspire);
  }
  function inspire() {
    var out = $('ia-inspire-out'), b = IA.bench(v('secteur'), state.effectif, dep());
    IA.loading(out, 'L’IA compare votre profil aux entreprises similaires…');
    var ctx = { secteur: v('secteur') || 'non précisé', effectif: state.effectif, departement: dep(), benchmark: b };
    IA.run('inspire', ctx, IA.repli.inspire).then(function (r) {
      var d = r.data || IA.repli.inspire(ctx);
      var bars = Object.keys(IA.AX).map(function (k) {
        return '<span>' + IA.AX[k].court + '</span><span class="ia-bar"><i style="width:' + (b.priorites[k] / 4 * 100) + '%"></i></span><b>' + String(b.priorites[k]).replace('.', ',') + '</b>';
      }).join('');
      out.innerHTML = '<p>' + IA.md(d.intro || '') + '</p>'
        + '<div class="ia-bars" aria-label="Priorités moyennes des entreprises similaires">' + bars + '</div>'
        + '<div class="ia-ideas">' + (d.idees || []).slice(0, 3).map(function (x) { return '<div class="ia-idea"><b>' + esc(x.titre) + '</b><br>' + esc(x.pourquoi) + '</div>'; }).join('') + '</div>'
        + (d.question ? '<p><i>' + esc(d.question) + '</i></p>' : '')
        + '<button type="button" class="ia-btn" id="ia-apply">Partir de ces priorités (modifiables)</button>'
        + '<p class="ia-ai-note">Benchmark : ' + esc(b.source) + ' · données agrégées et anonymisées.</p>' + IA.source(r.source);
      $('ia-apply').addEventListener('click', function () {
        Object.keys(IA.AX).forEach(function (k) { var n = Math.round(b.priorites[k]), s = $('s-' + k); if (s) s.value = n; onPriority(k, n); });
        IA.track('ia_inspire_applique', {});
        this.textContent = 'Priorités appliquées : ajustez-les à votre situation'; this.disabled = true;
      });
    });
  }

  /* ============ 2. COMPRENDRE MON ESTIMATION + « ET SI… » ============ */
  var gains = $('gains');
  if (gains) {
    var ex = document.createElement('div'); ex.className = 'ia-box ia-hidden'; ex.id = 'ia-explique';
    ex.innerHTML = '<div class="ia-head">' + IA.badge() + '<h4>Comprendre mon estimation</h4></div>'
      + '<p class="ia-lede">Le moteur du portail calcule ; l’IA vous explique le résultat, en langage simple.</p>'
      + '<button type="button" class="ia-btn pri" data-sc="">' + IA.SPARK + 'M’expliquer ces montants</button>'
      + '<div class="ia-chips"><span class="ia-lede" style="margin:0;align-self:center">Et si…</span>'
      + '<button type="button" class="ia-chip" data-sc="plus10">j’avais 10 salariés de plus ?</button>'
      + '<button type="button" class="ia-chip" data-sc="retraite">je préparais aussi la retraite ?</button>'
      + '<button type="button" class="ia-chip" data-sc="une">je commençais par une seule priorité ?</button></div>'
      + '<div class="ia-out" id="ia-explique-out"></div>';
    gains.parentNode.insertBefore(ex, gains.nextSibling);
    ex.addEventListener('click', function (e) { var b = e.target.closest('[data-sc]'); if (b) explique(b.getAttribute('data-sc')); });
  }
  function resultats(eff, pr) {
    var g = calculateFiscalGain(eff, pr), act = Object.keys(g.details).filter(function (k) { return g.details[k] > 0 && IA.AX[k]; });
    var det = {}; act.forEach(function (k) { det[IA.AX[k].long] = g.details[k]; });
    return { effectif: g.n, dispositifs_actifs: act.map(function (k) { return IA.AX[k].long; }), gain_fiscal_annuel: g.total,
             gain_pouvoir_achat_par_salarie: 400 * act.length, detail_par_dispositif: det };
  }
  function explique(sc) {
    var out = $('ia-explique-out'), pr = Object.assign({}, state.priorities), base = resultats(state.effectif, pr), scen = null;
    if (sc === 'plus10') { var r2 = resultats(+state.effectif + 10, pr); scen = { libelle: 'Et si vous aviez 10 salariés de plus', avant: base.gain_fiscal_annuel, apres: r2.gain_fiscal_annuel }; }
    if (sc === 'retraite') { var p2 = Object.assign({}, pr, { retraite: Math.max(3, pr.retraite) }), r3 = resultats(state.effectif, p2); scen = { libelle: 'Et si vous prépariez aussi la retraite de vos salariés', avant: base.gain_fiscal_annuel, apres: r3.gain_fiscal_annuel }; }
    if (sc === 'une') { var top = Object.keys(pr).sort(function (a, b) { return pr[b] - pr[a]; })[0], p3 = { protection: 1, partageValeur: 1, pouvoirAchat: 1, retraite: 1 }; p3[top] = Math.max(2, pr[top]);
      var r4 = resultats(state.effectif, p3); scen = { libelle: 'Et si vous commenciez seulement par « ' + IA.AX[top].long.toLowerCase() + ' »', avant: base.gain_fiscal_annuel, apres: r4.gain_fiscal_annuel }; }
    IA.loading(out, scen ? 'Le moteur recalcule, l’IA explique…' : 'L’IA prépare son explication…');
    var ctx = { page: 'diagnostic', resultats: Object.assign(base, { regle_de_calcul: 'estimation de démonstration du portail : 600 € par salarié et par dispositif actif pour l’entreprise ; 400 € de pouvoir d’achat par salarié et par dispositif' }), scenario: scen, secteur: v('secteur') };
    IA.run('explique', ctx, IA.repli.explique).then(function (r) {
      var d = r.data || {};
      out.innerHTML = (scen ? '<div class="ia-route"><span>' + esc(scen.libelle) + '</span><b>' + eur(scen.avant) + ' → ' + eur(scen.apres) + ' / an</b></div>' : '')
        + '<p>' + IA.md(d.explication || '') + '</p>' + IA.list(d.points) + (d.vigilance ? '<p><b>Point de vigilance :</b> ' + esc(d.vigilance) + '</p>' : '')
        + '<p class="ia-ai-note">Estimation indicative et non contractuelle.</p>' + IA.source(r.source);
    });
  }
  function key() { return state.effectif + '|' + JSON.stringify(state.priorities); }
  var _ug = updateGain;
  updateGain = function () {
    _ug.apply(this, arguments);
    var b = $('ia-explique'); if (!b) return;
    b.classList.toggle('ia-hidden', !state.resultsUnlocked);
    var o = $('ia-explique-out'); if (o && o.dataset.k !== key()) { o.innerHTML = ''; o.dataset.k = key(); }
  };
  if (state.resultsUnlocked && $('ia-explique')) $('ia-explique').classList.remove('ia-hidden');

  /* ============ 3. PISTES PRIORITAIRES JUSTIFIÉES ============ */
  var host = $('rec-cards');
  if (host) {
    var rb = document.createElement('div'); rb.className = 'ia-box'; rb.id = 'ia-preconise';
    rb.innerHTML = '<div class="ia-head">' + IA.badge() + '<h4>Par où commencer ?</h4></div>'
      + '<p class="ia-lede">L’IA croise vos priorités, votre taille et ce qui est déjà en place, applique la grille d’orientation validée, et vous propose 2 à 3 pistes dans l’ordre.</p>'
      + '<button type="button" class="ia-btn pri" id="ia-preco-btn">' + IA.SPARK + 'Obtenir mes pistes prioritaires</button><div class="ia-out" id="ia-preco-out"></div>';
    host.parentNode.insertBefore(rb, host);
    $('ia-preco-btn').addEventListener('click', preconise);
  }
  function profilCtx() {
    var p = prof(), c = chat(), g = calculateFiscalGain(state.effectif, state.priorities);
    return { effectif: state.effectif, secteur: v('secteur'), departement: dep(), idcc: typeof ccnTexte === 'function' ? ccnTexte() : '',
             priorites: Object.assign({}, state.priorities), enjeu: c.enjeu || '', deja: p.deja || c.deja || [],
             gains: state.resultsUnlocked ? { fiscalAnnuel: g.total } : null };
  }
  function preconise() {
    var out = $('ia-preco-out'), ctx = profilCtx(); IA.loading(out, 'L’IA applique la grille d’orientation à votre profil…');
    IA.run('preconise', ctx, IA.repli.preconise).then(function (r) { render(out, r.data || IA.repli.preconise(ctx), ctx, r.source); });
  }
  function render(out, d, ctx, src) {
    var eff = +ctx.effectif || 0, devisOk = eff >= 5 && eff <= 50;
    out.innerHTML = '<p>' + IA.md(d.constat || '') + '</p><div class="ia-pistes">' + (d.pistes || []).slice(0, 3).map(function (x, i) {
      return '<div class="ia-piste"><span class="ia-n">' + (i + 1) + '</span><div><b>' + esc(x.titre) + '</b><br>' + esc(x.pourquoi)
        + '<div class="ia-tags">' + (x.quand ? '<span class="ia-tag when">' + esc(x.quand) + '</span>' : '') + (x.canal ? '<span class="ia-tag">' + esc(x.canal) + '</span>' : '') + '</div></div></div>';
    }).join('') + '</div>' + (d.prochaine_etape ? '<p><b>Prochaine étape :</b> ' + esc(d.prochaine_etape) + '</p>' : '')
      + '<div class="ia-chips">' + (devisOk ? '<a class="ia-btn pri" href="devis.html">Obtenir mon devis en ligne</a>' : '')
      + (typeof goToContact === 'function' ? '<button type="button" class="ia-btn" id="ia-preco-contact">Être rappelé par un expert</button>' : '') + '</div>'
      + IA.source(src);
    var bc = $('ia-preco-contact'); if (bc) bc.addEventListener('click', function () { goToContact(); });
  }

  /* ============ 4. APRÈS LA DEMANDE DE CONTACT ============ */
  if (typeof submitLead === 'function') {
    var _sl = submitLead;
    submitLead = function () {
      var r0 = _sl.apply(this, arguments);
      var ok = $('contact-success'); if (!ok || ok.classList.contains('hidden') || $('ia-after')) return r0;
      var cr = IA.caisse(dep()), c = profilCtx(), slot = document.createElement('div'); slot.id = 'ia-after';
      ok.appendChild(slot); IA.loading(slot, 'L’IA prépare la synthèse pour votre expert…');
      var ctx = { source: 'diagnostic', entreprise: { secteur: c.secteur, effectif: c.effectif, departement: c.departement, idcc: c.idcc },
                  priorites: c.priorites, enjeu: c.enjeu, deja: c.deja, gains: c.gains, routage: cr.nom };
      IA.run('synthese', ctx, synthFallback).then(function (r) {
        var s = r.data || synthFallback(ctx);
        try { if (window.BRH_LAST_LEAD) window.BRH_LAST_LEAD.synthese_ia = s; } catch (e) {}
        slot.innerHTML = '<div class="ia-route"><span>Département ' + esc(cr.dep || '—') + '</span>→<span>' + esc(cr.nom) + '</span>→<span>Expert Banque des RH</span></div>'
          + '<div class="ia-mail"><div class="h">E-mail envoyé automatiquement · Objet : votre demande est prise en charge</div>'
          + 'Bonjour,<br>Votre demande a été transmise à <b>' + esc(cr.nom) + '</b>. Votre expert Banque des Ressources Humaines, <b>[nom attribué par la Caisse]</b>, vous rappelle sous 24 h ouvrées, avec votre diagnostic sous les yeux : vous n’aurez rien à répéter.</div>'
          + expertView(s) + IA.source(r.source)
          + '<p class="ia-ai-note">Aperçu de démonstration : en V0.0, SOLEAD envoie cette synthèse à l’expert BRH ; la console nationale trace l’attribution.' + (cr.connue ? '' : ' Table département → Caisse régionale à compléter.') + '</p>';
        IA.track('ia_lead_synthese', { source: r.source, page: 'diagnostic' });
      });
      return r0;
    };
  }
  function expertView(s) {
    return '<div class="ia-expert"><h4>Ce que reçoit l’expert · ' + esc(s.titre || '') + '</h4>'
      + '<div class="k">Synthèse</div>' + IA.list(s.synthese) + '<div class="k">Questions à poser</div>' + IA.list(s.questions)
      + '<div class="k">Pièces à demander</div>' + IA.list(s.pieces) + (s.angle ? '<div class="k">Angle d’approche</div><p style="margin:2px 0 0">' + esc(s.angle) + '</p>' : '') + '</div>';
  }
  function synthFallback(c) {
    var e = c.entreprise || {}, pr = c.priorites || {}, top = Object.keys(pr).filter(function (k) { return pr[k] >= 3 && IA.AX[k]; }).map(function (k) { return IA.AX[k].court; });
    return { titre: (e.secteur || 'Entreprise') + ' · ' + (e.effectif || '?') + ' salariés',
             synthese: [(e.secteur || 'Secteur non précisé') + ', ' + e.effectif + ' salariés' + (e.departement ? ', département ' + e.departement : '') + (e.idcc ? ', ' + e.idcc : ''),
                        'Priorités fortes : ' + (top.join(', ') || 'à préciser'), c.enjeu ? 'Enjeu déclaré : ' + c.enjeu : 'Enjeu à préciser au rappel',
                        c.gains ? 'Gain estimé par le portail : ' + eur(c.gains.fiscalAnnuel) + ' / an' : 'Estimation non consultée',
                        (c.deja && c.deja.length) ? 'Déjà en place : ' + c.deja.join(', ') : 'Aucun dispositif déclaré'],
             questions: ['Votre premier enjeu : attirer ou fidéliser ?', 'Quels contrats avez-vous déjà, et à quelle échéance ?', 'Qui décide avec vous (associé, expert-comptable) ?'],
             pieces: ['Contrats de mutuelle et de prévoyance en cours', 'Convention collective appliquée'], angle: 'Partir des priorités fortes et des gains estimés, puis proposer un plan en étapes.' };
  }
})();
