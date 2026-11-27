/* ====== DÉMO — e-mails reçus par le dirigeant (aperçu, aucun envoi) ======
   Les pages préviennent le shell (dossier_brh_demo.js) quand une demande avec e-mail crée le dossier
   ou quand le devis est envoyé. Le bandeau affiche « E-mail reçu » ; l'aperçu reprend le dossier et son lien. */
let MAILS=[]; try{ MAILS=JSON.parse(sessionStorage.getItem('brhDemoMails')||'[]'); }catch(e){}
const mailBtn=document.getElementById('mail'), boite=document.getElementById('boite');
function escM(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function eurM(n){ return Math.round(n).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g,'\u00a0')+'\u00a0€'; }
function garderMails(){ try{ sessionStorage.setItem('brhDemoMails',JSON.stringify(MAILS)); }catch(e){} }
function peindreMail(){
  const nl=MAILS.filter(m=>!m.lu).length;
  mailBtn.hidden=!MAILS.length;
  mailBtn.classList.toggle('neuf',nl>0);
  mailBtn.querySelector('i').textContent=nl||MAILS.length;
  mailBtn.setAttribute('aria-label',(nl?nl+' nouvel e-mail':'E-mails reçus')+' (démo) : ouvrir l’aperçu');
}
function objetMail(m){ return m.genre==='devis' ? 'Votre devis Banque des RH est dans votre dossier' : 'Votre dossier Banque des RH : reprenez là où vous en étiez'; }
function corpsMail(m){
  const r=m.resume||{}, src=r.src==='label'?'votre Label RH':'votre diagnostic des 4 besoins';
  const lignes=[];
  if(r.src==='label' && r.score!=null) lignes.push('Votre score Label RH : <b>'+r.score+'/100</b> (niveau '+escM(r.niveau)+')');
  if(r.gain) lignes.push('Votre gain estimé : <b>'+eurM(r.gain)+' par an</b>');
  if(r.priorites && r.priorites.length) lignes.push('Offres recommandées : <b>'+r.priorites.map(escM).join(', ')+'</b>');
  if(r.devis==='en_cours') lignes.push('Votre devis : <b>commencé</b>, vos réponses sont gardées');
  if(r.devis==='envoye') lignes.push('Votre devis : <b>envoyé</b>'+(r.devisRef?' (référence '+escM(r.devisRef)+')':''));
  const intro = m.genre==='devis'
    ? 'Votre devis indicatif est enregistré dans votre dossier Banque des RH. Vous y retrouvez vos offres, chacune expliquée en quelques lignes, et la suite avec votre expert.'
    : 'Merci d’avoir réalisé '+src+'. Vos réponses sont gardées dans votre dossier Banque des RH : vous pouvez le rouvrir à tout moment et reprendre votre parcours là où vous l’avez laissé, jusqu’au devis en ligne.';
  return '<p>Bonjour'+(r.prenom?' '+escM(r.prenom):'')+',</p><p>'+intro+'</p>'
    +(lignes.length?'<ul class="ml-res">'+lignes.map(l=>'<li>'+l+'</li>').join('')+'</ul>':'')
    +'<p class="ml-cta"><a href="#" data-dossier="1">Accéder à mon dossier BRH</a></p>'
    +'<p class="ml-pt">Ce lien est personnel et valable 30 jours'+(r.ref?' · dossier '+escM(r.ref):'')+'. Une question ? Un expert Banque des RH de votre Caisse régionale peut vous rappeler.</p>'
    +'<p class="ml-pt">La Banque des Ressources Humaines · Crédit Agricole Entreprises</p>';
}
function ouvrirBoite(i){
  if(!MAILS.length) return;
  const k=i==null?MAILS.length-1:i, m=MAILS[k]; m.lu=true; garderMails(); peindreMail();
  boite.querySelector('.ml-l').innerHTML=MAILS.map((x,j)=>'<button type="button" class="ml-it'+(j===k?' on':'')+'" data-m="'+j+'"><b>'+escM(objetMail(x))+'</b><span>'+escM(x.heure||'')+'</span></button>').reverse().join('');
  boite.querySelector('.ml-h').innerHTML='<div><span>De</span> La Banque des RH · Crédit Agricole &lt;ne-pas-repondre@banque-des-rh.fr&gt;</div><div><span>À</span> '+escM((m.resume||{}).email||'')+'</div><div class="ml-o">'+escM(objetMail(m))+'</div>';
  boite.querySelector('.ml-c').innerHTML=corpsMail(m);
  boite.hidden=false; const x=boite.querySelector('.ml-x'); if(x) x.focus();
}
function fermerBoite(){ boite.hidden=true; }
mailBtn.addEventListener('click',()=>ouvrirBoite());
boite.addEventListener('click',e=>{
  if(e.target===boite || e.target.closest('.ml-x')){ fermerBoite(); return; }
  const it=e.target.closest('[data-m]'); if(it){ ouvrirBoite(+it.dataset.m); return; }
  const d=e.target.closest('[data-dossier]'); if(d){ e.preventDefault(); fermerBoite(); const m=MAILS[MAILS.length-1]||{}, s=(m.resume&&m.resume.site)||site||DEFAUT; go(s+'/mon-dossier.html'); }
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && !boite.hidden) fermerBoite(); });
window.addEventListener('message',e=>{
  if(e.data && e.data.brhMail){ const m=e.data.brhMail; m.heure=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); MAILS.push(m); garderMails(); peindreMail();
    mailBtn.classList.remove('pulse'); void mailBtn.offsetWidth; mailBtn.classList.add('pulse'); }
  if(e.data && e.data.brhMailEffacer){ MAILS=[]; garderMails(); peindreMail(); fermerBoite(); }
});
/* « Recommencer » confirmé : le shell a vidé sa session, les e-mails de démo partent avec */
document.getElementById('reset').addEventListener('click',()=>{ let vide=true; try{ vide=sessionStorage.getItem('brhDemoMails')===null; }catch(e){} if(vide){ MAILS=[]; peindreMail(); fermerBoite(); } });
peindreMail();
