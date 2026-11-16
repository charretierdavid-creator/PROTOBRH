/* Version C 2.7 — 16/11/2026 · offres selon l'effectif : formule Amundi conseillée (Convergence jusqu'à 10 salariés, Découverte et Intégrale de 11 à 49, Intégrale de 50 à 200) et offres packagées santé et prévoyance de Crédit Agricole Assurances jusqu'à 200 salariés · historique : VERSIONS.md */
/* ==============================================================
   OFFRES SELON L'EFFECTIF (version C, protobrhc) — règles de David CHARRETIER du 16/11/2026
     Amundi (épargne salariale et retraite) : formule à privilégier
       - 1 à 10 salariés  : formule Convergence (PEI + PER COL-I) ;
       - 11 à 49 salariés : formules Découverte et Intégrale ;
       - 50 à 200 salariés : formule Intégrale ;
       - au-delà de 200 salariés : expert BRH (le devis en ligne s'arrête à 200, acces-devis.js).
     Crédit Agricole Assurances : offres packagées santé et prévoyance jusqu'à 200 salariés (le socle les limitait aux
       moins de 50) ; au-delà, les experts CAA construisent l'offre sur mesure.
   « Privilégier » = la formule de la tranche est présélectionnée dans le devis et porte le badge « Conseillée pour votre
   effectif » ; les autres restent disponibles. Jusqu'à 10 salariés, si un seul des deux besoins (épargne ou retraite)
   est choisi, le devis suggère d'ajouter l'autre pour profiter de la formule Convergence (choix du 16/11/2026).
   Surcouche du socle, sans modifier les pages. Fonctions du socle utilisées (ne pas les renommer) :
     devis : syncFormules, setRadio, renderTabs, renderChoices, save, val, S (S.sol, S.fi, S.done, S.ent.effectif), RH ;
     diagnostic : openSol, state ; accueil / diagnostic : cartesFormules, cartesCAA, BRH_CAA ; audit : resultat, A.
   ============================================================== */
