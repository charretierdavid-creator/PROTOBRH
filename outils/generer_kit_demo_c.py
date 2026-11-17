"""Kit de démonstration HORS LIGNE : Portail BRH version C + cockpit BRH (console LM 3.0), en un seul fichier HTML.
Usage : python3 outils/generer_kit_demo_c.py <fichier de sortie.html>
  (assemble d'abord la version C : outils/assembler_variantes.py c → _site/protobrhc/)

Ce que fait le kit, sans serveur ni connexion :
  - le portail de la version C (accueil, diagnostic, Label BRH, audit, devis…) tourne dans un cadre ;
  - la console LM 3.0 (cockpitbrh/module/console3.*) tourne dans un second cadre, avec ses données fictives ;
  - chaque demande consentie du portail (appel à lead.php) est transmise À LA CONSOLE le temps de la démo :
    le lead apparaît chez l'expert BRH du département (règles lm3-regles.js : type, fusion, échéance, routage) ;
  - Julia : 2 questions préparées sur l'accueil, réponses rédigées à l'avance (aucun appel à Mistral) ;
    les autres questions reçoivent les réponses de repli du portail (« Mode démonstration »).
Aucune clé, aucun jeton, aucune donnée réelle : le fichier peut être envoyé tel quel (ne pas le committer, il se régénère)."""
import sys, os, re, json, base64, datetime, subprocess

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RACINE, '_site', 'kit-demo-portail-c-cockpit.html')
subprocess.run([sys.executable, os.path.join(RACINE, 'outils', 'assembler_variantes.py'), 'c'], check=True, stdout=subprocess.DEVNULL)
SRC = os.path.join(RACINE, '_site', 'protobrhc')
LM = os.path.join(RACINE, 'cockpitbrh', 'module')
lire = lambda *p: open(os.path.join(*p), encoding='utf-8').read()
b64 = lambda s: base64.b64encode(s.encode('utf-8')).decode()

# ---------------------------------------------------------------- PORTAIL (version C)
PAGES = [('index.html', 'Accueil'), ('diagnostic.html', 'Diagnostic RH'), ('label-brh.html', 'Label BRH'), ('audit-mutuelle.html', 'Audit mutuelle'),
         ('devis.html', 'Devis en ligne'), ('avantages-fiscaux.html', 'Avantages fiscaux'), ('ressources.html', 'Ressources'), ('newsletter.html', 'Newsletter')]
INLINE = ['variante.js', 'formules-amundi.js', 'offres-caa.js', 'conventions.js', 'prevoyance-ccn.js', 'entreprise-lookup.js', 'carrousel.js', 'label-brh.js', 'chatbot-widget.js']
DROP = ['feedback-widget.js']
# modules chargés dynamiquement par variante.js (version C) : servis depuis le kit au lieu du serveur
vc = lire(SRC, 'variante.js')
MODS = sorted(set(re.findall(r"'([\w-]+\.js)'", vc)) | {'ia-assist.js', 'ia-julia.js', 'prevoyance-idcc.js', 'sante-ccn.js', 'lm-parcours.js'})
MODCODE = {m: lire(SRC, m) for m in MODS}
CIBLE = "s.src = src + '?v=' + IAV;"
assert CIBLE in vc, 'variante.js (C) : chargeur de modules introuvable'
VARIANTE = vc.replace(CIBLE, "if (window.__MOD && window.__MOD[src]) s.text = window.__MOD[src]; else s.src = src + '?v=' + IAV;")

def data_uri(f, mime):
    return 'data:' + mime + ';base64,' + base64.b64encode(open(os.path.join(SRC, f), 'rb').read()).decode()
IMGS = {'img/' + f: data_uri('img/' + f, 'image/jpeg') for f in sorted(os.listdir(os.path.join(SRC, 'img'))) if f.endswith('.jpg')}
IMGS['logo-brh.png'] = data_uri('logo-brh.png', 'image/png')
PHOTO = data_uri('photo.jpeg', 'image/jpeg')
POLICES = lire(SRC, 'polices.css')

def transform(html):
    for js in INLINE:
        code = VARIANTE if js == 'variante.js' else lire(SRC, js)
        code = re.sub(r'</(script)', r'<\\/\1', code, flags=re.I)
        html = re.sub(r'<script src="' + re.escape(js) + r'(\?v=[\w.-]+)?"( defer)?></script>', lambda m: '<script>\n' + code + '\n</script>', html)
    css = lire(SRC, 'variante.css').replace('</', '<\\/')
    html = re.sub(r'<link rel="stylesheet" href="variante\.css(\?v=[\w.-]+)?">', lambda m: '<style>\n' + css + '\n</style>', html)
    for js in DROP:
        html = re.sub(r'<script src="' + re.escape(js) + r'(\?v=[\w.-]+)?"( defer)?></script>\n?', '', html)
    html = html.replace('src="photo.jpeg"', 'src="' + PHOTO + '"')
    for f, uri in IMGS.items():
        html = html.replace("'" + f + "'", "'" + uri + "'").replace('"' + f + '"', '"' + uri + '"')
    html = re.sub(r'<link rel="stylesheet" href="polices\.css(\?v=[\w.-]+)?">', lambda m: '<style>\n' + POLICES.replace('</', '<\\/') + '\n</style>', html)
    html = re.sub(r'<link (rel="(preconnect|stylesheet)" )?href="https://fonts\.(googleapis|gstatic)\.com[^>]*>\n?', '', html)   # polices embarquées (polices.css)
    html = re.sub(r"location\.href='([^']+)'", r"__go('\1')", html)
    html = html.replace('location.search', "(window.__QS||'')")
    return html

