/* Version C 2.4 — 15/11/2026 · entreprises de 1 à 500 salariés ; obligations santé de la convention collective (sante-ccn.js) dans les réponses ; pleine largeur (2.2) · historique : VERSIONS.md */
/* ==============================================================
   JULIA — l'IA de la version C, une seule et même rubrique en haut de chaque page
   « Julia, votre assistante RH vous accompagne tout au long du parcours »
   Chargé par variante.js sur toutes les pages, après ia-assist.js (BRH_IA) et les modules de la page.
     - « Posez votre question » + 3 ou 4 exemples adaptés à la page ;
     - la réponse se développe juste sous la rubrique (3 réponses gardées, la plus récente en tête),
       avec au plus 2 liens vers les pages utiles du portail (jamais la page en cours) ;
     - diagnostic et devis : les exemples sont branchés sur le moteur du portail (le moteur calcule,
       Julia explique) : entreprises similaires, estimation, scénarios « Et si… », ordre des pistes ;
     - remplace les encadrés IA des versions C 1.x et la bulle « Assistant BRH » du socle (cbotOpen
       ouvre Julia) ; petit bouton « Julia » flottant pour revenir à la rubrique.
   Garde-fous : aucune donnée personnelle envoyée (ia.php filtre en plus), aucun niveau de lead, mention
   « estimation indicative et non contractuelle » dès qu'un montant est cité, mode démonstration sans clé.
   Avatar : monogramme ; une photo peut le remplacer (window.BRH_JULIA_AVATAR = 'img/julia.jpg').
   ============================================================== */
