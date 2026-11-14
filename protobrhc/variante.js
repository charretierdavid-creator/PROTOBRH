/* Version C — protobrhc.monsitedetest.com : version Standard (socle protobrh/) + couche IA à chaque étape du parcours.
   Principe : l'IA explique, inspire et prépare ; le moteur du portail calcule ; l'expert BRH conseille et engage.
     Découvrir    (index.html)      : « Expliquez votre situation, l'IA vous oriente » + FAQ structurée et llms.txt (GEO)
     Diagnostiquer (diagnostic.html): « Vous hésitez ? » priorités inspirées des entreprises similaires
     Simuler      (diagnostic, devis): « Comprendre mon estimation » et scénarios « Et si… » recalculés par le moteur
     Préconiser   (diagnostic, devis): 2 à 3 pistes justifiées et ordonnées
     Convertir    (diagnostic, devis): routage vers la Caisse régionale, e-mail de prise en charge, synthèse pour l'expert
   Les modules (ia-*.js) sont chargés ici, sans modifier les pages du socle ; ia.php relaie les appels à Mistral
   (clé dans config.php). Sans clé, chaque encadré fonctionne en « mode démonstration ».
   Identifie aussi la version (C) dans chaque événement de mesure et chaque demande transmise. */
(function(){
  var V = 'C', IAV = '20261114';
  window.BRH_VARIANTE = V;
  /* options du socle activées pour la version C : questions santé-prévoyance (secteur, convention collective, cadres)
     posées seulement si le besoin est choisi (atelier CR & Distribution du 13/11/2026, point 9) */
  window.BRH_OPTIONS = { champsSelonBesoins:true };
  document.documentElement.setAttribute('data-variante', V);
  var dl = window.dataLayer = window.dataLayer || [], push = dl.push;
  dl.push = function(o){ if (o && typeof o === 'object' && !o.variante) o.variante = V; return push.apply(dl, arguments); };

  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var MODULES = { 'index.html': 'ia-accueil.js', 'diagnostic.html': 'ia-diagnostic.js', 'devis.html': 'ia-devis.js' };
  var mod = MODULES[page]; if (!mod) return;
  function charger(src){ var s = document.createElement('script'); s.src = src + '?v=' + IAV; s.async = false; document.body.appendChild(s); }
  /* après le chargement des scripts de la page (fonctions du diagnostic et du devis, assistant BRH) */
  function go(){ charger('ia-assist.js'); charger(mod); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
