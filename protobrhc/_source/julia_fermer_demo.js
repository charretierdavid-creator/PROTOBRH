/* ==============================================================
   DÉMO HORS LIGNE (test CSA, sites A et B) — fermer Julia partout (demande de David du 23/11/2026)
   Couche ajoutée par le shell dans chaque page, sans modifier les pages ni les modules de la version C.
   CTA discrets, en haut à droite de chaque fenêtre Julia :
     1. Réponse de Julia (toutes pages)         : « Effacer » (déjà présent dans ia-julia.js, ajouté sur
                                                   les réponses de la page Label RH : julia-label-demo.js)
     2. Encart Julia sous les résultats          : « × » ferme l'encart pour la page (julia-relance-demo.js)
        (diagnostic, Label RH, devis)
     3. Rubrique Julia en haut de page           : « Fermer × » replie la rubrique ; le bouton flottant
                                                   « Julia » (bas à droite) la rouvre. Choix gardé de page
                                                   en page pendant la démo, « Recommencer » le remet à zéro.
   Toute question posée à Julia (encart, bouton flottant, assistant) rouvre la rubrique.
   À reporter dans protobrhc (ia-julia.js, julia-label-demo.js, julia-relance-demo.js) si validé.
   ============================================================== */
(function () {
  'use strict';
  var D = document, H = D.documentElement, CLE = 'brhJuliaFermee';
  function lire() { try { return sessionStorage.getItem(CLE) === '1'; } catch (e) { return false; } }
  function ecrire(v) { try { if (v) sessionStorage.setItem(CLE, '1'); else sessionStorage.removeItem(CLE); } catch (e) {} }
  var css = D.createElement('style');
  css.textContent = ''
    + '.jf-x{position:absolute;top:6px;right:8px;z-index:2;display:inline-flex;align-items:center;gap:4px;border:0;background:none;'
    +   'color:var(--slate,#5c6b64);font:inherit;font-size:.74rem;line-height:1;padding:5px 6px;border-radius:6px;cursor:pointer;opacity:.8}'
    + '.jf-x:hover{opacity:1;color:var(--green,#065145);background:rgba(6,81,69,.06)}'
    + '.jf-x:focus-visible{outline:2px solid var(--green,#065145);outline-offset:1px;opacity:1}'
    + '.jf-x b{font-size:1.05rem;font-weight:400;line-height:.8}'
    + '#julia.jf-ok{position:relative;padding-top:22px}'
    + '.jr.jf-ok{position:relative;padding-right:40px}'
    + 'html.julia-fermee #julia-band,html.julia-fermee #julia{display:none!important}'
    + 'html.julia-fermee .julia-fab{display:inline-flex!important}'
    + 'html.jr-ferme .jr{display:none!important}'
    + '.julia-rep .julia-q .jf-eff{flex:0 0 auto;margin-left:auto}';
  (D.head || H).appendChild(css);
  if (lire()) H.classList.add('julia-fermee');

  function bouton(cls, label, html) {
    var b = D.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('aria-label', label); b.innerHTML = html; return b;
  }
  function decorer() {
    /* 3. rubrique du haut */
    var j = D.getElementById('julia');
    if (j && !j.querySelector('.jf-x[data-jf="rubrique"]')) {
      var b = bouton('jf-x', 'Fermer Julia (le bouton « Julia » en bas à droite la rouvre)', 'Fermer <b aria-hidden="true">×</b>');
      b.setAttribute('data-jf', 'rubrique'); j.classList.add('jf-ok'); j.insertBefore(b, j.firstChild);
    }
    /* 1. réponses sans « Effacer » (page Label RH) */
    var reps = D.querySelectorAll('.julia-rep');
    for (var i = 0; i < reps.length; i++) {
      var q = reps[i].querySelector('.julia-q');
      if (q && !q.querySelector('[data-fermer]')) {
        var e = bouton('julia-x jf-eff', 'Effacer cette réponse', 'Effacer'); e.setAttribute('data-fermer', '1'); q.appendChild(e);
      }
    }
    /* 2. encart sous les résultats */
    var jr = D.querySelectorAll('.jr');
    for (var k = 0; k < jr.length; k++) {
      if (!jr[k].querySelector('.jf-x')) {
        var x = bouton('jf-x', 'Fermer cet encart', '<b aria-hidden="true">×</b>'); x.setAttribute('data-jf', 'encart');
        jr[k].classList.add('jf-ok'); jr[k].appendChild(x);
      }
    }
  }
  function rouvrir() { if (H.classList.contains('julia-fermee')) { H.classList.remove('julia-fermee'); ecrire(false); } }

  /* clics : phase de capture, avant les modules de Julia */
  D.addEventListener('click', function (ev) {
    var t = ev.target; if (!t || !t.closest) return;
    var f = t.closest('.jf-x');
    if (f) {
      ev.preventDefault(); ev.stopPropagation();
      if (f.getAttribute('data-jf') === 'rubrique') { H.classList.add('julia-fermee'); ecrire(true); }
      else if (f.getAttribute('data-jf') === 'encart') H.classList.add('jr-ferme');
      return;
    }
    var eff = t.closest('.julia-rep [data-fermer]');
    if (eff) { ev.preventDefault(); ev.stopPropagation(); var a = eff.closest('.julia-rep'); if (a) a.remove(); return; }
    if (t.closest('#julia-fab') || t.closest('[data-jr]')) rouvrir();   /* rouvrir avant que Julia ne défile vers la rubrique */
  }, true);

  function brancher() {
    decorer();
    var plan = 0;   /* au plus une passe toutes les 80 ms, même si la page bouge beaucoup (devis) */
    if (window.MutationObserver && D.body) new MutationObserver(function () { if (plan) return; plan = 1; setTimeout(function () { plan = 0; decorer(); }, 80); }).observe(D.body, { childList: true, subtree: true });
    /* tout appel à Julia rouvre la rubrique (assistant du socle, liens « Poser une question à Julia ») */
    var essais = 0;
    (function emballer() {
      var J = window.BRH_JULIA;
      if (J && J.ouvrir && !J.__jf) {
        var o = J.ouvrir; J.ouvrir = function () { rouvrir(); return o.apply(this, arguments); };
        var d = J.demander; if (d) J.demander = function () { rouvrir(); return d.apply(this, arguments); };
        J.__jf = 1;
        if (typeof window.cbotOpen === 'function') { var c = window.cbotOpen; window.cbotOpen = function () { rouvrir(); return c.apply(this, arguments); }; }
      } else if (essais++ < 40) setTimeout(emballer, 150);
    })();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', brancher); else brancher();
  window.BRH_JULIA_FERMER = { rouvrir: rouvrir, decorer: decorer, version: '1.0' };
})();
