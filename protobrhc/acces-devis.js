/* Version C 2.7 — 16/11/2026 · toutes les entreprises de 1 à 200 salariés (devis et souscription pour l'ensemble des offres) ; au-delà, prise de contact avec l'expert BRH, diagnostic toujours possible ; bouton « Faire réaliser un devis » (2.4) ; forfait social (1.13) · historique : VERSIONS.md */
/* ==============================================================
   ACCÈS AU DEVIS EN LIGNE DE 1 À 200 SALARIÉS (version C, protobrhc) — décisions du 15/11/2026, seuil ramené à 200 le 16/11/2026
   « De 1 à 200 salariés, nous pouvons aller jusqu'au devis / souscription pour l'ensemble des offres ; pour plus de 200 salariés,
   il faut préconiser une prise de contact avec l'expert BRH, mais le diagnostic - simulation peut être réalisé » (David CHARRETIER).
   Aucune mention « 5 à 1 000 salariés », ni de seuil à 5, 50 ou 300.
   Surcouche du socle, sans modifier les pages.
     Diagnostic (diagnostic.html)
       - effectif : plus d'avertissement « Outil ciblé 5 à 1 000 salariés » ; au-delà de 200, un échange avec un
         expert est proposé ;
       - le bloc « Bon à savoir » est retiré ; à sa place, la proposition d'accès au devis (bloc #devisCta du socle),
         de 1 à 200 salariés ; au-delà, la même place propose d'être rappelé par un expert ;
       - bouton « Faire réaliser un devis » à droite du titre « 3. Nos solutions », qui reprend l'effectif et les
         solutions prioritaires (au-delà de 200 salariés : « Être rappelé par un expert »).
     Devis (devis.html)
       - effectif accepté de 1 à 200 salariés ;
       - à partir de 50 salariés, le forfait social est ajouté au coût employeur :
           abondement PEE / PEI 20 %, participation 20 %, abondement PER COL 16 %,
           intéressement et prime de partage de la valeur 20 % à partir de 250 salariés.
         Taux à faire valider par Amundi / CA Titres (le socle ne gérait que les moins de 50 salariés).
     Audit mutuelle (audit-mutuelle.html)
       - « Obtenir un devis en ligne » proposé de 1 à 200 salariés (le socle le limitait à 5 à 50).
   ============================================================== */