PORTAIL = {}
for f, t in PAGES:
    if os.path.exists(os.path.join(SRC, f)):
        PORTAIL[f] = {'t': t, 'h': b64(transform(lire(SRC, f)))}

# ---------------------------------------------------------------- COCKPIT (console LM 3.0)
c3 = lire(LM, 'console3.js')
FIN = "remplirPersonas(); sauver(); rendre();\n})();"
assert FIN in c3 and "'lm3-demo-2'" in c3, 'console3.js : points d’accroche du kit introuvables'
CROCHET = r"""remplirPersonas(); sauver(); rendre();
  /* ---- KIT HORS LIGNE : leads transmis par le portail le temps de la démonstration ---- */
  function montrer(l) { ui.onglet = 'leads'; ui.moi = l.proprietaire; ui.vue = l.statut; ui.sel = l.id; ui.panneau = null; ui.plus = false; ui.erreur = ''; remplirPersonas(); sauver(); rendre(); }
  window.LM3_KIT = {
    recevoir: function (d, rappel) {
      var r = L.recevoir(etat, d, now());
      /* demande plus complète que la première (ex. devis après une simple estimation) : on complète l'identité du lead */
      if (r.fusion) { var l0 = r.lead; if (/^Entreprise de /.test(l0.entreprise) && d.entreprise && !/^Entreprise de /.test(d.entreprise)) l0.entreprise = d.entreprise;
        ['ville', 'effectif', 'convention', 'estimation'].forEach(function (k) { if (!l0[k] && d[k]) l0[k] = d[k]; });
        if (d.estimation) l0.estimation = d.estimation;
        if (d.contact) ['nom', 'fonction', 'tel'].forEach(function (k) { if (d.contact[k] && (!l0.contact[k] || (k === 'nom' && d.contact.nom.indexOf(' ') > 0))) l0.contact[k] = d.contact[k]; }); }
      if (rappel) { var r2 = L.recevoir(etat, { cle: r.lead.cle, site: d.site, type: 'rappel', origine: 'rappel', solutions: [] }, now()); r.lead = r2.lead; }
      montrer(r.lead); toast(r.message); return { ok: true, id: r.lead.id, fusion: r.fusion, type: L.TYPES[r.lead.type].lib, expert: L.nomComplet(L.trouver(etat, r.lead.proprietaire)), entreprise: r.lead.entreprise };
    },
    noter: function (id, par, texte) { var l = L.lead(etat, id); if (!l) return false; l.historique.push({ date: L.isoComplet(now()), par: par, texte: texte }); sauver(); rendre(); return true; },
    montrer: function (id) { var l = L.lead(etat, id); if (l) montrer(l); },
    persona: function (email) { if (!L.trouver(etat, email)) return; ui.moi = email; ui.vue = 'nouveau'; ui.sel = null; ui.panneau = null; remplirPersonas(); sauver(); rendre(); },
    reset: function () { etat = DEMO.genererDemo(L, now()); ui.moi = 'claire.dubois@exemple-ca-anjoumaine.fr'; if (!L.trouver(etat, ui.moi)) ui.moi = etat.users[0].email;
      ui.onglet = 'leads'; ui.vue = 'nouveau'; ui.sel = null; ui.panneau = null; ui.plus = false; ui.erreur = ''; fermerFen(); sauver(); remplirPersonas(); rendre(); },
    users: function () { return etat.users.map(function (u) { return { email: u.email, nom: L.nomComplet(u), role: L.libRole(u) }; }); },
    /* ---- « Mon dossier » du dirigeant : vue tirée du lead, mise à jour par les actions de l'expert ---- */
    dossiers: function () { return etat.leads.slice().sort(function (a, b) { return a.visite < b.visite ? 1 : (a.visite > b.visite ? -1 : (a.id < b.id ? 1 : -1)); }).map(function (l) { return { id: l.id, entreprise: l.entreprise, statut: L.STATUTS[l.statut] }; }); },
    dossier: function (id) {
      var l = L.lead(etat, id); if (!l) return null;
      var u = L.trouver(etat, l.proprietaire), pris = l.statut !== 'nouveau' || (l.transmissions || []).length > 0, p = l.prochaine, etape = 1;
      if (pris) etape = 2;
      if (l.statut === 'en_cours' && p) etape = p.action === 'rdv' || p.action === 'rappeler' ? 3 : 4;
      if (l.statut === 'cloture') etape = 5;
      var sols = (l.solutions || []).map(function (k) { return { sante: 'Santé et prévoyance', epargne: 'Épargne salariale', retraite: 'Retraite collective', avantages: 'Avantages salariés' }[k] || k; });
      var tel = (l.contact && l.contact.tel) || '';
      return { reference: l.id, cree_le: l.visite, entreprise: l.entreprise, prenom: String((l.contact && l.contact.nom) || '').split(' ')[0], etape: etape,
        etapes: ['Demande reçue', 'Prise en charge', 'Échange avec votre interlocuteur', 'Proposition', l.cloture && l.cloture.motif !== 'signe' ? 'Dossier clôturé' : 'Finalisé'],
        caisse: 'Crédit Agricole Anjou Maine',
        interlocuteur: pris && u ? { nom: L.nomComplet(u), role: L.libRole(u), agence: u.agence || '', telephone: null, email: null } : null,
        rdv: p && (p.action === 'rdv' || p.action === 'rappeler') ? { le: p.date + ' 00:00:00', note: (p.action === 'rappeler' ? 'Appel de votre interlocuteur' : 'Rendez-vous') + (p.note ? ' · ' + p.note : '') } : null,
        solutions: sols, relances: !l.kitStop, rappel: !!l.rappel, telephone_connu: !!tel, clos: l.statut === 'cloture',
        emails: (l.emails || []).filter(function (e) { return e.a === 'dirigeant'; }).map(function (e) { return { le: e.date, objet: e.objet }; }).reverse(),
        universels: { propose: (l.solutions || []).some(function (k) { return k === 'epargne' || k === 'retraite'; }), ouvert: l.statut === 'en_cours', mobile: tel ? tel.replace(/\d(?=(?:\D*\d){2})/g, '•') : '', simule: true } };
    },
    agir: function (id, a, corps) {
      var l = L.lead(etat, id); if (!l) return { ok: false, error: 'Dossier introuvable.' };
      if (a === 'rappel') { l.rappel = true; if (corps.telephone && !l.contact.tel) l.contact.tel = corps.telephone;
        l.historique.push({ date: L.isoComplet(now()), par: 'dirigeant', texte: 'Le dirigeant demande à être rappelé depuis « Mon dossier »' + (corps.creneau ? ' (' + corps.creneau.toLowerCase() + ')' : '') + '.' });
        sauver(); rendre(); return { ok: true, message: 'C’est noté : votre demande de rappel est transmise à votre interlocuteur.' }; }
      if (a === 'stop') { l.kitStop = true; l.historique.push({ date: L.isoComplet(now()), par: 'dirigeant', texte: 'Le dirigeant ne souhaite plus recevoir de relances.' }); sauver(); rendre();
        return { ok: true, message: 'C’est noté : vous ne recevrez plus de relances. Votre dossier reste consultable ici.' }; }
      return { ok: false, error: 'Action indisponible dans la démonstration.' };
    }
  };
  try { parent.postMessage({ lm3Kit: 'pret' }, '*'); } catch (x) { /* rien */ }
})();"""
c3 = c3.replace("'lm3-demo-2'", "'lm3-kit-c'").replace(FIN, CROCHET)
ch = lire(LM, 'console3.html')
ch = re.sub(r'<link rel="preconnect"[^>]*>\n?', '', ch)
ch = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>', lambda m: '<style>\n' + POLICES + '\n</style>', ch)
for js, code in [('lm3-regles.js', lire(LM, 'lm3-regles.js')), ('lm3-demo.js', lire(LM, 'lm3-demo.js')), ('console3.js', c3)]:
    code = re.sub(r'</(script)', r'<\\/\1', code, flags=re.I)
    ch, n = re.subn(r'<script src="' + re.escape(js) + r'(\?v=[\w.-]+)?"></script>', lambda m: '<script>\n' + code + '\n</script>', ch)
    assert n == 1, js
