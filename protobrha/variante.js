/* Version A — protobrha.monsitedetest.com : parcours court en autonomie, design épuré et moderne.
   Retours de l'atelier CR & Direction de la Distribution du 13/11/2026 (CR_PORTAIL_BRH_15C) :
   accroche sans « portail », cible dirigeants / RH / DAF, besoins en langage concret, écran « Nos solutions »
   supprimé au profit de « Voir mes tarifs », e-mail facultatif, devis en 4 étapes, convention collective
   seulement pour la santé et la prévoyance, « Être accompagné » à chaque étape, rappel sous 48 h ouvrées,
   devis automatique pour les cas simples et suivi des abandons (lead.php).
   Identifie aussi la version dans chaque événement de mesure et chaque demande transmise.
   Le reste du site est le socle commun (dossier protobrh/). */
(function(){
  var V = 'A';
  window.BRH_VARIANTE = V;
  document.documentElement.setAttribute('data-variante', V);
  var dl = window.dataLayer = window.dataLayer || [], push = dl.push;
  dl.push = function(o){ if (o && typeof o === 'object' && !o.variante) o.variante = V; return push.apply(dl, arguments); };
  function ready(f){ if (document.readyState !== 'loading') f(); else document.addEventListener('DOMContentLoaded', f); }
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var DELAI = '48 h ouvrées';   /* délai de rappel affiché (proposé à l'atelier, à confirmer avec les Caisses régionales) */

  /* ---------- besoins en langage concret (accueil et diagnostic) ---------- */
  var BESOINS = {
    proteger: { titre:'Bien couvrir mes salariés', ex:'Mutuelle, prévoyance',
      info:'La mutuelle d’entreprise est obligatoire ; la prévoyance protège vos salariés en cas d’arrêt de travail, d’invalidité ou de décès.' },
    pouvoir:  { titre:'Donner du pouvoir d’achat', ex:'Titres-restaurant, mobilité, cartes cadeaux',
      info:'Ces avantages sont exonérés de charges sociales dans la limite des plafonds : plus de net pour vos salariés, moins de coût pour vous.' },
    partage:  { titre:'Récompenser mon équipe', ex:'Prime de partage de la valeur, intéressement',
      info:'La prime de partage de la valeur et l’intéressement associent vos salariés aux résultats, avec une fiscalité avantageuse.' },
    retraite: { titre:'Préparer leur retraite', ex:'Épargne retraite d’entreprise',
      info:'Un plan d’épargne retraite d’entreprise aide vos salariés à préparer l’avenir, avec l’aide de l’entreprise.' }
  };
  var AXE_BESOIN = { protection:'proteger', pouvoirAchat:'pouvoir', partageValeur:'partage', retraite:'retraite' };
  var AXE_DEVIS = { protection:'sante', partageValeur:'epargne', pouvoirAchat:'avantages', retraite:'retraite' };
  function info(txt){ return '<span class="va-i" tabindex="0" role="note" aria-label="' + esc(txt) + '">i<span class="va-tip" aria-hidden="true">' + esc(txt) + '</span></span>'; }

  /* ---------- « portail » retiré des textes (le mot désigne déjà l'outil de gestion des clients BRH) ;
     « Portail entreprise » de Crédit Agricole Assurances (outil de gestion) est conservé ---------- */
  var PORTAIL = [[/Le portail RH dédié aux chefs d'entreprise/g, 'La plateforme RH des dirigeants, responsables RH et DAF'],
    [/Notre portail innovant vous accompagne/g, 'Notre plateforme vous accompagne'], [/Portail dirigeants/g, 'Plateforme RH'],
    [/le portail du Crédit Agricole/g, 'la plateforme du Crédit Agricole'], [/sur le portail/g, 'sur la plateforme'], [/du portail\b/g, 'de la plateforme'],
    [/sous 24 h ouvrées/g, 'sous ' + DELAI], [/Rappel sous 24 h\b/g, 'Rappel sous ' + DELAI]];
  function textes(root){
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), t, v;
    while ((t = w.nextNode())) {
      if (!/portail|24 h/.test(t.nodeValue)) continue;
      var pn = t.parentNode && t.parentNode.nodeName; if (pn === 'SCRIPT' || pn === 'STYLE') continue;
      v = t.nodeValue; PORTAIL.forEach(function(r){ v = v.replace(r[0], r[1]); }); if (v !== t.nodeValue) t.nodeValue = v;
    }
  }

  ready(function(){
    document.title = document.title.replace(/Portail dirigeants/g, 'Plateforme RH');
    /* bandeau de la maquette (accès dérogatoire, test « family & friends » au plus) */
    if (!document.querySelector('.va-maquette')) { var m = document.createElement('div'); m.className = 'va-maquette'; m.textContent = 'Maquette de test — ne pas diffuser aux clients'; document.body.insertBefore(m, document.body.firstChild); }
    accueil(); diagnostic(); devis(); expert();
    textes(document.body);
    new MutationObserver(function(ms){ ms.forEach(function(x){ x.addedNodes.forEach(function(n){
      if (n.nodeType === 1) textes(n); else if (n.nodeType === 3 && /portail|24 h/.test(n.nodeValue) && n.parentNode) textes(n.parentNode); }); }); })
      .observe(document.body, { childList:true, subtree:true });
    /* modules complémentaires retirés du menu : accessibles en bas de page */
    var foot = document.querySelector('footer');
    if (foot && !document.querySelector('.va-more')) {
      var p = document.createElement('p'); p.className = 'va-more';
      p.innerHTML = 'Aussi sur la plateforme : <a href="audit-mutuelle.html?from=header">Audit mutuelle</a><a href="ressources.html">Ressources</a><a href="newsletter-edition.html">Newsletter du mois</a>';
      foot.parentNode.insertBefore(p, foot);
    }
  });

  /* ============================== ACCUEIL ============================== */
  function accueil(){
    var hero = document.querySelector('section.hero'); if (!hero || $('vaHero')) return;
    var car = $('heroCarousel');
    var CHIPS = [['Mutuelle & prévoyance','g'],['Titres-restaurant','l'],['Mobilité','m'],['Cartes cadeaux','l'],
                 ['Prime de partage','m'],['Intéressement','g'],['Épargne salariale','l'],['Épargne retraite','m']];
    var chips = function(a){ return a.map(function(c){ return '<span class="va-chip ' + c[1] + '">' + c[0] + '</span>'; }).join(''); };
    var h = document.createElement('section'); h.className = 'va-hero'; h.id = 'vaHero';
    h.innerHTML = '<div class="va-hero-in">' +
      '<p class="va-kick">Pour les dirigeants, responsables RH et DAF</p>' +
      '<h1>Prenez soin de vos équipes,<br>et de votre budget.</h1>' +
      '<p class="va-sub">Mutuelle, titres-restaurant, prime de partage, épargne salariale, retraite : une seule plateforme pour choisir, chiffrer et mettre en place les avantages de vos salariés. Un expert du Crédit Agricole vous accompagne à chaque étape.</p>' +
      '<div class="va-cta"><a class="btn va-btn" href="devis.html" onclick="window.dataLayer.push({event:\'cta_tarifs\',source:\'accueil\'})">Voir mes tarifs ' + ARROW + '</a>' +
      '<a class="btn va-btn2" href="diagnostic.html">Faire mon diagnostic en 2 min</a></div>' +
      '<div class="va-stage"><div class="va-chips l">' + chips(CHIPS.slice(0, 4)) + '</div>' +
      '<div class="va-card"><span class="va-card-k">Estimation indicative</span><b>jusqu’à 5 050 €</b><span>de pouvoir d’achat en plus par salarié et par an, pour un coût employeur réduit</span>' +
      '<ul><li>Exonérés de charges dans la limite des plafonds</li><li>Estimation en 2 minutes, sans engagement</li><li>Un expert BRH valide avec vous</li></ul></div>' +
      '<div class="va-chips r">' + chips(CHIPS.slice(4)) + '</div></div></div>';
    hero.parentNode.insertBefore(h, hero);
    if (car) {   /* le carrousel passe sous l'accroche, en bandeau « À la une » */
      var s = document.createElement('section'); s.className = 'va-une'; s.innerHTML = '<div class="wrap"><h2 class="h2">À la une</h2></div>';
      s.querySelector('.wrap').appendChild(car); h.parentNode.insertBefore(s, h.nextSibling);
    }
    hero.remove();
    /* 4 besoins : titres concrets, exemples et « i » */
    document.querySelectorAll('#offres .scard').forEach(function(c){
      var b = c.querySelector('.sc-more'), k = b && (b.getAttribute('onclick') || '').match(/openSol\('(\w+)'\)/), d = k && BESOINS[k[1]];
      if (!d) return;
      var t = c.querySelector('h3'); if (t) t.innerHTML = esc(d.titre) + info(d.info);
      var p = c.querySelector('.sc-teaser'); if (p) p.innerHTML = '<span class="va-ex">' + esc(d.ex) + '</span>';
    });
    var hs = document.querySelector('#offres h2'); if (hs) hs.textContent = 'De quoi avez-vous besoin ?';
    /* bandeau diagnostic en langage simple */
    var dg = document.querySelector('#diagnostic .d-body');
    if (dg) {
      var t = dg.querySelector('h2'); if (t) t.textContent = 'Votre diagnostic en 2 minutes';
      var ps = dg.querySelectorAll('p');
      if (ps[0]) ps[0].textContent = 'Dites-nous ce qui compte pour vous et combien de salariés vous avez : vous voyez tout de suite ce que vous pouvez gagner, pour l’entreprise et pour vos salariés, puis vos tarifs.';
      if (ps[1]) ps[1].remove();
      var st = dg.querySelectorAll('.step span:not(.n)'); ['Je choisis mes priorités', 'Je vois mes gains estimés', 'Je découvre mes tarifs'].forEach(function(x, i){ if (st[i]) st[i].textContent = x; });
      var bt = document.querySelector('#diagnostic .d-cta .btn'); if (bt && bt.firstChild) bt.firstChild.nodeValue = 'Faire mon diagnostic ';
    }
  }

  /* ============================== DIAGNOSTIC ============================== */
  function diagnostic(){
    var eff = $('effectif'), prio = document.querySelector('#block2 .prio-body');
    if (!eff || !prio || document.querySelector('.va-eff')) return;
    /* une seule question sur l'entreprise, le nombre de salariés, posée après les curseurs */
    var box = document.createElement('div'); box.className = 'va-eff';
    var fld = eff.closest('.field'); var lab = fld.querySelector('label'); if (lab) lab.innerHTML = 'Combien de salariés compte votre entreprise ? <span class="req">*</span>';
    box.appendChild(fld); prio.parentNode.insertBefore(box, prio.nextSibling);
    /* « Nos solutions » (étoiles) supprimé : il reprenait les priorités saisies juste avant */
    var b3 = $('block3'); if (b3) b3.style.display = 'none';
    ['block2', 'contact'].forEach(function(id, i){ var n = document.querySelector('#' + id + ' h2 b'); if (n) n.textContent = (i + 1) + '.'; });
    var go1 = document.querySelector('button[onclick*="block1"]'); if (go1) go1.onclick = function(){ $('block2').scrollIntoView({ behavior:'smooth' }); };
    /* libellés concrets des 4 priorités */
    try {
      AXES.forEach(function(a){ var d = BESOINS[AXE_BESOIN[a.key]]; if (!d) return; a.full = d.titre; a.sub = d.ex.toLowerCase(); });
      if (typeof buildSliders === 'function') buildSliders();
      if (typeof refresh === 'function') refresh();
    } catch (e) {}
    /* gains affichés tout de suite, sans demander l'e-mail */
    try { if (typeof state !== 'undefined' && $('results-gate')) { state.resultsUnlocked = true; updateGain(); if (typeof updateRecap === 'function') updateRecap(); } } catch (e) {}
    /* sous l'estimation : « Voir mes tarifs » et e-mail facultatif */
    var gains = $('gains'); if (!gains || $('vaNext')) return;
    var n = document.createElement('div'); n.className = 'va-next'; n.id = 'vaNext';
    n.innerHTML = '<p class="va-ind">Estimation indicative et non contractuelle, à confirmer avec votre expert.</p>' +
      '<div class="va-next-row"><button class="btn va-btn" type="button" id="vaTarifs">Voir mes tarifs ' + ARROW + '</button>' +
      '<span class="va-next-t">Le devis reprend vos priorités et votre effectif.</span><a class="va-acc" href="#contact">ou être accompagné par un expert</a></div>' +
      '<form class="va-mail" id="vaMail" novalidate><label for="vaMailIn">Recevoir mon estimation par e-mail <span>(facultatif)</span></label>' +
      '<div class="va-mail-row"><input type="email" id="vaMailIn" placeholder="prenom.nom@entreprise.fr" autocomplete="email"><button class="btn va-btn2" type="submit">Envoyer</button></div>' +
      '<label class="va-mail-c"><input type="checkbox" id="vaMailOk"> J’accepte que mon e-mail, mon effectif et mes priorités soient utilisés par le Crédit Agricole et sa Caisse régionale pour m’adresser mon estimation et me recontacter à ce sujet.</label>' +
      '<p class="va-mail-msg" id="vaMailMsg" role="status"></p></form>';
    gains.parentNode.insertBefore(n, gains.nextSibling);
    $('vaTarifs').onclick = function(){
      var p = state.priorities, sol = Object.keys(AXE_DEVIS).filter(function(k){ return (p[k] || 0) >= 3; });
      if (!sol.length) sol = Object.keys(AXE_DEVIS).filter(function(k){ return (p[k] || 0) >= 2; });
      var ids = sol.map(function(k){ return AXE_DEVIS[k]; });
      try { if (typeof saveProfile === 'function') saveProfile(); } catch (e) {}
      window.dataLayer.push({ event:'cta_tarifs', source:'diagnostic', solutions:ids.join(',') });
      location.href = 'devis.html?from=diagnostic' + (ids.length ? '&sol=' + ids.join(',') : '') + '&eff=' + (state.effectif || '');
    };
    $('vaMail').onsubmit = function(e){
      e.preventDefault();
      var m = $('vaMailIn').value.trim(), msg = $('vaMailMsg');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)) { msg.textContent = 'Indiquez une adresse e-mail valide.'; return; }
      if (!$('vaMailOk').checked) { msg.textContent = 'Cochez la case pour accepter l’utilisation de votre e-mail.'; return; }
      var g = {}; try { g = calculateFiscalGain(state.effectif, state.priorities); } catch (x) {}
      fetch('lead.php', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ type:'diagnostic_estimation', variante:V,
        contact:{ email:m, consentement:true, consentement_date:new Date().toISOString() }, entreprise:{ effectif:state.effectif },
        priorities:state.priorities, fiscalGain:{ total:g.total || 0, details:g.details || {} } }) }).catch(function(){});
      window.dataLayer.push({ event:'diagnostic_email' });
      this.innerHTML = '<p class="va-mail-ok">C’est noté : votre estimation vous sera adressée à ' + esc(m) + '.</p>';
    };
  }

  /* ============================== DEVIS EN 4 ÉTAPES ============================== */
  function devis(){
    if (!$('dvStepper') || typeof window.go !== 'function' || document.querySelector('.va-rh')) return;
    var LABELS = ['Vos besoins', 'Votre entreprise', 'Vos salariés et solutions', 'Votre devis'];
    var VIS = { 1:1, 2:2, 3:3, 4:3, 5:4, 6:4, 7:4 }, START = { 1:1, 2:2, 3:4, 4:5 };
    /* « Vos salariés » fusionné dans la configuration, avec des valeurs par défaut */
    var s3 = document.querySelector('.dv-step[data-step="3"]'), s4 = document.querySelector('.dv-step[data-step="4"]');
    var grid = s3 && s3.querySelector('.dv-grid'), tabs = $('dvTabs');
    if (grid && tabs) {
      var w = document.createElement('div'); w.className = 'va-rh';
      w.innerHTML = '<h3>Vos salariés <span>valeurs proposées, modifiables</span></h3>';
      w.appendChild(grid); var e3 = $('err3'); if (e3) w.appendChild(e3);
      tabs.parentNode.insertBefore(w, tabs);
      if (!$('h-sal').value) $('h-sal').value = '25_35';
    }
    var hd = function(step, txt){ var b = document.querySelector('.dv-step[data-step="' + step + '"] h2 b'); if (b) b.textContent = txt; };
    hd(4, '3.'); hd(5, '4.'); hd(7, '4.');
    var t4 = s4 && s4.querySelector('h2'); if (t4 && t4.lastChild && t4.lastChild.nodeType === 3) t4.lastChild.nodeValue = ' Vos salariés et vos solutions';
    /* convention collective : seulement pour la santé et la prévoyance, jamais bloquante */
    var ccn = $('e-ccn'), cf = ccn && ccn.closest('.field');
    if (cf && !$('vaCcnNote')) { var note = document.createElement('span'); note.className = 'hint va-ccn'; note.id = 'vaCcnNote';
      note.textContent = 'Proposée à partir de votre SIRET, à confirmer par votre expert. Vous ne la connaissez pas ? Choisissez « Je ne sais pas » : votre devis n’est pas bloqué.'; cf.appendChild(note); }
    function ccnVisible(){ if (cf) cf.style.display = (S.sol || []).indexOf('sante') >= 0 ? '' : 'none'; }
    /* e-mail facultatif à l'étape « Votre entreprise » : suivi de la demande, y compris en cas d'abandon */
    var s2grid = document.querySelector('.dv-step[data-step="2"] .dv-grid');
    if (s2grid && !$('vaMail2')) {
      var f = document.createElement('div'); f.className = 'field va-mail2'; f.id = 'vaMail2';
      f.innerHTML = '<label for="vaEm">E-mail <span class="va-opt">facultatif — pour retrouver votre devis</span></label><input id="vaEm" type="email" autocomplete="email" placeholder="prenom.nom@entreprise.fr">' +
        '<label class="va-mail-c"><input type="checkbox" id="vaEmOk"> J’accepte que mes réponses soient utilisées par le Crédit Agricole et sa Caisse régionale pour établir mon devis et me recontacter, même si je ne vais pas jusqu’au bout.</label>';
      s2grid.appendChild(f);
    }
    var suivi = null; try { suivi = JSON.parse(sessionStorage.getItem('vaSuivi') || 'null'); } catch (e) {}
    function etape(lib){
      if (!suivi) return;
      fetch('lead.php', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ action:'etape', id:suivi.id, jeton:suivi.jeton, etape:lib }) }).catch(function(){});
    }
    function ouvrirSuivi(){
      var m = ($('vaEm') || {}).value; m = m ? m.trim() : '';
      if (suivi || !m || !$('vaEmOk').checked || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)) return;
      var e = S.ent || {};
      fetch('lead.php', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ type:'devis_en_cours', variante:V, etape:'Votre entreprise',
        contact:{ email:m, consentement:true, consentement_date:new Date().toISOString() },
        entreprise:{ raison_sociale:e.nom, siret:e.siret, code_postal:e.cp, ville:e.ville, effectif:e.effectif, secteur:e.secteur, idcc:e.idcc },
        solutions:S.sol }) })
        .then(function(r){ return r.json(); })
        .then(function(j){ if (j && j.ok && j.jeton) { suivi = { id:j.id, jeton:j.jeton }; try { sessionStorage.setItem('vaSuivi', JSON.stringify(suivi)); } catch (x) {} } })
        .catch(function(){});
      var ce = $('c-email'); if (ce && !ce.value) ce.value = m;
    }
    /* navigation : étape 3 (salariés) et 6 (proposition) intégrées aux étapes voisines */
    var goOrig = window.go, nextOrig = window.next;
    window.go = function(n){
      if (n === 3) n = S.step > 3 ? 2 : 4;
      if (n === 6) n = S.step > 6 ? 5 : 7;
      if (n === 4) { try { prefillRH(); } catch (e) {} }
      if (n === 2) ccnVisible();
      goOrig(n);
      etape(LABELS[VIS[S.step] - 1]);
    };
    window.next = function(n){
      if (n === 2) { if (!validateEntreprise()) return; ouvrirSuivi(); try { prefillRH(); } catch (e) {} S.maxStep = Math.max(S.maxStep, 4); return window.go(4); }
      if (n === 4 && !validateRH()) return;
      if (n === 5) { S.maxStep = Math.max(S.maxStep, 7); return window.go(7); }
      nextOrig(n);
    };
    window.renderStepper = function(){
      var cur = VIS[S.step] || 1, max = VIS[S.maxStep] || 1;
      $('dvStepper').innerHTML = LABELS.map(function(t, i){ var n = i + 1, cls = n === cur ? 'current' : (n < cur || n <= max ? 'done' : '');
        return '<li class="' + cls + '"><button type="button" ' + (cls === 'done' ? 'onclick="go(' + START[n] + ')"' : 'tabindex="-1" aria-disabled="true"') + (n === cur ? ' aria-current="step"' : '') + '><span class="n">' + n + '</span>' + t + '</button></li>'; }).join('');
      $('dvBar').style.width = ((cur - 1) / (LABELS.length - 1) * 100) + '%';
    };
    var b5 = document.querySelector('.dv-step[data-step="5"] button[onclick="next(5)"]'); if (b5 && b5.firstChild) b5.firstChild.nodeValue = 'Recevoir mon devis ';
    var back7 = document.querySelector('.dv-step[data-step="7"] .contact-link'); if (back7) back7.textContent = 'Revenir à mon estimation';
    /* « Être accompagné » à chaque étape */
    document.querySelectorAll('.dv-step .dv-nav').forEach(function(nav){
      if (nav.querySelector('.va-acc')) return;
      var a = document.createElement('button'); a.type = 'button'; a.className = 'va-acc'; a.textContent = 'Être accompagné par un expert';
      a.onclick = function(){ window.dataLayer.push({ event:'devis_accompagnement', step:S.step }); openExpert(); }; nav.appendChild(a);
    });
    /* fin du parcours : devis automatique pour les cas simples, sinon votre expert vous adresse votre devis */
    var subOrig = window.submitDevis;
    window.submitDevis = async function(){
      await subOrig.apply(this, arguments);
      if (!window.BRH_LEAD || $('dvDone').classList.contains('hidden')) return;
      etape('Devis envoyé');
      var simple = S.sol.every(function(k){ return k === 'avantages'; });
      if (!simple) {
        var h = document.querySelector('#dvDone h3'); if (h) h.textContent = 'Votre demande est transmise';
        $('doneMsg').textContent = 'Votre expert BRH vérifie avec vous les points nécessaires (convention collective, garanties) et vous adresse votre devis sous ' + DELAI + '. Voici le récapitulatif de votre demande.';
        var r = document.querySelector('#devisDoc .brhq-ref b'); if (r) r.textContent = 'RÉCAPITULATIF DE VOTRE DEMANDE';
        var o = document.querySelector('#dvDone .btn-primary'); if (o && o.firstChild) o.firstChild.nodeValue = 'Consulter mon récapitulatif ';
      }
      try { sessionStorage.removeItem('vaSuivi'); } catch (e) {}
    };
    if (typeof S !== 'undefined') { ccnVisible(); window.renderStepper(); }
  }

  /* ============================== RAPPEL PAR UN EXPERT ============================== */
  function expert(){
    var cr = $('x-cr'); if (!cr || document.querySelector('.va-delai')) return;
    var f = cr.closest('.field'); if (f) f.style.display = 'none';   /* pas de créneau : promesse tenable par les Caisses régionales */
    var p = document.querySelector('#exForm > p'); if (p) { p.textContent = 'Un expert de votre Caisse régionale vous rappelle sous ' + DELAI + '. Les informations déjà saisies lui sont transmises : vous n’aurez pas à les répéter.'; p.classList.add('va-delai'); }
  }
})();
