/* ==========================================================================
   Feedback prototype — widget flottant auto-injecté (bas à gauche).
   Une seule ligne à ajouter dans chaque page, avant </body> :
     <script src="feedback-widget.js" defer></script>
   Les avis sont envoyés à feedback.php, qui les enregistre en MySQL.
   ========================================================================== */
(function(){
  var GREEN='#065145', BANNER='#016265', LIME='#8fb822', MINT='#e9f1ea', INK='#233029', SLATE='#5c6b64', LINE='#e7ece9';

  var CSS =
  ".fb-launch{position:fixed;left:16px;bottom:16px;z-index:1400;display:inline-flex;align-items:center;gap:.5rem;background:"+GREEN+";color:#fff;border:none;border-radius:999px;font-family:'Poppins',system-ui,sans-serif;font-weight:700;font-size:.92rem;padding:.75rem 1.15rem;cursor:pointer;box-shadow:0 10px 26px rgba(6,81,69,.35)}"+
  ".fb-launch:hover{background:"+BANNER+"}.fb-launch svg{width:18px;height:18px}"+
  "#fbw .fb-panel{position:fixed;left:16px;bottom:16px;z-index:1401;width:360px;max-width:calc(100vw - 32px);max-height:82vh;overflow:auto;background:#fff;border:1px solid "+LINE+";border-radius:18px;box-shadow:0 24px 60px rgba(6,81,69,.30);display:none;font-family:'Inter',system-ui,sans-serif;color:"+INK+"}"+
  "#fbw.open .fb-panel{display:block}#fbw.open .fb-launch{display:none}"+
  "#fbw .fb-head{background:linear-gradient(135deg,"+GREEN+","+BANNER+");color:#fff;padding:16px 18px;border-radius:18px 18px 0 0;position:relative}"+
  "#fbw .fb-head h3{font-family:'Poppins',system-ui,sans-serif;font-weight:700;font-size:1.02rem;margin:0}"+
  "#fbw .fb-head p{font-size:.8rem;opacity:.9;margin:4px 0 0}"+
  "#fbw .fb-x{position:absolute;top:12px;right:12px;width:30px;height:30px;border:none;background:rgba(255,255,255,.18);color:#fff;border-radius:8px;font-size:1.2rem;line-height:1;cursor:pointer}"+
  "#fbw .fb-body{padding:16px 18px}"+
  "#fbw .fb-sec{font-family:'Poppins',system-ui,sans-serif;font-weight:700;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:"+GREEN+";margin:14px 0 8px}"+
  "#fbw .fb-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}"+
  "#fbw .fb-lab{font-size:.86rem;color:"+INK+";line-height:1.25}"+
  "#fbw .fb-stars{white-space:nowrap;flex:0 0 auto}"+
  "#fbw .fb-stars button{background:none;border:none;font-size:1.15rem;line-height:1;color:#d7ddd9;cursor:pointer;padding:0 1px}"+
  "#fbw .fb-stars button.on{color:"+LIME+"}"+
  "#fbw .fb-field{margin-top:10px}#fbw .fb-two{display:flex;gap:10px}#fbw .fb-two .fb-field{flex:1;margin-top:10px}"+
  "#fbw .fb-field label{display:block;font-family:'Poppins',system-ui,sans-serif;font-weight:600;font-size:.8rem;margin-bottom:4px}"+
  "#fbw .fb-field label .opt{color:"+SLATE+";font-weight:400}"+
  "#fbw input,#fbw textarea{width:100%;border:1px solid "+LINE+";border-radius:10px;padding:.6rem .7rem;font-family:'Inter',system-ui,sans-serif;font-size:.9rem;color:"+INK+"}"+
  "#fbw textarea{min-height:70px;resize:vertical}#fbw input:focus,#fbw textarea:focus{outline:none;border-color:"+GREEN+";box-shadow:0 0 0 3px rgba(6,81,69,.12)}"+
  "#fbw .fb-err{color:#c0392b;font-size:.8rem;font-weight:600;min-height:1em;margin-top:6px}"+
  "#fbw .fb-send{width:100%;margin-top:12px;background:"+GREEN+";color:#fff;border:none;border-radius:12px;font-family:'Poppins',system-ui,sans-serif;font-weight:700;font-size:.95rem;padding:.8rem;cursor:pointer}"+
  "#fbw .fb-send:hover{background:"+BANNER+"}#fbw .fb-send:disabled{opacity:.6;cursor:default}"+
  "#fbw .fb-ok{display:none;padding:22px 18px;text-align:center;color:"+GREEN+";font-family:'Poppins',system-ui,sans-serif;font-weight:600;line-height:1.5}"+
  "@media(max-width:420px){#fbw .fb-panel{width:calc(100vw - 24px);left:12px}.fb-launch{left:12px}}";

  var ratings = {};

  function starRow(key,label){
    var b=''; for(var i=1;i<=5;i++) b+='<button type="button" data-v="'+i+'" aria-label="'+i+' sur 5">\u2605</button>';
    return '<div class="fb-row"><span class="fb-lab">'+label+'</span><span class="fb-stars" data-key="'+key+'">'+b+'</span></div>';
  }

  var HTML =
    '<button class="fb-launch" type="button" onclick="fbOpen()" aria-haspopup="dialog">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9 6.7 19.2l1-5.8L3.5 9.2l5.9-.9z"/></svg>'
    + 'Votre avis</button>'
    + '<div class="fb-panel" role="dialog" aria-label="Votre avis sur le prototype">'
    + '<div class="fb-head"><button class="fb-x" type="button" onclick="fbClose()" aria-label="Fermer">&times;</button>'
    + '<h3>Votre avis sur ce prototype</h3><p>Ce site est en test — vos retours nous aident à l\u2019améliorer.</p></div>'
    + '<div class="fb-body" id="fb-form">'
    + '<div class="fb-sec">Les parties du site (note sur 5)</div>'
    + starRow('infos','Informations &amp; approche besoin')
    + starRow('diagnostic','Diagnostic / Simulateur')
    + starRow('newsletter','Newsletter')
    + starRow('chatbot','Chatbot')
    + '<div class="fb-sec">Critères généraux</div>'
    + starRow('pertinence','Pertinence')
    + starRow('facilite','Facilité d\u2019utilisation')
    + starRow('valeur','Valeur ajoutée')
    + '<div class="fb-two">'
    + '<div class="fb-field"><label for="fb-prenom">Prénom</label><input id="fb-prenom" type="text" autocomplete="given-name"></div>'
    + '<div class="fb-field"><label for="fb-nom">Nom</label><input id="fb-nom" type="text" autocomplete="family-name"></div>'
    + '</div>'
    + '<div class="fb-field"><label for="fb-email">E-mail <span class="opt">(facultatif)</span></label><input id="fb-email" type="email" autocomplete="email"></div>'
    + '<div class="fb-field"><label for="fb-comm">Commentaires libres (suggestions\u2026)</label><textarea id="fb-comm"></textarea></div>'
    + '<div class="fb-err" id="fb-err" role="alert"></div>'
    + '<button class="fb-send" id="fb-send" type="button" onclick="fbSend()">Envoyer mon avis</button>'
    + '</div>'
    + '<div class="fb-ok" id="fb-ok">\u2705 Merci pour votre retour !<br>Il nous aide à améliorer le prototype.</div>'
    + '</div>';

  function inject(){
    if (document.getElementById('fbw')) return;
    var st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);
    var root=document.createElement('div'); root.id='fbw'; root.innerHTML=HTML; document.body.appendChild(root);
    root.querySelectorAll('.fb-stars').forEach(function(row){
      var key=row.getAttribute('data-key');
      row.querySelectorAll('button').forEach(function(b){
        b.addEventListener('click',function(){
          var v=parseInt(b.getAttribute('data-v'),10); ratings[key]=v;
          row.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', parseInt(x.getAttribute('data-v'),10)<=v); });
        });
      });
    });
  }

  window.fbOpen  = function(){ var w=document.getElementById('fbw'); if(w) w.classList.add('open'); };
  window.fbClose = function(){ var w=document.getElementById('fbw'); if(w) w.classList.remove('open'); };
  window.fbSend  = function(){
    var g=function(id){ var el=document.getElementById(id); return el?el.value:''; };
    var err=document.getElementById('fb-err');
    var prenom=g('fb-prenom').trim(), nom=g('fb-nom').trim(), email=g('fb-email').trim();
    if(!prenom || !nom){ err.textContent='Merci d\u2019indiquer votre prénom et votre nom.'; return; }
    if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ err.textContent='Adresse e-mail non valide.'; return; }
    err.textContent='';
    var payload={ prenom:prenom, nom:nom, email:email, commentaires:g('fb-comm').trim(), notes:ratings, page:location.pathname };
    var btn=document.getElementById('fb-send'); btn.disabled=true; btn.textContent='Envoi\u2026';
    fetch('feedback.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d && d.ok){ document.getElementById('fb-form').style.display='none'; document.getElementById('fb-ok').style.display='block'; }
        else { err.textContent=(d&&d.error)||'Envoi impossible pour le moment.'; btn.disabled=false; btn.textContent='Envoyer mon avis'; }
      })
      .catch(function(){ err.textContent='Envoi impossible pour le moment.'; btn.disabled=false; btn.textContent='Envoyer mon avis'; });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject();
})();