(function () {
  'use strict';
  var MIN = 1, MAX = 200;   // C 2.7 : 200 (500 en C 2.4)
  var $ = function (id) { return document.getElementById(id); };
  var page = (window.BRH_PAGE || location.pathname.split('/').pop() || 'index.html').toLowerCase();

  /* ============================== DIAGNOSTIC ============================== */
  if (page === 'diagnostic.html') {
    var bas = $('bon-a-savoir'), cta = $('devisCta');
    if (bas) bas.style.display = 'none';
    if (cta && bas && bas.parentNode) bas.parentNode.insertBefore(cta, bas);   // la proposition de devis prend la place du « Bon à savoir »
    if (typeof DEVIS_LINK === 'object' && DEVIS_LINK) { DEVIS_LINK.min = MIN; DEVIS_LINK.max = MAX; }
    /* effectif : plus de message « Outil ciblé 5 à 1 000 salariés » ; au-delà de 200, un expert */
    if (typeof CONFIG === 'object' && CONFIG) { CONFIG.minEmployeesWarning = MIN; CONFIG.maxEmployeesWarning = MAX; }
    if (typeof onEffectif === 'function') {
      var _oe = onEffectif;
      onEffectif = function () {
        var r = _oe.apply(this, arguments), w = $('eff-warn'), n = typeof state === 'object' ? +state.effectif || 0 : 0;
        if (w && n > MAX) { w.textContent = 'Au-delà de ' + MAX + ' salariés, prenez contact avec un expert Banque des Ressources Humaines : il construit votre proposition avec vous. Votre diagnostic et sa simulation restent disponibles ici.'; if (w.classList) w.classList.add('show'); }
        else if (w && /1 000|5 à/.test(w.textContent || '')) { w.textContent = ''; if (w.classList) w.classList.remove('show'); }
        return r;
      };
    }
    var titre = cta && cta.querySelector('.dc-txt h2'), texte = cta && cta.querySelector('.dc-txt p'), btn = $('devisCtaBtn'), alt = cta && cta.querySelector('.dc-alt');
    var T0 = { h: titre ? titre.textContent : '', p: texte ? texte.textContent : '', b: btn ? btn.innerHTML : '' };
    function maj() {
      if (!cta || typeof state !== 'object') return;
      var n = +state.effectif || 0;
      if (n > MAX) {   /* au-delà de 200 salariés : un expert construit la proposition */
        cta.classList.remove('hidden');
        if (titre) titre.textContent = 'Votre entreprise mérite une proposition sur mesure';
        if (texte) texte.textContent = 'Au-delà de ' + MAX + ' salariés, le devis et la souscription se font avec un expert Banque des Ressources Humaines : il construit votre proposition avec vous, à partir de ce diagnostic.';
        if (btn) { btn.setAttribute('href', '#contact'); btn.innerHTML = 'Être rappelé par un expert'; }
        if (alt) alt.style.display = 'none';
      } else {
        if (titre && T0.h) titre.textContent = T0.h;
        if (texte && T0.p) texte.textContent = T0.p;
        if (btn && T0.b && btn.innerHTML !== T0.b) btn.innerHTML = T0.b;
        if (alt) alt.style.display = '';
        if (typeof updateDevisCta === 'function') updateDevisCta();
      }
    }
    /* bouton « Faire réaliser un devis » à droite du titre « 3. Nos solutions » */
    var b3 = document.querySelector('#block3 .block-head');
    if (b3 && !$('recDevisCta')) {
      var a = document.createElement('a'); a.className = 'btn btn-primary rec-devis'; a.id = 'recDevisCta'; a.href = 'devis.html'; a.textContent = 'Faire réaliser un devis';
      b3.appendChild(a);
      var stl = document.createElement('style');
      stl.textContent = '#block3 .block-head{flex-wrap:wrap}#block3 .block-head .rec-devis{margin-left:auto;align-self:center;white-space:nowrap}';
      document.head.appendChild(stl);
      a.addEventListener('click', function (e) {
        if (a.getAttribute('href') === '#contact' && typeof goToContact === 'function') { if (e && e.preventDefault) e.preventDefault(); goToContact(); }
        if (typeof track === 'function') track('cta_devis_solutions', { effectif: typeof state === 'object' ? state.effectif : null });
      });
    }
    function majBouton() {
      var a = $('recDevisCta'); if (!a || typeof state !== 'object') return;
      var n = +state.effectif || 0;
      if (n > MAX) { a.setAttribute('href', '#contact'); a.textContent = 'Être rappelé par un expert'; return; }
      var src = $('devisCtaBtn'), h = src && src.getAttribute ? src.getAttribute('href') : '';
      if (!h || h === '#contact') {
        var sol = typeof DEVIS_LINK === 'object' ? Object.keys(DEVIS_LINK.map).filter(function (k) { return (state.priorities[k] || 0) >= 3; }).map(function (k) { return DEVIS_LINK.map[k]; }) : [];
        h = 'devis.html?eff=' + (n || '') + (sol.length ? '&sol=' + sol.join(',') : '');
      }
      a.setAttribute('href', h); a.textContent = 'Faire réaliser un devis';
    }
    if (typeof refresh === 'function') { var _r = refresh; refresh = function () { var x = _r.apply(this, arguments); maj(); majBouton(); return x; }; }
    if (typeof updateDevisCta === 'function') updateDevisCta();
    maj(); majBouton();
    window.BRH_ACCES_DEVIS = { min: MIN, max: MAX, maj: maj, majBouton: majBouton };
  }

  /* ============================== DEVIS ============================== */
  if (page === 'devis.html' && typeof DEVIS_CONFIG === 'object' && DEVIS_CONFIG) {
    DEVIS_CONFIG.EFFECTIF_MIN = MIN; DEVIS_CONFIG.EFFECTIF_MAX = MAX;
    if (typeof compute === 'function') {
      var _c = compute;
      compute = function () {
        var out = _c.apply(this, arguments);
        try {
          var h = typeof RH === 'function' ? RH() : { N: 0 }, N = +h.N || 0, E = (typeof S === 'object' && S.ent && +S.ent.effectif) || N;
          if (E < 50) return out;
          var v = function (id) { var el = $(id); return el ? +el.value || 0 : 0; };
          var d = typeof vals === 'function' ? vals('ep_disp') : [];
          if (out.epargne && S.sol.indexOf('epargne') >= 0) {
            var a = d.indexOf('pee') >= 0 ? v('ep_abd') : 0, i = (d.indexOf('int') >= 0 || d.indexOf('part') >= 0) ? v('ep_int') : 0, p = d.indexOf('ppv') >= 0 ? v('ep_ppv') : 0;
            var fi = E >= 250 ? 0.20 : (d.indexOf('part') >= 0 && d.indexOf('int') < 0 ? 0.20 : 0), fp = E >= 250 ? 0.20 : 0;
            out.epargne.cout = N * (a * 1.20 + i * (1 + fi) + p * (1 + fp));
            out.epargne.hyp = (out.epargne.hyp || []).map(function (t) {
              return /Sans forfait social/.test(t) ? 'Forfait social inclus (' + E + ' salariés) : 20 % sur l’abondement' + (fi ? ', l’intéressement ou la participation' : (d.indexOf('part') >= 0 ? ' et la participation' : '')) + (fp ? ', 20 % sur la prime de partage' : '') + ' ; taux à confirmer par votre expert' : t;
            });
          }
          if (out.retraite && out.retraite.cout != null && S.sol.indexOf('retraite') >= 0 && /PER COL/.test((out.retraite.hyp || []).join(' '))) {
            out.retraite.cout = out.retraite.cout * 1.16;
            out.retraite.hyp = (out.retraite.hyp || []).concat(['Forfait social de 16 % inclus sur l’abondement (50 salariés et plus), à confirmer']);
          }
        } catch (e) {}
        return out;
      };
    }
  }

  /* ============================== AUDIT MUTUELLE ============================== */
  if (page === 'audit-mutuelle.html' && typeof resultat === 'function' && typeof A === 'object') {
    var _res = resultat;
    resultat = function () {
      var h = _res.apply(this, arguments), eff = parseInt(A.effectif, 10) || 0;
      /* le socle ne propose le devis en ligne qu'à 5 à 50 salariés : la version C l'ouvre de 1 à 200 */
      if (eff >= MIN && eff <= MAX && h.indexOf('Obtenir un devis en ligne') < 0 && h.indexOf('<div class="opt" style="grid-column:1/-1">') >= 0) {
        var code = typeof ccnCode === 'function' ? ccnCode() : '', q = 'eff=' + eff + '&sol=sante&from=audit' + (code ? '&idcc=' + encodeURIComponent(code) : '') + (A.secteur ? '&secteur=' + encodeURIComponent(A.secteur) : '');
        h = h.replace('<div class="opt" style="grid-column:1/-1">', '<div class="opt"><h4>Obtenir un devis en ligne</h4><p>Votre effectif et votre convention sont repris. Estimation immédiate, à votre rythme.</p><a class="btn btn-primary" href="devis.html?' + q + '" onclick="window.__auT&&__auT(\'audit_to_devis\')">Mon devis santé et prévoyance</a></div><div class="opt">');
      }
      /* l'assistant de la version C est Julia */
      return h.replace('Poser une question à l’Assistant BRH', 'Poser une question à Julia');
    };
  }
})();