ch = ch.replace('<head>', '<head><script>try{localStorage.getItem("x")}catch(e){}</script>', 1)
COCKPIT = b64(ch)

# ---------------------------------------------------------------- MON DOSSIER (vue du dirigeant)
sd = lire(LM, 'suivi-dossier.html')
for a, b in [
    ("  function appel(corps) {\n", "  function appel(corps) {\n    if (window.__KIT) return Promise.resolve(window.__KIT(corps));\n"),
    ("var q = new URLSearchParams(location.search), DEMO = q.get('demo') === '1';", "var q = new URLSearchParams(location.search), DEMO = q.get('demo') === '1' || !!window.__KIT;"),
    ("return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' à ' +", "return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + (d.getHours() + d.getMinutes() === 0 ? '' : ' à ' +"),
    ("d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }\n  function jour", "d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })); }\n  function jour"),
    ("if (v.ok) { location.href = v.url; return; }", "if (v.ok) { if (!v.url) { $('uniZone').innerHTML = '<p class=\"msg\">Code vérifié. Dans le service réel, votre espace Universels (Amundi / CA Titres) s’ouvre ici.</p>'; return; } location.href = v.url; return; }"),
    ("  else charger();\n})();", "  else charger();\n  window.__kitRecharger = charger;\n})();"),
    ('src="logo-brh.png"', 'src="' + IMGS['logo-brh.png'] + '"'),
    ("Démonstration : dossier fictif, aucun SMS ni e-mail envoyé.", "Démonstration : ce que voit le dirigeant avec le lien personnel reçu par e-mail. Données fictives, aucun SMS ni e-mail envoyé."),
]:
    assert a in sd, 'suivi-dossier.html : ' + a[:50]
    sd = sd.replace(a, b, 1)
sd = re.sub(r'<link rel="preconnect"[^>]*>\n?', '', sd)
sd = re.sub(r'<link (rel="stylesheet" )?href="https://fonts\.googleapis\.com[^>]*>\n?', '', sd)
sd = sd.replace('</head>', '<style>\n' + POLICES + '\n</style>\n</head>', 1)
SUIVI = b64(sd)
assert 'fonts.googleapis' not in ch

