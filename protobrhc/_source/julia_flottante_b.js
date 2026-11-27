/* ==============================================================
   DÉMO HORS LIGNE V4.1 — site B (Label RH) : Julia en fenêtre flottante (26/11/2026, demande de David CHARRETIER)
   Injecté par le shell dans chaque page, en dernier. Ne fait rien hors du site B (le site A garde Julia en haut de page).
   - Retour au principe de l'assistant BRH du socle : bouton « Besoin d'aide ? » en bas à droite, qui ouvre une
     fenêtre flottante. La fenêtre contient Julia (même champ de question, mêmes exemples, mêmes réponses).
   - Plus aucun accès à Julia au milieu des écrans : rubrique du haut de page déplacée dans la fenêtre,
     encart « Une question sur votre score / estimation ? » sous les résultats masqué, petit bouton « Julia » retiré.
   - Tout appel à Julia (question, assistant du socle, réponse ajoutée) ouvre la fenêtre.
   Aucune page ni aucun module de la version C n'est modifié.
   ============================================================== */
(function () {
  var W = window, D = document, H = D.documentElement;
  var S = W.__SITE; if (!S || S.id !== 'B') return;
  H.classList.add('jfl-b');

  var BULLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.9 8.9 0 0 1-4-.9L3 20l1-3.9a8.3 8.3 0 0 1-1-4A8.4 8.4 0 0 1 11.5 3 8.4 8.4 0 0 1 21 11.5Z"/></svg>';
  var CROIX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var CSS = ''
    /* accès au milieu des écrans retirés */
    + 'html.jfl-b #julia-band,html.jfl-b .jr,html.jfl-b #julia-fab,html.jfl-b .julia-fab{display:none!important}'
    + 'html.jfl-b #cbotLaunch,html.jfl-b #cbot,html.jfl-b #cbotNudge{display:none!important}'
    /* bouton en bas à droite (même allure que l'assistant BRH du socle) */
    + '.jfl-launch{position:fixed;right:22px;bottom:22px;z-index:900;display:inline-flex;align-items:center;gap:.6rem;background:var(--green,#065145);color:#fff;border:none;border-radius:999px;padding:.85rem 1.25rem;cursor:pointer;font-family:var(--fh,inherit);font-weight:600;font-size:.95rem;box-shadow:0 12px 30px rgba(6,81,69,.32);transition:transform .18s,background .18s}'
    + '.jfl-launch:hover{background:var(--green-h,#02392f);transform:translateY(-2px)}.jfl-launch:focus-visible{outline:3px solid var(--lime,#8FB822);outline-offset:3px}'
    + '.jfl-launch svg{width:22px;height:22px}.jfl-launch[hidden]{display:none}'
    + '.jfl-launch.neuf::after{content:"";position:absolute;top:6px;right:8px;width:10px;height:10px;border-radius:50%;background:var(--lime,#8FB822);box-shadow:0 0 0 2px var(--green,#065145)}'
    + '.jfl-nudge{position:fixed;right:22px;bottom:84px;z-index:900;max-width:280px;background:#fff;border:1px solid var(--line,#e7ece9);border-radius:14px;border-bottom-right-radius:4px;box-shadow:0 12px 30px rgba(6,81,69,.18);display:flex;align-items:flex-start}'
    + '.jfl-nudge[hidden]{display:none}.jfl-nl{all:unset;cursor:pointer;padding:10px 4px 10px 14px;font-size:.84rem;line-height:1.4;color:var(--ink,#233029)}'
    + '.jfl-nl b{display:block;color:var(--green,#065145);font-family:var(--fh,inherit);font-weight:600}.jfl-nl:focus-visible{outline:2px solid var(--green,#065145)}'
    + '.jfl-nx{all:unset;cursor:pointer;padding:6px 10px;font-size:1.1rem;line-height:1;color:var(--slate,#5c6b64)}'
    + '.jfl-launch .jfl-av{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center;font-weight:700;font-size:.8rem}'
    /* fenêtre flottante */
    + '.jfl{position:fixed;right:22px;bottom:22px;z-index:901;width:420px;max-width:calc(100vw - 32px);height:640px;max-height:calc(100vh - 40px);background:#fff;border-radius:20px;box-shadow:0 24px 70px rgba(6,81,69,.28);display:none;flex-direction:column;overflow:hidden}'
    + '.jfl.open{display:flex}'
    + '.jfl-head{background:linear-gradient(135deg,var(--green,#065145) 0%,var(--banner,#0b6b5a) 100%);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;flex:0 0 auto}'
    + '.jfl-head .jfl-av{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.16);display:grid;place-items:center;flex:0 0 auto;font-family:var(--fh,inherit);font-weight:700}'
    + '.jfl-head .jfl-t b{font-family:var(--fh,inherit);font-weight:700;font-size:1rem;display:block;line-height:1.2}'
    + '.jfl-head .jfl-t span{font-size:.78rem;opacity:.88;display:flex;align-items:center;gap:.35rem}'
    + '.jfl-head .jfl-t span::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--lime,#8FB822);display:inline-block}'
    + '.jfl-x{margin-left:auto;background:rgba(255,255,255,.14);border:none;color:#fff;width:34px;height:34px;border-radius:9px;cursor:pointer;display:grid;place-items:center;flex:0 0 auto}'
    + '.jfl-x svg{width:18px;height:18px}.jfl-x:focus-visible{outline:3px solid var(--lime,#8FB822);outline-offset:2px}'
    + '.jfl-body{flex:1;overflow-y:auto;background:var(--gray-bg,#f6f8f7);padding:14px}'
    + '.jfl-note{flex:0 0 auto;font-size:.72rem;color:var(--slate,#5c6b64);padding:8px 16px 10px;border-top:1px solid var(--line,#e7ece9);background:#fff}'
    /* Julia dans la fenêtre : rubrique sans titre (il est dans l'en-tête), exemples sur plusieurs lignes */
    + '#jfl #julia{display:block!important;margin:0!important;background:transparent;border:0;padding:0!important;box-shadow:none}'
    + '#jfl #julia .julia-id,#jfl .jf-x[data-jf="rubrique"]{display:none!important}'
    + '#jfl .julia-l1{grid-template-columns:1fr!important}'
    + '#jfl .julia-ex{flex-wrap:wrap;overflow:visible}#jfl .julia-chip{white-space:normal;text-align:left}'
    + '#jfl .julia-fil{margin-top:10px}'
    + '@media(max-width:460px){.jfl{right:0;bottom:0;width:100vw;max-width:100vw;height:100%;max-height:100%;border-radius:0}.jfl-launch{right:16px;bottom:16px}}';

  var launch, panel, body, nudge, boxJ = null, ouverte = false;
  function construire() {
    var st = D.createElement('style'); st.id = 'jflCss'; st.textContent = CSS; (D.head || H).appendChild(st);
    launch = D.createElement('button'); launch.type = 'button'; launch.className = 'jfl-launch'; launch.id = 'jflLaunch';
    launch.setAttribute('aria-label', 'Ouvrir Julia, votre assistante BRH'); launch.setAttribute('aria-expanded', 'false'); launch.setAttribute('aria-controls', 'jfl');
    launch.innerHTML = BULLE + 'Besoin d’aide ?';
    panel = D.createElement('div'); panel.className = 'jfl'; panel.id = 'jfl';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Julia, votre assistante BRH');
    panel.innerHTML = '<div class="jfl-head"><span class="jfl-av" aria-hidden="true">J</span><div class="jfl-t"><b>Julia, votre assistante BRH</b><span>Démonstration · réponses préparées</span></div>'
      + '<button type="button" class="jfl-x" id="jflX" aria-label="Fermer l’assistante">' + CROIX + '</button></div>'
      + '<div class="jfl-body" id="jflBody"></div>'
      + '<div class="jfl-note">Assistante informative : pour un conseil personnalisé, un expert de votre Caisse régionale peut vous recontacter.</div>';
    nudge = D.createElement('div'); nudge.className = 'jfl-nudge'; nudge.id = 'jflNudge'; nudge.hidden = true; nudge.setAttribute('role', 'status');
    nudge.innerHTML = '<button type="button" class="jfl-nl"><b>Julia a une réponse pour vous</b><span class="jfl-nt"></span></button><button type="button" class="jfl-nx" aria-label="Masquer">×</button>';
    D.body.appendChild(launch); D.body.appendChild(panel); D.body.appendChild(nudge);
    nudge.querySelector('.jfl-nl').addEventListener('click', function () { ouvrir(); });
    nudge.querySelector('.jfl-nx').addEventListener('click', function () { nudge.hidden = true; launch.classList.remove('neuf'); });
    body = panel.querySelector('#jflBody');
    launch.addEventListener('click', function () { ouvrir(); });
    panel.querySelector('#jflX').addEventListener('click', function () { fermer(true); });
    D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ouverte) fermer(true); });
  }
  function ouvrir(focus) {
    if (!panel) return;
    if (!ouverte) { ouverte = true; panel.classList.add('open'); launch.hidden = true; launch.setAttribute('aria-expanded', 'true'); }
    if (nudge) { nudge.hidden = true; launch.classList.remove('neuf'); }
    if (focus !== false) setTimeout(function () { var q = D.getElementById('julia-q'); if (q) { try { q.focus({ preventScroll: true }); } catch (e) { q.focus(); } } }, 60);
  }
  function signaler(t) {
    if (!nudge) return;
    nudge.querySelector('.jfl-nt').textContent = t ? '« ' + t + ' » : cliquez pour la lire.' : 'Cliquez pour la lire.';
    nudge.hidden = false; launch.classList.add('neuf');
  }
  function fermer(rendreFocus) {
    ouverte = false; panel.classList.remove('open'); launch.hidden = false; launch.setAttribute('aria-expanded', 'false');
    if (rendreFocus) try { launch.focus(); } catch (e) {}
  }
  /* la rubrique Julia (créée par ia-julia.js) est rangée dans la fenêtre, et y reste */
  function ranger() {
    var j = D.getElementById('julia'); if (!j || !body) return;
    if (j.parentNode !== body) body.appendChild(j);
    if (j !== boxJ) {
      boxJ = j;
      j.scrollIntoView = function () {};   /* plus de défilement de la page vers la rubrique */
      j.classList.remove('julia-inline'); j.style.marginTop = '';
      var fil = D.getElementById('julia-fil');
      /* réponse ajoutée fenêtre fermée (ex. « Votre score, en bref » à l'affichage des résultats) : la fenêtre ne s'impose pas,
         une bulle discrète au-dessus du bouton la signale, comme la relance de l'assistant BRH du socle */
      if (fil && W.MutationObserver) new MutationObserver(function (m) {
        for (var i = 0; i < m.length; i++) for (var k = 0; k < m[i].addedNodes.length; k++) {
          var n = m[i].addedNodes[k]; if (n.nodeType !== 1 || ouverte) continue;
          var qq = n.querySelector && n.querySelector('.julia-q b'); signaler(qq ? qq.textContent : '');
        }
      }).observe(fil, { childList: true });
    }
    H.classList.remove('julia-fermee');   /* le « Fermer » du haut de page n'a plus d'objet sur B */
  }
  /* tout appel à Julia ouvre la fenêtre */
  var essais = 0;
  function emballer() {
    var J = W.BRH_JULIA;
    if (J && J.ouvrir && !J.__jfl) {
      J.__jfl = 1;
      var d = J.demander;
      J.ouvrir = function (q) { ranger(); ouvrir(); if (q && d) d.call(J, String(q), '', 'libre'); };
      if (d) J.demander = function () { ranger(); ouvrir(false); return d.apply(this, arguments); };
      W.cbotOpen = function () { ranger(); ouvrir(); };
    } else if (!J && essais++ < 60) setTimeout(emballer, 150);
  }
  function brancher() {
    construire(); ranger(); emballer();
    var plan = 0;
    if (W.MutationObserver) new MutationObserver(function () { if (plan) return; plan = 1; setTimeout(function () { plan = 0; ranger(); }, 50); }).observe(D.body, { childList: true, subtree: true });
    W.addEventListener('load', function () { ranger(); emballer(); });
    W.BRH_JULIA_FLOTTANTE = { ouvrir: ouvrir, fermer: fermer, ouverte: function () { return ouverte; }, version: '1.0' };
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', brancher); else brancher();
})();
