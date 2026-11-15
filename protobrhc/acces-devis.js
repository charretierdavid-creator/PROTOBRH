/* Version C 1.13 — 15/11/2026 · accès au devis jusqu’à 300 salariés : « Bon à savoir » du diagnostic remplacé par la proposition de devis ; forfait social à partir de 50 salariés · historique : VERSIONS.md */
/* ==============================================================
   ACCÈS AU DEVIS EN LIGNE JUSQU'À 300 SALARIÉS (version C, protobrhc) — décision du 15/11/2026
   Surcouche du socle, sans modifier les pages.
     Diagnostic (diagnostic.html)
       - le bloc « Bon à savoir » (avantages fiscaux, Convergence, audit) est retiré ;
       - à sa place : la proposition d'accès au devis en ligne (bloc #devisCta du socle), visible de 5 à
         300 salariés (au lieu de 50) ; au-delà, la même place propose d'être rappelé par un expert.
     Devis (devis.html)
       - effectif accepté jusqu'à 300 salariés (au lieu de 50) ;
       - à partir de 50 salariés, le forfait social est ajouté au coût employeur :
           abondement PEE / PEI 20 %, participation 20 %, abondement PER COL 16 %,
           intéressement et prime de partage de la valeur 20 % à partir de 250 salariés.
         Taux à faire valider par Amundi / CA Titres (le socle ne gérait que les moins de 50 salariés).
   ============================================================== */
(function () {
  'use strict';
  var MAX = 300;
  var $ = function (id) { return document.getElementById(id); };
  var page = (window.BRH_PAGE || location.pathname.split('/').pop() || 'index.html').toLowerCase();

  /* ============================== DIAGNOSTIC ============================== */
  if (page === 'diagnostic.html') {
    var bas = $('bon-a-savoir'), cta = $('devisCta');
    if (bas) bas.style.display = 'none';
    if (cta && bas && bas.parentNode) bas.parentNode.insertBefore(cta, bas);   // la proposition de devis prend la place du « Bon à savoir »
    if (typeof DEVIS_LINK === 'object' && DEVIS_LINK) DEVIS_LINK.max = MAX;
    var titre = cta && cta.querySelector('.dc-txt h2'), texte = cta && cta.querySelector('.dc-txt p'), btn = $('devisCtaBtn'), alt = cta && cta.querySelector('.dc-alt');
    var T0 = { h: titre ? titre.textContent : '', p: texte ? texte.textContent : '', b: btn ? btn.innerHTML : '' };
    function maj() {
      if (!cta || typeof state !== 'object') return;
      var n = +state.effectif || 0;
      if (n > MAX) {   /* au-delà de 300 salariés : un expert construit la proposition */
        cta.classList.remove('hidden');
        if (titre) titre.textContent = 'Votre entreprise mérite une proposition sur mesure';
        if (texte) texte.textContent = 'Au-delà de ' + MAX + ' salariés, un expert Banque des Ressources Humaines construit votre proposition avec vous, à partir de ce diagnostic.';
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
    if (typeof refresh === 'function') { var _r = refresh; refresh = function () { var x = _r.apply(this, arguments); maj(); return x; }; }
    if (typeof updateDevisCta === 'function') updateDevisCta();
    maj();
    window.BRH_ACCES_DEVIS = { max: MAX, maj: maj };
  }

  /* ============================== DEVIS ============================== */
  if (page === 'devis.html' && typeof DEVIS_CONFIG === 'object' && DEVIS_CONFIG) {
    DEVIS_CONFIG.EFFECTIF_MAX = MAX;
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
})();