(function () {
  'use strict';
  if (window.__BRH_OFFRES_EFFECTIF) return;
  window.__BRH_OFFRES_EFFECTIF = true;
  var D = document, $ = function (id) { return D.getElementById(id); };
  var page = String(window.BRH_PAGE || location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var MAX = 200;
  var BADGE = 'Conseillée pour votre effectif';

  /* ---------- règles (partagées avec Julia et les tests) ---------- */
  function nb(n) { return parseInt(n, 10) || 0; }
  function tranche(n) { n = nb(n); return n < 1 ? null : n <= 10 ? 't1' : n <= 49 ? 't2' : n <= MAX ? 't3' : 'expert'; }
  /* formules conseillées : clés du devis (ep_form / rt_form) et clés des fiches (formules-amundi.js) */
  var AMUNDI = {
    t1: { ep: ['convergence'], rt: ['convergence'], fiches: ['convergence'], texte: 'jusqu’à 10 salariés : formule Convergence (PEI + PER COL-I, un seul contrat)' },
    t2: { ep: ['decouverte', 'integrale'], rt: ['integrale'], fiches: ['decouverte', 'integrale_epargne', 'integrale_retraite'], texte: 'de 11 à 49 salariés : formules Découverte et Intégrale' },
    t3: { ep: ['integrale'], rt: ['integrale'], fiches: ['integrale_epargne', 'integrale_retraite'], texte: 'de 50 à 200 salariés : formule Intégrale' }
  };
  function amundi(n) { var t = tranche(n); return AMUNDI[t] || null; }
  function caaPackage(n) { var x = nb(n); return !(x > MAX); }   // effectif inconnu ou ≤ 200 : offres packagées
  window.BRH_OFFRES_C = { max: MAX, tranche: tranche, amundi: amundi, caaPackage: caaPackage, badge: BADGE, version: '2.7' };

  var st = D.createElement('style'); st.id = 'offresEffectifC';
  st.textContent =
    '.dv-tag.c-reco,.fa-card .c-reco{background:var(--lime,#8fb822);color:#fff}' +
    '.fa-card .c-reco{display:inline-block;margin-left:8px;font:700 .62rem var(--fb,inherit);text-transform:uppercase;letter-spacing:.04em;border-radius:999px;padding:2px 8px;vertical-align:middle}' +
    '.c-conv{margin:12px 0 0;padding:12px 14px;border-radius:12px;background:var(--mint-2,#eef4ef);border:1.5px solid var(--lime-soft,#c7dd8a);font-size:.86rem;line-height:1.45;color:var(--ink,#233029);display:flex;gap:12px;align-items:center;flex-wrap:wrap}' +
    '.c-conv[hidden]{display:none}.c-conv span{flex:1 1 260px}.c-conv .btn{flex:0 0 auto;padding:.55rem .9rem;font-size:.84rem}' +
    '.c-caa-exp{margin:0 0 12px;padding:12px 14px;border-radius:12px;background:var(--mint-2,#eef4ef);font-size:.86rem;line-height:1.45;color:var(--ink,#233029)}';
  (D.head || D.documentElement).appendChild(st);

  /* ---------- Crédit Agricole Assurances : offres packagées jusqu'à 200 salariés ---------- */
  var CAA_S0 = 'Pour les entrepreneurs et les entreprises de moins de 50 salariés.';
  var CAA_S1 = 'Offres packagées de Crédit Agricole Assurances pour les entreprises jusqu’à 200 salariés.';
  var CAA_PREV = '<p class="caa-s c-caa-prev">Prévoyance collective : offre packagée de Crédit Agricole Assurances, également jusqu’à 200 salariés, chiffrée dans le devis en ligne.</p>';
  var CAA_EXPERT = 'Au-delà de 200 salariés, les experts de Crédit Agricole Assurances construisent votre couverture santé et prévoyance sur mesure, avec votre expert Banque des RH.';
  if (window.BRH_CAA && !BRH_CAA.__c27) {
    BRH_CAA.pourEffectif = caaPackage;
    var _cartes = BRH_CAA.cartes;
    var cartes = function () {
      var h = _cartes.apply(this, arguments);
      h = h.replace(CAA_S0, CAA_S1);
      var i = h.lastIndexOf('</div>');
      return i > 0 && h.indexOf('c-caa-prev') < 0 ? h.slice(0, i) + CAA_PREV + h.slice(i) : h;
    };
    BRH_CAA.cartes = cartes; window.cartesCAA = cartes; BRH_CAA.__c27 = true;
  }

  /* ---------- fiches formules (accueil, diagnostic) : formule conseillée en premier, avec son badge ---------- */
  function effectifPage() {
    if (page === 'diagnostic.html' && typeof state === 'object' && state) return state.effSaisi ? nb(state.effectif) : 0;
    return 0;
  }
  if (typeof window.cartesFormules === 'function' && !window.cartesFormules.__c27) {
    var _cf = window.cartesFormules;
    var cf = function (keys) {
      var r = amundi(effectifPage());
      if (!r || !keys || !keys.length) return _cf.apply(this, arguments);
      var ks = keys.slice();
      var epRt = ks.some(function (k) { return /^(decouverte|integrale_epargne|integrale_retraite)$/.test(k); });
      if (r.fiches.indexOf('convergence') >= 0 && epRt && ks.indexOf('convergence') < 0) ks.unshift('convergence');
      ks.sort(function (a, b) { return (r.fiches.indexOf(a) < 0) - (r.fiches.indexOf(b) < 0); });
      var h = _cf.call(this, ks), F = window.FORMULES_AMUNDI || {};
      r.fiches.forEach(function (k) { if (F[k] && ks.indexOf(k) >= 0) h = h.replace('<b>' + F[k].nom + '</b>', '<b>' + F[k].nom + '<em class="c-reco">' + BADGE + '</em></b>'); });
      return h;
    };
    cf.__c27 = true; window.cartesFormules = cf;
  }

  /* ---------- diagnostic : au-delà de 200 salariés, les experts CAA pour « Protéger mes salariés » ---------- */
  if (page === 'diagnostic.html' && typeof openSol === 'function') {
    var _os = openSol;
    openSol = function (id) {
      var r = _os.apply(this, arguments), b = $('smBody');
      if (id === 'proteger' && b && !caaPackage(effectifPage()) && String(b.innerHTML).indexOf('c-caa-exp') < 0) b.innerHTML = '<p class="c-caa-exp">' + CAA_EXPERT + '</p>' + b.innerHTML;
      return r;
    };
  }

  /* ---------- audit mutuelle : offres packagées jusqu'à 200 salariés ---------- */
  if (page === 'audit-mutuelle.html' && typeof resultat === 'function' && typeof A === 'object') {
    var _res = resultat;
    resultat = function () {
      var h = _res.apply(this, arguments), eff = nb(A.effectif);
      h = h.replace(' sont conçus pour les entreprises de moins de 50 salariés ; au-delà, votre expert BRH construit une offre sur mesure',
        eff > MAX ? ' sont proposés jusqu’à 200 salariés ; au-delà, les experts de Crédit Agricole Assurances construisent avec votre expert BRH une offre sur mesure' : ' (offres packagées, entreprises jusqu’à 200 salariés)');
      return h.replace(' (entreprises de moins de 50 salariés)', eff > MAX ? ' sont proposés jusqu’à 200 salariés ; au-delà, les experts de Crédit Agricole Assurances construisent avec votre expert BRH une offre sur mesure' : ' (offres packagées, entreprises jusqu’à 200 salariés)');
    };
  }

  /* ============================== DEVIS ============================== */
  if (page === 'devis.html' && typeof syncFormules === 'function' && typeof S === 'object' && S) {
    /* texte de l'offre santé : packagée jusqu'à 200 salariés */
    var qs = D.querySelectorAll ? D.querySelectorAll('#devis .q-h') : [];
    [].forEach.call(qs, function (q) { if (/moins de 50 salariés/.test(q.textContent || '')) q.textContent = 'Offre packagée de Crédit Agricole Assurances pour les entreprises jusqu’à 200 salariés.'; });

    function effDevis() { var e = S.ent && nb(S.ent.effectif); if (e) return e; try { return typeof RH === 'function' ? nb(RH().N) : 0; } catch (x) { return 0; } }
    function radios(n) { return D.querySelectorAll ? [].slice.call(D.querySelectorAll('#devis input[name="' + n + '"]')) : []; }
    function badges(r) {
      ['ep', 'rt'].forEach(function (t) {
        radios(t + '_form').forEach(function (inp) {
          var lab = inp.closest ? inp.closest('label') : inp.parentNode, sp = lab && lab.querySelector ? lab.querySelector('span') : null; if (!sp) return;
          var old = [].filter.call(sp.children || [], function (c) { return /(^| )c-reco( |$)/.test(c.className || ''); })[0] || null, on = !!(r && r[t].indexOf(inp.value) >= 0);
          if (old && !on && old.parentNode) old.parentNode.removeChild(old);
          if (on && !old) { var em = D.createElement('em'); em.className = 'dv-tag c-reco'; em.textContent = BADGE; sp.insertBefore(em, sp.firstChild); }
        });
      });
    }
    function setR(n, v) { if (typeof setRadio === 'function') setRadio(n, v); }
    function preselection(r) {
      var both = S.sol.indexOf('epargne') >= 0 && S.sol.indexOf('retraite') >= 0;
      if (r === AMUNDI.t1 && both) { setR('ep_form', 'convergence'); setR('rt_form', 'convergence'); return; }
      if (r === AMUNDI.t1) return;   // un seul besoin : formule habituelle du devis, suggestion de Convergence ci-dessous
      if (S.sol.indexOf('epargne') >= 0) setR('ep_form', r.ep[0]);
      if (S.sol.indexOf('retraite') >= 0) setR('rt_form', r.rt[0]);
    }
    /* jusqu'à 10 salariés avec un seul des deux besoins : suggérer d'ajouter l'autre (formule Convergence) */
    function suggestion(r) {
      ['epargne', 'retraite'].forEach(function (k) {
        var autre = k === 'epargne' ? 'retraite' : 'epargne', id = 'cConv_' + k, box = $(id), p = $('p-' + k);
        var montrer = r === AMUNDI.t1 && S.sol.indexOf(k) >= 0 && S.sol.indexOf(autre) < 0;
        if (!montrer) { if (box) box.hidden = true; return; }
        if (!box && p) {
          var forms = p.querySelector ? p.querySelector('.dv-forms') : null;
          box = D.createElement('div'); box.className = 'c-conv'; box.id = id; box.setAttribute('role', 'note');
          box.innerHTML = '<span>Pour une entreprise de 10 salariés ou moins, la <b>formule Convergence</b> est conseillée : PEI + PER COL-I réunis, un seul contrat, 199 € HT/an. ' +
            (autre === 'retraite' ? 'Ajoutez la retraite collective pour en profiter.' : 'Ajoutez l’épargne salariale pour en profiter.') + '</span>' +
            '<button type="button" class="btn btn-outline" id="' + id + 'Btn">' + (autre === 'retraite' ? 'Ajouter la retraite collective' : 'Ajouter l’épargne salariale') + '</button>';
          if (forms && forms.parentNode) forms.parentNode.insertBefore(box, forms.nextSibling); else p.appendChild(box);
          var bt = $(id + 'Btn'); if (bt) bt.addEventListener('click', function () { ajouter(autre); });
        }
        if (box) box.hidden = false;
      });
    }
    function ajouter(k) {
      if (S.sol.indexOf(k) < 0) S.sol.push(k);
      if (typeof DV_ORDER !== 'undefined') S.sol.sort(function (a, b) { return DV_ORDER.indexOf(a) - DV_ORDER.indexOf(b); });
      S.done = S.done || {}; S.done.epargne = true; S.done.retraite = true;   // Convergence se configure une seule fois pour les deux onglets
      setR('ep_form', 'convergence'); setR('rt_form', 'convergence');
      if (typeof renderTabs === 'function') renderTabs(); else syncFormules('ep_form');
      if (typeof renderChoices === 'function') try { renderChoices(); } catch (e) {}
      if (typeof save === 'function') save();
      if (typeof track === 'function') track('formule_convergence_ajout', { besoin_ajoute: k, effectif: effDevis() });
    }
    var _sync = syncFormules, dedans = false;
    syncFormules = function (changed) {
      var avant = !!S.fi, x = _sync.apply(this, arguments);
      if (dedans) return x;
      dedans = true;
      try {
        var r = amundi(effDevis());
        if (!avant && S.fi && r) { preselection(r); _sync.call(this); }   // présélection de la tranche, puis règles du socle (dispositifs, Convergence)
        badges(r); suggestion(r);
      } catch (e) {}
      dedans = false;
      return x;
    };
  }
})();