(function () {
  'use strict';
  var IA = window.BRH_IA; if (!IA || window.BRH_JULIA) return;
  var D = document, $ = function (id) { return D.getElementById(id); };
  var esc = IA.esc, eur = IA.eur;
  var page = String(window.BRH_PAGE || location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (/^newsletter-\d{4}-\d{2}\.html$/.test(page)) page = 'newsletter-edition.html';   // éditions mensuelles
  var MAX_LIENS = 2, MAX_REP = 3;
  var TITRE = 'Julia, votre assistante RH vous accompagne tout au long du parcours';
  var TITRE_1 = 'Julia, votre assistante RH', TITRE_2 = TITRE.slice(TITRE_1.length + 1);   // titre affiché sur 2 lignes courtes

  /* ---------- pages vers lesquelles Julia peut renvoyer (liste fermée, aussi envoyée à ia.php) ---------- */
  var LIENS = {
    diagnostic: { url: 'diagnostic.html', lib: 'Faire mon diagnostic RH', desc: 'diagnostic en 3 minutes : priorités RH, gains estimés, pistes prioritaires', page: 'diagnostic.html' },
    devis:      { url: 'devis.html', lib: 'Obtenir mon devis en ligne', desc: 'devis indicatif de 1 à 500 salariés : épargne salariale, santé-prévoyance, retraite, avantages salariés', page: 'devis.html' },
    label:      { url: 'label-brh.html', lib: 'Découvrir le Label BRH', desc: 'une dizaine de questions pour évaluer sa politique avantages salariés et se comparer', page: 'label-brh.html' },
    audit:      { url: 'audit-mutuelle.html', lib: 'Auditer ma mutuelle', desc: 'audit gratuit de la santé et de la prévoyance au regard de la convention collective', page: 'audit-mutuelle.html' },
    fiscal:     { url: 'avantages-fiscaux.html', lib: 'Voir les avantages fiscaux', desc: 'exonérations sociales et fiscales, dispositif par dispositif', page: 'avantages-fiscaux.html' },
    ressources: { url: 'ressources.html', lib: 'Parcourir les ressources', desc: 'cas clients, livres blancs, articles, webinaires', page: 'ressources.html' },
    newsletter: { url: 'newsletter.html', lib: 'Recevoir la newsletter RH', desc: 'actualité RH du mois par e-mail', page: 'newsletter.html' },
    offres:     { url: 'index.html#offres', lib: 'Voir nos offres', desc: 'les solutions de la Banque des RH', page: 'index.html' },
    expert:     { url: 'diagnostic.html#contact', lib: 'Être rappelé par un expert', desc: 'expert Banque des RH de la Caisse régionale', page: '' }
  };
  function liensPossibles() {
    return Object.keys(LIENS).filter(function (k) { return LIENS[k].page !== page; }).map(function (k) { return { id: k, libelle: LIENS[k].lib, description: LIENS[k].desc }; });
  }

  /* ---------- exemples et accroche de chaque page ---------- */
  function Q(t) { return { q: t }; }
  function A(t, action) { return { q: t, action: action }; }
  var PAGES = {
    'index.html': { lede: 'Dites-moi ce que vous cherchez : je vous oriente vers la bonne étape, diagnostic, devis en ligne ou expert de votre Caisse régionale.',
      ex: [Q('Par où commencer pour fidéliser mes 15 salariés ?'), Q('Comment donner du pouvoir d’achat sans alourdir mes charges ?'), Q('Ma mutuelle d’entreprise est-elle adaptée ?')] },
    'diagnostic.html': { lede: 'Je vous aide à noter vos priorités, à comprendre votre estimation et à choisir par où commencer.',
      ex: [A('Que font les entreprises comme la mienne ?', 'inspire'), A('Expliquez-moi mon estimation', 'explique'), A('Et si j’avais 10 salariés de plus ?', 'sc:plus10'), A('Par où commencer ?', 'preconise')] },
    'devis.html': { lede: 'Je vous explique chaque montant de votre devis, je simule vos « Et si… » avec le moteur du portail et je vous aide à choisir l’ordre.',
      ex: null /* exemples calculés selon l'avancement du devis : exemplesDevis() */ },
    'label-brh.html': { lede: 'Je vous explique le Label BRH : comment se passe l’évaluation et ce qu’elle apporte à votre marque employeur.',
      ex: [Q('À quoi sert le Label BRH ?'), Q('Comment se passe l’évaluation ?'), Q('Que gagne mon entreprise à être labellisée ?')] },
    'audit-mutuelle.html': { lede: 'Je vous aide à vérifier votre complémentaire santé et votre prévoyance au regard de votre convention collective.',
      ex: [Q('Ma mutuelle respecte-t-elle ma convention collective ?'), Q('Quelle part de la cotisation dois-je financer ?'), Q('Que vérifie l’audit, concrètement ?')] },
    'avantages-fiscaux.html': { lede: 'Je vous explique les exonérations, dispositif par dispositif, et ce qui peut s’appliquer à votre entreprise.',
      ex: [Q('Quels avantages sont exonérés de charges ?'), Q('Prime de partage de la valeur : quelles conditions ?'), Q('Titres-restaurant ou chèques cadeaux : que choisir ?')] },
    'ressources.html': { lede: 'Je vous indique la ressource utile pour votre question : cas client, livre blanc, article ou webinaire.',
      ex: [Q('Par quelle ressource commencer ?'), Q('Avez-vous un cas client dans mon secteur ?'), Q('Comment préparer mes NAO ?')] },
    'newsletter.html': { lede: 'Je vous présente la newsletter et l’actualité RH qui peut concerner votre entreprise.',
      ex: [Q('Quels sujets traite la newsletter ?'), Q('Quelles nouveautés RH ce mois-ci ?'), Q('Puis-je me désabonner facilement ?')] },
    'newsletter-edition.html': { lede: 'Je vous aide à retrouver une information de l’actualité RH et à voir ce qu’elle change pour vous.',
      ex: [Q('Qu’est-ce qui change pour mon entreprise ce mois-ci ?'), Q('Quels sujets sont traités dans cette édition ?'), Q('Où trouver les éditions précédentes ?')] }
  };
  PAGES['newsletter-archive.html'] = PAGES['newsletter-edition.html'];
  var CONF = PAGES[page] || PAGES['index.html'];

  /* =================== MOTEUR DU PORTAIL : DIAGNOSTIC =================== */
  var DIAG = page === 'diagnostic.html' && typeof state !== 'undefined' && typeof calculateFiscalGain === 'function';
  var val = function (id) { var e = $(id); return e ? String(e.value || '').trim() : ''; };
  var dep = function () { return typeof depValide === 'function' ? depValide() : val('departement'); };
  var memo = function (k) { try { return JSON.parse(sessionStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
  function resultatsDiag(eff, pr) {
    var g = calculateFiscalGain(eff, pr), act = Object.keys(g.details).filter(function (k) { return g.details[k] > 0 && IA.AX[k]; });
    var det = {}; act.forEach(function (k) { det[IA.AX[k].long] = g.details[k]; });
    return { effectif: g.n, dispositifs_actifs: act.map(function (k) { return IA.AX[k].long; }), gain_fiscal_annuel: g.total,
             gain_pouvoir_achat_par_salarie: 400 * act.length, detail_par_dispositif: det };
  }
  function profilDiag() {
    var p = memo('brhProfil'), c = memo('brhProfilChat'), g = calculateFiscalGain(state.effectif, state.priorities);
    return { effectif: state.effectif, secteur: val('secteur'), departement: dep(), idcc: typeof ccnTexte === 'function' ? ccnTexte() : '',
             priorites: Object.assign({}, state.priorities), enjeu: c.enjeu || '', deja: p.deja || c.deja || [],
             gains: state.resultsUnlocked ? { fiscalAnnuel: g.total } : null };
  }
  function scenarioDiag(id) {
    var pr = Object.assign({}, state.priorities), base = resultatsDiag(state.effectif, pr);
    if (id === 'plus10') return { libelle: 'Et si vous aviez 10 salariés de plus', avant: base.gain_fiscal_annuel, apres: resultatsDiag(+state.effectif + 10, pr).gain_fiscal_annuel };
    if (id === 'retraite') return { libelle: 'Et si vous prépariez aussi la retraite de vos salariés', avant: base.gain_fiscal_annuel, apres: resultatsDiag(state.effectif, Object.assign({}, pr, { retraite: Math.max(3, pr.retraite) })).gain_fiscal_annuel };
    return null;
  }

  /* =================== MOTEUR DU PORTAIL : DEVIS =================== */
  var DEVIS = page === 'devis.html' && typeof S !== 'undefined' && typeof compute === 'function' && typeof RH === 'function';
  function totauxDevis(o) {
    var h = RH(), tot = 0, eq = 0, net = 0, costNS = 0, det = {};
    S.sol.forEach(function (k) { var r = o[k]; if (!r) return; tot += r.cout || 0;
      if (k !== 'sante') { eq += r.equiv || 0; net += (r.netSal || 0) * (r.benef || 0); costNS += r.cout || 0; }
      det[(typeof DV_SOL !== 'undefined' && DV_SOL[k] ? DV_SOL[k].title : k)] = { cout_employeur_annuel: r.cout == null ? 'sur mesure' : Math.round(r.cout), hypotheses: r.hyp }; });
    return { salaries: h.N, cout_total: Math.round(tot), gain_net_moyen_par_salarie: h.N ? Math.round(net / h.N) : 0,
             economie_vs_hausse_salaire: Math.round(eq - costNS), detail: det };
  }
  /* le moteur recalcule avec des valeurs modifiées, puis tout est restauré */
  function simulerDevis(ch) {
    var saved = ch.map(function (c) { var el = $(c[0]); return [el, el ? el.value : null]; });
    ch.forEach(function (c) { var el = $(c[0]); if (el) el.value = c[1]; });
    var r = totauxDevis(compute());
    saved.forEach(function (s) { if (s[0]) s[0].value = s[1]; });
    compute(); return r;
  }
  /* vals() du devis est déclaré en « const » dans devis.html : visible par son nom, pas comme propriété de window */
  function valsDevis(n) { try { return typeof vals === 'function' ? vals(n) : []; } catch (e) { return []; } }
  function scenariosDevis() {
    var h = RH(), out = [{ id: 'plus5', label: 'j’avais 5 salariés de plus', ch: [['h-couv', h.N + 5]] }], t = valsDevis('av_type'), d = valsDevis('ep_disp');
    if (S.sol.indexOf('avantages') >= 0 && t.indexOf('tr') >= 0 && $('av_trv') && +$('av_trv').value !== 10) out.unshift({ id: 'tr10', label: 'le titre-restaurant passait à 10 €', ch: [['av_trv', 10]] });
    if (S.sol.indexOf('epargne') >= 0 && d.indexOf('ppv') >= 0 && $('ep_ppv') && +$('ep_ppv').value !== 500) out.unshift({ id: 'ppv500', label: 'la prime de partage était de 500 €', ch: [['ep_ppv', 500]] });
    if (S.sol.indexOf('epargne') >= 0 && d.indexOf('pee') >= 0 && $('ep_abd')) out.unshift({ id: 'abd', label: 'je doublais l’abondement', ch: [['ep_abd', Math.min(3000, (+$('ep_abd').value || 250) * 2)]] });
    return out;
  }
  function devisEstime() { return DEVIS && S.sol && S.sol.length && (S.maxStep || 0) >= 5; }
  function exemplesDevis() {
    var ex = [A('Expliquez-moi mon estimation', 'explique')];
    if (devisEstime()) { var sc = scenariosDevis()[0]; ex.push(A('Et si ' + sc.label + ' ?', 'sc:' + sc.id)); }
    else ex.push(Q('Quelles solutions choisir pour mon entreprise ?'));
    ex.push(A('Dans quel ordre avancer ?', 'preconise'), Q('Est-ce que je paie des charges sur la prime de partage ?'));
    return ex;
  }
  /* convention collective santé de la page (sante-ccn.js) : détails seulement si la ligne est confirmée */
  function conventionSante() { var M = window.BRH_SANTE_CCN; try { return M ? M.public(M.courante()) : null; } catch (e) { return null; } }
  function contexte() {
    var cs = conventionSante(), r = contexte0(); if (cs) r.convention_sante = cs; return r;
  }
  function contexte0() {
    try {
      if (DIAG) { var c = { effectif: state.effectif, secteur: val('secteur'), departement: dep(), priorites: Object.assign({}, state.priorities), resultats_affiches: !!state.resultsUnlocked };
        if (state.resultsUnlocked) c.estimation_du_portail = resultatsDiag(state.effectif, state.priorities); return c; }
      if (DEVIS) { var x = { solutions_choisies: S.sol.map(function (k) { return (typeof DV_SOL !== 'undefined' && DV_SOL[k]) ? DV_SOL[k].title : k; }), etape: S.step, secteur: (S.ent && S.ent.secteur) || '' };
        if (devisEstime()) x.estimation_du_portail = totauxDevis(S.est || compute()); return x; }
    } catch (e) {}
    return {};
  }

  /* =================== RÉPONSES DE DÉMONSTRATION (sans IA) =================== */
  var REGLES = [
    [/mutuelle|sant[ée]|pr[ée]voyance|compl[ée]mentaire|convention|ccn/i,
      'La complémentaire santé collective est obligatoire pour les salariés du privé, et l’employeur en finance au moins la moitié. La prévoyance dépend surtout de votre convention collective, qui peut imposer des garanties minimales.\nL’audit mutuelle compare votre contrat à ces obligations en quelques minutes ; un expert Banque des RH vous aide ensuite à l’ajuster.',
      ['Santé : obligatoire, financée au moins à 50 % par l’employeur', 'Prévoyance : selon votre convention collective', 'Audit gratuit, sans engagement'], ['audit', 'devis']],
    [/pouvoir d.achat|titre|restaurant|ch[èe]que|cadeau|mobilit|avantages? salari/i,
      'Titres-restaurant, chèques cadeaux, forfait mobilités durables : ces avantages améliorent le quotidien de vos salariés et bénéficient de régimes sociaux et fiscaux favorables, dans des plafonds fixés chaque année.\nLe choix dépend de vos équipes : les titres-restaurant servent tous les jours, les chèques cadeaux marquent les temps forts. Le devis en ligne chiffre ce que chaque option coûterait à votre entreprise.',
      ['Régimes favorables, dans des plafonds annuels', 'Visibles dès le premier mois pour vos salariés'], ['fiscal', 'devis']],
    [/prime|partage|ppv|int[ée]ressement|participation|[ée]pargne|pee|abondement|charges/i,
      'Prime de partage de la valeur, intéressement, plan d’épargne salariale : ces dispositifs associent vos salariés aux résultats et sont, selon les conditions et plafonds en vigueur, largement exonérés de cotisations sociales, contrairement à une hausse de salaire.\nLes règles précises dépendent de la taille de votre entreprise et de l’accord mis en place : votre expert Banque des RH les vérifie avec vous.',
      ['Accessible aux petites entreprises', 'Exonérations selon les conditions et plafonds en vigueur'], ['fiscal', 'diagnostic']],
    [/retraite|\bper\b|perco|pero/i,
      'Un plan d’épargne retraite d’entreprise est un avantage différenciant pour fidéliser les profils expérimentés. Il se construit sur mesure (versements de l’entreprise, catégories de salariés, gestion).\nLe diagnostic RH vous dit si la retraite fait partie de vos priorités ; l’expert de votre Caisse régionale conçoit ensuite le plan avec vous.',
      [], ['diagnostic', 'expert']],
    [/label/i,
      'Le Label BRH évalue votre politique d’avantages salariés : vous répondez à une dizaine de questions, vous obtenez un diagnostic complet et vous comparez votre politique à celle des autres entreprises répondantes.\nC’est un bon point de départ pour valoriser votre marque employeur et repérer ce qui manque à votre offre.',
      ['Une dizaine de questions', 'Comparaison avec les entreprises répondantes'], ['label', 'diagnostic']],
    [/\bnao\b|n[ée]gociation/i,
      'Pour vos négociations annuelles, partez de ce que vos salariés valorisent le plus et de ce que chaque euro coûte à l’entreprise : un avantage exonéré rapporte souvent plus en net qu’une hausse de salaire équivalente.\nLes ressources du portail proposent des repères et des cas clients ; un expert Banque des RH peut préparer les options avec vous.',
      [], ['ressources', 'expert']],
    [/newsletter|actualit|nouveaut|[ée]dition|d[ée]sabonn|d[ée]sinscri/i,
      'La newsletter de la Banque des RH vous adresse chaque mois l’essentiel de l’actualité RH : épargne salariale, santé et prévoyance, retraite, NAO et avantages salariés. Chaque brève renvoie vers sa source.\nVous pouvez vous désabonner à tout moment depuis le lien présent dans chaque envoi.',
      [], ['newsletter', 'ressources']],
    [/ressource|livre blanc|cas client|webinai|podcast|guide|secteur/i,
      'Les ressources du portail rassemblent des cas clients, des livres blancs, des articles et des webinaires. Pour démarrer, le guide des avantages fiscaux et sociaux donne une vue d’ensemble, dispositif par dispositif.\nPour un exemple proche de votre activité, filtrez les cas clients par thème ; votre expert peut aussi vous en présenter d’autres.',
      [], ['ressources', 'fiscal']],
    [/devis|prix|co[uû]t|tarif|combien|solutions? choisir/i,
      'Le devis en ligne chiffre en quelques minutes le coût de vos solutions pour l’entreprise et le gain net pour vos salariés, de 1 à 500 salariés. Au-delà, ou pour la santé et la prévoyance sur mesure, un expert Banque des RH construit la proposition avec vous.\nLe devis est indicatif : votre expert le confirme avant toute souscription.',
      ['De 1 à 500 salariés', 'Devis indicatif, confirmé par un expert'], ['devis', 'expert']],
    [/fid[ée]li|attirer|recrut|garder|motiv|commencer|d[ée]marrer|par o[uù]/i,
      'Pour fidéliser, commencez par ce que vos salariés ressentent vite : avantages du quotidien et bonne couverture santé. Ajoutez ensuite le partage de la valeur pour les associer aux résultats.\nLe diagnostic RH classe vos priorités en 3 minutes et estime les gains ; vous pouvez ensuite obtenir votre devis en ligne.',
      ['Le quotidien d’abord, puis le partage de la valeur', 'Diagnostic en 3 minutes'], ['diagnostic', 'devis']],
    [/expert|conseiller|rappel|rendez|contact|agence/i,
      'Un expert Banque des RH de votre Caisse régionale peut vous rappeler pour étudier votre situation. Laissez vos coordonnées depuis le diagnostic ou le devis : il reprend vos réponses, vous n’avez rien à ressaisir.',
      [], ['expert', 'diagnostic']]
  ];
  function repliJulia(question) {
    var q = String(question || '');
    var M = window.BRH_SANTE_CCN, cc = null; try { cc = M ? M.courante() : null; } catch (e) {}
    for (var i = 0; i < REGLES.length; i++) if (REGLES[i][0].test(q)) {
      var rep = REGLES[i][1];
      if (i === 0 && cc) rep += '\n' + (cc.c ? M.phrase(cc) + ' Ce point vient d’un document de travail que votre expert Banque des RH confirme avec vous.' : 'Les exigences de votre convention (IDCC ' + cc.i + ') sont vérifiées par votre expert Banque des RH ; le socle légal s’applique au minimum.');
      return { reponse: rep, points: REGLES[i][2], liens: REGLES[i][3] };
    }
    return { reponse: 'En mode démonstration, je n’ai pas de réponse toute faite à cette question. Le plus simple : faire le diagnostic RH en 3 minutes, ou demander à être rappelé par un expert Banque des RH de votre Caisse régionale, qui vous répond avec les règles applicables à votre entreprise.',
             points: [], liens: ['diagnostic', 'expert'] };
  }

  /* =================== AFFICHAGE =================== */
  var AVATAR = window.BRH_JULIA_AVATAR ? '<img src="' + esc(window.BRH_JULIA_AVATAR) + '" alt="">' : '<span aria-hidden="true">J</span>';
  var ENVOI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  /* C 2.2 : rubrique claire et discrète (c'est une aide), sur 2 lignes, exactement à la largeur totale du bloc du dessus
     (bandeau d'accueil : texte + carrousel ou photo ; voir caler()). Ligne 1 = Julia (2 lignes de texte courtes) | champ de
     question, qui prend toute la place restante ; ligne 2 = exemples sur une seule ligne (défilement horizontal si besoin). */
  var CSS = ''
    + '.julia-on #cbotLaunch,.julia-on #cbot,.julia-on #cbotNudge{display:none!important}'
    + '.julia-band{padding:0 0 28px}.julia-inline{margin:18px 0 8px}'
    + '.julia{background:var(--fisc,#f5f8f2);color:var(--ink,#233029);border:1px solid var(--line,#e7ece9);border-radius:var(--radius,16px);padding:12px 16px 10px;font-family:var(--fb,inherit);scroll-margin-top:90px}'
    + '.julia-l1{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px 22px;align-items:center}'
    + '.julia-id{display:flex;align-items:center;gap:10px;min-width:0}'
    + '.julia-av{flex:0 0 auto;width:32px;height:32px;border-radius:50%;background:var(--mint,#e9f1ea);color:var(--green,#065145);display:flex;align-items:center;justify-content:center;font-family:var(--fh,inherit);font-weight:700;font-size:.95rem;box-shadow:0 0 0 2px #fff,0 0 0 3px var(--lime-soft,#c7dd8a);overflow:hidden}'
    + '.julia-av img{width:100%;height:100%;object-fit:cover}'
    + '.julia h2.julia-t{font-family:var(--fh,inherit);font-size:.92rem;font-weight:600;line-height:1.25;margin:0;color:var(--green,#065145);letter-spacing:0}'
    + '.julia-t span{display:block;white-space:nowrap}.julia-t .julia-t2{font-family:var(--fb,inherit);font-weight:400;font-size:.78rem;color:var(--slate,#5c6b64)}'
    + '.julia-f{display:flex;gap:6px;margin:0;background:#fff;border:1px solid var(--line-2,#dfe6e2);border-radius:999px;padding:3px 3px 3px 16px;align-items:center}'
    + '.julia-f:focus-within{border-color:var(--green,#065145);box-shadow:0 0 0 3px var(--mint,#e9f1ea)}'
    + '.julia-f input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:16px;color:var(--ink,#233029);padding:7px 0}'
    + '.julia-f input::placeholder{color:var(--slate,#5c6b64)}'
    + '.julia-go{flex:0 0 auto;width:34px;height:34px;border-radius:50%;border:0;background:var(--green,#065145);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}'
    + '.julia-go:hover{background:var(--green-hover,#02392f)}.julia-go:focus-visible{outline:3px solid var(--lime,#8fb822);outline-offset:2px}.julia-go svg{width:17px;height:17px}'
    + '.julia-ex{display:flex;flex-wrap:nowrap;gap:6px;margin:8px 0 0;overflow-x:auto;scrollbar-width:none;padding:1px 0}.julia-ex::-webkit-scrollbar{display:none}'
    + '.julia-chip{flex:0 0 auto;white-space:nowrap;font:inherit;font-size:.78rem;color:var(--slate,#5c6b64);background:#fff;border:1px solid var(--line-2,#dfe6e2);border-radius:999px;padding:.28rem .75rem;cursor:pointer;line-height:1.35}'
    + '.julia-chip:hover{color:var(--green,#065145);border-color:var(--green,#065145)}.julia-chip:focus-visible{outline:2px solid var(--green,#065145);outline-offset:2px}'
    + '.julia-fil{display:grid;gap:10px;margin-top:10px}.julia-fil:empty{display:none}'
    + '.julia-rep{background:#fff;color:var(--ink,#233029);border:1px solid var(--line,#e7ece9);border-radius:12px;padding:14px 18px 12px;font-size:.9rem;line-height:1.55}'
    + '.julia-rep.ancienne{opacity:.72}.julia-rep.ancienne .julia-c{display:none}.julia-rep.ancienne .julia-q{margin:0;cursor:pointer}'
    + '.julia-q{display:flex;justify-content:space-between;gap:12px;align-items:baseline;margin:0 0 8px;font-size:.82rem;color:var(--slate,#5c6b64)}'
    + '.julia-q b{color:var(--green,#065145);font-family:var(--fh,inherit);font-weight:600;font-size:.9rem}'
    + '.julia-x{border:0;background:none;color:var(--slate,#5c6b64);cursor:pointer;font-size:.76rem;padding:0;text-decoration:underline}'
    + '.julia-c p{margin:0 0 8px;max-width:76ch}.julia-c ul{margin:4px 0 10px 18px;padding:0}.julia-c li{margin:3px 0}'
    + '.julia-liens{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 2px}'
    + '.julia-lien{display:inline-flex;align-items:center;gap:4px;border:1.5px solid var(--green,#065145);color:var(--green,#065145);background:#fff;border-radius:999px;padding:.4rem .65rem .4rem .95rem;font-family:var(--fh,inherit);font-weight:600;font-size:.82rem;text-decoration:none;cursor:pointer}'
    + '.julia-lien:hover{background:var(--mint-2,#eef4ef)}.julia-lien svg{width:15px;height:15px}'
    + '.julia-lien:focus-visible{outline:3px solid var(--lime,#8fb822);outline-offset:2px}'
    + '.julia-n{margin:10px 0 0!important;font-size:.74rem;color:var(--slate,#5c6b64)}'
    + '.julia-sc{display:inline-flex;flex-wrap:wrap;gap:6px 10px;align-items:center;background:var(--mint-2,#eef4ef);border-radius:10px;padding:7px 12px;margin:0 0 10px;font-size:.85rem}'
    + '.julia-sc b{color:var(--green,#065145)}'
    + '.julia-bars{display:grid;grid-template-columns:auto 1fr auto;gap:6px 10px;align-items:center;margin:8px 0 12px;font-size:.8rem;max-width:460px}'
    + '.julia-bar{height:8px;border-radius:6px;background:var(--line,#e7ece9);position:relative;overflow:hidden}.julia-bar i{position:absolute;inset:0 auto 0 0;background:var(--lime,#8fb822);border-radius:6px}'
    + '.julia-pistes{list-style:none;margin:8px 0 10px!important;padding:0;display:grid;gap:8px;counter-reset:p}'
    + '.julia-pistes li{counter-increment:p;display:grid;grid-template-columns:28px 1fr;gap:10px;margin:0!important}'
    + '.julia-pistes li::before{content:counter(p);width:24px;height:24px;border-radius:50%;background:var(--mint,#e9f1ea);color:var(--green,#065145);font-weight:700;font-size:.78rem;display:flex;align-items:center;justify-content:center}'
    + '.julia-tag{display:inline-block;font-size:.72rem;font-weight:600;border-radius:999px;padding:1px 8px;margin:4px 6px 0 0;background:var(--mint,#e9f1ea);color:var(--green,#065145)}.julia-tag.q{background:#fdf1d6;color:#7a5200}'
    + '.julia-act{font:inherit;font-weight:600;font-size:.84rem;border:1.5px solid var(--green,#065145);background:#fff;color:var(--green,#065145);border-radius:999px;padding:.4rem .9rem;cursor:pointer;margin:2px 0 4px}'
    + '.julia-act[disabled]{opacity:.7;cursor:default}'
    + '.julia-load{display:flex;gap:5px;align-items:center;color:var(--slate,#5c6b64);font-size:.85rem}'
    + '.julia-load i{width:7px;height:7px;border-radius:50%;background:var(--lime,#8fb822);animation:juliaP 1s infinite}.julia-load i:nth-child(2){animation-delay:.15s}.julia-load i:nth-child(3){animation-delay:.3s}'
    + '@keyframes juliaP{0%,100%{opacity:.25}50%{opacity:1}}'
    + '.julia-fab{position:fixed;right:22px;bottom:22px;z-index:900;display:none;align-items:center;gap:8px;border:1px solid var(--line-2,#dfe6e2);border-radius:999px;background:#fff;color:var(--green,#065145);padding:5px 16px 5px 5px;font-family:var(--fh,inherit);font-weight:600;font-size:.88rem;cursor:pointer;box-shadow:var(--shadow-sm,0 2px 12px rgba(6,81,69,.06))}'
    + '.julia-fab.on{display:inline-flex}.julia-fab:hover{border-color:var(--green,#065145)}.julia-fab:focus-visible{outline:3px solid var(--lime,#8fb822);outline-offset:2px}'
    + '.julia-fab .julia-av{width:30px;height:30px;font-size:.85rem}'
    + '.julia-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'
    + '@media(max-width:640px){.julia-l1{grid-template-columns:1fr;gap:8px}.julia-t span{display:inline;white-space:normal}}'
    + '@media(max-width:640px){.julia{padding:10px 12px 8px}.julia-rep{padding:12px 12px 10px}.julia-fab{right:14px;bottom:14px}}'
    + '@media(prefers-reduced-motion:reduce){.julia-load i{animation:none;opacity:.7}}';
  var st = D.createElement('style'); st.textContent = CSS; D.head.appendChild(st);
  if (D.documentElement.classList) D.documentElement.classList.add('julia-on');

  /* ---------- rubrique en haut de page : sous le bandeau d'accueil, ou sous le titre de la page ---------- */
  function construire() {
    var box = D.createElement('div'); box.className = 'julia'; box.id = 'julia';
    box.setAttribute('role', 'region'); box.setAttribute('aria-labelledby', 'julia-t');
    box.setAttribute('aria-describedby', 'julia-l');
    box.innerHTML = '<div class="julia-l1"><div class="julia-id"><div class="julia-av">' + AVATAR + '</div><h2 class="julia-t" id="julia-t"><span>' + esc(TITRE_1) + '</span> <span class="julia-t2">' + esc(TITRE_2) + '</span></h2></div>'
      + '<form class="julia-f" id="julia-f" autocomplete="off"><label class="julia-sr" for="julia-q">Posez votre question à Julia</label>'
      + '<input type="text" id="julia-q" maxlength="300" placeholder="Posez votre question" enterkeyhint="send">'
      + '<button type="submit" class="julia-go" id="julia-go" aria-label="Envoyer ma question à Julia">' + ENVOI + '</button></form></div>'
      + '<p class="julia-sr" id="julia-l">' + esc(CONF.lede) + '</p>'
      + '<div class="julia-ex" id="julia-ex" aria-label="Exemples de questions"></div>'
      + '<div class="julia-fil" id="julia-fil" aria-live="polite"></div>';
    var hero = D.querySelector('section.hero') || D.querySelector('section.sim-hero') || D.querySelector('section.au-hero');
    if (hero && hero.parentNode) {
      var band = D.createElement('section'); band.className = 'julia-band'; band.id = 'julia-band';
      var w = D.createElement('div'); w.className = 'wrap'; w.appendChild(box); band.appendChild(w);
      hero.parentNode.insertBefore(band, hero.nextSibling);
      /* largeur totale du bloc du dessus : même largeur maximale et mêmes marges intérieures que son conteneur
         (.hero-in et .sim-hero-in n'ont pas de marge latérale, .wrap simple en a 24 px), recalculées si la fenêtre change */
      var ref = hero.firstElementChild || null;
      var caler = function () {
        if (!ref || !window.getComputedStyle) return;
        var cs = window.getComputedStyle(ref);
        w.style.paddingLeft = cs.paddingLeft; w.style.paddingRight = cs.paddingRight;
        if (cs.maxWidth && cs.maxWidth !== 'none') w.style.maxWidth = cs.maxWidth;
      };
      caler(); if (window.addEventListener) window.addEventListener('resize', caler);
      return box;
    }
    var h1 = D.querySelector('main h1') || D.querySelector('h1');
    if (h1 && h1.parentNode) {
      var apres = h1.nextElementSibling && h1.nextElementSibling.tagName === 'P' ? h1.nextElementSibling : h1;
      box.className += ' julia-inline'; apres.parentNode.insertBefore(box, apres.nextSibling); return box;
    }
    var main = D.querySelector('main') || D.body; box.className += ' julia-inline'; main.insertBefore(box, main.firstChild || null); return box;
  }
  if ($('julia')) return;
  var box = construire();
  var fil = $('julia-fil'), champ = $('julia-q'), histo = [];

  function exemples() { return CONF.ex || (DEVIS ? exemplesDevis() : PAGES['index.html'].ex); }
  function peindreExemples() {
    var ex = exemples().slice(0, 4), zone = $('julia-ex'); if (!zone) return;
    zone.innerHTML = ex.map(function (x, i) {
      return '<button type="button" class="julia-chip" data-i="' + i + '">' + esc(x.q) + '</button>'; }).join('');
    zone.__ex = ex;
  }
  peindreExemples();
  /* devis : les exemples suivent l'avancement (scénario « Et si… » adapté aux solutions choisies) */
  if (DEVIS) ['renderEstimation', 'renderCart'].forEach(function (f) {
    if (typeof window[f] !== 'function') return;
    var o = window[f]; window[f] = function () { var r = o.apply(this, arguments); try { peindreExemples(); } catch (e) {} return r; };
  });

  box.addEventListener('submit', function (e) { if (e.preventDefault) e.preventDefault(); var q = String(champ.value || '').trim(); if (!q) { champ.focus(); return; } champ.value = ''; demander(q, '', 'libre'); });
  box.addEventListener('click', function (e) {
    var t = e.target, c = t && t.closest ? t.closest('[data-i]') : null;
    if (c && c.getAttribute('data-i') != null) { var ex = ($('julia-ex').__ex || [])[+c.getAttribute('data-i')]; if (ex) demander(ex.q, ex.action || '', 'exemple'); return; }
    var x = t && t.closest ? t.closest('[data-fermer]') : null; if (x) { var a = x.closest('.julia-rep'); if (a) a.remove(); return; }
    var qa = t && t.closest ? t.closest('.julia-q') : null;
    if (qa) { var art = qa.closest('.julia-rep'); if (art && art.classList && art.classList.contains('ancienne')) { art.classList.remove('ancienne'); return; } }
    var l = t && t.closest ? t.closest('[data-lien]') : null;
    if (l) { var id = l.getAttribute('data-lien'); IA.track('julia_lien', { page: page, lien: id });
      if (id === 'expert') { if (typeof goToContact === 'function' && page === 'diagnostic.html') { if (e.preventDefault) e.preventDefault(); goToContact(); }
        else if (typeof openExpert === 'function') { if (e.preventDefault) e.preventDefault(); openExpert(); } } }
  });

  function liens(ids) {
    var vus = {}, l = (ids || []).filter(function (k) { if (!LIENS[k] || vus[k] || (LIENS[k].page && LIENS[k].page === page)) return false; vus[k] = 1; return true; }).slice(0, MAX_LIENS);
    return l.length ? '<div class="julia-liens">' + l.map(function (k) { return '<a class="julia-lien" data-lien="' + k + '" href="' + LIENS[k].url + '">' + esc(LIENS[k].lib) + CHEV + '</a>'; }).join('') + '</div>' : '';
  }
  function note(src, montants) {
    return '<p class="julia-n">' + (montants ? 'Estimation indicative et non contractuelle. ' : '')
      + (src === 'mistral' ? 'Réponse de Julia, une IA, à partir de vos réponses et de la base documentaire du portail. Un expert Banque des RH valide avec vous.'
                           : 'Mode démonstration : réponse préparée par les règles du portail, sans appel à l’IA.') + '</p>';
  }
  function paras(t) { return String(t || '').split(/\n+/).filter(function (x) { return x.trim(); }).map(function (x) { return '<p>' + IA.md(x) + '</p>'; }).join(''); }
  function puces(a) { a = (Array.isArray(a) ? a : []).filter(function (x) { return typeof x === 'string' && x.trim(); }).slice(0, 4); return a.length ? '<ul>' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''; }

  /* une réponse = un bloc sous la rubrique, le plus récent en tête ; 3 au plus, les anciens repliés */
  function nouveauBloc(q) {
    var a = D.createElement('article'); a.className = 'julia-rep';
    a.innerHTML = '<div class="julia-q"><span>Votre question : <b>' + esc(q) + '</b></span><button type="button" class="julia-x" data-fermer="1" aria-label="Effacer cette réponse">Effacer</button></div>'
      + '<div class="julia-c"><div class="julia-load"><i></i><i></i><i></i>Julia prépare sa réponse…</div></div>';
    var prec = fil.children || [];
    for (var i = 0; i < prec.length; i++) if (prec[i].classList) prec[i].classList.add('ancienne');
    fil.insertBefore(a, (fil.children && fil.children[0]) || null);
    while (fil.children && fil.children.length > MAX_REP) fil.removeChild(fil.children[fil.children.length - 1]);
    return a;
  }
  function corps(a) { return (a.querySelector && a.querySelector('.julia-c')) || a; }
  function remplir(a, html) { var c = corps(a); c.innerHTML = html; if (a.classList) a.classList.remove('ancienne'); }

  function demander(q, action, origine) {
    IA.track('julia_question', { page: page, origine: origine, action: action || 'libre' });
    var a = nouveauBloc(q), p;
    if (action === 'inspire' && DIAG) p = inspire(a);
    else if ((action === 'explique' || /^sc:/.test(action || '')) && DIAG) p = expliqueDiag(a, action);
    else if ((action === 'explique' || /^sc:/.test(action || '')) && DEVIS) p = expliqueDevis(a, action);
    else if (action === 'preconise' && (DIAG || DEVIS)) p = preconise(a);
    else p = libre(a, q);
    /* réponse inattendue de l'IA : le bloc ne reste jamais bloqué sur « Julia prépare sa réponse… » */
    p = Promise.resolve(p).catch(function () {
      remplir(a, '<p>Je n’ai pas pu préparer cette réponse. Reformulez votre question, ou demandez à être rappelé par un expert Banque des RH.</p>' + liens(['expert']));
      return null;
    });
    window.BRH_JULIA.derniere = p;
    return p;
  }

  /* ---------- question libre ---------- */
  function libre(a, q) {
    var ctx = { page: page, titre_page: D.title || '', question: q, contexte: contexte(), historique: histo.slice(-2), liens_possibles: liensPossibles() };
    return IA.run('julia', ctx, function () { return repliJulia(q); }).then(function (r) {
      var d = (r.data && typeof r.data === 'object') ? r.data : repliJulia(q), rep = String(d.reponse || '').trim() || repliJulia(q).reponse;
      histo.push({ q: q.slice(0, 200), r: rep.replace(/\s+/g, ' ').slice(0, 280) }); if (histo.length > 4) histo.shift();
      var montants = !!d.chiffres || /\d[\d  ]*(?:,\d+)?\s?(?:€|%)/.test(rep);
      remplir(a, paras(rep) + puces(d.points) + liens(Array.isArray(d.liens) ? d.liens : []) + note(r.source, montants));
      return d;
    });
  }

  /* ---------- diagnostic : entreprises similaires ---------- */
  function inspire(a) {
    var b = IA.bench(val('secteur'), state.effectif, dep());
    var ctx = { secteur: val('secteur') || 'non précisé', effectif: state.effectif, departement: dep(), benchmark: b };
    return IA.run('inspire', ctx, IA.repli.inspire).then(function (r) {
      var d = r.data || IA.repli.inspire(ctx);
      var bars = Object.keys(IA.AX).map(function (k) {
        return '<span>' + IA.AX[k].court + '</span><span class="julia-bar"><i style="width:' + (b.priorites[k] / 4 * 100) + '%"></i></span><b>' + String(b.priorites[k]).replace('.', ',') + '</b>'; }).join('');
      remplir(a, paras(d.intro) + '<div class="julia-bars" aria-label="Priorités moyennes des entreprises similaires, sur 4">' + bars + '</div>'
        + puces((d.idees || []).slice(0, 3).map(function (x) { return x.titre + ' : ' + x.pourquoi; }))
        + (d.question ? '<p><i>' + esc(d.question) + '</i></p>' : '')
        + '<button type="button" class="julia-act" data-appliquer="1">Partir de ces priorités (modifiables)</button>'
        + '<p class="julia-n">Entreprises similaires : ' + esc(b.source) + ', données agrégées et anonymisées.</p>' + note(r.source, false));
      var bt = a.querySelector && a.querySelector('[data-appliquer]');
      if (bt && bt.addEventListener) bt.addEventListener('click', function () {
        Object.keys(IA.AX).forEach(function (k) { var n = Math.round(b.priorites[k]), s = $('s-' + k); if (s) s.value = n; if (typeof onPriority === 'function') onPriority(k, n); });
        IA.track('julia_priorites_appliquees', {}); bt.textContent = 'Priorités appliquées : ajustez-les à votre situation'; bt.disabled = true;
      });
      return d;
    });
  }

  /* ---------- diagnostic : estimation et « Et si… » ---------- */
  function expliqueDiag(a, action) {
    if (!state.resultsUnlocked) {
      remplir(a, '<p>Affichez d’abord votre estimation à l’étape « Estimation » du diagnostic : je vous explique ensuite chaque montant et je simule vos « Et si… ».</p>');
      return Promise.resolve(null);
    }
    var sc = /^sc:/.test(action) ? scenarioDiag(action.slice(3)) : null, base = resultatsDiag(state.effectif, Object.assign({}, state.priorities));
    var ctx = { page: 'diagnostic', resultats: Object.assign(base, { regle_de_calcul: 'estimation de démonstration du portail : 600 € par salarié et par dispositif actif pour l’entreprise ; 400 € de pouvoir d’achat par salarié et par dispositif' }), scenario: sc, secteur: val('secteur') };
    return IA.run('explique', ctx, IA.repli.explique).then(function (r) {
      var d = r.data || {};
      remplir(a, (sc ? '<div class="julia-sc">' + esc(sc.libelle) + ' <b>' + eur(sc.avant) + ' → ' + eur(sc.apres) + ' par an</b></div>' : '')
        + paras(d.explication) + puces(d.points) + (d.vigilance ? '<p><b>Point de vigilance :</b> ' + esc(d.vigilance) + '</p>' : '')
        + (sc ? '<p class="julia-n">Scénario recalculé par le portail sans modifier vos réponses.</p>' : '') + note(r.source, true));
      return d;
    });
  }

  /* ---------- devis : estimation et « Et si… » ---------- */
  function expliqueDevis(a, action) {
    if (!devisEstime()) {
      remplir(a, '<p>Votre estimation s’affiche à l’étape « Votre estimation », une fois vos solutions et vos salariés renseignés. Je vous explique alors chaque montant et je simule vos « Et si… ».</p>');
      return Promise.resolve(null);
    }
    var base = totauxDevis(S.est || compute()), sc = null;
    if (/^sc:/.test(action)) { var s = scenariosDevis().filter(function (x) { return x.id === action.slice(3); })[0];
      if (s) { var r2 = simulerDevis(s.ch); sc = { libelle: 'Et si ' + s.label, avant: base.cout_total, apres: r2.cout_total, gain_net_par_salarie_avant: base.gain_net_moyen_par_salarie, gain_net_par_salarie_apres: r2.gain_net_moyen_par_salarie }; } }
    var ctx = { page: 'devis', resultats: base, scenario: sc, secteur: (S.ent && S.ent.secteur) || '',
                note: 'cout_total = coût employeur annuel estimé ; un euro net versé en salaire coûte environ 1,81 € à l’employeur (hypothèse du portail)' };
    return IA.run('explique', ctx, IA.repli.explique).then(function (r) {
      var d = r.data || {};
      remplir(a, (sc ? '<div class="julia-sc">' + esc(sc.libelle) + ' <b>coût ' + eur(sc.avant) + ' → ' + eur(sc.apres) + ' par an</b>'
          + (sc.gain_net_par_salarie_apres !== sc.gain_net_par_salarie_avant ? '<b>gain net ' + eur(sc.gain_net_par_salarie_avant) + ' → ' + eur(sc.gain_net_par_salarie_apres) + ' par salarié</b>' : '') + '</div>' : '')
        + paras(d.explication) + puces(d.points) + (d.vigilance ? '<p><b>Point de vigilance :</b> ' + esc(d.vigilance) + '</p>' : '')
        + (sc ? '<p class="julia-n">Scénario simulé sans modifier vos réponses : pour le retenir, ajustez la configuration de vos solutions.</p>' : '') + note(r.source, true));
      return d;
    });
  }

  /* ---------- diagnostic et devis : par où commencer, dans quel ordre ---------- */
  function preconise(a) {
    var ctx, eff;
    if (DIAG) { ctx = profilDiag(); ctx.convention_sante = conventionSante(); eff = +ctx.effectif || 0; }
    else { var p = memo('brhProfil'), h = RH(); eff = h.N || +((S.ent || {}).effectif) || 0;
      ctx = { effectif: eff, secteur: (S.ent && S.ent.secteur) || p.secteur || '', priorites: p.priorites || {}, deja: p.deja || [], panier: S.sol.slice(), convention_sante: conventionSante(),
              statuts: S.sol.map(function (k) { return (typeof DV_SOL !== 'undefined' && DV_SOL[k] && typeof STATUT_LBL !== 'undefined') ? DV_SOL[k].title + ' : ' + STATUT_LBL[DV_SOL[k].statut] : k; }) }; }
    return IA.run('preconise', ctx, IA.repli.preconise).then(function (r) {
      var d = r.data || IA.repli.preconise(ctx);
      var pistes = (d.pistes || []).slice(0, 3).map(function (x) {
        return '<li><div><b>' + esc(x.titre) + '</b><br>' + esc(x.pourquoi) + '<br>' + (x.quand ? '<span class="julia-tag q">' + esc(x.quand) + '</span>' : '') + (x.canal ? '<span class="julia-tag">' + esc(x.canal) + '</span>' : '') + '</div></li>'; }).join('');
      var suite = DIAG ? (eff >= 1 && eff <= 500 ? ['devis', 'expert'] : ['expert']) : ['expert'];
      var M = window.BRH_SANTE_CCN, cc = null; try { cc = M ? M.courante() : null; } catch (e) {}
      var sante = (d.pistes || []).some(function (x) { return x.solution === 'sante' || /mutuelle|santé|prévoyance/i.test(x.titre || ''); });
      var rappel = sante && cc && cc.c && M.phrase(cc) ? '<p class="julia-sc">' + esc(M.phrase(cc)) + '</p>' : '';
      remplir(a, paras(d.constat) + (pistes ? '<ol class="julia-pistes">' + pistes + '</ol>' : '') + rappel + (d.prochaine_etape ? '<p><b>Prochaine étape :</b> ' + esc(d.prochaine_etape) + '</p>' : '')
        + liens(suite) + note(r.source, false));
      return d;
    });
  }

  /* ---------- bouton flottant « Julia » : visible quand la rubrique est hors de l'écran ---------- */
  var fab = D.createElement('button'); fab.type = 'button'; fab.className = 'julia-fab'; fab.id = 'julia-fab';
  fab.setAttribute('aria-label', 'Poser une question à Julia, votre assistante RH');
  fab.innerHTML = '<span class="julia-av">' + AVATAR + '</span>Julia';
  D.body.appendChild(fab);
  function ouvrir(q) {
    if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { try { champ.focus({ preventScroll: true }); } catch (e) { champ.focus(); } }, 350);
    if (q) demander(String(q), '', 'libre');
    IA.track('julia_ouverture', { page: page });
  }
  fab.addEventListener('click', function () { ouvrir(); });
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (en) { fab.classList.toggle('on', !en[0].isIntersecting); }, { threshold: 0 }).observe(box);
  }
  /* la bulle « Assistant BRH » du socle n'est plus affichée sur C : ses appels ouvrent Julia */
  if (typeof window.cbotOpen === 'function') window.__cbotOpenSocle = window.cbotOpen;
  window.cbotOpen = function () { ouvrir(); };

  /* ---------- accueil : questions fréquentes en données structurées (GEO), reprises de la C 1.x ---------- */
  if (page === 'index.html' && !D.querySelector('script[data-ia-faq]')) {
    var FAQ = [
      ['Comment donner du pouvoir d’achat à mes salariés sans alourdir mes charges ?', 'Titres-restaurant, forfait mobilités durables, cartes cadeaux, prime de partage de la valeur et épargne salariale bénéficient de régimes sociaux et fiscaux spécifiques, selon les conditions et plafonds en vigueur. Un expert Banque des RH de la Caisse régionale précise ce qui s’applique à votre entreprise.'],
      ['La complémentaire santé est-elle obligatoire ?', 'Oui, pour les salariés du secteur privé ; l’employeur finance au moins 50 % de la cotisation. La prévoyance dépend notamment de la convention collective.'],
      ['Puis-je mettre en place l’intéressement ou la prime de partage de la valeur dans une petite entreprise ?', 'Oui, ces dispositifs sont facultatifs et accessibles aux petites entreprises, selon des conditions précisées par un expert.']
    ];
    var ld = D.createElement('script'); ld.type = 'application/ld+json'; ld.setAttribute('data-ia-faq', '1');
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(function (f) { return { '@type': 'Question', name: f[0], acceptedAnswer: { '@type': 'Answer', text: f[1] } }; }) });
    D.head.appendChild(ld);
  }

  window.BRH_JULIA = { page: page, demander: demander, ouvrir: ouvrir, exemples: exemples, liens: LIENS, repli: repliJulia, version: '2.0' };
})();
