/* Version C 2.6 — 15/11/2026 · version 2.6 : estimation du devis (estimation-c.js), études santé et prévoyance par convention sur toutes les pages (prevoyance-idcc.js), page de test BRH_PAGE ; couche parcours partout (2.5) · historique : VERSIONS.md */
/* Version C — protobrhc.monsitedetest.com : version Standard (socle protobrh/) + IA à chaque étape du parcours.
   Depuis la C 2.0, l'IA prend un seul visage : « Julia, votre assistante RH », en haut de chaque page
   (ia-julia.js). Elle explique, inspire et oriente ; le moteur du portail calcule ; l'expert BRH conseille et engage.
     Toutes les pages   : question libre + exemples adaptés à la page, réponse développée sous la rubrique,
                          au plus 2 liens vers les pages utiles
     Diagnostic, devis  : exemples branchés sur le moteur (« Expliquez mon estimation », « Et si… » recalculés,
                          « Par où commencer ? », « Que font les entreprises comme la mienne ? »)
     Fin de parcours    : récapitulatif court, argumentaire de vente préparé par l'IA pour l'expert (fin-parcours.js)
   Le lead management (cockpit, dossiers, e-mails, suivi) est dans le module commun : cockpitbrh.monsitedetest.com.
   lead.php de C le relaie quand il est branché, sinon enregistre dans la table leads du socle.
   ia.php relaie les appels à Mistral (clé dans config.php). Sans clé, Julia répond en « mode démonstration ».
   Identifie aussi la version (C) dans chaque événement de mesure et chaque demande transmise. */
(function(){
  var V = 'C', IAV = '2.6';
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

  var page = String(window.BRH_PAGE || location.pathname.split('/').pop() || 'index.html').toLowerCase();   // BRH_PAGE : pages de test et aperçus
  /* ACCUEIL de la version C (demande de David du 15/11/2026) : accroche du bandeau remplacée, titre « Nos solutions »
     remplacé par « De quoi avez-vous besoin ? ». Les textes du socle sont masqués (variante.css, classe c-accueil)
     jusqu'au remplacement, pour qu'ils n'apparaissent jamais, même un instant. Modifier les textes ici. */
  var ACCUEIL = {
    titre: 'Prenez soin de vos équipes, et de votre budget.',
    sousTitre: 'Mutuelle, titres-restaurant, prime de partage, épargne salariale, retraite\u00a0: une seule plateforme pour chouchouter vos salariés.',
    note: 'Un expert du Crédit Agricole vous accompagne à chaque étape.',
    besoins: 'De quoi avez-vous besoin\u00a0?'
  };
  var html = document.documentElement;
  if (page === 'index.html' && html.classList) html.classList.add('c-accueil');
  function accueil(){
    if (page !== 'index.html') return;
    try {
      var q = function(s){ return document.querySelector(s); };
      var h1 = q('#page-home .hero h1'), sub = q('#page-home .hero .sub'), note = q('#page-home .hero-note p'), sol = q('#offres .h2');
      if (h1) h1.textContent = ACCUEIL.titre;
      if (sub) sub.textContent = ACCUEIL.sousTitre;
      if (note) note.textContent = ACCUEIL.note;
      if (sol) sol.textContent = ACCUEIL.besoins;
    } catch (e) {}
    finally { if (html.classList) html.classList.remove('c-accueil'); }
  }
  window.BRH_ACCUEIL_C = ACCUEIL;
  /* modules propres à certaines pages, chargés avant Julia :
     - fiche publique (entreprise-public.js) : secteur, tranche d'effectif, département et conventions collectives
       préremplis depuis le SIREN / SIRET dans le diagnostic (diag-entreprise.js) et le devis (idcc-devis.js) ;
     - parcours (lm-parcours.js) : coordonnées partagées entre écrans, estimation par e-mail, « déjà client ? » ;
     - fin-parcours.js : récapitulatif court après l'envoi, argumentaire de vente transmis au dossier ;
     - sante-ccn.js : obligations santé de la convention collective (étude du 14/11/2026, lignes confirmées pour le dirigeant) ;
     - acces-devis.js : toutes les entreprises de 1 à 500 salariés (diagnostic, devis, audit), bouton « Faire réaliser un devis ». */
  var MODULES = { 'diagnostic.html': ['entreprise-public.js', 'diag-entreprise.js', 'sante-ccn.js', 'fin-parcours.js', 'lm-parcours.js', 'acces-devis.js'],
                  'label-brh.html': ['lm-parcours.js'], 'audit-mutuelle.html': ['sante-ccn.js', 'lm-parcours.js', 'acces-devis.js'], 'newsletter.html': ['lm-parcours.js'],
                  'devis.html': ['entreprise-lookup.js', 'entreprise-public.js', 'idcc-devis.js', 'sante-ccn.js', 'fin-parcours.js', 'lm-parcours.js', 'estimation-c.js', 'acces-devis.js'] };
  var mods = (MODULES[page] || []).slice();
  /* C 2.6 : études santé et prévoyance par convention collective sur toutes les pages (Julia s'en sert partout) */
  if (mods.indexOf('sante-ccn.js') < 0) mods.unshift('sante-ccn.js');
  mods.splice(mods.indexOf('sante-ccn.js') + 1, 0, 'prevoyance-idcc.js');
  if (mods.indexOf('lm-parcours.js') < 0) mods.push('lm-parcours.js');   // C 2.5 : couche parcours sur toutes les pages (offres consultées, pages vues : Q13 du lead management 2.0)
  mods = mods.concat(['ia-julia.js']);   // Julia : sur toutes les pages
  function charger(src){ var s = document.createElement('script'); s.src = src + '?v=' + IAV; s.async = false; document.body.appendChild(s); }
  /* après le chargement des scripts de la page (fonctions du diagnostic et du devis, assistant BRH) */
  function go(){ accueil(); charger('ia-assist.js'); mods.forEach(charger);
    /* repère de contrôle : la console du navigateur indique les modules de la version C réellement chargés */
    window.BRH_C_MODULES = { version: IAV, page: page, modules: ['ia-assist.js'].concat(mods) };
    if (window.console) console.info('Version C ' + IAV + ' — modules chargés :', window.BRH_C_MODULES.modules.join(', ')); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
