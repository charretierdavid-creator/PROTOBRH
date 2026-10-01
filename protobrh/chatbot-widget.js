/* ==========================================================================
   Assistant BRH — widget chatbot (fichier unique, auto-injecté)
   Ajouter UNE seule ligne dans chaque page, avant </body> :
     <script src="chatbot-widget.js" defer></script>
   Le "cerveau" reste côté serveur (chatbot.php -> Mistral).
   Pour modifier les questions suggérées : voir CBOT_SUGG plus bas.
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
.cbot{position:fixed;right:22px;bottom:22px;z-index:901;width:380px;max-width:calc(100vw - 32px);height:600px;max-height:calc(100vh - 40px);
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
.msg{max-width:82%;padding:.7rem .9rem;border-radius:14px;font-size:.9rem;line-height:1.5;white-space:pre-wrap}
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
  <div class="cbot-body" id="cbotBody" aria-live="polite"></div>
  <div class="cbot-sugg" id="cbotSugg"></div>
  <div class="cbot-foot">
    <input id="cbotInput" type="text" placeholder="Posez votre question…" autocomplete="off" onkeydown="if(event.key==='Enter')cbotSend()" aria-label="Votre question">
    <button aria-label="Envoyer" onclick="cbotSend()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z"/></svg></button>
  </div>
  <div class="cbot-note">Assistant informatif — pour un conseil personnalisé, un expert peut vous recontacter.</div>
</div>`;
  function inject(){
    if (document.getElementById('cbot')) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var wrap = document.createElement('div'); wrap.innerHTML = HTML;
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject();
})();

/* Assistant BRH — le "cerveau" est côté serveur (chatbot.php → Mistral). */
const CBOT_ENDPOINT = 'chatbot.php';                 // même dossier
const CBOT_CONTACT  = { label:'Être recontacté par un expert', href:'diagnostic.html#contact' };
const CBOT_SUGG = ["Qu'est-ce que la Banque des RH ?","Quelles solutions proposez-vous ?","Parler à un expert"];
let cbotHistory = [];

function cbotOpen(){ document.getElementById('cbot').classList.add('open'); document.getElementById('cbotLaunch').classList.add('hide');
  const b=document.getElementById('cbotBody'); if(!b.dataset.init){ b.dataset.init='1'; botSay("Bonjour \uD83D\uDC4B Je suis l'assistant de la Banque des Ressources Humaines. Comment puis-je vous aider ?"); renderSugg(); }
  setTimeout(()=>document.getElementById('cbotInput').focus(),120); }
function cbotClose(){ document.getElementById('cbot').classList.remove('open'); document.getElementById('cbotLaunch').classList.remove('hide'); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape') cbotClose(); });

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
/* mise en forme légère des réponses de l'assistant (gras, italique, listes, titres) — texte échappé d'abord, donc sans risque */
function md(s){ let h=esc(s).replace(/\r/g,'');
  h=h.replace(/^[ \t]*#{1,6}[ \t]*(.+)$/gm,'<b>$1</b>');                 // ### Titre -> gras
  h=h.replace(/^[ \t]*[-*•][ \t]+/gm,'• ');                               // - item / * item -> puce
  h=h.replace(/^[ \t]*(\d+)[.)][ \t]+/gm,'$1. ');                         // 1) item -> 1. item
  h=h.replace(/\*\*([^*\n]+?)\*\*/g,'<b>$1</b>').replace(/__([^_\n]+?)__/g,'<b>$1</b>');
  h=h.replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\w)/g,'$1<i>$2</i>');
  h=h.replace(/\*\*/g,'');                                          // astérisques orphelins (réponse tronquée)
  h=h.replace(/\n{3,}/g,'\n\n').trim();
  return h; }
function bubble(text,who,cta){ const b=document.getElementById('cbotBody'); const d=document.createElement('div'); d.className='msg '+who; d.innerHTML= who==='bot' ? md(text) : esc(text);
  if(cta){ d.innerHTML+='<br><a class="cta" href="'+cta.href+'">'+esc(cta.label)+' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>'; }
  b.appendChild(d); b.scrollTop=b.scrollHeight; }
function botSay(t,cta){ bubble(t,'bot',cta); }
function userSay(t){ bubble(t,'user'); }
function renderSugg(){ const s=document.getElementById('cbotSugg'); s.innerHTML='';
  CBOT_SUGG.forEach(q=>{ const btn=document.createElement('button'); btn.textContent=q;
    btn.onclick = /^parler/i.test(q) ? ()=>botSay("Bien sûr, un expert peut vous recontacter :", CBOT_CONTACT) : ()=>ask(q);
    s.appendChild(btn); }); }
function typing(on){ const b=document.getElementById('cbotBody'); if(on){ const t=document.createElement('div'); t.className='typing'; t.id='cbotTyping'; t.innerHTML='<i></i><i></i><i></i>'; b.appendChild(t); b.scrollTop=b.scrollHeight; } else { const t=document.getElementById('cbotTyping'); if(t) t.remove(); } }

async function ask(q){
  userSay(q); cbotHistory.push({role:'user',content:q}); typing(true);
  try{
    const r = await fetch(CBOT_ENDPOINT,{ method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ question:q, history: cbotHistory.slice(-6) }) });
    const data = await r.json(); typing(false);
    const ans = (data && data.answer) ? data.answer : "Je n'ai pas pu répondre. Un expert peut vous recontacter.";
    botSay(ans); cbotHistory.push({role:'assistant',content:ans});
  }catch(e){
    typing(false);
    botSay("Je ne parviens pas à joindre l'assistant pour le moment. Souhaitez-vous être recontacté par un expert ?", CBOT_CONTACT);
  }
}
function cbotSend(){ const i=document.getElementById('cbotInput'); const q=i.value.trim(); if(!q) return; i.value=''; ask(q); }
