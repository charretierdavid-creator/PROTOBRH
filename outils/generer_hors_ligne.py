"""Génère une version hors ligne (fichier unique) du prototype Portail BRH.
Usage : python3 outils/generer_hors_ligne.py <dossier protobrh> <fichier de sortie> [<url du relais assistant-demo.php> <jeton>]
#   Versions A/B : lancer d'abord outils/assembler_variantes.py puis passer _site/protobrha (ou _site/protobrhb).
Chaque page est embarquée en base64 et affichée dans un iframe (srcdoc) ; les scripts partagés
sont intégrés dans les pages ; la navigation entre pages passe par un routeur (#/page.html).
Assistant BRH : relais en ligne assistant-demo.php (jeton de démonstration, clé Mistral jamais embarquée) ;
sans réseau, réponses tirées de la base documentaire embarquée. Le bouton « Votre avis » est retiré (serveur requis)."""
import sys, os, re, json, base64, datetime

SRC, OUT = sys.argv[1], sys.argv[2]
RELAIS = (sys.argv[3] + '?t=' + sys.argv[4]) if len(sys.argv) > 4 else ''
PAGES = [('index.html', 'Accueil'), ('diagnostic.html', 'Diagnostic RH'), ('audit-mutuelle.html', 'Audit mutuelle'),
         ('devis.html', 'Devis en ligne'), ('avantages-fiscaux.html', 'Avantages fiscaux'), ('ressources.html', 'Ressources'),
         ('newsletter.html', 'Newsletter'), ('newsletter-archive.html', 'Éditions de la newsletter'),
         ('newsletter-edition.html', 'Newsletter du mois'), ('newsletter-2026-09.html', 'Newsletter septembre 2026'),
         ('newsletter-2026-10.html', 'Newsletter octobre 2026')]
INLINE = ['variante.js', 'formules-amundi.js', 'conventions.js', 'entreprise-lookup.js', 'chatbot-widget.js']
DROP = ['feedback-widget.js']
photo = base64.b64encode(open(os.path.join(SRC, 'photo.jpeg'), 'rb').read()).decode()

def transform(html):
    for js in INLINE:
        code = open(os.path.join(SRC, js), encoding='utf-8').read()
        code = re.sub(r'</(script)', r'<\\/\1', code, flags=re.I)   # ne pas fermer la balise englobante
        html = re.sub(r'<script src="' + re.escape(js) + r'(\?v=[\w.-]+)?"( defer)?></script>', lambda m: '<script>\n' + code + '\n</script>', html)
    css = open(os.path.join(SRC, 'variante.css'), encoding='utf-8').read().replace('</', '<\\/')   # version A/B : styles propres
    html = re.sub(r'<link rel="stylesheet" href="variante\.css(\?v=[\w.-]+)?">', lambda m: '<style>\n' + css + '\n</style>', html)
    for js in DROP:
        html = re.sub(r'<script src="' + re.escape(js) + r'(\?v=[\w.-]+)?"( defer)?></script>\n?', '', html)
    html = html.replace('src="photo.jpeg"', 'src="data:image/jpeg;base64,' + photo + '"')
    html = re.sub(r"location\.href='([^']+)'", r"__go('\1')", html)
    html = html.replace('location.search', "(window.__QS||'')")
    return html

# base documentaire embarquée (repli de l'assistant sans réseau)
kb = open(os.path.join(SRC, 'connaissances.txt'), encoding='utf-8').read()
kb = re.sub(r'^(={10,}[^\n]*)\n([^\n]*?) +(={10,}) *$', r'\1\n\2\n\3', kb, flags=re.M)   # titre et séparateur sur la même ligne
heads = list(re.finditer(r'^=+ *(?:\d+\.)? *([^\n]*)\n([^\n]*)\n=+ *$', kb, re.M))
LOCAL = []
for i, m in enumerate(heads):
    body = kb[m.end():heads[i + 1].start() if i + 1 < len(heads) else len(kb)].strip()
    title = ' '.join((m.group(1) + ' ' + m.group(2)).split()).lower().capitalize()
    for sig in ['PEE', 'PEI', 'PER', 'COL', 'PPV', 'IFC', 'FMD', 'CAA', 'BRH', 'ESR', 'NAO', 'CESU']:
        title = re.sub(r'\b' + sig.lower() + r'\b', sig, title, flags=re.I)
    if body: LOCAL.append({'t': ' '.join(title.split()), 'x': body})

