/* Version C 1.12 — 15/11/2026 · version 1.12 ; lm-parcours.js aussi sur la newsletter · historique : VERSIONS.md */
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
  var V = 'C', IAV = '1.12';
  window.BRH_VARIANTE = V;
  /* profil de la session AVANT le script de la page : le diagnostic réécrit brhProfil à son chargement
     (valeurs par défaut) ; la version C reprend ainsi ce que le dirigeant avait déjà indiqué ailleurs */
  try { window.BRH_PROFIL_AVANT = JSON.parse(sessionStorage.getItem('brhProfil') || 'null') || {}; } catch (e) { window.BRH_PROFIL_AVANT = {}; }
  /* options du socle activées pour la version C : questions santé-prévoyance (secteur, convention collective, cadres)
     posées seulement si le besoin est choisi ; convention collective jamais bloquante, avec « Je ne sais pas »
     (atelier CR & Distribution du 13/11/2026, point 9) */
  window.BRH_OPTIONS = { champsSelonBesoins:true, ccnNonBloquante:true };
  document.documentElement.setAttribute('data-variante', V);
  var dl = window.dataLayer = window.dataLayer || [], push = dl.push;
  dl.push = function(o){ if (o && typeof o === 'object' && !o.variante) o.variante = V; return push.apply(dl, arguments); };

  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  /* devis : conventions collectives déclarées (idcc-devis.js, avec entreprise-lookup.js du socle pour le secteur
     déduit du NAF) chargées avant la couche IA, pour que la synthèse de l'expert reçoive toutes les conventions */
  /* lead management (lm-parcours.js) : remontée des leads abandonnistes (diagnostic) et chauds (devis commencé),
     suivi d'étape et lien de suivi du dossier ; console : cockpit-brh.html */
  /* fiche publique (entreprise-public.js) : secteur, tranche d'effectif, département et conventions collectives
     préremplis depuis le SIREN / SIRET dans le diagnostic (diag-entreprise.js) et le devis (idcc-devis.js) */
  var MODULES = { 'index.html': ['ia-accueil.js'], 'diagnostic.html': ['entreprise-public.js', 'diag-entreprise.js', 'ia-diagnostic.js', 'lm-parcours.js'],
                  'label-brh.html': ['lm-parcours.js'], 'audit-mutuelle.html': ['lm-parcours.js'], 'newsletter.html': ['lm-parcours.js'],
                  'devis.html': ['entreprise-lookup.js', 'entreprise-public.js', 'idcc-devis.js', 'ia-devis.js', 'lm-parcours.js'] };
  var mods = MODULES[page]; if (!mods) return;
  function charger(src){ var s = document.createElement('script'); s.src = src + '?v=' + IAV; s.async = false; document.body.appendChild(s); }
  /* après le chargement des scripts de la page (fonctions du diagnostic et du devis, assistant BRH) */
  function go(){ charger('ia-assist.js'); mods.forEach(charger);
    /* repère de contrôle : la console du navigateur indique les modules de la version C réellement chargés */
    window.BRH_C_MODULES = { version: IAV, page: page, modules: ['ia-assist.js'].concat(mods) };
    if (window.console) console.info('Version C ' + IAV + ' — modules chargés :', window.BRH_C_MODULES.modules.join(', ')); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
