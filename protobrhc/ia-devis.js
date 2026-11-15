/* Version C 1.13 — 15/11/2026 · synthèse pour l’expert retirée de l’écran du dirigeant et transmise au cockpit ; fin de devis alignée sur le dossier (1.9) · historique : VERSIONS.md */
/* ==============================================================
   IA DU PARCOURS — page Devis en ligne (version C du test A/B, protobrhc)
   Surcouche de devis.html du socle (S, compute, RH, renderEstimation,
   renderCart, submitDevis…), sans modifier le moteur de calcul.
     Étape 5 du devis : « Comprendre mon estimation », scénarios « Et si… »
                        (le moteur recalcule, l'IA explique) et question libre
     Étape 6 du devis : proposition justifiée et ordonnée dans le temps
     Fin              : niveau de lead, routage V0.0, e-mail de prise en charge,
                        synthèse et préparation d'entretien pour l'expert BRH
   ============================================================== */
(function () {
  'use strict';
  var IA = window.BRH_IA; if (!IA || typeof S === 'undefined' || typeof compute !== 'function' || typeof RH !== 'function') return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = IA.esc, eur = IA.eur;
  var prof = function () { try { return JSON.parse(sessionStorage.getItem('brhProfil') || '{}'); } catch (e) { return {}; } };
  var lesVals = function (n) { return typeof vals === 'function' ? vals(n) : []; };

  /* ---------- totaux, comme l'écran « Votre estimation » ---------- */
  function totals(o) {
    var h = RH(), tot = 0, eq = 0, net = 0, costNS = 0;
    S.sol.forEach(function (k) { var r = o[k]; if (!r) return; tot += r.cout || 0;
      if (k !== 'sante') { eq += r.equiv || 0; net += (r.netSal || 0) * (r.benef || 0); costNS += r.cout || 0; } });
    var det = {}; S.sol.forEach(function (k) { if (o[k]) det[DV_SOL[k].title] = { cout_employeur_annuel: o[k].cout == null ? 'sur mesure' : Math.round(o[k].cout), hypotheses: o[k].hyp }; });
    return { salaries: h.N, cout_total: Math.round(tot), gain_net_moyen_par_salarie: h.N ? Math.round(net / h.N) : 0,
             economie_vs_hausse_salaire: Math.round(eq - costNS), detail: det };
  }
  /* le moteur recalcule avec des valeurs modifiées, puis tout est restauré */
  function simulate(changes) {
    var saved = changes.map(function (c) { var el = $(c[0]); return [el, el ? el.value : null]; });
    changes.forEach(function (c) { var el = $(c[0]); if (el) el.value = c[1]; });
    var r = totals(compute());
    saved.forEach(function (s) { if (s[0]) s[0].value = s[1]; });
    compute(); return r;
  }
  function scenarios() {
    var h = RH(), out = [{ id: 'plus5', label: 'j’avais 5 salariés de plus ?', ch: [['h-couv', h.N + 5]] }];
    var t = lesVals('av_type'), d = lesVals('ep_disp');
    if (S.sol.indexOf('avantages') >= 0 && t.indexOf('tr') >= 0 && $('av_trv') && +$('av_trv').value !== 10) out.push({ id: 'tr10', label: 'le titre-restaurant passait à 10 € ?', ch: [['av_trv', 10]] });
    if (S.sol.indexOf('epargne') >= 0 && d.indexOf('ppv') >= 0 && $('ep_ppv') && +$('ep_ppv').value !== 500) out.push({ id: 'ppv500', label: 'la prime de partage était de 500 € ?', ch: [['ep_ppv', 500]] });
    if (S.sol.indexOf('epargne') >= 0 && d.indexOf('pee') >= 0 && $('ep_abd')) out.push({ id: 'abd', label: 'je doublais l’abondement ?', ch: [['ep_abd', Math.min(3000, (+$('ep_abd').value || 250) * 2)]] });
    return out;
  }

  /* ============ ÉTAPE 5 : COMPRENDRE MON ESTIMATION ============ */
  var synth = $('dvSynth'), ex = document.createElement('div');
  ex.className = 'ia-box'; ex.id = 'ia-dv-explique';
  if (synth) synth.parentNode.insertBefore(ex, synth.nextSibling);
  function paintExplique() {
    var sc = scenarios();
    ex.innerHTML = '<div class="ia-head">' + IA.badge() + '<h4>Comprendre mon estimation</h4></div>'
      + '<p class="ia-lede">Le moteur du portail calcule ; l’IA explique chaque montant, ses hypothèses et ses limites, en langage simple.</p>'
      + '<button type="button" class="ia-btn pri" data-sc="">' + IA.SPARK + 'M’expliquer ces montants</button>'
      + '<div class="ia-chips"><span class="ia-lede" style="margin:0;align-self:center">Et si…</span>'
      + sc.map(function (s) { return '<button type="button" class="ia-chip" data-sc="' + s.id + '">' + esc(s.label) + '</button>'; }).join('') + '</div>'
      + '<div class="ia-ask"><input type="text" id="ia-dv-q" maxlength="300" placeholder="Votre question : « Est-ce que je paie des charges sur la prime ? »" aria-label="Votre question sur l’estimation"><button type="button" class="ia-btn" data-q="1">Demander</button></div>'
      + '<div class="ia-out" id="ia-dv-out"></div>';
  }
  ex.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sc],[data-q]'); if (!b) return;
    if (b.hasAttribute('data-q')) { var q = $('ia-dv-q').value.trim(); if (q) explique('', q); return; }
    explique(b.getAttribute('data-sc'), '');
  });
  ex.addEventListener('keydown', function (e) { if (e.target.id === 'ia-dv-q' && e.key === 'Enter') { e.preventDefault(); var q = e.target.value.trim(); if (q) explique('', q); } });
  function explique(id, question) {
    var out = $('ia-dv-out'), base = totals(S.est || compute()), scen = null;
    if (id) { var s = scenarios().filter(function (x) { return x.id === id; })[0];
      if (s) { var r = simulate(s.ch); scen = { libelle: 'Et si ' + s.label.replace(/ \?$/, ''), avant: base.cout_total, apres: r.cout_total,
                                              gain_net_par_salarie_avant: base.gain_net_moyen_par_salarie, gain_net_par_salarie_apres: r.gain_net_moyen_par_salarie }; } }
    IA.loading(out, scen ? 'Le moteur recalcule, l’IA explique…' : 'L’IA prépare sa réponse…');
    var ctx = { page: 'devis', resultats: base, scenario: scen, question: question || '', secteur: (S.ent && S.ent.secteur) || '',
                note: 'cout_total = coût employeur annuel estimé ; un euro net versé en salaire coûte environ 1,81 € à l’employeur (hypothèse du portail)' };
    IA.run('explique', ctx, IA.repli.explique).then(function (r) {
      var d = r.data || {};
      out.innerHTML = (scen ? '<div class="ia-route"><span>' + esc(scen.libelle) + '</span><b>coût ' + eur(scen.avant) + ' → ' + eur(scen.apres) + ' / an</b>'
                        + (scen.gain_net_par_salarie_apres !== scen.gain_net_par_salarie_avant ? '<b>· gain net ' + eur(scen.gain_net_par_salarie_avant) + ' → ' + eur(scen.gain_net_par_salarie_apres) + ' / salarié</b>' : '') + '</div>' : '')
        + (question ? '<p><i>« ' + esc(question) + ' »</i></p>' : '')
        + '<p>' + IA.md(d.explication || '') + '</p>' + IA.list(d.points) + (d.vigilance ? '<p><b>Point de vigilance :</b> ' + esc(d.vigilance) + '</p>' : '')
        + (scen ? '<p class="ia-ai-note">Scénario simulé sans modifier vos réponses : pour le retenir, ajustez la configuration à l’étape 4.</p>' : '')
        + '<p class="ia-ai-note">Estimation indicative et non contractuelle.</p>' + IA.source(r.source);
    });
  }
  if (typeof renderEstimation === 'function') {
    var _re = renderEstimation;
    renderEstimation = function () { var x = _re.apply(this, arguments); paintExplique(); return x; };
  }

  /* ============ ÉTAPE 6 : PROPOSITION JUSTIFIÉE ============ */
  var cart = $('dvCart'), pb = document.createElement('div');
  pb.className = 'ia-box'; pb.id = 'ia-dv-preco';
  if (cart) cart.parentNode.insertBefore(pb, cart.nextSibling);
  function paintPreco() {
    pb.innerHTML = '<div class="ia-head">' + IA.badge() + '<h4>Dans quel ordre avancer ?</h4></div>'
      + '<p class="ia-lede">L’IA relie chaque solution de votre proposition à votre profil, et vous propose un ordre : ce qui se signe en ligne maintenant, ce qui se prépare avec un expert.</p>'
      + '<button type="button" class="ia-btn pri" id="ia-dv-preco-btn">' + IA.SPARK + 'Ordonner et justifier ma proposition</button><div class="ia-out" id="ia-dv-preco-out"></div>';
    $('ia-dv-preco-btn').addEventListener('click', preconise);
  }
  function preconise() {
    var out = $('ia-dv-preco-out'), p = prof(), h = RH();
    var ctx = { effectif: h.N, secteur: (S.ent && S.ent.secteur) || p.secteur || '', priorites: p.priorites || {}, deja: p.deja || [],
                panier: S.sol.slice(), statuts: S.sol.map(function (k) { return DV_SOL[k].title + ' : ' + STATUT_LBL[DV_SOL[k].statut]; }) };
    IA.loading(out, 'L’IA applique la grille d’orientation à votre proposition…');
    IA.run('preconise', ctx, IA.repli.preconise).then(function (r) {
      var d = r.data || {};
      out.innerHTML = '<p>' + IA.md(d.constat || '') + '</p><div class="ia-pistes">' + (d.pistes || []).slice(0, 4).map(function (x, i) {
        return '<div class="ia-piste"><span class="ia-n">' + (i + 1) + '</span><div><b>' + esc(x.titre) + '</b><br>' + esc(x.pourquoi)
          + '<div class="ia-tags">' + (x.quand ? '<span class="ia-tag when">' + esc(x.quand) + '</span>' : '') + (x.canal ? '<span class="ia-tag">' + esc(x.canal) + '</span>' : '') + '</div></div></div>';
      }).join('') + '</div>' + (d.prochaine_etape ? '<p><b>Prochaine étape :</b> ' + esc(d.prochaine_etape) + '</p>' : '') + IA.source(r.source);
    });
  }
  if (typeof renderCart === 'function') {
    var _rc = renderCart;
    renderCart = function () { var x = _rc.apply(this, arguments); paintPreco(); return x; };
  }

  /* ============ FIN DE PARCOURS : LEAD, ROUTAGE, PRISE EN CHARGE ============ */
  if (typeof submitDevis === 'function') {
    var _sd = submitDevis;
    submitDevis = function () {
      var before = window.BRH_LEAD;
      return Promise.resolve(_sd.apply(this, arguments)).then(function (x) {
        var l = window.BRH_LEAD, done = $('dvDone');
        if (l && l !== before && done && !done.classList.contains('hidden')) afterLead(l, done);
        return x;
      });
    };
  }
  function niveau() {
    // niveaux de lead définis le 14/11 : abandonniste, chaud, ultra-chaud (Dossier BRH transmis)
    return { lib: 'Ultra-chaud', det: 'offre configurée et coordonnées laissées : Dossier BRH transmis', delai: '24 h ouvrées' };
  }
  function afterLead(l, done) {
    /* réponse du lead management (lead.php) : même référence de dossier, même Caisse régionale et même e-mail
       que ceux réellement produits ; attente 1,5 s au plus, sinon table de démonstration */
    if (window.BRH_LM_REPONSE && !l.__lm) {
      Promise.race([window.BRH_LM_REPONSE, new Promise(function (r) { setTimeout(function () { r(null); }, 1500); })])
        .then(function (j) { l.__lm = j || {}; afterLead(l, done); }, function () { l.__lm = {}; afterLead(l, done); });
      return;
    }
    var lm = l.__lm || {};
    var old = $('ia-dv-after'); if (old) old.remove();
    var ent = l.entreprise || {}, dep = String(ent.code_postal || '').slice(0, 2), cr = lm.caisse ? { nom: lm.caisse, connue: true } : IA.caisse(dep), eff = +((l.rh || {}).salaries_concernes) || 0;
    var refDossier = lm.dossier || l.reference || '';
    var pro = eff < 50, nv = niveau(), slot = document.createElement('div'); slot.id = 'ia-dv-after';
    var cta = done.querySelector('.r-cta'); done.insertBefore(slot, cta ? cta.nextSibling : null);
    IA.loading(slot, 'L’IA prépare le dossier pour votre expert…');
    var contact = l.contact || {}, panier = l.panier || [], sc = l.scoring || {};
    var ctx = { source: 'devis en ligne', entreprise: { secteur: ent.secteur, effectif: eff, departement: dep, naf: ent.naf, idcc: ent.idcc,
                              conventions_declarees: ((ent.source_donnees || {}).conventions || []).map(function (c) { return c.idcc + (c.libelle ? ' — ' + c.libelle : '') + (c.population ? ' (' + c.population + ')' : ''); }) },
                priorites: (prof().priorites) || null, deja: prof().deja || [],
                panier: panier.map(function (p) { return { libelle: p.libelle, formule: p.formule, statut: p.statut, cout_employeur_annuel: p.cout_employeur_annuel }; }),
                estimation_totale: l.estimation_totale, score: (sc.points != null ? sc.points + '/100' : '') + (sc.maturite ? ' (' + sc.maturite + ')' : ''), niveau_lead: nv.lib,
                rappel_souhaite: !!contact.rappel_expert, fonction_contact: contact.fonction };
    IA.run('synthese', ctx, IA.repli.synthese).then(function (r) {
      var s = r.data || IA.repli.synthese(ctx); l.synthese_ia = s; l.niveau_lead = nv.lib;
      var worklife = panier.filter(function (p) { return p.solution === 'avantages'; }).length;
      slot.innerHTML = '<div class="ia-box" style="text-align:left"><div class="ia-head">' + IA.badge() + '<h4>Ce qui se passe maintenant</h4></div>'
        + '<div class="ia-route"><span>Lead ' + esc(nv.lib.toLowerCase()) + '</span><span>Département ' + esc(dep || '—') + '</span>→<span>' + esc(cr.nom) + '</span>→<span>Expert Banque des RH</span>'
        + (pro ? '→<span>conseiller pro (si l’expert le confie)</span>' : '') + '</div>'
        + '<p class="ia-ai-note">' + esc(nv.det) + ' · prise en charge visée sous ' + esc(nv.delai) + ' · ' + esc(lm.canal ? 'reçu par la Caisse ' + (lm.canal === 'SOLEAD' ? 'via SOLEAD' : (lm.canal === 'CRM + alerte PUC' ? 'dans son CRM, alerte PUC' : 'dans le cockpit BRH')) : 'envoi SOLEAD ou cockpit selon la Caisse (V0.0)') + ', tracé dans la console nationale.</p>'
        + '<div class="ia-mail"><div class="h">E-mail envoyé au dirigeant · Objet : Votre demande ' + esc(refDossier) + ' : votre expert vous rappelle pour finaliser</div>'
        + 'Bonjour' + (contact.prenom ? ' ' + esc(contact.prenom) : '') + ',<br>Votre demande de devis est bien reçue (référence ' + esc(refDossier) + ').<br>Votre expert Banque des Ressources Humaines du <b>' + esc(cr.nom) + '</b> vous rappelle pour finaliser votre devis, avec votre dossier sous les yeux : vous n’aurez rien à ressaisir.'
        + (lm.suivi ? '<br>Suivre votre dossier : <a href="' + esc(lm.suivi) + '">lien de suivi</a>' : '')
        + (worklife ? '<br>Vos avantages salariés Worklife peuvent être signés en ligne dès aujourd’hui (signature électronique).' : '') + '</div>'
        + '<p class="ia-ai-note">Votre expert reçoit votre devis et une synthèse préparée pour l’échange : vous n’aurez rien à ressaisir.</p>'
        + '<p class="ia-ai-note">' + (lm.dossier ? 'Dossier ' + esc(lm.dossier) + ' · devis ' + esc(l.reference || '') + ' · le nom de l’expert est communiqué dès sa prise en charge.' : 'Aperçu de démonstration : le nom de l’expert est attribué par la Caisse régionale ; table département → Caisse à valider.') + '</p></div>';
      /* synthèse détaillée (questions, pièces, angle) : transmise au cockpit de l'expert, plus affichée au dirigeant */
      if (window.BRH_LM && BRH_LM.argumentaire) BRH_LM.argumentaire(s, 'devis');
      IA.track('ia_lead_synthese', { niveau: nv.lib, source: r.source, page: 'devis' });
    });
  }
})();