data = {}
for f, t in PAGES:
    p = os.path.join(SRC, f)
    if not os.path.exists(p): continue
    h = transform(open(p, encoding='utf-8').read())
    data[f] = {'t': t, 'h': base64.b64encode(h.encode('utf-8')).decode()}

SHIM = r"""<script>
window.__QS=%QS%;window.__HASH=%HASH%;window.__PAGE=%PAGE%;
(function(){
  /* stockage de session partagé entre les pages (le fichier local n'y a pas toujours accès) */
  ['sessionStorage','localStorage'].forEach(function(k){
    var ok=false; try{ var t=window[k]; t.setItem('__t','1'); t.removeItem('__t'); ok=true; }catch(e){}
    if(ok) return;
    var root; try{ root=parent.__brhStore=parent.__brhStore||{}; }catch(e){ root={}; }
    var d=root[k]=root[k]||{};
    var st={ getItem:function(n){ return Object.prototype.hasOwnProperty.call(d,n)?d[n]:null; }, setItem:function(n,v){ d[n]=String(v); },
      removeItem:function(n){ delete d[n]; }, clear:function(){ for(var n in d) delete d[n]; }, key:function(i){ return Object.keys(d)[i]||null; } };
    Object.defineProperty(st,'length',{get:function(){ return Object.keys(d).length; }});
    try{ Object.defineProperty(window,k,{configurable:true,get:function(){ return st; }}); }catch(e){}
  });
  try{ window.BRH_CBOT_ENDPOINT=parent.__BRH_EP||'chatbot.php'; window.BRH_CBOT_LOCAL=parent.__BRH_LOCAL||[]; }catch(e){}
  window.__go=function(h){ try{ parent.postMessage({brhGo:String(h)},'*'); }catch(e){} };
  function local(href){ return href && !/^(https?:|mailto:|tel:|javascript:|data:|#)/i.test(href) && /\.html(\?|#|$)/i.test(href); }
  document.addEventListener('click',function(e){
    var a=e.target.closest && e.target.closest('a[href]'); if(!a || e.defaultPrevented) return;
    var href=a.getAttribute('href');
    if(href && href.charAt(0)==='#' && href.length>1){ var t=document.getElementById(href.slice(1)); if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth'}); } return; }
    if(!local(href)) return;
    e.preventDefault();
    var page=href.split(/[?#]/)[0].split('/').pop(), hash=(href.indexOf('#')>=0)?href.slice(href.indexOf('#')):'';
    if(page===window.__PAGE && hash && href.indexOf('?')<0){ var el=document.getElementById(hash.slice(1)); if(el){ el.scrollIntoView({behavior:'smooth'}); return; } }
    window.__go(href);
  },false);
  window.open=function(u){ if(local(u)) window.__go(u); else if(u) parent.open(u,'_blank'); return null; };
  window.addEventListener('load',function(){ if(window.__HASH){ var el=document.getElementById(window.__HASH.slice(1)); if(el) setTimeout(function(){ el.scrollIntoView(); },60); } });
})();
</script>"""

