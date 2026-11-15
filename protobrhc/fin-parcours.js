/* Version C 2.0 — 15/11/2026 · fin de parcours compacte (devis, diagnostic) sans niveau de lead ; argumentaire de vente préparé par l'IA et transmis au dossier · historique : VERSIONS.md */
/* ==============================================================
   FIN DE PARCOURS — version C (protobrhc). Remplace la fin de parcours d'ia-devis.js et d'ia-diagnostic.js (C 1.x).
   Ce que voit le dirigeant, en court (décision du 15/11/2026 : récapitulatif trop long, « lead ultra-chaud » visible) :
     Devis      : le message du socle est complété en une phrase (Caisse régionale qui reçoit la demande, délai de
                  rappel), la référence du dossier BRH s'ajoute à celle du devis, et « Suivre mon dossier » rejoint
                  les boutons « Consulter mon devis / Imprimer / Retour ». Plus d'aperçu d'e-mail, plus de chaîne
                  de routage, jamais de niveau de lead ni de score.
     Diagnostic : une phrase sous « Votre demande est enregistrée » (Caisse régionale, délai de rappel).
   Ce que reçoit l'expert : la synthèse de l'IA (profil, questions à poser, pièces à demander, angle d'approche) part
   avec le dossier (BRH_LM.argumentaire, lm-parcours.js → lead.php → module LM ou table leads), sans être affichée.
   Les informations viennent de la réponse de lead.php (dossier, caisse, suivi) ; sans réponse sous 1,5 s, table de
   démonstration département → Caisse régionale (ia-assist.js).
   ============================================================== */
