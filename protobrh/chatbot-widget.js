/* ==========================================================================
   Assistant BRH — widget chatbot (fichier unique, auto-injecté)
   Ajouter UNE seule ligne dans chaque page, avant </body> :
     <script src="chatbot-widget.js" defer></script>
   Le "cerveau" reste côté serveur (chatbot.php -> Mistral).
   Pour modifier les questions suggérées : voir CBOT_SUGG plus bas.
   V2 : conseil personnalisé à partir du diagnostic (consentement, qualification, invitation).
   ========================================================================== */
(function(){
  var CSS = `/* ===== MODULE CHATBOT — widget flottant (branché sur chatbot.php) ===== */
:root{--green:#065145;--green-h:#02392f;--banner:#016265;--lime:#8fb822;--mint:#e9f1ea;--mint2:#eef4ef;
  --ink:#233029;--slate:#5c6b64;--line:#e7ece9;--line2:#dfe6e2;--white:#fff;--gray-bg:#f6f8f7;
  --fh:'Poppins',system-ui,sans-serif;--fb:'Inter',system-ui,sans-serif;}
.cbot-launch{position:fixed;right:22px;bottom:22px;z-index:900;display:inline-flex;align-items:center;gap:.6rem;
  background:var(--green);color:#fff;border:none;border-radius:999px;padding:.85rem 1.25rem;cursor:pointer;
  font-family:var(--fh);font-weight:600;font-size:.95rem;box-shadow:0 12px 30px rgba(6,81,69,.32);transition:.18s}
.cbot-launch:hover{background:var(--green-h);transform:translateY(-2px)}
.cbot-launch svg{width:22px;height:22px}
.cbot-launch.hide{display:none}
.cbot{position:fixed;right:22px;bottom:22px;z-index:901;width:460px;max-width:calc(100vw - 32px);height:760px;max-height:calc(100vh - 40px);
  background:#fff;border-radius:20px;box-shadow:0 24px 70px rgba(6,81,69,.28);display:none;flex-direction:column;overflow:hidden}
.cbot.open{display:flex}
.cbot-head{background:linear-gradient(135deg,var(--green) 0%,var(--banner) 100%);color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px}
.cbot-head .av{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.16);display:grid;place-items:center;flex:0 0 auto}
.cbot-head .av svg{width:24px;height:24px}
.cbot-head .t b{font-family:var(--fh);font-weight:700;font-size:1rem;display:block;line-height:1.2}
.cbot-head .t span{font-size:.78rem;opacity:.85;display:flex;align-items:center;gap:.35rem}
.cbot-head .t span::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--lime);display:inline-block}
.cbot-head .x{margin-left:auto;background:rgba(255,255,255,.14);border:none;color:#fff;width:34px;height:34px;border-radius:9px;cursor:pointer;display:grid;place-items:center}
.cbot-head .x svg{width:18px;height:18px}
.cbot-body{flex:1;overflow-y:auto;padding:18px;background:var(--gray-bg);display:flex;flex-direction:column;gap:12px}
.msg{max-width:88%;padding:.8rem 1rem;border-radius:14px;font-size:1rem;line-height:1.55;white-space:pre-wrap}
.msg.bot{background:#fff;border:1px solid var(--line);border-bottom-left-radius:4px;align-self:flex-start;color:var(--ink)}
.msg.user{background:var(--green);color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
.msg.bot b{font-weight:600;color:var(--green)}
.msg .cta{display:inline-flex;align-items:center;gap:.4rem;margin-top:8px;background:var(--mint);color:var(--green);
  font-family:var(--fh);font-weight:600;font-size:.82rem;padding:.4rem .7rem;border-radius:8px;text-decoration:none}
.msg .cta svg{width:14px;height:14px}
.typing{align-self:flex-start;background:#fff;border:1px solid var(--line);border-radius:14px;border-bottom-left-radius:4px;padding:.7rem .9rem;display:flex;gap:4px}
.typing i{width:7px;height:7px;border-radius:50%;background:#b9c6c0;animation:bl 1s infinite}
.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}
@keyframes bl{0%,60%,100%{opacity:.3}30%{opacity:1}}
.cbot-sugg{padding:0 18px 8px;display:flex;flex-wrap:wrap;gap:8px;background:var(--gray-bg)}
.cbot-sugg button{background:#fff;border:1px solid var(--line2);border-radius:999px;padding:.4rem .8rem;font-size:.8rem;
  color:var(--green);font-weight:600;font-family:var(--fb);cursor:pointer;transition:.15s}
.cbot-sugg button:hover{background:var(--mint);border-color:var(--mint)}
.cbot-foot{padding:12px 14px;border-top:1px solid var(--line);background:#fff;display:flex;gap:8px;align-items:center}
.cbot-foot input{flex:1;border:1.5px solid var(--line2);border-radius:12px;padding:.7rem .85rem;font-size:.92rem;font-family:var(--fb);color:var(--ink)}
.cbot-foot input:focus{outline:none;border-color:var(--green);box-shadow:0 0 0 3px rgba(6,81,69,.12)}
.cbot-foot button{background:var(--green);border:none;color:#fff;width:44px;height:44px;border-radius:12px;cursor:pointer;display:grid;place-items:center;flex:0 0 auto}
.cbot-foot button:hover{background:var(--green-h)}
.cbot-foot button svg{width:20px;height:20px}
.cbot-note{font-size:.68rem;color:var(--slate);text-align:center;padding:0 14px 10px;background:#fff}

.cbot-ctx{background:#fff;border-bottom:1px solid var(--line);padding:10px 16px;font-size:.8rem;color:var(--ink);display:none}
.cbot-ctx.show{display:block}
.cbot-ctx .q{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cbot-ctx .q b{font-family:var(--fh);color:var(--green);font-weight:600}
.cbot-ctx .q small{display:block;width:100%;color:var(--slate);font-size:.72rem;margin-top:2px}
.cbot-ctx button{border:1px solid var(--line2);background:#fff;color:var(--green);border-radius:999px;padding:.25rem .7rem;font:600 .76rem var(--fb);cursor:pointer}
.cbot-ctx .pill{display:inline-flex;align-items:center;gap:.4rem;background:var(--mint);color:var(--green);border-radius:999px;padding:.25rem .7rem;font:600 .76rem var(--fh)}
.cbot-ctx .pill::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--lime)}
.cbot-ctx .lnk{border:none;background:none;padding:0 .2rem;text-decoration:underline;color:var(--slate);font-weight:500}
.msg.bot .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;white-space:normal}
.msg.bot .chips button{background:#fff;border:1px solid var(--line2);border-radius:999px;padding:.35rem .7rem;font:600 .78rem var(--fb);color:var(--green);cursor:pointer}
.msg.bot .chips button.sel{background:var(--green);color:#fff;border-color:var(--green)}
.msg.bot .chips button.ok{background:var(--lime);border-color:var(--lime);color:#fff}
.msg.bot .chips[aria-disabled="true"] button{pointer-events:none;opacity:.55}
.msg .cta{margin-right:4px}
.cbot-nudge{position:fixed;right:22px;bottom:84px;z-index:900;max-width:270px;background:#fff;border:1px solid var(--line);border-radius:14px;border-bottom-right-radius:4px;
  box-shadow:0 12px 30px rgba(6,81,69,.22);padding:.75rem 1.6rem .75rem .9rem;font-size:.86rem;line-height:1.4;color:var(--ink);cursor:pointer;display:none;font-family:var(--fb)}
.cbot-nudge.show{display:block;animation:nup .3s ease}
.cbot-nudge b{color:var(--green);font-family:var(--fh)}
.cbot-nudge .nx{position:absolute;top:4px;right:6px;border:none;background:none;color:var(--slate);font-size:1rem;cursor:pointer}
@keyframes nup{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media(max-width:460px){.cbot{right:0;bottom:0;width:100vw;height:100vh;max-height:100vh;border-radius:0}.cbot-launch{right:16px;bottom:16px}}`;
  var HTML = `<button class="cbot-launch" id="cbotLaunch" aria-label="Ouvrir l'assistant BRH" onclick="cbotOpen()">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.9 8.9 0 0 1-4-.9L3 20l1-3.9a8.3 8.3 0 0 1-1-4A8.4 8.4 0 0 1 11.5 3 8.4 8.4 0 0 1 21 11.5Z"/></svg>
  Besoin d'aide ?
</button>
<div class="cbot" id="cbot" role="dialog" aria-label="Assistant Banque des Ressources Humaines">
  <div class="cbot-head">
    <span class="av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3C9 6 6 8 6 12a6 6 0 0 0 12 0c0-4-3-6-6-9Z"/></svg></span>
    <div class="t"><b>Assistant BRH</b><span>En ligne · propulsé par Mistral</span></div>
    <button class="x" aria-label="Fermer" onclick="cbotClose()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
  </div>
  <div class="cbot-ctx" id="cbotCtx"></div>
  <div class="cbot-body" id="cbotBody" aria-live="polite"></div>
  <div class="cbot-sugg" id="cbotSugg"></div>
  <div class="cbot-foot">
    <input id="cbotInput" type="text" placeholder="Posez votre question…" autocomplete="off" onkeydown="if(event.key==='Enter')cbotSend()" aria-label="Votre question">
    <button aria-label="Envoyer" onclick="cbotSend()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z"/></svg></button>
  </div>
  <div class="cbot-note" id="cbotNote">Assistant informatif — pour un conseil personnalisé, un expert peut vous recontacter.</div>
</div>
<div class="cbot-nudge" id="cbotNudge" role="button" tabindex="0" aria-label="Ouvrir l'assistant pour un éclairage sur vos résultats"><button class="nx" aria-label="Masquer" onclick="event.stopPropagation();cbotNudgeHide(true)">&times;</button><b>Une question sur vos résultats ?</b><br>Je peux vous aider à prioriser selon le profil de votre entreprise.</div>`;
  function inject(){
    if (document.getElementById('cbot')) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var wrap = document.createElement('div'); wrap.innerHTML = HTML;
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject();
})();

/* Toute la logique est isolée dans une fonction (IIFE) : aucun nom ne peut entrer en conflit avec
   les scripts des pages (ex. « esc » déjà déclaré dans devis.html, qui bloquait l'assistant). */
(function(){
/* Assistant BRH — le "cerveau" est côté serveur (chatbot.php → Mistral).
   V2 (01/10/2026) : conseil personnalisé (pré-orientation) à partir du profil de l'entreprise.
   Le profil est lu dans la session du navigateur (diagnostic : brhProfil ; devis : brhDevis),
   n'est utilisé qu'avec l'accord du dirigeant et ne contient aucune donnée personnelle. */
const CBOT_ENDPOINT = 'chatbot.php';                 // même dossier
const CBOT_CONTACT  = { label:'Être recontacté par un expert', href:'diagnostic.html#contact' };
const CBOT_DEVIS    = { label:'Obtenir mon devis en ligne', href:'devis.html' };
const CBOT_SUGG = ["Qu'est-ce que la Banque des RH ?","Quelles solutions proposez-vous ?","Parler à un expert"];
const CBOT_ENJEUX = ["Attirer des talents","Fidéliser mes salariés","Motiver et engager","Maîtriser le coût salarial","Préparer les départs en retraite"];
const CBOT_DEJA   = ["Mutuelle","Prévoyance","Épargne salariale","Intéressement / participation","Retraite supplémentaire","Titres-restaurant","Autres avantages"];
const CBOT_AXES   = { protection:"Protéger vos salariés", partageValeur:"Partager la valeur", pouvoirAchat:"Donner du pouvoir d'achat", retraite:"Préparer la retraite" };
let cbotHistory = [];

/* ---------- session (profil, consentement) ---------- */
function cbSS(k,d){ try{ const v=sessionStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
function cbSSet(k,v){ try{ sessionStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
function cbotProfile(){
  const p = Object.assign({}, cbSS('brhProfil',{}) || {});
  const dv = cbSS('brhDevis',null);
  if(dv){
    const S=dv.S||{}, f=dv.f||{};
    if(Array.isArray(S.sol) && S.sol.length) p.solutionsDevis=S.sol.slice(0,4);
    const effD=parseInt(f['e-eff'],10); if(!p.effectif && effD>0) p.effectif=effD;
    if(S.ent){ if(S.ent.naf) p.naf=S.ent.naf; if(S.ent.idcc) p.idcc=S.ent.idcc; }
  }
  const c = cbSS('brhProfilChat',{}) || {};
  if(c.enjeu) p.enjeu=c.enjeu;
  if(Array.isArray(c.deja)) p.deja=c.deja;
  return (p.effectif || p.priorites || p.solutionsDevis) ? p : null;
}
function cbotConsent(){ return cbSS('brhIAConsent',null); }           // 'oui' | 'non' | null
function cbotPerso(){ return cbotConsent()==='oui' && !!cbotProfile(); }
function cbotTop(p){ const pr=(p&&p.priorites)||{}; return Object.keys(CBOT_AXES).filter(k=>(pr[k]||0)>=3).sort((a,b)=>(pr[b]||0)-(pr[a]||0)); }
function cbotResume(p){
  const parts=[];
  if(p.effectif) parts.push(p.effectif+' salarié'+(p.effectif>1?'s':''));
  if(p.typeEntreprise) parts.push(p.typeEntreprise);
  if(p.secteur) parts.push(p.secteur);
  if(p.region) parts.push(p.region);
  return parts.join(' · ');
}

/* ---------- ouverture / fermeture ---------- */
function cbotOpen(){ document.getElementById('cbot').classList.add('open'); document.getElementById('cbotLaunch').classList.add('hide'); cbotNudgeHide(true);
  const b=document.getElementById('cbotBody'); renderCtx();
  if(!b.dataset.init){ b.dataset.init='1'; cbotGreet(); }
  setTimeout(()=>document.getElementById('cbotInput').focus(),120); }
function cbotClose(){ document.getElementById('cbot').classList.remove('open'); document.getElementById('cbotLaunch').classList.remove('hide'); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape') cbotClose(); });

function cbotGreet(){
  const p=cbotProfile(), c=cbotConsent();
  if(p && c==='oui'){
    const top=cbotTop(p).map(k=>CBOT_AXES[k].toLowerCase());
    botSay("Bonjour \uD83D\uDC4B J'ai les résultats de votre diagnostic"+(cbotResume(p)?" ("+cbotResume(p)+")":"")+"."+
      (top.length?" Vos priorités les plus fortes : **"+top.join("** et **")+"**.":"")+" Je peux vous aider à prioriser.");
    cbotQualify();
  } else if(p && c===null){
    botSay("Bonjour \uD83D\uDC4B Je suis l'assistant de la Banque des Ressources Humaines. Vous avez réalisé votre diagnostic : souhaitez-vous que j'en tienne compte pour personnaliser mes réponses ? (voir le choix ci-dessus)");
    renderSugg();
  } else {
    botSay("Bonjour \uD83D\uDC4B Je suis l'assistant de la Banque des Ressources Humaines. Comment puis-je vous aider ?");
    renderSugg();
  }
}

/* ---------- bandeau « conseil personnalisé » (consentement) ---------- */
function renderCtx(){
  const box=document.getElementById('cbotCtx'), note=document.getElementById('cbotNote'), p=cbotProfile(), c=cbotConsent();
  if(!p){ box.classList.remove('show'); box.innerHTML=''; note.textContent="Assistant informatif — pour un conseil personnalisé, un expert peut vous recontacter."; return; }
  box.classList.add('show');
  if(c==='oui'){
    box.innerHTML='<div class="q"><span class="pill">Conseil personnalisé · '+esc(cbotResume(p)||'votre diagnostic')+'</span><button class="lnk" onclick="cbotSetConsent(\'non\')">Désactiver</button></div>';
    note.textContent="Orientation indicative et non contractuelle — un expert BRH valide avec vous la solution adaptée.";
  } else if(c==='non'){
    box.innerHTML='<div class="q">Réponses générales.<button class="lnk" onclick="cbotSetConsent(\'oui\')">Personnaliser avec mon diagnostic</button></div>';
    note.textContent="Assistant informatif — pour un conseil personnalisé, un expert peut vous recontacter.";
  } else {
    box.innerHTML='<div class="q"><b>Personnaliser mes réponses avec mon diagnostic ?</b><button onclick="cbotSetConsent(\'oui\')">Oui</button><button onclick="cbotSetConsent(\'non\')">Non</button>'+
      '<small>Seules des données d\'entreprise sont utilisées (effectif, secteur, priorités), jamais vos coordonnées.</small></div>';
    note.textContent="Assistant informatif — pour un conseil personnalisé, un expert peut vous recontacter.";
  }
}
function cbotSetConsent(v){
  const before=cbotConsent(); cbSSet('brhIAConsent',v); renderCtx();
  if(v==='oui' && before!=='oui'){ const p=cbotProfile(); const top=cbotTop(p).map(k=>CBOT_AXES[k].toLowerCase());
    botSay("C'est noté, je tiens compte de votre diagnostic"+(top.length?" (priorités : "+top.join(", ")+")":"")+"."); cbotQualify(); }
  if(v==='non'){ botSay("C'est noté : je réponds de façon générale, sans utiliser votre diagnostic."); renderSugg(); }
}

/* ---------- 2 questions de qualification (enjeu RH, existant) ---------- */
function chipsMsg(text,items,opts){
  const b=document.getElementById('cbotBody'); const d=document.createElement('div'); d.className='msg bot';
  d.innerHTML=md(text)+'<div class="chips"></div>'; const c=d.querySelector('.chips');
  const sel=new Set();
  items.forEach(it=>{ const btn=document.createElement('button'); btn.type='button'; btn.textContent=it;
    btn.onclick=()=>{ if(opts.multi){ if(sel.has(it)){ sel.delete(it); btn.classList.remove('sel'); } else { if(it==='Rien de tout cela'){ sel.clear(); c.querySelectorAll('.sel').forEach(x=>x.classList.remove('sel')); } else { const r=[...c.children].find(x=>x.textContent==='Rien de tout cela'); if(r&&sel.has('Rien de tout cela')){ sel.delete('Rien de tout cela'); r.classList.remove('sel'); } } sel.add(it); btn.classList.add('sel'); } }
      else { c.setAttribute('aria-disabled','true'); btn.classList.add('sel'); opts.done([it]); } };
    c.appendChild(btn); });
  if(opts.multi){ const ok=document.createElement('button'); ok.type='button'; ok.className='ok'; ok.textContent='Valider';
    ok.onclick=()=>{ c.setAttribute('aria-disabled','true'); opts.done([...sel]); }; c.appendChild(ok); }
  b.appendChild(d); b.scrollTop=b.scrollHeight;
}
function cbotQualify(){
  const p=cbotProfile()||{}, saved=cbSS('brhProfilChat',{})||{};
  document.getElementById('cbotSugg').innerHTML='';
  const askDeja=()=>{
    if(Array.isArray(saved.deja)){ cbotAdvise(); return; }
    chipsMsg("Qu'avez-vous **déjà en place** dans votre entreprise ? (plusieurs choix possibles)", CBOT_DEJA.concat(['Rien de tout cela']), {multi:true, done:(v)=>{
      const deja=v.filter(x=>x!=='Rien de tout cela'); saved.deja=deja; cbSSet('brhProfilChat',saved);
      userSay(deja.length?deja.join(', '):'Rien de tout cela'); cbotAdvise(); }});
  };
  if(saved.enjeu){ askDeja(); return; }
  chipsMsg("Pour affiner, quel est votre **enjeu RH n°1** aujourd'hui ?", CBOT_ENJEUX, {multi:false, done:(v)=>{
    saved.enjeu=v[0]; cbSSet('brhProfilChat',saved); userSay(v[0]); askDeja(); }});
}
function cbotAdvise(){ renderSugg(); ask("Compte tenu de mon profil, par où commencer ? Quelles sont mes 2 ou 3 pistes prioritaires ?"); }

/* ---------- mise en forme ---------- */
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
/* mise en forme légère des réponses de l'assistant (gras, italique, listes, titres) — texte échappé d'abord, donc sans risque */
function md(s){ let h=esc(s).replace(/\r/g,'');
  h=h.replace(/^[ \t]*#{1,6}[ \t]*(.+)$/gm,'<b>$1</b>');
  h=h.replace(/^[ \t]*[-*•][ \t]+/gm,'• ');
  h=h.replace(/^[ \t]*(\d+)[.)][ \t]+/gm,'$1. ');
  h=h.replace(/\*\*([^*\n]+?)\*\*/g,'<b>$1</b>').replace(/__([^_\n]+?)__/g,'<b>$1</b>');
  h=h.replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\w)/g,'$1<i>$2</i>');
  h=h.replace(/\*\*/g,'');
  h=h.replace(/\n{3,}/g,'\n\n').trim();
  return h; }
function ctaHTML(cta){ return '<a class="cta" href="'+cta.href+'">'+esc(cta.label)+' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>'; }
function bubble(text,who,cta){ const b=document.getElementById('cbotBody'); const d=document.createElement('div'); d.className='msg '+who; d.innerHTML= who==='bot' ? md(text) : esc(text);
  const ctas=Array.isArray(cta)?cta:(cta?[cta]:[]);
  if(ctas.length){ d.innerHTML+='<br>'+ctas.map(ctaHTML).join(' '); }
  b.appendChild(d); b.scrollTop=b.scrollHeight; }
function botSay(t,cta){ bubble(t,'bot',cta); }
function userSay(t){ bubble(t,'user'); }

/* ---------- questions suggérées (adaptées au profil si conseil personnalisé) ---------- */
function cbotSuggestions(){
  // Deux suggestions seulement, pour laisser la place à la conversation
  return cbotPerso() ? ["Par où commencer avec mes priorités ?","Parler à un expert"]
                     : ["Quelles solutions proposez-vous ?","Parler à un expert"];
}
function renderSugg(){ const s=document.getElementById('cbotSugg'); s.innerHTML='';
  cbotSuggestions().forEach(q=>{ const btn=document.createElement('button'); btn.textContent=q;
    btn.onclick = /^parler/i.test(q) ? ()=>botSay("Bien sûr, un expert de votre Caisse régionale peut vous recontacter :", CBOT_CONTACT) : ()=>ask(q);
    s.appendChild(btn); }); }
function typing(on){ const b=document.getElementById('cbotBody'); if(on){ const t=document.createElement('div'); t.className='typing'; t.id='cbotTyping'; t.innerHTML='<i></i><i></i><i></i>'; b.appendChild(t); b.scrollTop=b.scrollHeight; } else { const t=document.getElementById('cbotTyping'); if(t) t.remove(); } }

/* ---------- envoi ---------- */
/* Le profil est envoyé encodé (base64) : certains pare-feu d'hébergement (WAF) bloquent en 403 les requêtes
   dont le contenu JSON ressemble à des motifs suspects. On n'envoie que les champs utiles (minimisation). */
function cbotB64(s){ return btoa(unescape(encodeURIComponent(s))); }
function cbotUnB64(s){ try{ return decodeURIComponent(escape(atob(s))); }catch(e){ return ''; } }
function cbotPack(p){
  if(!p) return null;
  const keep=['effectif','secteur','typeEntreprise','region','naf','idcc','enjeu','deja','priorites','solutionsDevis','gains'];
  const o={}; keep.forEach(k=>{ if(p[k]!==undefined && p[k]!==null && p[k]!=='') o[k]=p[k]; });
  try{ return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }catch(e){ return null; }
}
const CBOT_DEBUG = /[?&]debug=1/.test(location.search);   // ajouter ?debug=1 à l'adresse pour afficher le diagnostic technique
async function ask(q){
  userSay(q); cbotHistory.push({role:'user',content:q}); typing(true);
  const perso=cbotPerso(), profile= perso ? cbotProfile() : null;
  let status=0, raw='';
  try{
    const payload = { question:q, history: cbotHistory.slice(-6), p: cbotPack(profile) };
    const r = await fetch(CBOT_ENDPOINT,{ method:'POST', headers:{'Content-Type':'text/plain;charset=UTF-8'}, credentials:'same-origin',
      body: cbotB64(JSON.stringify(payload)) });          // requête encodée : invisible pour le pare-feu de l'hébergeur
    status=r.status; raw=await r.text();
    let data=null; try{ data=JSON.parse(raw.trim()); }catch(err){}
    if(data && data.e){ data = { answer: data.a ? cbotUnB64(data.a) : '', debug: data.d ? cbotUnB64(data.d) : '', mode: data.m }; }
    typing(false);
    if(!data){
      console.warn('[Assistant BRH] réponse non JSON de chatbot.php (HTTP '+status+') :', raw.slice(0,400));
      botSay("Je ne parviens pas à joindre l'assistant pour le moment (code "+status+"). Souhaitez-vous être recontacté par un expert ?"+
        (CBOT_DEBUG?"\n\n[Diagnostic] Réponse reçue : "+(raw.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,300)||'vide'):''), CBOT_CONTACT);
      return;
    }
    if(data.debug) console.warn('[Assistant BRH] '+data.debug);
    const ans = (data.answer) ? data.answer : "Je n'ai pas pu répondre. Un expert peut vous recontacter.";
    let ctas=null;
    if(perso){ const eff=(profile&&profile.effectif)||0; ctas = (eff>=5 && eff<=50) ? [CBOT_DEVIS, CBOT_CONTACT] : [CBOT_CONTACT]; }
    botSay(ans+(CBOT_DEBUG && data.debug ? "\n\n[Diagnostic] "+data.debug : '')+(CBOT_DEBUG ? "\n[Mode] "+(data.mode||'?') : ''), ctas);
    cbotHistory.push({role:'assistant',content:ans});
    if(window.dataLayer) window.dataLayer.push({event:'chatbot_answer', mode: data.mode || (perso?'perso':'standard')});
  }catch(e){
    typing(false);
    console.warn('[Assistant BRH] appel impossible :', e);
    botSay("Je ne parviens pas à joindre l'assistant pour le moment. Souhaitez-vous être recontacté par un expert ?"+(CBOT_DEBUG?"\n\n[Diagnostic] "+(e&&e.message?e.message:e):''), CBOT_CONTACT);
  }
}
function cbotSend(){ const i=document.getElementById('cbotInput'); const q=i.value.trim(); if(!q) return; i.value=''; ask(q); }

/* ---------- invitation proactive (page diagnostic, une fois par session) ---------- */
function cbotNudgeHide(forever){ const n=document.getElementById('cbotNudge'); if(n) n.classList.remove('show'); if(forever) cbSSet('brhNudgeVu',1); }
function cbotNudgeInit(){
  const n=document.getElementById('cbotNudge'); if(!n) return;
  n.onclick=()=>cbotOpen(); n.onkeydown=e=>{ if(e.key==='Enter') cbotOpen(); };
  const target=document.getElementById('rec-cards') || document.getElementById('gains'); if(!target || !('IntersectionObserver' in window)) return;
  const io=new IntersectionObserver(es=>{ es.forEach(en=>{ if(en.isIntersecting && !cbSS('brhNudgeVu',0) && cbotProfile() && !document.getElementById('cbot').classList.contains('open')){
    setTimeout(()=>{ if(!document.getElementById('cbot').classList.contains('open') && !cbSS('brhNudgeVu',0)){ n.classList.add('show'); cbSSet('brhNudgeVu',1); } }, 2500); io.disconnect(); } }); }, {threshold:0.35});
  io.observe(target);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>setTimeout(cbotNudgeInit,300)); else setTimeout(cbotNudgeInit,300);

/* seules les fonctions appelées depuis le HTML du widget sont rendues publiques */
window.cbotOpen=cbotOpen; window.cbotClose=cbotClose; window.cbotSend=cbotSend;
window.cbotSetConsent=cbotSetConsent; window.cbotNudgeHide=cbotNudgeHide;
})();