# ---------------------------------------------------------------- JULIA : 2 questions préparées
JULIA = [
    {'q': 'Par où commencer pour fidéliser mes 15 salariés ?', 'cles': ['fideli', 'commencer'],
     'reponse': "Avec 15 salariés, commencez par ce que vos équipes ressentent chaque mois, puis associez-les aux résultats.\n"
                "**1. Le quotidien** : titres-restaurant ou mutuelle mieux couverte. L’effet est immédiat et la charge reste maîtrisée.\n"
                "**2. La reconnaissance** : une prime de partage de la valeur, modulable selon l’ancienneté ou la présence, exonérée de cotisations sociales jusqu’à 3 000 € par salarié et par an (6 000 € dans certains cas, par exemple avec un accord d’intéressement).\n"
                "**3. Le long terme** : un plan d’épargne salariale, avec la formule Découverte pour démarrer simplement ; vous pouvez abonder l’épargne de vos salariés.\n"
                "Le diagnostic RH classe ces priorités en 3 minutes et chiffre le gain pour votre entreprise.",
     'points': ['Démarrer avec 1 ou 2 dispositifs, pas tout à la fois', 'Présenter le choix aux salariés renforce l’effet fidélisation',
                'Votre expert Banque des RH vérifie les conditions applicables à votre entreprise'],
     'liens': ['diagnostic', 'expert']},
    {'q': 'Comment donner du pouvoir d’achat sans alourdir mes charges ?', 'cles': ['pouvoir d', 'charge'],
     'reponse': "Un avantage salarié coûte moins cher qu’une hausse de salaire : un euro net de salaire coûte environ 1,81 € à l’employeur, alors que plusieurs dispositifs sont largement exonérés.\n"
                "**Titres-restaurant** : vous financez entre 50 % et 60 % du titre ; votre part est exonérée jusqu’à 7,32 € par titre en 2026.\n"
                "**Prime de partage de la valeur** : exonérée de cotisations sociales jusqu’à 3 000 € par salarié et par an, 6 000 € dans certains cas.\n"
                "**Épargne salariale et abondement** : l’entreprise complète l’épargne de ses salariés dans un cadre social et fiscal avantageux.\n"
                "Le devis en ligne compare chaque solution à une hausse de salaire équivalente, pour votre effectif.",
     'points': ['Montants issus du guide 2026 de la base documentaire du portail', 'Les conditions d’exonération sont vérifiées par votre expert Banque des RH'],
     'liens': ['devis', 'fiscal']}
]

# ---------------------------------------------------------------- SHIM des pages du portail
SHIM = r"""<script>
window.__QS=%QS%;window.__HASH=%HASH%;window.__PAGE=%PAGE%;window.BRH_PAGE=%PAGE%;
(function(){
  var P; try{ P=parent; P.__BRH_MODS; }catch(e){ P=null; }
  window.__MOD = P ? P.__BRH_MODS : null;
  ['sessionStorage','localStorage'].forEach(function(k){
    var ok=false; try{ var t=window[k]; t.setItem('__t','1'); t.removeItem('__t'); ok=true; }catch(e){}
    if(ok) return;
    var root=(P&&(P.__brhStore=P.__brhStore||{}))||{}; var d=root[k]=root[k]||{};
    var st={ getItem:function(n){ return Object.prototype.hasOwnProperty.call(d,n)?d[n]:null; }, setItem:function(n,v){ d[n]=String(v); },
      removeItem:function(n){ delete d[n]; }, clear:function(){ for(var n in d) delete d[n]; }, key:function(i){ return Object.keys(d)[i]||null; } };
    Object.defineProperty(st,'length',{get:function(){ return Object.keys(d).length; }});
    try{ Object.defineProperty(window,k,{configurable:true,get:function(){ return st; }}); }catch(e){}
  });
  window.BRH_CBOT_ENDPOINT='hors-ligne'; window.BRH_CBOT_LOCAL=[];
  /* serveur simulé : lead.php → console du kit ; ia.php → Julia préparée ; autres scripts PHP : indisponibles */
  var F=window.fetch?window.fetch.bind(window):null;
  function rep(o,code){ return new Response(JSON.stringify(o),{status:code||200,headers:{'Content-Type':'application/json'}}); }
  function attendre(ms,v){ return new Promise(function(r){ setTimeout(function(){ r(v); },ms); }); }
  window.fetch=function(u,o){
    var s=String(u&&u.url?u.url:u||''), corps=o&&typeof o.body==='string'?o.body:'';
    if(/^(\.\/)?lead\.php/.test(s)){ var b={}; try{ b=JSON.parse(corps||'{}'); }catch(e){}
      var r=null; try{ r=P.__kitLead(b,window.__PAGE); }catch(e){}
      return attendre(350,rep(r||{ok:true}));
    }
    if(/^(\.\/)?ia\.php/.test(s)){ var q=null; try{ q=JSON.parse(decodeURIComponent(escape(atob(corps)))); }catch(e){}
      var d=null; try{ d=P.__kitIA(q); }catch(e){}
      return attendre(d?1300:250,d?rep({ok:true,data:d}):rep({ok:false},503));
    }
    if(/^(\.\/)?[\w-]+\.php/.test(s)) return attendre(150,rep({ok:false,erreur:'hors ligne'},503));
    return F?F(u,o):Promise.reject(new Error('hors ligne'));
  };
  window.__go=function(h){ try{ P.__kitGo(String(h)); }catch(e){} };
  function local(href){ return href && !/^(https?:|mailto:|tel:|javascript:|data:|#)/i.test(href) && /\.html(\?|#|$)/i.test(href); }
  document.addEventListener('click',function(e){
    var a=e.target.closest && e.target.closest('a[href]'); if(!a || e.defaultPrevented) return;
    var href=a.getAttribute('href');
    if(href && href.charAt(0)==='#' && href.length>1){ var t=document.getElementById(href.slice(1)); if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth'}); } return; }
    if(/^https?:/i.test(href||'')){ e.preventDefault(); try{ P.__kitExterne(href); }catch(x){} return; }
    if(!local(href)) return;
    e.preventDefault();
    var page=href.split(/[?#]/)[0].split('/').pop(), hash=(href.indexOf('#')>=0)?href.slice(href.indexOf('#')):'';
    if(page===window.__PAGE && hash && href.indexOf('?')<0){ var el=document.getElementById(hash.slice(1)); if(el){ el.scrollIntoView({behavior:'smooth'}); return; } }
    window.__go(href);
  },false);
  window.open=function(u){ if(local(u)) window.__go(u); else if(u){ try{ P.__kitExterne(u); }catch(x){} } return null; };
  window.addEventListener('load',function(){
    if(window.__HASH){ var el=document.getElementById(window.__HASH.slice(1)); if(el) setTimeout(function(){ el.scrollIntoView(); },60); }
    try{ P.__kitPageChargee(window.__PAGE, window); }catch(e){}
  });
})();
</script>"""