(function () {
  'use strict';
  var IA = window.BRH_IA; if (!IA || window.BRH_FIN_PARCOURS) return;
  window.BRH_FIN_PARCOURS = true;   // lm-parcours.js n'ajoute plus son encart « Suivre mon dossier » : il est ici
  var $ = function (id) { return document.getElementById(id); };
  var esc = IA.esc;
  var page = String(window.BRH_PAGE || location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var prof = function () { try { return JSON.parse(sessionStorage.getItem('brhProfil') || '{}') || {}; } catch (e) { return {}; } };
  function attendre(p, ms) { return p ? Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, ms); })]).then(function (j) { return j || {}; }, function () { return {}; }) : Promise.resolve({}); }
  function nomCaisse(lm, dep) { if (lm && lm.caisse) return lm.caisse; var c = IA.caisse(dep); return c.connue ? c.nom : ''; }
  function argumentaire(ctx, source) {
    return IA.run('synthese', ctx, IA.repli.synthese).then(function (r) {
      var s = r.data || IA.repli.synthese(ctx);
      if (window.BRH_LM && BRH_LM.argumentaire) BRH_LM.argumentaire(s, source);
      IA.track('ia_lead_synthese', { source: r.source, page: source });
      return s;
    });
  }
  var st = document.createElement('style');
  st.textContent = '.fin-c{margin:10px auto 0;max-width:56ch;color:var(--slate,#5c6b64);font-size:.92rem}.fin-c b{color:var(--green,#065145)}';
  document.head.appendChild(st);

  /* ============================== DEVIS EN LIGNE ============================== */
  if (page === 'devis.html' && typeof submitDevis === 'function') {
    var _sd = submitDevis;
    submitDevis = function () {
      var avant = window.BRH_LEAD;
      return Promise.resolve(_sd.apply(this, arguments)).then(function (x) {
        var l = window.BRH_LEAD, done = $('dvDone');
        if (l && l !== avant && done && !done.classList.contains('hidden')) finDevis(l, done);
        return x;
      });
    };
  }
  function finDevis(l, done) {
    attendre(window.BRH_LM_REPONSE, 1500).then(function (lm) {
      var ent = l.entreprise || {}, contact = l.contact || {}, panier = l.panier || [], dep = String(ent.code_postal || '').slice(0, 2);
      var caisse = nomCaisse(lm, dep), msg = $('doneMsg'), ref = $('doneRef');
      var worklife = panier.some(function (p) { return p.solution === 'avantages'; });
      if (msg) msg.textContent = 'Votre devis indicatif est prêt. Il est transmis ' + (caisse ? 'au ' + caisse : 'à votre Caisse régionale')
        + (contact.rappel_expert ? ' : votre expert Banque des RH vous rappelle sous 24 h ouvrées pour le finaliser avec vous.' : ' : votre expert Banque des RH le confirme avec vous avant toute souscription.')
        + (worklife ? ' Vos avantages salariés Worklife peuvent être signés en ligne dès aujourd’hui.' : '');
      if (ref && lm.dossier) ref.textContent = 'Référence ' + (l.reference || '') + ', dossier ' + lm.dossier;
      var cta = done.querySelector('.r-cta');
      if (lm.suivi && cta && !$('finSuivi')) {
        var a = document.createElement('a'); a.className = 'btn btn-outline'; a.id = 'finSuivi'; a.href = lm.suivi; a.textContent = 'Suivre mon dossier';
        cta.appendChild(a);
      }
      try { sessionStorage.removeItem('brhLmSuivi'); } catch (e) {}
      var sc = l.scoring || {};
      var ctx = { source: 'devis en ligne', entreprise: { secteur: ent.secteur, effectif: +((l.rh || {}).salaries_concernes) || 0, departement: dep, naf: ent.naf, idcc: ent.idcc,
                    conventions_declarees: ((ent.source_donnees || {}).conventions || []).map(function (c) { return c.idcc + (c.libelle ? ' — ' + c.libelle : '') + (c.population ? ' (' + c.population + ')' : ''); }) },
                  priorites: prof().priorites || null, deja: prof().deja || [],
                  panier: panier.map(function (p) { return { libelle: p.libelle, formule: p.formule, statut: p.statut, cout_employeur_annuel: p.cout_employeur_annuel }; }),
                  estimation_totale: l.estimation_totale, score: (sc.points != null ? sc.points + '/100' : ''), rappel_souhaite: !!contact.rappel_expert, fonction_contact: contact.fonction };
      argumentaire(ctx, 'devis').then(function (s) { l.synthese_ia = s; });
    });
  }

  /* ============================== DIAGNOSTIC RH ============================== */
  if (page === 'diagnostic.html' && typeof submitLead === 'function') {
    var _sl = submitLead;
    submitLead = function () {
      var r0 = _sl.apply(this, arguments);
      var ok = $('contact-success'); if (!ok || ok.classList.contains('hidden') || $('finDiag')) return r0;
      var dep = typeof depValide === 'function' ? depValide() : '';
      var p = document.createElement('p'); p.className = 'fin-c'; p.id = 'finDiag'; ok.appendChild(p);
      attendre(window.BRH_LM_DERNIER, 1500).then(function (lm) {
        var caisse = nomCaisse(lm, dep);
        p.textContent = 'Votre demande est transmise ' + (caisse ? 'au ' + caisse : 'à votre Caisse régionale') + ' : votre expert Banque des RH vous rappelle sous 24 h ouvrées, avec votre diagnostic sous les yeux.';
        if (typeof state === 'undefined' || typeof calculateFiscalGain !== 'function') return;
        var pr = prof(), g = calculateFiscalGain(state.effectif, state.priorities), sect = $('secteur') ? $('secteur').value : '';
        argumentaire({ source: 'diagnostic', entreprise: { secteur: sect, effectif: state.effectif, departement: dep, idcc: typeof ccnTexte === 'function' ? ccnTexte() : '' },
          priorites: Object.assign({}, state.priorities), deja: pr.deja || [], gains: state.resultsUnlocked ? { fiscalAnnuel: g.total } : null, routage: caisse }, 'diagnostic');
      });
      return r0;
    };
  }
})();