STAMP = datetime.date.today().strftime('%d/%m/%Y')
out = r"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Portail Banque des RH — prototype hors ligne</title>
<style>
:root{--green:#065145;--mint:#e9f1ea}
html,body{margin:0;height:100%;background:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
#app{position:fixed;inset:0;width:100%;height:100%;border:0;display:block}
#badge{position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:5;background:#fdf3e1;color:#8a5300;border:1px solid #f0dfb8;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;box-shadow:0 4px 14px rgba(6,81,69,.12);display:flex;gap:8px;align-items:center}
#badge button{all:unset;cursor:pointer;color:#065145;text-decoration:underline}
#menu{position:fixed;left:12px;bottom:calc(52px + env(safe-area-inset-bottom,0px));z-index:6;background:#fff;border:1px solid #dfe6e2;border-radius:14px;box-shadow:0 14px 40px rgba(6,81,69,.18);padding:8px;display:none;min-width:240px;max-height:70vh;overflow:auto}
#menu.open{display:block}
#menu a{display:block;padding:9px 12px;border-radius:9px;color:#233029;text-decoration:none;font-size:14px}
#menu a:hover,#menu a.on{background:var(--mint);color:var(--green);font-weight:600}
#menu p{margin:6px 12px 8px;font-size:11px;color:#5c6b64;line-height:1.4}
</style>
</head>
<body>
<div id="boot" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:#065145;font-size:16px;line-height:1.5">
  <div><b>Portail Banque des RH — prototype hors ligne</b><br>Chargement…<br><span style="font-size:13px;color:#5c6b64">Si cette page reste vide, le fichier est ouvert dans un aperçu qui n’exécute pas les scripts (par exemple l’app Fichiers de l’iPad ou un aperçu de messagerie). Ouvrez-le dans un navigateur : Safari, Chrome ou Edge.</span></div>
</div>
<noscript><div style="position:fixed;inset:0;background:#fff;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:#065145">Ce prototype a besoin de JavaScript. Ouvrez le fichier dans un navigateur (Safari, Chrome ou Edge).</div></noscript>
<iframe id="app" title="Portail Banque des RH"></iframe>
<div id="badge" role="status">Prototype hors ligne · données fictives <button type="button" id="mbtn" aria-expanded="false">Pages</button></div>
<nav id="menu" aria-label="Pages du prototype"></nav>
<script>
const PAGES=%DATA%;
window.__BRH_EP=%EP%;      /* relais de l'assistant (jeton de démonstration) */
window.__BRH_LOCAL=%LOCAL%; /* base documentaire : repli sans réseau */
const SHIM=%SHIM%;
const STAMP=%STAMP%;
const frame=document.getElementById('app'), menu=document.getElementById('menu');
function dec(b){ return new TextDecoder('utf-8').decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0))); }
function parse(h){ h=(h||'').replace(/^#\/?/,''); try{ h=decodeURIComponent(h); }catch(e){}
  let anchor='', qs=''; const ia=h.indexOf('#'); if(ia>=0){ anchor=h.slice(ia); h=h.slice(0,ia); }
  const iq=h.indexOf('?'); if(iq>=0){ qs=h.slice(iq); h=h.slice(0,iq); }
  h=h.replace(/^\.\//,'').split('/').pop(); if(!PAGES[h]) h='index.html';
  return {page:h, qs, anchor}; }
const cache={};
function load(){
  const r=parse(location.hash);
  const src=cache[r.page]||(cache[r.page]=dec(PAGES[r.page].h));
  const shim=SHIM.replace('%QS%',JSON.stringify(r.qs)).replace('%HASH%',JSON.stringify(r.anchor)).replace('%PAGE%',JSON.stringify(r.page));
  frame.srcdoc=src.replace('<head>','<head>'+shim);
  document.title=PAGES[r.page].t+' — Portail BRH (hors ligne)';
  menu.querySelectorAll('a').forEach(a=>a.classList.toggle('on',a.dataset.p===r.page));
}
function go(h){ const t='#/'+h; if(location.hash===t) load(); else location.hash=t; }
window.addEventListener('message',e=>{ if(e.data && e.data.brhGo) go(e.data.brhGo); });
window.addEventListener('hashchange',load);
menu.innerHTML='<p>Pages du prototype — version du '+STAMP+'.<br>Assistant BRH : en ligne via Mistral si le réseau est disponible, sinon réponses tirées de la base documentaire. Envois désactivés ; recherche SIRET en données de démonstration.</p>'+Object.keys(PAGES).map(k=>'<a href="#/'+k+'" data-p="'+k+'">'+PAGES[k].t+'</a>').join('');
menu.addEventListener('click',e=>{ if(e.target.closest('a')) toggle(false); });
const mb=document.getElementById('mbtn'); function toggle(o){ menu.classList.toggle('open',o); mb.setAttribute('aria-expanded',o); }
mb.addEventListener('click',()=>toggle(!menu.classList.contains('open')));
frame.addEventListener('load',()=>{ const b=document.getElementById('boot'); if(b) b.remove(); });
load();
</script>
</body>
</html>
"""
out = out.replace('%DATA%', json.dumps(data, ensure_ascii=False)).replace('%SHIM%', json.dumps(SHIM).replace('</', '<\\/')).replace('%STAMP%', json.dumps(STAMP)).replace('%EP%', json.dumps(RELAIS or 'hors-ligne-sans-relais')).replace('%LOCAL%', json.dumps(LOCAL, ensure_ascii=False).replace('</', '<\\/'))
open(OUT, 'w', encoding='utf-8').write(out)
print('sections KB', len(LOCAL), '| relais', 'oui' if RELAIS else 'non'); print('OK', OUT, round(len(out) / 1e6, 2), 'Mo', len(data), 'pages')
