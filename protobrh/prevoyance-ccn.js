/* ==============================================================
   PRÉVOYANCE COLLECTIVE PAR CONVENTION COLLECTIVE (IDCC) — MODIFIABLE ICI
   Source : « Répertoire des conventions collectives imposant des garanties minimales »,
   état documentaire au 21/10/2026 (document de travail transmis par le Business Owner).
   Utilisé par devis.html : petit « i » à côté de la convention collective (étape 2) et dans
   la prévoyance (étape 4), qui ouvre une fenêtre flottante adaptée à l'IDCC identifié.
   Après modification : changer le numéro ?v=AAAAMMJJ dans les pages qui le chargent.
   ============================================================== */
(function(){
  var LF = 'https://www.legifrance.gouv.fr/conv_coll/';
  /* [codes IDCC, branche, salariés concernés, socle / point clé, texte officiel, lien, statut, confirmé] */
  var CCN = [
    [['573'], 'Commerces de gros', 'Non-cadres', 'Régime de branche collectif obligatoire ; décès, incapacité, invalidité ; l’accord 2023 ajoute rente éducation et frais d’obsèques et améliore l’invalidité.', 'Accord du 23 octobre 2023, applicable depuis le 01/07/2024', LF+'article/KALIARTI000048953876', 'Confirmé — accord étendu', 1],
    [['3127'], 'Entreprises de services à la personne', 'Non-cadres', 'Garanties minimales obligatoires ; décès, rente éducation, obsèques et garanties d’arrêt de travail/invalidité selon le tableau conventionnel.', 'Accord du 6 février 2025, étendu fin 2025', LF+'article/KALIARTI000051843478', 'Confirmé — accord étendu', 1],
    [['1431'], 'Optique-lunetterie de détail', 'Non-cadres', 'Régime national de prévoyance collectif et obligatoire pour les non-cadres ; risques décès, incapacité et invalidité selon accord et avenants.', 'Accord du 14 juin 2011, modifié notamment par avenant n°9 du 26/09/2024', LF+'article/KALIARTI000050796404', 'Confirmé — accord étendu, mise à jour à contrôler', 1],
    [['3221'], 'Agences de presse', 'Salariés couverts par l’accord', 'Couverture minimale de prévoyance, notamment capital décès minimal de 200 % du traitement de base en tranche 1 ; vérifier les autres garanties dans l’accord.', 'Accord du 31 janvier 2019', LF+'article/KALIARTI000038688296', 'Confirmé — accord étendu', 1],
    [['1480'], 'Journalistes', 'Salariés couverts par l’accord, hors journalistes pigistes couverts par un régime distinct', 'Le même accord de branche institue une couverture minimale pour les salariés concernés ; exclusion expresse des journalistes rémunérés à la pige, soumis à un régime particulier.', 'Accord du 31 janvier 2019', LF+'article/KALIARTI000038688294', 'Confirmé — champ particulier', 1],
    [['2128'], 'Mutualité', 'Cadres et non-cadres', 'Régime conventionnel détaillé : décès/IAD, rente éducation, incapacité temporaire et invalidité ; niveaux de garanties et cotisations actualisés en 2025/2026.', 'Annexe IV garanties et annexe V cotisations, en vigueur au 01/01/2026', LF+'article/KALIARTI000048995847', 'Confirmé — garanties et cotisations publiées', 1],
    [['2128'], 'Mutualité — cotisations', 'Cadres et non-cadres', 'Cotisations de prévoyance définies par tranches de rémunération ; taux d’appel applicables en 2026 publiés dans l’annexe V.', 'Annexe V, modifiée par avenant du 21 octobre 2025', LF+'article/KALIARTI000053751275', 'Confirmé — cotisations 2026', 1],
    [['1499'], 'Miroiterie, transformation et négoce du verre', 'Salariés couverts par le régime conventionnel', 'Garanties minimales conventionnelles comprenant décès, invalidité absolue et définitive, obsèques, double effet et rente éducation.', 'Accord du 1er mars 2016', LF+'article/KALIARTI000032826642', 'Confirmé — accord étendu', 1],
    [['292'], 'Plasturgie', 'Salariés visés par l’accord (vérifier catégories et articulation avec les textes ultérieurs)', 'Contrat collectif couvrant incapacité, invalidité et décès ; cotisation minimale conventionnelle de 0,8 %, dont 0,4 % employeur et 0,4 % salarié selon le texte consulté.', 'Accord du 29 octobre 2014', LF+'article/KALIARTI000030370179', 'Confirmé — vérifier actualisation et champ', 1],
    [['1586'], 'Industries charcutières (salaison, charcuterie en gros, conserves de viandes) — non-cadres', 'Non-cadres non couverts par le régime cadres', 'Contrat collectif obligatoire et garanties minimales pour les non-cadres ; textes récents de la branche à vérifier pour l’articulation cadres/non-cadres.', 'Avenant de révision des garanties minimales ; textes de branche 2025-2026', LF+'id/KALITEXT000045518073', 'Confirmé — vigilance sur les textes récents', 1],
    [['1586'], 'Industries charcutières (salaison, charcuterie en gros, conserves de viandes) — cadres', 'Cadres', 'Accord distinct sur la prévoyance des cadres adopté en 2025 et révisé en 2026 ; ne pas confondre avec le socle non-cadres.', 'Accord du 3 novembre 2025 et avenant du 16 avril 2026', LF+'article/KALIARTI000054825356', 'Confirmé — cadres uniquement', 1],
    [['1605'], 'Désinfection, désinsectisation, dératisation (3D)', 'Non-cadres', 'Régime de prévoyance obligatoire pour les non-cadres ; garanties décès, incapacité et invalidité prévues par l’accord de branche. L’avenant historique consulté indique une fin de vigueur au 01/01/2025 : vérifier le texte successeur avant mise en conformité.', 'Avenant du 13 mai 2014, fin de vigueur indiquée au 01/01/2025', LF+'article/KALIARTI000029617255', 'À revalider — ne pas appliquer l’ancien avenant seul', 0],
    [['275'], 'Personnel au sol des entreprises de transport aérien', 'Salariés visés par l’accord', 'Garanties minimales obligatoires, notamment décès et perte totale et irréversible d’autonomie, avec choix d’option par l’entreprise selon l’accord.', 'Texte actualisé/étendu en 2026', LF+'id/KALIARTI000054033690', 'Confirmé — vérifier catégories bénéficiaires', 1],
    [['3017'], 'Ports et manutention (convention unifiée)', 'Ouvriers dockers professionnels intermittents (régime spécifique)', 'Garanties collectives obligatoires minimales : incapacité temporaire, invalidité, IPP, décès/IAD ; règles spécifiques de présence et d’éligibilité.', 'Accord de branche consulté sur Légifrance', LF+'id/KALITEXT000032489589/', 'Confirmé — population spécifique, pas tous les salariés', 1],
    [['1596','1597'], 'Bâtiment et travaux publics — ouvriers', 'Ouvriers, selon champ bâtiment/travaux publics', 'Régime national obligatoire des ouvriers du BTP avec cotisation minimale à la charge exclusive de l’employeur et garanties minimales de branche ; les IDCC diffèrent selon bâtiment/travaux publics et taille/champ.', 'Accord national et avenants, dont avenant n°62 du 20 mai 2020', LF+'article/KALIARTI000042258429', 'Confirmé — vérifier le bon IDCC et le champ exact', 1],
    [['1505'], 'Commerce de détail alimentaire non spécialisé', 'Catégories couvertes par le régime applicable', 'Textes de protection sociale complémentaire présents ; la source consultée porte surtout sur les catégories objectives et ne suffit pas seule à établir un socle de garanties de prévoyance.', 'Avenant du 25 juin 2024 relatif au régime complémentaire de prévoyance / catégories', LF+'article/KALIARTI000050329353', 'À vérifier — source de catégories, pas preuve suffisante du socle', 0],
    [['1505'], 'Commerce de détail alimentaire spécialisé', 'Catégories objectives à distinguer', 'Accord sur catégories objectives de protection sociale complémentaire ; nécessite un contrôle séparé des textes fixant les garanties minimales et cotisations.', 'Accord du 16 septembre 2024, applicable en 2025', LF+'article/KALIARTI000050699629', 'À vérifier — catégories, pas preuve suffisante du socle', 0],
    [['2335'], 'Personnel des agences générales d’assurances', 'Tous salariés', 'Régime de prévoyance obligatoire pour tous les salariés de la branche et garanties minimales communes ; les régimes préexistants peuvent subsister s’ils respectent l’accord.', 'Accord du 13 novembre 2018, en vigueur depuis 2020', LF+'article/KALIARTI000038544933', 'Confirmé — accord étendu', 1],
    [['2378'], 'Entreprises de travail temporaire — intérimaires', 'Intérimaires cadres et non-cadres, selon accord et statut', 'Accord dédié aux garanties de prévoyance des intérimaires, avec régime distinct des salariés permanents ; appliquer les règles spécifiques à la mission et à la catégorie.', 'Accord du 16 novembre 2018', LF+'id/KALITEXT000038418182', 'Confirmé — régime particulier', 1],
    [['3233'], 'Industrie cimentière / fabrication des ciments', 'Catégories objectives à distinguer', 'Des textes récents déterminent les catégories objectives bénéficiaires de la protection sociale complémentaire ; ils ne constituent pas, à eux seuls, une preuve d’un niveau minimal de garantie pour tous les non-cadres.', 'Avenant du 11 décembre 2024, applicable en 2025', LF+'article/KALIARTI000051315208', 'À vérifier — catégorie d’affiliation, pas socle de garanties', 0]
  ];
  var LIENS = [
    ['Code de la sécurité sociale, art. L. 911-1 et suivants', 'https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006126923/2026-04-23'],
    ['Urssaf — prévoyance complémentaire', 'https://www.urssaf.fr/accueil/employeur/embaucher-gerer-salaries/embaucher/prevoyance-complementaire.html'],
    ['Légifrance — conventions collectives par IDCC', 'https://www.legifrance.gouv.fr/liste/idcc']
  ];
  var CSS = '.pv-wrap{position:relative;display:inline-flex;align-items:center;gap:6px;vertical-align:1px;margin-left:8px}'+
    '.pv-i{width:19px;height:19px;border-radius:50%;border:none;background:var(--lime,#8FB822);color:#fff;font:italic 700 .74rem/19px var(--fh,sans-serif);text-align:center;cursor:pointer;padding:0;flex:none}'+
    '.pv-i:focus-visible{outline:2px solid var(--green,#065145);outline-offset:2px}'+
    '.pv-flag{font:600 .7rem var(--fb,sans-serif);color:var(--green,#065145);background:var(--mint,#E3EFEA);border-radius:999px;padding:2px 8px;white-space:nowrap}'+
    '.pv-tip{display:none;position:absolute;left:-12px;top:calc(100% + 10px);z-index:60;width:min(440px,86vw);max-height:min(460px,70vh);overflow:auto;background:#fff;color:var(--ink,#1d2b28);border:1px solid var(--line-2,#dfe6e2);border-radius:12px;box-shadow:0 12px 32px rgba(6,81,69,.18);padding:14px 16px;font:400 .8rem/1.45 var(--fb,sans-serif);text-transform:none;letter-spacing:0;text-align:left;white-space:normal}'+
    '.pv-wrap.open .pv-tip{display:block}'+
    '.pv-tip h4{margin:0 0 4px;font:700 .9rem var(--fh,sans-serif);color:var(--green,#065145)}.pv-tip p{margin:0 0 8px}'+
    '.pv-c{border:1px solid var(--line,#e7ece9);border-radius:10px;padding:9px 11px;margin:0 0 8px}.pv-c b{display:block;color:var(--green,#065145);font-size:.84rem}'+
    '.pv-c dl{margin:4px 0 0;display:grid;grid-template-columns:auto 1fr;gap:2px 8px}.pv-c dt{font-weight:600;color:var(--slate,#5b6b66)}.pv-c dd{margin:0}'+
    '.pv-s{display:inline-block;margin-top:6px;font-size:.72rem;font-weight:700;border-radius:999px;padding:2px 8px;background:var(--mint,#E3EFEA);color:var(--green,#065145)}.pv-s.av{background:#fff3df;color:#8a5a00}'+
    '.pv-tip a{color:var(--teal,#016265);font-weight:600}.pv-tip ul{margin:2px 0 8px;padding-left:16px}.pv-n{font-size:.72rem;color:var(--slate,#5b6b66);border-top:1px solid var(--line,#e7ece9);padding-top:6px;margin-top:4px}'+
    '@media(max-width:600px){.pv-tip{left:auto;right:-60px}}';
  function css(){ if (document.getElementById('pvCss')) return; var s = document.createElement('style'); s.id = 'pvCss'; s.textContent = CSS; document.head.appendChild(s); }
  function code(t){ var m = String(t||'').match(/^\s*(\d{1,4})\b/); return m ? String(parseInt(m[1], 10)) : ''; }
  /* fiches de l'inventaire pour un IDCC (texte « 1596 — … » ou code seul) */
  function pour(t){ var c = code(t); return c ? CCN.filter(function(e){ return e[0].indexOf(c) >= 0; }) : []; }
  var courant = '';
  function contenu(){
    var c = code(courant), l = pour(courant), h;
    if (l.length) {
      h = '<h4>Prévoyance de branche — IDCC ' + c + '</h4><p>Votre convention collective figure dans l’inventaire des branches qui imposent un régime ou des garanties minimales de prévoyance. Votre expert BRH s’appuie sur ce socle pour votre devis prévoyance et vérifie le texte applicable.</p>' +
        l.map(function(e){ return '<div class="pv-c"><b>' + e[1] + '</b><dl><dt>Salariés</dt><dd>' + e[2] + '</dd><dt>Socle</dt><dd>' + e[3] + '</dd><dt>Texte</dt><dd>' + e[4] + ' — <a href="' + e[5] + '" target="_blank" rel="noopener">ouvrir sur Légifrance</a></dd></dl><span class="pv-s' + (e[7] ? '' : ' av') + '">' + e[6] + '</span></div>'; }).join('');
    } else {
      h = '<h4>Prévoyance et convention collective</h4><p>' + (c ? 'L’IDCC ' + c + ' ne figure pas dans l’inventaire des 20 régimes de branche repérés au 21/10/2026 : cela ne prouve pas l’absence d’obligation. ' : 'Indiquez votre code IDCC (bulletin de paie) : certaines branches imposent un régime ou des garanties minimales de prévoyance. ') +
        'Votre expert BRH contrôle le texte applicable.</p><p><b>Branches repérées :</b> ' + CCN.map(function(e){ return e[0].join('/'); }).filter(function(v, i, a){ return a.indexOf(v) === i; }).join(', ') + '.</p>';
    }
    return h + '<p><b>À savoir :</b> la prévoyance couvre ici le décès, l’incapacité temporaire de travail et l’invalidité ; la complémentaire santé et le maintien de salaire sont des sujets distincts. Avant toute décision de conformité, vérifier la version du texte, son extension, son champ, les catégories bénéficiaires et les avenants.</p>' +
      '<ul>' + LIENS.map(function(x){ return '<li><a href="' + x[1] + '" target="_blank" rel="noopener">' + x[0] + '</a></li>'; }).join('') + '</ul>' +
      '<p class="pv-n">Répertoire de travail au 21/10/2026, non exhaustif — ne remplace pas la lecture des textes applicables ni un avis juridique.</p>';
  }
  /* petit « i » : à insérer dans la page ; le contenu suit l'IDCC transmis à maj() */
  function bouton(id){
    css();
    return '<span class="pv-wrap"><button type="button" class="pv-i" aria-label="Prévoyance imposée par votre convention collective" aria-expanded="false" aria-controls="' + id + '" onclick="BRH_PREV.ouvrir(this)">i</button><span class="pv-flag" hidden>Prévoyance de branche</span><span class="pv-tip" id="' + id + '" role="dialog" aria-label="Prévoyance et convention collective"></span></span>';
  }
  function fermer(){ document.querySelectorAll('.pv-wrap.open').forEach(function(w){ w.classList.remove('open'); w.querySelector('.pv-i').setAttribute('aria-expanded', 'false'); }); }
  function ouvrir(b){
    var w = b.parentNode, on = !w.classList.contains('open'); fermer();
    if (on) { w.querySelector('.pv-tip').innerHTML = contenu(); w.classList.add('open'); b.setAttribute('aria-expanded', 'true');
      if (window.BRH_PREV.onOpen) window.BRH_PREV.onOpen(code(courant), pour(courant).length > 0); }
  }
  function maj(t){
    courant = t || ''; var ok = pour(courant).length > 0;
    document.querySelectorAll('.pv-wrap').forEach(function(w){ w.querySelector('.pv-flag').hidden = !ok; if (w.classList.contains('open')) w.querySelector('.pv-tip').innerHTML = contenu(); });
  }
  document.addEventListener('click', function(e){ if (!e.target.closest || !e.target.closest('.pv-wrap')) fermer(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') fermer(); });
  window.BRH_PREV = { liste:CCN, pour:pour, bouton:bouton, ouvrir:ouvrir, maj:maj, fermer:fermer };
})();
