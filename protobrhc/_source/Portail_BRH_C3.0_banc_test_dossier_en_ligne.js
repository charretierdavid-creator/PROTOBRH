/* C 3.0 en ligne : version du banc sans l'aperçu d'e-mail simulé (retiré en ligne), avec le faux serveur des tests.
   Banc de test automatique « Mon dossier BRH » (version _test uniquement) : parcours réels pilotés par script,
   rapport affiché par-dessus la démo. VUE='mobile' | 'bureau' : écran laissé à la fin pour la capture. */
(function(){
  const VUE=window.__BANC_VUE||'mobile';
  const R=[], errs=[]; let fini=false;
  const box=document.createElement('div');
  box.style.cssText='position:fixed;z-index:99;left:8px;right:8px;bottom:8px;max-height:60vh;overflow:auto;background:#fff;border:3px solid #065145;border-radius:10px;padding:8px 12px;font:12px/1.35 system-ui;color:#233029;box-shadow:0 10px 30px rgba(0,0,0,.3)';
  document.body.appendChild(box);
  function ok(nom,c,det){ R.push([nom,!!c,det||'']); peindre(); }
  function peindre(){ const ko=R.filter(r=>!r[1]);
    box.innerHTML='<b>Banc « Mon dossier BRH » : '+R.length+' contrôles, '+(R.length-ko.length)+' OK, '+ko.length+' KO'+(fini?' — terminé':' — en cours…')+'</b> · Erreurs JS : '+(errs.length?'<span style="color:#b00020">'+errs.slice(0,3).join(' | ')+'</span>':'aucune')+
    (ko.length?'<ol style="margin:4px 0 0 18px;padding:0">'+ko.map(r=>'<li style="color:#b00020">KO '+r[0]+(r[2]?' <i>('+r[2]+')</i>':'')+'</li>').join('')+'</ol>':''); }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const fr=document.getElementById('app');
  function charge(){ return new Promise(res=>{ const f=()=>{ fr.removeEventListener('load',f); try{ fr.contentWindow.addEventListener('error',e=>errs.push(e.message)); }catch(e){} setTimeout(res,1700); }; fr.addEventListener('load',f); }); }
  function ouvrir(h){ const p=charge(); if(location.hash==='#/'+h) load(); else location.hash='#/'+h; return p; }
  const W=()=>fr.contentWindow, Dc=()=>fr.contentWindow.document, $=id=>Dc().getElementById(id);
  const vis=el=>!!el && W().getComputedStyle(el).display!=='none' && el.getClientRects().length>0;
  const clic=el=>el && el.dispatchEvent(new (W().MouseEvent)('click',{bubbles:true,cancelable:true}));
  function js(code){ const s=Dc().createElement('script'); s.text='try{'+code+'}catch(e){window.__err=String(e);}'; Dc().body.appendChild(s); return W().__r; }
  const txt=sel=>{ const e=Dc().querySelector(sel); return e?e.textContent:''; };
  async function remise(){ const c=window.confirm; window.confirm=()=>true; document.getElementById('reset').click(); window.confirm=c; await charge(); }
  (async()=>{
    try{
      /* 1. dossier vide */
      await remise();
      await ouvrir('A/mon-dossier.html');
      ok('Dossier vide : message et bouton « Faire mon diagnostic »', /vide/.test(txt('.dos-rt')) && /diagnostic\.html/.test((Dc().querySelector('.dos-rep .btn')||{}).getAttribute?.('href')||''));
      ok('Bandeau de démo : bouton « Mon dossier » actif, à droite du choix du site', document.getElementById('dosBtn').classList.contains('on') && document.querySelector('.seg').nextElementSibling===document.getElementById('dosBtn'));
      ok('Menu du site A : plus d’entrée « Mon dossier »', !/Mon dossier/.test(txt('header .nav')) && !/Mon dossier/.test(txt('#mobileMenu')));
      ok('En ligne : aperçu « E-mail reçu » simulé retiré du bandeau', getComputedStyle(document.getElementById('mail')).display==='none');
      /* 2. site A : diagnostic 4 besoins + e-mail laissé à l'affichage des résultats (case cochée) */
      await ouvrir('A/diagnostic.html');
      js("state.effectif=20;state.effSaisi=true;[['protection',4],['pouvoirAchat',3],['partageValeur',1],['retraite',2]].forEach(function(x){onPriority(x[0],x[1]);});refresh();"+
         "document.getElementById('gate-email').value='claire.martin@boulangerie-martin.fr';var c=document.getElementById('lmGateOk');if(c)c.checked=true;unlockResults();");
      ok('Diagnostic : case « recevoir mon résultat » présente', !!$('lmGateOk'), W().__err||'');
      await wait(1800);
      const la=(window.__fauxServeur||[]).filter(x=>/lead\.php/.test(x.url));
      ok('En ligne : demande transmise à lead.php avec le parcours A', la.length>=1 && la[la.length-1].body.parcours_ab==='A');
      ok('En ligne : aucun e-mail simulé', MAILS.length===0);
      const p1=charge(); document.getElementById('dosBtn').click(); await p1;
      ok('Bouton « Mon dossier » : ouvre « Mon dossier BRH » du site A', location.hash==='#/A/mon-dossier.html' && !!$('dossier'), location.hash);
      ok('Lien de l’e-mail : ouvre « Mon dossier BRH » du site A', location.hash==='#/A/mon-dossier.html' && !!$('dossier'), location.hash);
      ok('Dossier : référence, date et e-mail', /BRH-/.test(txt('.dos-id')) && /claire\.martin/.test(txt('.dos-id')));
      ok('Dossier : gain estimé et 4 priorités', /€/.test(txt('.dos-big')) && Dc().querySelectorAll('.dos-bars .dos-bar').length===4);
      const cta=Dc().querySelector('.dos-rep .btn-primary'), href=cta?cta.getAttribute('href'):'';
      ok('Reprise : « Construire mon devis » prérempli (offres + effectif)', /Construire mon devis/.test(cta&&cta.textContent) && /sol=sante,avantages/.test(href) && /eff=20/.test(href), href);
      ok('Offres recommandées : 2, chacune avec un « i »', Dc().querySelectorAll('[data-l="r"] .dos-off .dos-i').length===2);
      const i1=Dc().querySelector('[data-l="r"] .dos-i'); clic(i1); await wait(150);
      ok('« i » : explication affichée', vis(i1.closest('.dos-off').querySelector('.dos-info')) && /Ce que c’est/.test(i1.closest('.dos-off').textContent));
      clic(Dc().querySelector('[data-plus]')); await wait(250);
      ok('« En savoir plus » : fiche détaillée de l’offre', $('solModal') && !$('solModal').hidden); js('closeSol()');
      ok('Étapes : diagnostic et gains faits, devis en cours', Dc().querySelectorAll('.dos-steps li.ok').length>=3 && !!Dc().querySelector('.dos-steps li.cur'));
      /* 3. reprise vers le devis prérempli, puis arrêt à l'étape 3 */
      const p2=charge(); clic(cta); await p2;
      W().__r=null; js("window.__r=S.sol.join(',')+'|'+(S.prefEff||'');");
      ok('Devis : offres recommandées cochées et effectif repris', W().__r==='sante,avantages|20', W().__r);
      js("S.maxStep=3;S.step=3;save();");
      await ouvrir('A/mon-dossier.html');
      ok('Dossier : « étape 3 sur 7 » et « Reprendre mon devis »', /étape 3 sur 7/.test(txt('.dos-rt')) && /Reprendre mon devis/.test(txt('.dos-rep .btn-primary')), txt('.dos-rt'));
      ok('Dossier : offres du devis listées avec « i »', Dc().querySelectorAll('[data-l="d"] .dos-off .dos-i').length===2);
      const p3=charge(); clic(Dc().querySelector('.dos-rep .btn-primary')); await p3;
      W().__r=null; js("window.__r=S.step;");
      ok('Devis rouvert à l’étape 3', W().__r===3, String(W().__r));
      /* 4. site B : Label RH */
      await remise();
      await ouvrir('B/label-brh.html');
      js("state.answers={effectif:'35',secteur:'Commerce',q1:2,q2:0,q3:1,q4:1,q5:0,q6:2,q7:1,q8:0};"+
         "document.getElementById('gate-prenom').value='Marc';document.getElementById('gate-nom').value='Durand';document.getElementById('gate-email').value='marc.durand@transports-durand.fr';"+
         "document.getElementById('gate-poste').value='Dirigeant';document.getElementById('gate-consent').checked=true;unlockResults();");
      await wait(1800);
      ok('Label RH : aucun e-mail simulé', MAILS.length===0, W().__err||'');
      const lb=(window.__fauxServeur||[]).filter(x=>/lead\.php/.test(x.url)).pop();
      ok('Label RH : demande transmise avec le parcours B', lb && lb.body.parcours_ab==='B');
      const p4=charge(); document.getElementById('dosBtn').click(); await p4;
      ok('Bouton « Mon dossier » : dossier du site B', location.hash==='#/B/mon-dossier.html', location.hash);
      ok('Dossier B : score / 100, niveau et badge Label RH', /\/ 100/.test(txt('.dos-big')) && /Label RH/.test(txt('.dos-id')));
      ok('Site B : bouton « Mon dossier » du bandeau actif, menu du site sans « Mon dossier »', document.getElementById('dosBtn').classList.contains('on') && !/Mon dossier/.test(txt('header .nav')) && /Évaluez vos besoins RH/.test(txt('header .nav')) && /label-brh\.html/.test(document.getElementById('app').contentDocument.querySelector('header .nav').innerHTML)   /* V4 : « Label RH » devient « Évaluez vos besoins RH » dans le menu du site B */);
      document.getElementById('dosBtn').click(); await wait(100);
      /* 5. e-mail non laissé : sauvegarde depuis le dossier, avec accord */
      await remise();
      await ouvrir('A/diagnostic.html');
      js("state.effectif=8;state.effSaisi=true;onPriority('partageValeur',4);onPriority('retraite',3);refresh();document.getElementById('gate-email').value='test@exemple.fr';unlockResults();");
      await wait(1500);
      ok('Sans la case cochée : pas de dossier ni d’e-mail', MAILS.length===0);
      const p5=charge(); document.getElementById('dosBtn').click(); await p5;
      ok('Bouton « Mon dossier » du bandeau : ouvre le dossier du site en cours', location.hash==='#/A/mon-dossier.html', location.hash);
      ok('Dossier non sauvegardé : formulaire « Sauvegardez votre dossier »', !!$('dosSv'));
      $('dosEm').value='paul@menuiserie-paul.fr'; clic(Dc().querySelector('#dosSv button')); await wait(200);
      ok('Sans accord : message d’erreur', /accord/.test(txt('#dosErr')));
      $('dosOk').checked=true; clic(Dc().querySelector('#dosSv button')); await wait(1200);
      ok('Avec accord : dossier créé (sans e-mail simulé)', MAILS.length===0 && /BRH-/.test(txt('.dos-id')));
      /* 6. effacer le dossier */
      W().confirm=()=>true; clic($('dosEff')); await wait(400);
      ok('« Effacer mon dossier » : dossier vide et e-mails retirés', /vide/.test(txt('.dos-rt')) && document.getElementById('mail').hidden);
    }catch(e){ ok('exception du banc : '+e.message,false); }
    fini=true; peindre(); document.title='TEST FINI';
    /* écran laissé pour la capture */
    try{
      await remise(); await ouvrir('A/diagnostic.html');
      js("state.effectif=20;state.effSaisi=true;[['protection',4],['pouvoirAchat',3],['partageValeur',1],['retraite',2]].forEach(function(x){onPriority(x[0],x[1]);});refresh();"+
         "document.getElementById('gate-email').value='claire.martin@boulangerie-martin.fr';var c=document.getElementById('lmGateOk');if(c)c.checked=true;unlockResults();");
      await wait(1800);
      
      await ouvrir('A/mon-dossier.html'); clic(Dc().querySelector('[data-l="r"] .dos-i'));
      if(VUE==='bureau'){ fr.style.width='1440px'; fr.style.height='2200px'; fr.style.transformOrigin='0 0'; fr.style.transform='scale('+(innerWidth/1440)+')'; }
      if(VUE==='offres'){ const c=Dc().querySelector('[data-l="r"]').closest('.dos-card'); Array.prototype.forEach.call(Dc().querySelectorAll('#dossier > *, .dos-sub, .dos-h1'),x=>{ if(x!==c) x.style.display='none'; }); W().scrollTo(0,0); }
      box.style.maxHeight='46px';
    }catch(e){}
  })();
})();
