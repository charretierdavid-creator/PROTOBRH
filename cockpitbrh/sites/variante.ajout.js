/* Module LM 2.0 — 15/11/2026 · bloc à AJOUTER à la fin du variante.js des sites S, A, B (C : lm-parcours.js 2.0 inclus dans C 2.5) · historique : VERSIONS.md */
/* Branche les pages du site sur le module lead management (sous-domaine dédié).
   data-mode : « relais » (lead.php du site = connecteur), « navigateur » (envoi direct au module) ou « base » (base MySQL partagée).
   data-parcours : « oui » pour l'estimation par e-mail, « déjà client ? », l'encart « Suivre mon dossier » et les coordonnées reportées. */
(function(){
  var s = document.createElement('script');
  s.src = 'https://cockpitbrh.monsitedetest.com/connecteurs/lm-hub.js?v=2.0';
  s.setAttribute('data-mode', 'relais');
  s.setAttribute('data-parcours', 'oui');
  (document.head || document.documentElement).appendChild(s);
})();
