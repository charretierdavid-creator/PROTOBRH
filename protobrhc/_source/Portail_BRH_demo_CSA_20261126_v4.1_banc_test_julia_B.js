/* Banc de test automatique V4.1 « Julia flottante sur le site B » (version _test uniquement).
   À coller avant la dernière balise de fin de script du shell. Rapport affiché par-dessus la démo. */
(function(){
  const R=[], errs=[]; let fini=false;
  const box=document.createElement('div');
  box.style.cssText='position:fixed;z-index:99;left:8px;right:8px;top:8px;max-height:94vh;overflow:auto;background:#fff;border:3px solid #065145;border-radius:10px;padding:8px 12px;font:12px/1.35 system-ui;color:#233029;box-shadow:0 10px 30px rgba(0,0,0,.3)';
  document.body.appendChild(box);
  function ok(nom,c,det){ R.push([nom,!!c,det||'']); peindre(); }
  function peindre(){ const ko=R.filter(r=>!r[1]);
    box.innerHTML='<b>Banc V4.1 « Julia flottante (site B) » : '+R.length+' contrôles, '+(R.length-ko.length)+' OK, '+ko.length+' KO'+(fini?' — terminé':' — en cours…')+'</b> · Erreurs JS : '+(errs.length?'<span style="color:#b00020">'+errs.slice(0,4).join(' | ')+'</span>':'aucune')+
    (ko.length?'<ol style="margin:4px 0 0 18px;padding:0">'+ko.map(r=>'<li style="color:#b00020">KO '+r[0]+(r[2]?' <i>('+r[2]+')</i>':'')+'</li>').join('')+'</ol>':''); }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const fr=document.getElementById('app');
  function charge(){ return new Promise(res=>{ const f=()=>{ fr.removeEventListener('load',f); try{ fr.contentWindow.addEventListener('error',e=>errs.push(e.message)); }catch(e){} setTimeout(res,1900); }; fr.addEventListener('load',f); }); }
  function ouvrirP(h){ const p=charge(); if(location.hash==='#/'+h) load(); else location.hash='#/'+h; return p; }
  const Wn=()=>fr.contentWindow, Dc=()=>fr.contentWindow.document, $=id=>Dc().getElementById(id), q=s=>Dc().querySelector(s);
  const vis=el=>!!el && Wn().getComputedStyle(el).display!=='none' && el.getClientRects().length>0;
  function js(code){ Wn().__err=''; const s=Dc().createElement('script'); s.text='try{'+code+'}catch(e){window.__err=String(e);}'; Dc().body.appendChild(s); }
  async function remise(){ const c=window.confirm; window.confirm=()=>true; document.getElementById('reset').click(); window.confirm=c; await charge(); }
  function milieu(p){
    const j=$('julia'), panel=$('jfl');
    ok(p+' : Julia rangée dans la fenêtre flottante', j && panel && panel.contains(j));
    ok(p+' : aucun accès à Julia au milieu de l’écran', !vis($('julia-band')) && ![...Dc().querySelectorAll('.jr,.julia-fab')].some(vis));
    ok(p+' : bouton « Besoin d’aide ? » visible en bas à droite, fenêtre fermée', vis($('jflLaunch')) && !vis(panel) && (()=>{ const r=$('jflLaunch').getBoundingClientRect(); return r.right>Wn().innerWidth-60 && r.bottom>Wn().innerHeight-80; })());
  }
  (async()=>{
    try{
      await remise();
      /* 1. pages du site B */
      for(const p of ['B/accueil-label-rh.html','B/label-brh.html','B/devis.html','B/ressources.html','B/avantages-fiscaux.html','B/audit-mutuelle.html','B/newsletter-archive.html','B/mon-dossier.html']){ await ouvrirP(p); milieu(p); }
      /* 2. ouverture, question, fermeture */
      await ouvrirP('B/label-brh.html');
      $('jflLaunch').click(); await wait(200);
      ok('Clic sur « Besoin d’aide ? » : fenêtre ouverte, champ de question visible', vis($('jfl')) && vis($('julia-q')) && !vis($('jflLaunch')));
      ok('Fenêtre : en-tête « Julia, votre assistante BRH » et exemples', /Julia, votre assistante BRH/.test($('jfl').textContent) && Dc().querySelectorAll('#jfl .julia-chip').length>=2);
      const y0=Wn().scrollY; const chip=q('#jfl .julia-chip'); chip.click(); await wait(2600);
      ok('Exemple cliqué : réponse affichée dans la fenêtre', Dc().querySelectorAll('#jfl .julia-rep').length>=1, Wn().__err);
      ok('La page ne défile pas vers une rubrique', Math.abs(Wn().scrollY-y0)<5);
      $('julia-q').value='Comment se passe l’évaluation ?'; q('#julia-f button[type="submit"]').click(); await wait(2600);
      ok('Question libre : 2e réponse dans la fenêtre', Dc().querySelectorAll('#jfl .julia-rep').length>=2);
      $('jflX').click(); await wait(150);
      ok('Fermer × : fenêtre fermée, bouton revenu', !vis($('jfl')) && vis($('jflLaunch')));
      $('jflLaunch').click(); await wait(150);
      Dc().dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); await wait(150);
      ok('Touche Échap : fenêtre fermée', !vis($('jfl')));
      js("BRH_JULIA.ouvrir()"); await wait(250);
      ok('Appel à Julia depuis la page (BRH_JULIA.ouvrir) : fenêtre ouverte', vis($('jfl')), Wn().__err);
      js("BRH_JULIA_FLOTTANTE.fermer();cbotOpen()"); await wait(250);
      ok('Assistant du socle (cbotOpen) : ouvre la fenêtre Julia', vis($('jfl')) && !vis($('cbot')), Wn().__err);
      /* 3. résultats du Label : pas d'encart Julia sous le score */
      js("BRH_JULIA_FLOTTANTE.fermer();['gate-prenom','gate-nom'].forEach(function(i){document.getElementById(i).value='Test';});document.getElementById('gate-email').value='test@exemple.fr';document.getElementById('gate-poste').value='Dirigeant';document.getElementById('gate-consent').checked=true;document.getElementById('results-gate').classList.remove('hidden');unlockResults();"); await wait(1500);
      ok('Label RH, résultats : aucun encart Julia sous le score', vis($('results')) && ![...Dc().querySelectorAll('.jr')].some(vis), Wn().__err);
      milieu('Label RH (résultats)');
      await wait(1200);
      ok('Label RH, résultats : la fenêtre ne s’ouvre pas d’elle-même, une bulle la signale en bas à droite', !vis($('jfl')) && vis($('jflNudge')) && /Votre score, en bref/.test($('jflNudge').textContent));
      q('#jflNudge .jfl-nl').click(); await wait(250);
      ok('Clic sur la bulle : fenêtre ouverte sur « Votre score, en bref »', vis($('jfl')) && !vis($('jflNudge')) && /Votre score, en bref/.test($('jfl').textContent));
      /* 4. devis B jusqu'à l'estimation */
      await remise(); await ouvrirP('B/devis.html');
      js("toggleSol('avantages');next(1);document.getElementById('e-nom').value='Test';document.getElementById('e-cp').value='37000';document.getElementById('e-eff').value='12';next(2);document.getElementById('h-couv').value='10';next(3);next(4);"); await wait(900);
      ok('Devis B, estimation : aucun encart Julia', ![...Dc().querySelectorAll('.jr')].some(vis) && !vis($('julia-band')), Wn().__err);
      /* 5. site A inchangé */
      await ouvrirP('A/diagnostic.html');
      ok('Site A : Julia toujours en haut de page', vis($('julia')) && !$('jfl') && !$('jflLaunch'));
      await ouvrirP('A/accueil-4-besoins.html');
      ok('Site A, accueil : Julia toujours en haut de page', vis($('julia')) && !$('jfl'));
      ok('Aucune erreur JavaScript', errs.length===0, errs.join(' | '));
      /* écran laissé pour la capture : Label RH B, fenêtre ouverte avec une réponse */
      await ouvrirP('B/label-brh.html'); $('jflLaunch').click(); await wait(200); q('#jfl .julia-chip').click(); await wait(2600);
    }catch(e){ ok('Banc interrompu', false, String(e)); }
    fini=true; peindre();
  })();
})();