STAMP = datetime.date.today().strftime('%d/%m/%Y')
LOGO = IMGS['logo-brh.png']

SHELL = r"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Portail Banque des RH · kit de démonstration</title>
<style>
%POLICES%
:root{--pin:#065145;--teal:#016265;--lime:#8FB822;--menthe:#E3EFEA;--band:#006A4E;--ink:#1d2b28;--slate:#5b6b66;--line:#dfe8e4;--fh:'Poppins',system-ui,-apple-system,'Segoe UI',sans-serif;--fb:system-ui,-apple-system,'Segoe UI',sans-serif}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#f3f7f5;color:var(--ink);font:14px/1.45 var(--fb);overflow:hidden}
button,select{font:inherit}
.top{position:fixed;inset:0 0 auto 0;height:72px;background:var(--pin);color:#fff;display:flex;align-items:center;gap:20px;padding:0 18px;z-index:20;box-shadow:0 2px 10px rgba(6,81,69,.25)}
.brand{display:flex;align-items:center;gap:10px;min-width:0;flex:0 0 auto}
.brand img{height:34px;width:auto;background:#fff;border-radius:6px;padding:3px 6px}
.brand b{font:600 15px/1.15 var(--fh);white-space:nowrap}
.brand small{display:block;font:500 11.5px/1.2 var(--fb);color:#cfe3dc;white-space:nowrap}
.vues{display:flex;gap:8px;margin:0 auto}
.vues button{all:unset;cursor:pointer;position:relative;display:flex;align-items:center;gap:10px;padding:8px 16px 8px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.25);color:#fff;min-width:0}
.vues button:hover{background:rgba(255,255,255,.1)}
.vues button[aria-selected="true"]{background:#fff;border-color:#fff;color:var(--pin)}
.vues button:focus-visible{outline:3px solid var(--lime);outline-offset:2px}
.vues svg{width:22px;height:22px;flex:0 0 auto}
.vues b{display:block;font:600 14px/1.15 var(--fh);letter-spacing:.02em;white-space:nowrap}
.vues small{display:block;font:500 11.5px/1.25 var(--fb);opacity:.8;white-space:nowrap}
.badge{position:absolute;top:-7px;right:-7px;min-width:22px;height:22px;border-radius:11px;background:var(--lime);color:var(--pin);font:700 12px/22px var(--fb);text-align:center;padding:0 6px;display:none;box-shadow:0 2px 6px rgba(0,0,0,.2)}
.badge.on{display:block}
.stage{position:fixed;top:72px;left:0;right:0;bottom:30px}
.pane{position:absolute;inset:0;display:none;flex-direction:column;background:#fff}
.pane.on{display:flex}
.pane iframe{flex:1;width:100%;border:0;display:block;background:#fff}
.cap{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 18px;background:var(--menthe);border-bottom:1px solid var(--line);font-size:13px;color:var(--slate)}
.cap b{font:600 13px var(--fh);color:var(--pin)}
.cap select{padding:6px 10px;border:1px solid #cfe0d8;border-radius:8px;background:#fff;color:var(--ink);max-width:100%}
.foot{position:fixed;left:0;right:0;bottom:0;height:30px;display:flex;align-items:center;gap:14px;padding:0 16px;background:#fff;border-top:1px solid var(--line);font-size:12px;color:var(--slate);z-index:15}
.foot span{white-space:nowrap}.foot b{color:var(--pin)}.foot .sp{flex:1}
.foot .dot{width:7px;height:7px;border-radius:50%;background:var(--lime);display:inline-block;margin-right:6px}
.notif{position:fixed;right:18px;bottom:44px;z-index:30;width:360px;max-width:calc(100vw - 36px);background:#fff;border-radius:12px;border:1px solid var(--line);border-left:5px solid var(--lime);box-shadow:0 16px 40px rgba(6,81,69,.22);padding:14px 16px;transform:translateY(16px);opacity:0;pointer-events:none;transition:.25s}
.notif.on{transform:none;opacity:1;pointer-events:auto}
.notif .k{font:700 10.5px var(--fb);letter-spacing:.05em;text-transform:uppercase;color:var(--teal)}
.notif b{display:block;font:600 15px/1.3 var(--fh);color:var(--pin);margin:3px 0 2px}
.notif p{margin:0 0 10px;color:var(--slate);font-size:13px}
.notif .r{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.notif button{all:unset;cursor:pointer;padding:7px 12px;border-radius:8px;font:600 12.5px var(--fh);color:var(--pin)}
.notif button.p{background:var(--pin);color:#fff}
.boot{position:fixed;inset:0;z-index:50;background:#fff;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;color:var(--pin)}
.boot small{display:block;margin-top:8px;color:var(--slate);max-width:520px}
@media(max-width:1240px){.brand div{display:none}.foot .x{display:none}}
@media(max-width:900px){.vues small{display:none}.vues button{padding:8px 12px}}
@media(max-width:640px){.vues b{font-size:12px;white-space:normal}.vues svg{display:none}.brand{display:none}}
</style>
</head>
<body>
<div class="boot" id="boot"><div><b style="font:600 18px var(--fh)">Portail Banque des RH · kit de démonstration</b><br>Chargement…
<small>Si cette page reste vide, le fichier est ouvert dans un aperçu qui n’exécute pas les scripts (app Fichiers de l’iPad, aperçu de messagerie). Ouvrez-le dans Safari, Chrome ou Edge.</small></div></div>
<header class="top">
  <div class="brand"><img src="%LOGO%" alt="Banque des RH"><div><b>Portail Banque des RH</b><small>Kit de démonstration</small></div></div>
  <nav class="vues" role="tablist" aria-label="Vues de la démonstration">
    <button type="button" role="tab" data-vue="portail" aria-selected="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/></svg><span><b>PORTAIL BRH</b><small>Prospects et clients CA</small></span></button>
    <button type="button" role="tab" data-vue="cockpit" aria-selected="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/></svg><span><b>CONSOLE EXPERT BRH</b><small>Gestion des leads</small></span><span class="badge" id="badge" aria-label="leads reçus pendant la démonstration"></span></button>
    <button type="button" role="tab" data-vue="suivi" aria-selected="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/></svg><span><b>SUIVI DOSSIER</b><small>Ce que voit le prospect ou client</small></span></button>
  </nav>
</header>
<main class="stage">
  <section class="pane on" id="p-portail" aria-label="Portail BRH"><iframe id="f-portail" title="Portail Banque des RH, version C"></iframe></section>
  <section class="pane" id="p-cockpit" aria-label="Console expert BRH"><iframe id="f-cockpit" title="Console de l’expert BRH"></iframe></section>
  <section class="pane" id="p-suivi" aria-label="Suivi dossier"><div class="cap"><label for="dossier"><b>Dossier affiché</b></label><select id="dossier"></select><span>Le dirigeant ouvre cette page avec le lien personnel reçu par e-mail. Elle suit en direct les actions de l’expert dans la console.</span></div><iframe id="f-suivi" title="Mon dossier, vue du dirigeant"></iframe></section>
</main>
<div class="notif" id="notif" role="status" aria-live="polite"><div class="k" id="n-k"></div><b id="n-t"></b><p id="n-p"></p><div class="r"><button type="button" id="n-x">Fermer</button><button type="button" id="n-suivi">Suivi dossier</button><button type="button" class="p" id="n-voir">Voir dans la console</button></div></div>
<footer class="foot"><span><span class="dot"></span><b>Démonstration hors ligne</b> · données fictives, rien n’est envoyé</span><span class="x">Julia : réponses préparées · l’IA éclaire, l’expert BRH conseille et engage</span><span class="sp"></span><span>Version du %STAMP%</span></footer>
<script>
(function(){
'use strict';
var PAGES=%PAGES%, COCKPIT=%COCKPIT%, SUIVI=%SUIVI%, SHIM=%SHIM%, JULIA=%JULIA%;
window.__BRH_MODS=%MODS%;
var $=function(id){ return document.getElementById(id); };
function dec(b){ return new TextDecoder('utf-8').decode(Uint8Array.from(atob(b),function(c){ return c.charCodeAt(0); })); }
var fp=$('f-portail'), fc=$('f-cockpit'), fs=$('f-suivi'), cache={}, pageCourante='index.html', attente=null, recus=0, dernier=null, vueCourante='portail';
function K(){ try{ return fc.contentWindow && fc.contentWindow.LM3_KIT; }catch(e){ return null; } }

/* ---------------- portail ---------------- */
function parse(h){ h=String(h||'').replace(/^#\/?/,''); var an='',qs='',i=h.indexOf('#'); if(i>=0){ an=h.slice(i); h=h.slice(0,i); }
  i=h.indexOf('?'); if(i>=0){ qs=h.slice(i); h=h.slice(0,i); } h=h.replace(/^\.\//,'').split('/').pop(); if(!PAGES[h]) h='index.html'; return {page:h,qs:qs,anchor:an}; }
function ouvrirPage(h, ensuite){
  var r=parse(h), src=cache[r.page]||(cache[r.page]=dec(PAGES[r.page].h));
  var shim=SHIM.replace('%QS%',JSON.stringify(r.qs)).replace('%HASH%',JSON.stringify(r.anchor)).split('%PAGE%').join(JSON.stringify(r.page));
  pageCourante=r.page; attente=ensuite||null;
  fp.srcdoc=src.replace('<head>','<head>'+shim);
}
window.__kitGo=function(h){ h=String(h||'');
  if(/suivi-dossier\.html/.test(h)){ var m=/[?&]d=([^&#]+)/.exec(h); remplirDossiers(m?decodeURIComponent(m[1]):dernier); vue('suivi'); return; }
  ouvrirPage(h); };
window.__kitExterne=function(u){ notifier('Lien externe', 'Hors démonstration', 'Ce lien ouvre un site extérieur au portail : '+u.replace(/^https?:\/\//,'').split('/')[0]+'.', null); };
window.__kitPageChargee=function(page, w){
  var b=$('boot'); if(b) b.remove();
  if(page==='index.html') julia2(w);
  if(attente){ var f=attente; attente=null; setTimeout(function(){ f(w); },120); }
};
/* Julia : les 2 questions préparées en exemples sur l'accueil */
function julia2(w){
  var n=0, t=setInterval(function(){ var z=w.document.getElementById('julia-ex'); n++;
    if(z){ clearInterval(t); z.__ex=JULIA.map(function(x){ return {q:x.q,action:''}; });
      z.innerHTML=JULIA.map(function(x,i){ return '<button type="button" class="julia-chip" data-i="'+i+'">'+x.q.replace(/[&<>]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; })+'</button>'; }).join(''); }
    else if(n>60) clearInterval(t); },100);
}
function norm(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[’']/g,' ').toLowerCase(); }
window.__kitIA=function(req){
  if(!req || req.action!=='julia' || !req.ctx) return null;
  var q=norm(req.ctx.question);
  for(var i=0;i<JULIA.length;i++){ var j=JULIA[i]; if(norm(j.q)===q || j.cles.every(function(c){ return q.indexOf(norm(c))>=0; })) return {reponse:j.reponse, points:j.points, liens:j.liens, chiffres:true}; }
  return null;
};

/* ---------------- lien portail → console ---------------- */
var SOL_AX={protection:'sante',partageValeur:'epargne',pouvoirAchat:'avantages',retraite:'retraite'};
function prem(){ for(var i=0;i<arguments.length;i++){ var v=arguments[i]; if(v!==undefined && v!==null && String(v).trim()!=='') return v; } return ''; }
function versLM3(b){
  var t=String(b.type||''), e=b.entreprise||{}, co=b.company||{}, c=b.contact||{}, rh=b.rh||{};
  var type = /^devis/.test(t) ? 'devis' : (t==='rappel_expert'||t==='contact') ? 'rappel' : (t==='newsletter' ? null : 'simulation');
  if(!type) return null;
  var origine = /^label/.test(t) ? 'label' : type==='devis' ? 'devis' : type==='rappel' ? 'rappel' : 'diagnostic';
  var email=String(prem(c.email,'')).trim().toLowerCase();
  var nom=prem([c.prenom,c.nom].filter(Boolean).join(' '), c.name, email ? email.split('@')[0].replace(/[._-]+/g,' ').replace(/(^| )(\S)/g,function(m,a,l){ return a+l.toUpperCase(); }) : '', 'Dirigeant (nom à préciser)');
  var eff=parseInt(prem(e.effectif, co.employeeCount, rh.salaries_concernes, b.effectif, 0),10)||0;
  var cp=String(prem(e.code_postal,'')), dep=String(prem(e.departement, co.departement, cp.slice(0,2), b.routage&&b.routage.departement, '49')).slice(0,2);
  var secteur=prem(e.secteur, co.sector, '');
  var ent=prem(e.raison_sociale, c.companyName, b.companyName, '');
  if(!ent) ent='Entreprise de '+(eff||'?')+' salariés'+(secteur?' ('+String(secteur).toLowerCase()+')':'');
  var sols=[];
  if(Array.isArray(b.solutions)) sols=b.solutions.slice();
  else if(Array.isArray(b.panier)) sols=b.panier.map(function(p){ return p.solution; });
  else if(b.priorities){ for(var k in b.priorities) if((+b.priorities[k]||0)>1 && SOL_AX[k]) sols.push(SOL_AX[k]); }
  sols=sols.filter(function(s,i,a){ return ['sante','epargne','retraite','avantages'].indexOf(s)>=0 && a.indexOf(s)===i; });
  var est=prem(b.estimation_totale, b.fiscalGain&&b.fiscalGain.total, '');
  var cl=String(prem(e.client_declare, c.client_declare, b.client_declare, '')); cl = cl==='oui'?'declare':cl==='non'?'non_declare':'a_verifier';
  return { d:{ cle: email||('kit-'+norm(ent)), site:'C', type:type, origine:origine, entreprise:ent, effectif:eff, ville:prem(e.ville,''), dep:dep,
               convention:prem(e.idcc, co.idcc, ''), solutions:sols, estimation: est===''?null:Math.round(+est)||null,
               contact:{ nom:nom, fonction:prem(c.fonction,'Dirigeant'), tel:prem(c.telephone,c.phone,''), email:email }, client:cl },
           rappel: !!(c.rappel_expert || t==='diagnostic_contact') };
}
window.__kitLead=function(b, page){
  var k=K(); if(!b || !k) return {ok:true};
  if(b.action==='argumentaire'){ var a=b.argumentaire||{}, x=[].concat(a.synthese||[]).slice(0,3).join(' ; ');
    k.noter(b.id,'Julia (IA)','Argumentaire de vente préparé pour l’expert'+(a.angle?' : '+a.angle:'')+(x?' — '+x:'')+'.'); return {ok:true}; }
  if(b.action) return {ok:true};
  if(b.type==='newsletter'){ notifier('Newsletter', 'Inscription enregistrée', 'Une inscription à la newsletter ne crée pas de lead dans la console.', null); return {ok:true}; }
  var m=versLM3(b); if(!m) return {ok:true};
  var r=k.recevoir(m.d, m.rappel);
  dernier=r.id; if(vueCourante!=='cockpit'){ recus++; var bd=$('badge'); bd.textContent=recus; bd.classList.add('on'); }
  notifier(r.fusion?'Lead mis à jour dans la console':'Nouveau lead transmis à la console', r.entreprise, (r.fusion?'Rattaché au lead existant · ':'')+r.type+' · attribué à '+r.expert+' (Caisse régionale Anjou Maine, démonstration).', r.id);
  remplirDossiers(r.id);
  var lien='suivi-dossier.html?d='+encodeURIComponent(r.id);
  return {ok:true, id:r.id, dossier:r.id, reference:r.id, jeton:'kit-demo', suivi:lien, suivi_email:lien};
};
var tn=null;
function notifier(k,t,p,id){ $('n-k').textContent=k; $('n-t').textContent=t; $('n-p').textContent=p; $('n-voir').style.display=id?'':'none'; $('n-suivi').style.display=id?'':'none';
  $('notif').dataset.id=id||''; $('notif').classList.add('on'); clearTimeout(tn); tn=setTimeout(function(){ $('notif').classList.remove('on'); },9000); }
$('n-x').addEventListener('click',function(){ $('notif').classList.remove('on'); });
$('n-voir').addEventListener('click',function(){ var id=$('notif').dataset.id; $('notif').classList.remove('on'); vue('cockpit'); var k=K(); if(k && id) k.montrer(id); });
$('n-suivi').addEventListener('click',function(){ var id=$('notif').dataset.id; $('notif').classList.remove('on'); remplirDossiers(id); vue('suivi'); });

/* ---------------- suivi dossier (vue du dirigeant) ---------------- */
function remplirDossiers(choix){
  var k=K(); if(!k) return; var sel=$('dossier'), avant=choix||sel.value||dernier, ds=k.dossiers();
  if(!ds.some(function(d){ return d.id===avant; })) avant=ds.length?ds[0].id:'';
  sel.innerHTML=ds.map(function(d){ return '<option value="'+d.id+'"'+(d.id===avant?' selected':'')+'>'+d.entreprise.replace(/[&<>]/g,'')+' · '+d.id+' · '+d.statut+'</option>'; }).join('');
}
function chargerSuivi(){ try{ var w=fs.contentWindow; if(w && w.__kitRecharger) w.__kitRecharger(); }catch(e){} }
function preparerSuivi(){
  var src=dec(SUIVI);
  fs.srcdoc=src.replace('<head>','<head><script>window.__KIT=function(c){ try{ var P=parent, id=P.document.getElementById("dossier").value, k=P.document.getElementById("f-cockpit").contentWindow.LM3_KIT; if(!c){ var d=k.dossier(id); return d?{ok:true,dossier:d}:{ok:false,error:"Choisissez un dossier."}; } return P.__kitSuiviAction(id,c); }catch(e){ return {ok:false,error:"Dossier indisponible."}; } };<\/script>');
}
var otp=null;
window.__kitSuiviAction=function(id,c){
  var a=c.action;
  if(a==='universels_code'){ otp={code:String(Math.floor(100000+Math.random()*900000)),essais:0,exp:Date.now()+600000}; var d=K().dossier(id); return {ok:true,masque:(d&&d.universels.mobile)||'06 •• •• •• ••',code_demo:otp.code}; }
  if(a==='universels_verifier'){ if(!otp||Date.now()>otp.exp) return {ok:false,error:'Code expiré : demandez un nouveau code.'};
    if(otp.essais>=3) return {ok:false,error:'Trois essais au plus : demandez un nouveau code.'};
    if(String(c.code||'').replace(/\D/g,'')!==otp.code){ otp.essais++; return {ok:false,error:'Code incorrect ('+(3-otp.essais)+' essai(s) restant(s)).'}; }
    return {ok:true,url:''}; }
  return K().agir(id,a,c);
};
$('dossier').addEventListener('change',chargerSuivi);

/* ---------------- vues ---------------- */
function vue(v){
  vueCourante=v;
  document.querySelectorAll('.vues button').forEach(function(b){ b.setAttribute('aria-selected', String(b.dataset.vue===v)); });
  ['portail','cockpit','suivi'].forEach(function(x){ $('p-'+x).classList.toggle('on', x===v); });
  if(v==='cockpit'){ recus=0; $('badge').classList.remove('on'); }
  if(v==='suivi'){ remplirDossiers(); chargerSuivi(); }
}
document.querySelector('.vues').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b) vue(b.dataset.vue); });

/* ---------------- démarrage ---------------- */
fc.srcdoc=dec(COCKPIT);
fc.addEventListener('load',function(){ try{ var k=K(); if(k && !sessionStorage.getItem('kitInit')){ k.reset(); sessionStorage.setItem('kitInit','1'); } }catch(x){} remplirDossiers(); preparerSuivi(); },{once:true});
ouvrirPage('index.html');
setTimeout(function(){ var b=$('boot'); if(b) b.remove(); },6000);
})();
</script>
</body>
</html>
"""

def js(o): return json.dumps(o, ensure_ascii=False).replace('</', '<\\/')
out = (SHELL.replace('%POLICES%', POLICES.replace('</', '<\\/'))
            .replace('%LOGO%', LOGO).replace('%STAMP%', STAMP)
            .replace('%PAGES%', js(PORTAIL)).replace('%COCKPIT%', js(COCKPIT)).replace('%SUIVI%', js(SUIVI)).replace('%SHIM%', js(SHIM))
            .replace('%JULIA%', js(JULIA)).replace('%MODS%', js(MODCODE)))
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(out)
print('OK', OUT, round(len(out) / 1e6, 2), 'Mo ·', len(PORTAIL), 'pages ·', len(MODCODE), 'modules C ·', len(JULIA), 'questions Julia')
