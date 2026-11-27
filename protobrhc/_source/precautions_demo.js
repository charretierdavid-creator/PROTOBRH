/* ==============================================================
   DÉMO HORS LIGNE V3 — précautions d'usage (24/11/2026, demande de David CHARRETIER)
   Injecté par le shell dans chaque page, après le SHIM.
   - Le bandeau « Démonstration – données fictives… » est dans le shell (visible sur toutes les pages).
   - Ce script ajoute, dans les pages, un encadré à côté de chaque montant affiché :
     simulation (diagnostic), Label RH, devis (estimation, proposition, coordonnées, devis prêt, document imprimable),
     audit mutuelle, avantages fiscaux, Mon dossier BRH, fenêtres « En savoir plus » des offres.
   - Les encadrés sont placés à côté d'éléments existants (aucun identifiant ni aucune fonction du socle modifiés) ;
     un observateur les remet en place si la page redessine son contenu.
   Textes validés par David le 24/11/2026 (texte proposé).
   ============================================================== */
(function () {
  var W = window, D = document;
  var PAGE = W.__REAL_PAGE || W.__PAGE || '';
  var TITRE = 'Démonstration · données fictives, non contractuelles';
  var TEXTE = 'Montants calculés sur des hypothèses fictives. Ils n’engagent pas le Crédit Agricole et ne valent ni offre ni devis. Seul l’expert de votre Caisse régionale peut établir une proposition.';
  var COURT = 'Démonstration : données fictives, non contractuelles, présentées à titre d’illustration.';
  var SCORE = 'Démonstration : score et comparaisons calculés sur des données fictives, non contractuelles, présentés à titre d’illustration.';
  var ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';

  /* règles : sel = élément de référence ; pos = after | before | append | prepend | afterChild (après l'enfant « sous ») ;
     type = plein (titre + texte) | court (une ligne) | score */
  var R = [
    { p: '*', id: 'sol', sel: '#smBody', pos: 'append', type: 'court' },
    { p: 'diagnostic.html', id: 'gains', sel: '#gains', pos: 'after', type: 'plein' },
    { p: 'diagnostic.html', id: 'fisc', sel: '#avantages-fiscaux', sous: '.fisc-head', pos: 'afterChild', type: 'court' },
    { p: 'label-brh.html', id: 'score', sel: '#cbars', pos: 'after', type: 'score' },
    { p: 'label-brh.html', id: 'fisc', sel: '#avantages-fiscaux', sous: '.fisc-head', pos: 'afterChild', type: 'plein' },
    { p: 'devis.html', id: 'config', sel: '.dv-step[data-step="4"] .dv-head', pos: 'after', type: 'court' },
    { p: 'devis.html', id: 'estim', sel: ['#cEstNote', '#dvSynth'], pos: 'after', type: 'plein' },
    { p: 'devis.html', id: 'panier', sel: '#dvCart', pos: 'after', type: 'plein' },
    { p: 'devis.html', id: 'recap', sel: '#dvRecap', pos: 'append', type: 'court' },
    { p: 'devis.html', id: 'fini', sel: '#dvDone .r-cta', pos: 'before', type: 'plein' },
    { p: 'devis.html', id: 'doc', sel: '#devisDoc .brhq-top', pos: 'after', type: 'doc' },
    { p: 'audit-mutuelle.html', id: 'audit', sel: '.disclaimer', pos: 'before', type: 'plein' },
    { p: 'avantages-fiscaux.html', id: 'fisc', sel: '#fisc-content', pos: 'before', type: 'plein' },
    { p: 'mon-dossier.html', id: 'dossier', sel: '#dossier', pos: 'before', type: 'plein' }
  ];

  var CSS = ''
    + '.brh-prec{display:flex;gap:10px;align-items:flex-start;margin:14px 0;padding:10px 14px;border:1px solid #ecdcc6;border-left:3px solid #b26b14;border-radius:10px;background:#fffaf3;color:#4a3a26;font-size:.84rem;line-height:1.45;text-align:left;font-weight:400;letter-spacing:0;text-transform:none;box-sizing:border-box;width:auto;max-width:100%}'
    + '.brh-prec svg{flex:0 0 16px;width:16px;height:16px;margin-top:2px;color:#9a5a12}'
    + '.brh-prec b{display:block;font-weight:700;font-size:.8rem;color:#7a4510;margin:0 0 2px}'
    + '.brh-prec p{margin:0}'
    + '.brh-prec.c{padding:7px 12px;font-size:.78rem;margin:10px 0}.brh-prec.c svg{width:14px;height:14px;flex-basis:14px;margin-top:1px}'
    + '.dv-recap .brh-prec{margin:14px 0 0}'
    + '.brh-prec.doc{border-left-width:4px;margin:0 0 18px;font-size:.82rem}.brh-prec.doc b{text-transform:uppercase;letter-spacing:.05em}'
    + '#devisDoc .brhq{position:relative}'
    + '#devisDoc .brhq::after{content:"DÉMONSTRATION";position:absolute;left:50%;top:42%;transform:translate(-50%,-50%) rotate(-28deg);font-size:88px;font-weight:800;letter-spacing:.08em;color:rgba(154,90,18,.07);pointer-events:none;white-space:nowrap;z-index:0}'
    + '@media print{.brh-prec{-webkit-print-color-adjust:exact;print-color-adjust:exact}#devisDoc .brhq::after{color:rgba(154,90,18,.09)}}'
    + '@media(max-width:640px){#devisDoc .brhq::after{font-size:52px}}';

  function bloc(r) {
    var el = D.createElement('div');
    el.setAttribute('data-prec', r.id);
    el.setAttribute('role', 'note');
    if (r.type === 'plein') { el.className = 'brh-prec'; el.innerHTML = ICO + '<div><b>' + TITRE + '</b><p>' + TEXTE + '</p></div>'; }
    else if (r.type === 'doc') { el.className = 'brh-prec doc'; el.innerHTML = ICO + '<div><b>Document de démonstration · données fictives</b><p>Ce devis est établi à titre de démonstration, sur des hypothèses fictives. Il n’engage pas le Crédit Agricole et ne vaut ni offre ni devis. Seul l’expert de votre Caisse régionale peut établir une proposition.</p></div>'; }
    else { el.className = 'brh-prec c'; el.innerHTML = ICO + '<p>' + (r.type === 'score' ? SCORE : COURT) + '</p>'; }
    return el;
  }
  var cache = {};
  function cible(r) {
    var l = [].concat(r.sel);
    for (var i = 0; i < l.length; i++) { var t = D.querySelector(l[i]); if (t) return t; }
    return null;
  }
  function placer() {
    R.forEach(function (r) {
      if (r.p !== '*' && r.p !== PAGE) return;
      var t = cible(r); if (!t) return;
      var k = r.p + ':' + r.id, el = cache[k];
      if (!el) {
        el = D.querySelector('[data-prec="' + r.id + '"]') || bloc(r); cache[k] = el;
      }
      if (r.pos === 'after') { if (t.nextElementSibling !== el) t.insertAdjacentElement('afterend', el); }
      else if (r.pos === 'before') { if (t.previousElementSibling !== el) t.insertAdjacentElement('beforebegin', el); }
      else if (r.pos === 'append') { if (t.lastElementChild !== el) t.appendChild(el); }
      else if (r.pos === 'prepend') { if (t.firstElementChild !== el) t.insertBefore(el, t.firstChild); }
      else if (r.pos === 'afterChild') {
        var s = t.querySelector(r.sous);
        if (s) { if (s.nextElementSibling !== el) s.insertAdjacentElement('afterend', el); }
        else if (t.firstElementChild !== el) t.insertBefore(el, t.firstChild);
      }
    });
  }
  var prevu = false;
  function bientot() { if (prevu) return; prevu = true; (W.requestAnimationFrame || setTimeout)(function () { prevu = false; try { placer(); } catch (e) {} }); }
  function brancher() {
    var st = D.createElement('style'); st.id = 'brhPrecCss'; st.textContent = CSS; (D.head || D.documentElement).appendChild(st);
    placer();
    try { new MutationObserver(bientot).observe(D.body, { childList: true, subtree: true }); } catch (e) {}
    W.addEventListener('load', bientot);
  }
  W.BRH_PRECAUTIONS = { titre: TITRE, texte: TEXTE, court: COURT, placer: placer, regles: R };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', brancher); else brancher();
})();
