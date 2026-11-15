/* Module LM 2.0 — 15/11/2026 · chargeur côté site (cockpitbrh.monsitedetest.com) : modes relais, navigateur et base partagée, couche parcours 2.0 · historique : VERSIONS.md */
/* ==============================================================
   lm-hub.js — branche les pages d'un site sur le module lead management (sous-domaine dédié).
   Une seule ligne dans le site (pages ou variante.js), servie par le module :
     <script src="https://cockpitbrh.monsitedetest.com/connecteurs/lm-hub.js" data-mode="relais" data-parcours="oui"></script>
   data-mode
     « relais »     : les demandes restent envoyées à lead.php du site, qui les transmet au module
                      (connecteurs/lead.php) — recommandé ;
     « navigateur » : les demandes envoyées à lead.php partent directement vers collecte.php du module
                      (sites sans PHP ; l'adresse du site doit figurer dans LM_SITES du module) ;
     « base »       : rien n'est détourné (mode base partagée : le module lit la table des demandes du site).
   data-parcours « oui » : charge aussi lm-parcours.js (estimation par e-mail, « déjà client ? », offres consultées,
   encart « Suivre mon dossier », coordonnées et nom de l'entreprise reportés d'un formulaire à l'autre).
   Réglage possible sans attributs : window.BRH_LM_HUB_CONFIG = { url:'https://…/', mode:'relais', parcours:true }
   avant de charger ce script.
   ============================================================== */
(function () {
  'use strict';
  if (window.BRH_LM_HUB) return;   // chargé une seule fois
  var VERSION = '2.0';
  var cs = document.currentScript, cfg = window.BRH_LM_HUB_CONFIG || {};
  var attr = function (n) { return cs ? cs.getAttribute(n) : null; };
  var base = cfg.url || (cs && cs.src ? cs.src.replace(/connecteurs\/lm-hub\.js(\?.*)?$/, '') : '');
  if (base && base.slice(-1) !== '/') base += '/';
  var mode = String(cfg.mode || attr('data-mode') || 'relais').toLowerCase();
  var parcours = cfg.parcours != null ? !!cfg.parcours : /^(oui|1|true)$/i.test(attr('data-parcours') || 'oui');
  window.BRH_LM_HUB = { version: VERSION, url: base, mode: mode, parcours: parcours };

  /* mode navigateur : fetch('lead.php') → collecte.php du module (même JSON, même réponse) */
  if (mode === 'navigateur' && base && window.fetch) {
    var f0 = window.fetch;
    window.fetch = function (u, o) {
      var s = typeof u === 'string' ? u : (u && u.url) || '';
      if (/^(\.\/|\/)?lead\.php(\?|$)/.test(s) || /\/lead\.php(\?|$)/.test(s) && s.indexOf(location.origin) === 0) {
        return f0.call(this, base + 'collecte.php', Object.assign({}, o || {}, { mode: 'cors', credentials: 'omit' }));
      }
      return f0.apply(this, arguments);
    };
  }

  /* couche parcours (facultative) */
  /* chargée après les scripts de la page (fonctions du diagnostic et du devis) : DOMContentLoaded */
  if (parcours && base) {
    var charger = function () {
      var s = document.createElement('script');
      s.src = base + 'connecteurs/lm-parcours.js?v=' + VERSION; s.async = false;
      (document.body || document.head || document.documentElement).appendChild(s);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', charger); else charger();
  }
  if (window.console) console.info('Module lead management ' + VERSION + ' — mode ' + mode + (parcours ? ' + parcours' : '') + ' — ' + (base || 'adresse du module inconnue'));
})();
