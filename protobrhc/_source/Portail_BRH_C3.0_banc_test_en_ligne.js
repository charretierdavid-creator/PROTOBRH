/* Banc de test C 3.0 « en ligne » (version _test uniquement, avec un faux serveur : voir faux_serveur_test.js).
   Vérifie ce qui change entre la démo V4.1 et la version en ligne. À coller avant la dernière balise de fin de script du shell. */
(function(){
  const R=[], errs=[]; let fini=false;
  const box=document.createElement('div');
  box.style.cssText='position:fixed;z-index:99;left:8px;right:8px;top:8px;max-height:94vh;overflow:auto;background:#fff;border:3px solid #065145;border-radius:10px;padding:8px 12px;font:12px/1.35 system-ui;color:#233029;box-shadow:0 10px 30px rgba(0,0,0,.3)';
  document.body.appendChild(box);
  function ok(nom,c,det){ R.push([nom,!!c,det||'']); peindre(); }
  function peindre(){ const ko=R.filter(r=>!r[1]);
    box.innerHTML='<b>Banc C 3.0 « en ligne » : '+R.length+' contrôles, '+(R.length-ko.length)+' OK, '+ko.length+' KO'+(fini?' — terminé':' — en cours…')+'</b> · Erreurs JS : '+(errs.length?'<span style="color:#b00020">'+errs.slice(0,4).join(' | ')+'</span>':'aucune')+
    (ko.length?'<ol style="margin:4px 0 0 18px;padding:0">'+ko.map(r=>'<li style="color:#b00020">KO '+r[0]+(r[2]?' <i>('+r[2]+')</i>':'')+'</li>').join('')+'</ol>':''); }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const fr=document.getElementById('app');
  function charge(){ return new Promise(res=>{ const f=()=>{ fr.removeEventListener('load',f); try{ fr.contentWindow.addEventListener('error',e=>errs.push(e.message)); }catch(e){} setTimeout(res,1900); }; fr.addEventListener('load',f); }); }
  function ouvrirP(h){ const p=charge(); if(location.hash==='#/'+h) load(); else location.hash='#/'+h; return p; }
  const Wn=()=>fr.contentWindow, Dc=()=>fr.contentWindow.document, $=id=>Dc().getElementById(id), q=s=>Dc().querySelector(s);
  const vis=el=>!!el && Wn().getComputedStyle(el).display!=='none' && el.getClientRects().length>0;
  function js(code){ Wn().__err=''; const s=Dc().createElement('script'); s.text='try{'+code+'}catch(e){window.__err=String(e);}'; Dc().body.appendChild(s); }
  async function remise(){ const c=window.confirm; window.confirm=()=>true; document.getElementById('reset').click(); window.confirm=c; await charge(); }
  const LOG=()=>window.__fauxServeur||[];
  (async()=>{
    try{
      await remise();
      ok('Bandeau : « Prototype · données fictives » (plus « Démo »)', /Prototype · données fictives/.test(document.getElementById('tag').textContent) && /Prototype du parcours dirigeant/.test(document.getElementById('bar').textContent));
      ok('Bandeau de précautions conservé (texte validé le 24/11)', /Démonstration – données fictives, non contractuelles, présentées à titre d’illustration\./.test(document.getElementById('prec').textContent));
      ok('Titre de l’onglet : prototype', /prototype/.test(document.title) && !/\(démo\)/.test(document.title));
      /* 1. diagnostic A : demande réelle à lead.php, avec le parcours */
      await ouvrirP('A/diagnostic.html');
      js("document.getElementById('effectif').value='12';onEffectif();document.getElementById('secteur').value='Commerce';onSecteur();document.getElementById('departement').value='37';onDepartement();"
        +"var s=document.getElementById('s-protection'); if(s){s.value=3; onPriority('protection',3);} "
        +"document.getElementById('gate-email').value='test.a@exemple.fr'; var c=document.getElementById('lmGateOk')||document.querySelector('#results-gate input[type=checkbox]'); if(c) c.checked=true; unlockResults();"); await wait(1500);
      const la=LOG().filter(x=>/lead\.php/.test(x.url));
      ok('Diagnostic A : demande envoyée au vrai lead.php', la.length>=1, Wn().__err+' / appels : '+LOG().map(x=>x.url).join(', '));
      ok('Demande : parcours « A » et page indiqués', la.length && la[la.length-1].body.parcours_ab==='A' && /^A\//.test(la[la.length-1].body.page||''), la.length?JSON.stringify({p:la[la.length-1].body.parcours_ab,pg:la[la.length-1].body.page}):'');
      ok('Aperçu « E-mail reçu » simulé retiré', !vis(document.getElementById('mail')) && !vis(document.getElementById('boite')));
      /* 2. Julia : vraie question à ia.php */
      const n0=LOG().filter(x=>/ia\.php/.test(x.url)).length;
      js("document.getElementById('julia-q').value='Quels avantages sont exonérés de charges ?'; document.querySelector('#julia-f button[type=submit]').click();"); await wait(2500);
      ok('Julia : question envoyée au vrai ia.php (Mistral)', LOG().filter(x=>/ia\.php/.test(x.url)).length>n0, Wn().__err);
      /* 3. devis : SIRET réel via entreprise.php */
      await ouvrirP('A/devis.html');
      js("toggleSol('epargne');next(1);document.getElementById('siret').value='890 331 754 00014';lookupSiret();"); await wait(1800);
      ok('Devis : SIRET cherché sur le vrai entreprise.php', LOG().some(x=>/entreprise\.php/.test(x.url) && /89033175400014/.test(x.url)), LOG().map(x=>x.url).slice(-3).join(', '));
      ok('Devis : fiche remplie avec la réponse du serveur (pas le jeu de démonstration)', /BRIAND/i.test($('e-nom').value) && !/Démo/.test($('e-nom').value), $('e-nom').value);
      /* 4. lien externe : nouvel onglet */
      await ouvrirP('B/ressources.html');
      const a=Dc().createElement('a'); a.href='https://www.credit-agricole.fr/'; a.textContent='x'; Dc().body.appendChild(a);
      let bloque=null; const vu=e=>{ if(e.target!==a) return; bloque=e.defaultPrevented; e.preventDefault(); Wn().removeEventListener('click',vu); }; Wn().addEventListener('click',vu); a.click();   /* écouteur sur la fenêtre : après celui de la page */
      ok('Lien externe : ouvert dans un nouvel onglet (plus neutralisé)', a.getAttribute('target')==='_blank' && bloque===false, 'target='+a.getAttribute('target')+' bloqué='+bloque);
      /* 5. site B : Julia flottante, sous-titre en ligne */
      ok('Site B : fenêtre Julia « Assistante IA · réponses indicatives »', /Assistante IA · réponses indicatives/.test(($('jfl')||{}).textContent||''));
      /* 6. Mon dossier : plus de lien promis par e-mail */
      await ouvrirP('A/mon-dossier.html');
      const t=($('dossier')||{}).textContent||'';
      ok('Mon dossier : plus de « Lien envoyé à » ni « vous recevrez un lien »', !/Lien envoyé à|vous recevrez (le|un) lien|Recevoir mon lien/.test(t), t.slice(0,160));
      ok('Mon dossier : le dossier du diagnostic est là (e-mail)', /test\.a@exemple\.fr/.test(t));
      ok('Aucune erreur JavaScript', errs.length===0, errs.join(' | '));
    }catch(e){ ok('Banc interrompu', false, String(e)); }
    fini=true; peindre();
  })();
})();
