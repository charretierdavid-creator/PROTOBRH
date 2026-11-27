/* Banc de test automatique V4 « parcours simplifiés » (version _test uniquement) : parcours pilotés par script,
   rapport affiché par-dessus la démo. À coller avant la dernière balise de fin de script du shell. */
(function(){
  const R=[], errs=[]; let fini=false;
  const box=document.createElement('div'); box.id='bancV4';
  box.style.cssText='position:fixed;z-index:99;left:8px;right:8px;top:8px;max-height:94vh;overflow:auto;background:#fff;border:3px solid #065145;border-radius:10px;padding:8px 12px;font:12px/1.35 system-ui;color:#233029;box-shadow:0 10px 30px rgba(0,0,0,.3)';
  document.body.appendChild(box);
  function ok(nom,c,det){ R.push([nom,!!c,det||'']); peindre(); }
  function peindre(){ const ko=R.filter(r=>!r[1]);
    box.innerHTML='<b>Banc V4 « parcours simplifiés » : '+R.length+' contrôles, '+(R.length-ko.length)+' OK, '+ko.length+' KO'+(fini?' — terminé':' — en cours…')+'</b> · Erreurs JS : '+(errs.length?'<span style="color:#b00020">'+errs.slice(0,4).join(' | ')+'</span>':'aucune')+
    (ko.length?'<ol style="margin:4px 0 0 18px;padding:0">'+ko.map(r=>'<li style="color:#b00020">KO '+r[0]+(r[2]?' <i>('+r[2]+')</i>':'')+'</li>').join('')+'</ol>':'')+
    (fini?'<details style="margin-top:4px"><summary>Détail des '+R.length+' contrôles</summary><ol style="margin:4px 0 0 18px;padding:0">'+R.map(r=>'<li style="color:'+(r[1]?'#1d6b3a':'#b00020')+'">'+(r[1]?'OK ':'KO ')+r[0]+'</li>').join('')+'</ol></details>':''); }
  window.__BANC_V4=R;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const fr=document.getElementById('app');
  function charge(){ return new Promise(res=>{ const f=()=>{ fr.removeEventListener('load',f); try{ fr.contentWindow.addEventListener('error',e=>errs.push(e.message)); }catch(e){} setTimeout(res,1800); }; fr.addEventListener('load',f); }); }
  function ouvrir(h){ const p=charge(); if(location.hash==='#/'+h) load(); else location.hash='#/'+h; return p; }
  const Wn=()=>fr.contentWindow, Dc=()=>fr.contentWindow.document, $=id=>Dc().getElementById(id), q=s=>Dc().querySelector(s);
  const vis=el=>!!el && Wn().getComputedStyle(el).display!=='none' && el.getClientRects().length>0;
  function js(code){ Wn().__err=''; Wn().__r=undefined; const s=Dc().createElement('script'); s.text='try{'+code+'}catch(e){window.__err=String(e);}'; Dc().body.appendChild(s); return Wn().__r; }
  const st=()=>js('window.__r=S.step'), ent=()=>js('window.__r=S.ent');
  async function remise(){ const c=window.confirm; window.confirm=()=>true; document.getElementById('reset').click(); window.confirm=c; await charge(); }
  const TXT=/hypothèses fictives[\s\S]*n’engagent pas le Crédit Agricole[\s\S]*ni offre ni devis/;
  function precBas(p,plein){
    const z=Dc().querySelectorAll('.brh-prec-zone'), all=[...Dc().querySelectorAll('[data-prec]')].filter(e=>!e.closest('#smBody,#devisDoc'));
    const zz=z[0], pied=q('footer.footer')||q('footer');
    const bas = zz && (pied ? zz.nextElementSibling===pied : (q('main')||Dc().body).lastElementChild===zz);
    ok(p+' : un seul encadré de précautions, en bas de l’écran', z.length===1 && all.length===1 && bas && vis(zz), 'zones '+z.length+', mentions '+all.length+', bas '+bas);
    if(plein) ok(p+' : texte complet (montants fictifs, n’engagent pas…)', zz && TXT.test(zz.textContent));
    const ban=document.getElementById('prec'); ok(p+' : bandeau fixe conservé', vis(ban));
  }
  function menu(p,site){
    const a=[...Dc().querySelectorAll('header.header .nav a')].map(x=>x.textContent.trim());
    ok(p+' : menu à 4 phases', a.join(' · ')==='Nos solutions · Évaluez vos besoins RH · Allons plus loin ensemble · En savoir plus', a.join(' · '));
    const ev=[...Dc().querySelectorAll('header.header .nav a')][1]; ok(p+' : « Évaluez vos besoins RH » mène au '+(site==='A'?'diagnostic':'Label RH'), ev && ev.getAttribute('href')===(site==='A'?'diagnostic.html':'label-brh.html'));
  }
  (async()=>{
    try{
      await remise();
      /* 1. menus, phase du bandeau, précautions sur toutes les pages */
      const pages=[['A/accueil-4-besoins.html',0,'Nos solutions'],['B/accueil-label-rh.html',0,'Nos solutions'],['A/diagnostic.html',1,'Évaluez vos besoins RH'],['B/label-brh.html',0,'Évaluez vos besoins RH'],
        ['A/devis.html',1,'Allons plus loin ensemble'],['B/devis.html',1,'Allons plus loin ensemble'],['A/audit-mutuelle.html',1,'Évaluez vos besoins RH'],['A/avantages-fiscaux.html',1,'En savoir plus'],
        ['B/ressources.html',0,'En savoir plus'],['A/newsletter-edition.html',0,'En savoir plus'],['B/newsletter-archive.html',0,'En savoir plus'],['A/mon-dossier.html',1,'Mon dossier BRH']];
      for(const [p,plein,ph] of pages){ await ouvrir(p); precBas(p,plein); if(!/newsletter-edition/.test(p)) menu(p,p[0]);   /* l'édition de la newsletter a son propre en-tête (comme en V3) */
        ok(p+' : phase affichée « '+ph+' »', document.getElementById('etape').textContent.indexOf('Phase : '+ph)>=0, document.getElementById('etape').textContent); }
      await ouvrir('A/avantages-fiscaux.html');
      ok('Avantages fiscaux : « En savoir plus » actif dans le menu', /En savoir plus/.test((q('header.header .nav a.active')||{}).textContent||''));
      await ouvrir('B/ressources.html');
      ok('Ressources : accès aux avantages fiscaux et à la newsletter', !!q('a[href="avantages-fiscaux.html"]') && !!q('a[href="newsletter.html"]'));
      await ouvrir('A/accueil-4-besoins.html');
      ok('Home A : titre « Nos solutions, besoin par besoin »', /Nos solutions, besoin par besoin/.test((q('#offres .h2')||{}).textContent||''));
      js("openSol('proteger')"); await wait(300);
      ok('Fenêtre « En savoir plus » d’une offre : mention en bas', $('smBody') && $('smBody').lastElementChild && $('smBody').lastElementChild.getAttribute('data-prec')==='sol', Wn().__err);

      /* 2. diagnostic */
      await ouvrir('A/diagnostic.html');
      ok('Diagnostic : question SIREN / SIRET retirée', !vis($('siren')) && !vis(q('.ent-or')) && vis($('secteur')) && vis($('effectif')));
      ok('Diagnostic : « 3. Nos solutions pour vos besoins prioritaires »', /^3\.\s*Nos solutions pour vos besoins prioritaires$/.test(q('#block3 .block-head h2').textContent.trim()));
      ok('Diagnostic : « 5. Demandez une démo ou contactez un expert »', /^5\.\s*Demandez une démo ou contactez un expert$/.test(q('#contact .block-head h2').textContent.trim()));
      js("document.getElementById('effectif').value='12';onEffectif();document.getElementById('secteur').value='Commerce';onSecteur();document.getElementById('departement').value='37';onDepartement();"); await wait(400);
      ok('Diagnostic : « 4. Allons plus loin : notre proposition en ligne en 5 minutes » (après saisie)', /^4\.\s*Allons plus loin : notre proposition en ligne en 5 minutes$/.test(q('#devisCta .dc-txt h2').textContent.trim()), q('#devisCta .dc-txt h2').textContent+' '+Wn().__err);
      const ordre=['block3','devisCta','contact'].map(id=>$(id)); ok('Diagnostic : ordre 3 → 4 → 5', ordre[0].compareDocumentPosition(ordre[1])&4 && ordre[1].compareDocumentPosition(ordre[2])&4);
      ok('Diagnostic : bouton vers le devis présent', !!$('devisCtaBtn') && /devis\.html/.test($('devisCtaBtn').getAttribute('href')||''));

      /* 3. Label RH */
      await ouvrir('B/label-brh.html');
      ok('Label RH : « Demandez une démo ou contactez un expert »', /Demandez une démo ou contactez un expert/.test(q('#contact .block-head h2').textContent));
      ok('Label RH : « Nos solutions pour vos besoins prioritaires »', [...Dc().querySelectorAll('#results .block-head h2')].some(h=>h.textContent.trim()==='Nos solutions pour vos besoins prioritaires'));
      js("['gate-prenom','gate-nom'].forEach(function(i){document.getElementById(i).value='Test';});document.getElementById('gate-email').value='test@exemple.fr';document.getElementById('gate-poste').value='Dirigeant';document.getElementById('gate-consent').checked=true;document.getElementById('results-gate').classList.remove('hidden');unlockResults();"); await wait(900);
      const band=$('devis-cta'), fisc=q('#results #avantages-fiscaux');
      ok('Label RH : passerelle « Allons plus loin… » affichée', band && /Allons plus loin : notre proposition en ligne en 5 minutes/.test(band.textContent), Wn().__err);
      ok('Label RH : passerelle placée après « Nos solutions » et les avantages fiscaux', band && fisc && fisc.nextElementSibling===band);
      precBas('Label RH (résultats)',0);

      /* 4. devis : avantages salariés seuls */
      await remise(); await ouvrir('A/devis.html');
      ok('Devis : avantages salariés décrits « Titres-restaurant et cartes cadeaux »', /Titres-restaurant et cartes cadeaux/.test(Dc().getElementById('dvChoices').textContent) && !/mobilit/i.test(Dc().getElementById('dvChoices').textContent));
      js("toggleSol('avantages');next(1);"); await wait(500);
      ok('Devis W : étape 2, champs affichés sans recherche SIRET', vis($('dvFound')) && vis($('e-nom')) && vis($('e-cp')) && vis($('e-eff')), Wn().__err);
      ok('Devis W : ville, NAF, secteur, convention masqués', !vis($('e-ville')) && !vis($('e-naf')) && !vis($('e-sec')) && !vis($('e-ccn')));
      ok('Devis W : SIRET marqué « facultatif »', vis(q('label[for="siret"] .v4-wo')) && !vis(q('label[for="siret"] .req')));
      js("document.getElementById('e-nom').value='Boulangerie Test';document.getElementById('e-cp').value='37000';document.getElementById('e-eff').value='12';next(2);"); await wait(500);
      ok('Devis W : passage à l’étape 3 avec nom, CP et effectif', st()===3, document.getElementById('app').contentDocument.getElementById('err2').textContent);
      ok('Devis W : ville non inventée', ent() && ent().ville==='' && $('e-ville').value==='');
      ok('Devis W : étape 3 = seul « Nombre de salariés concernés »', vis($('h-couv')) && /Nombre de salariés concernés/.test(q('label[for="h-couv"]').textContent) && ['h-cad','h-sal','h-etab','h-loc','h-anc'].every(i=>!vis($(i))));
      ok('Devis W : bouton (i) présent, contenu fermé', vis($('v4iBtn')) && $('v4Info').hidden);
      $('v4iBtn').click(); await wait(100);
      ok('Devis W : (i) ouvert → CDI, CDD, apprentis, intérimaires, stagiaires', vis($('v4Info')) && /CDI et CDD/.test($('v4Info').textContent) && /Intérimaires/.test($('v4Info').textContent) && /Stagiaires/.test($('v4Info').textContent));
      js("document.getElementById('h-couv').value='10';next(3);"); await wait(500);
      ok('Devis W : étape 4 sans tranche de salaire', st()===4, $('err3').textContent);
      ok('Devis : forfait mobilités retiré, titres-restaurant et cartes cadeaux proposés', !vis(q('#devis input[name="av_type"][value="mob"]').closest('label')) && vis(q('#devis input[name="av_type"][value="tr"]').closest('label')) && vis(q('#devis input[name="av_type"][value="cad"]').closest('label')));
      js("document.querySelector('#devis input[name=\"av_type\"][value=\"cad\"]').checked=true;applyShow();next(4);"); await wait(600);
      ok('Devis W : étape 5 estimation chiffrée', st()===5 && /€/.test($('dvSynth').textContent+$('dvEst').textContent));
      js("next(5);"); await wait(600);
      const head=q('#dvCart .dv-line.head'), lig=q('#dvCart .dv-line:not(.head):not(.total)');
      ok('Devis : étape 6 sans colonne « Estimation »', st()===6 && head && !vis(head.children[2]) && lig && !vis(lig.children[2]));
      ok('Devis : étape 6 sans « Total estimé »', !vis(q('#dvCart .dv-line.total')));
      ok('Devis : étape 6 sans montant / an visible', !/€\s*\/\s*an/.test(($('dvCart').innerText||'')));
      ok('Devis : étape 6 garde solution, hypothèse, statut, Modifier / Retirer', lig && vis(lig.children[0]) && vis(lig.children[1]) && vis(lig.children[3]) && vis(lig.querySelector('.l-act')));
      js("next(6);"); await wait(600);
      ok('Devis W : étape 7 atteinte', st()===7);
      precBas('Devis (étape 7)',1);

      /* 5. devis : non-régression avec plusieurs besoins */
      await remise(); await ouvrir('A/devis.html');
      js("toggleSol('epargne');toggleSol('avantages');next(1);"); await wait(500);
      ok('Devis 2 besoins : recherche SIRET demandée (pas de fiche ouverte d’office)', !vis($('dvFound')) && vis($('siret')) && vis(q('label[for="siret"] .req')));
      js("manualEntry();"); await wait(300);
      ok('Devis 2 besoins : ville et NAF demandés', vis($('e-ville')) && vis($('e-naf')));
      js("document.getElementById('e-nom').value='Test SAS';document.getElementById('e-ville').value='Tours';document.getElementById('e-cp').value='37000';document.getElementById('e-eff').value='20';next(2);"); await wait(500);
      ok('Devis 2 besoins : étape 3 complète (salaire demandé)', st()===3 && vis($('h-sal')) && vis($('h-etab')));
      js("document.getElementById('h-couv').value='20';next(3);"); await wait(400);
      ok('Devis 2 besoins : la tranche de salaire reste obligatoire', st()===3 && /salaire/i.test($('err3').textContent));
      js("toggleSol('epargne');"); await wait(200);
      ok('Devis : retirer l’épargne → mode avantages seuls réactivé', Dc().documentElement.classList.contains('v4-w') && !vis($('h-sal')));
      ok('Aucune erreur JavaScript', errs.length===0, errs.join(' | '));
    }catch(e){ ok('Banc interrompu', false, String(e)); }
    fini=true; peindre();
  })();
})();
