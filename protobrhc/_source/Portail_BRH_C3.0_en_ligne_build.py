#!/usr/bin/env python3
"""Version C 3.0 — la démo V4.1 (sites A et B) mise en ligne sur protobrhc.monsitedetest.com (26/11/2026, demande de David CHARRETIER).

Usage : python3 Portail_BRH_C3.0_en_ligne_build.py <demo_v4.1_julia_B.html> <protobrhc/index.html>
Chaîne complète : v2 → v3_precautions_build.py → v4_parcours_build.py → v4.1_julia_B_build.py → ce script.

La page de démo devient l'accueil de protobrhc. Mêmes écrans, mêmes parcours A et B ; seuls changent :
  1. le réseau : plus de simulation. Les pages appellent les vrais services du serveur protobrhc, qui sont
     ia.php (Julia, relais Mistral), entreprise.php (SIRET réel, API Recherche d'entreprises) et lead.php (demandes
     réellement enregistrées, avec le parcours A ou B), ainsi que l'API publique des entreprises lue par entreprise-public.js ;
  2. les liens externes s'ouvrent dans un nouvel onglet (ils étaient neutralisés pendant les tests) ;
  3. l'aperçu « E-mail reçu » simulé est retiré (aucun e-mail n'est envoyé par le prototype) ; « Mon dossier BRH » reste,
     avec des textes qui ne promettent plus de lien par e-mail ;
  4. les mentions « démo hors ligne / réponses simulées » deviennent « prototype en ligne » ; les précautions d'usage
     (bandeau et encadrés « données fictives, non contractuelles », validés le 24/11) sont conservées.
PAGES et __BRH_MOD restent identiques octet pour octet (contrôlé). Le SHIM change : c'est lui qui simulait le réseau.
"""
import sys, json, hashlib

src_path, out_path = sys.argv[1], sys.argv[2]
s = open(src_path, encoding='utf-8').read()

def ligne(t, debut):
    L = [l for l in t.split('\n') if l.startswith(debut)]
    assert len(L) == 1, debut
    return L[0]
def h(t): return hashlib.sha256(t.encode()).hexdigest()
avant = [h(ligne(s, 'const PAGES=')), h(ligne(s, 'window.__BRH_MOD='))]

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, 'remplacement attendu %d fois, trouvé %d fois : %s' % (n, c, a[:90])
    s = s.replace(a, b)

def chaine_js(prefixe, f):
    """modifie une chaîne JS encodée en JSON : const X='<script>'+"..."+'<\\/script>' ou const SHIM="..." """
    global s
    i = s.index(prefixe) + len(prefixe)
    txt, fin = json.JSONDecoder().raw_decode(s[i:])
    nouveau = f(txt)
    assert nouveau != txt, prefixe
    s = s[:i] + json.dumps(nouveau).replace('</', '<\\/') + s[i + fin:]   # jamais « </script » en clair dans le script du shell

def remplacer(txt, a, b, n=1):
    c = txt.count(a)
    assert c == n, 'attendu %d, trouvé %d : %s' % (n, c, a[:90])
    return txt.replace(a, b)

# ---------- 1. SHIM : le réseau réel ----------
def shim(t):
    debut = t.index('  /* démo hors ligne : aucun appel réseau.')
    fin = t.index("  window.__go=")
    t = t[:debut] + (
        "  /* C 3.0 en ligne : appels réels aux services du serveur protobrhc (ia.php, entreprise.php, lead.php) et à l'API publique\n"
        "     des entreprises. Chaque demande transmise à lead.php indique le parcours suivi (A : 4 besoins, B : Label RH). */\n"
        "  var natif=window.fetch;\n"
        "  window.fetch=function(u,o){\n"
        "    try{\n"
        "      var url=String(u&&u.url||u||'');\n"
        "      if(/(^|\\/)lead\\.php/.test(url) && o && typeof o.body==='string' && o.body.charAt(0)==='{'){\n"
        "        var b=JSON.parse(o.body), S=window.__SITE||{};\n"
        "        if(!b.parcours_ab) b.parcours_ab=S.id||'';\n"
        "        if(!b.page) b.page=(S.id?S.id+'/':'')+(window.__REAL_PAGE||window.__PAGE||'');\n"
        "        o=Object.assign({},o,{body:JSON.stringify(b)});\n"
        "      }\n"
        "    }catch(e){}\n"
        "    return natif.call(window,u,o);\n"
        "  };\n") + t[fin:]
    t = remplacer(t, "    if(href && /^https?:/i.test(href)){ e.preventDefault(); return; }   /* liens externes neutralisés pendant le test */\n",
                  "    if(href && /^https?:/i.test(href)){ a.setAttribute('target','_blank'); a.setAttribute('rel','noopener'); return; }   /* liens externes : nouvel onglet */\n")
    t = remplacer(t, "  window.open=function(u){ if(local(u)) window.__go(u); return null; };",
                  "  var ouvrirNatif=window.open;\n  window.open=function(u){ if(local(u)){ window.__go(u); return null; } return ouvrirNatif.call(window,u,'_blank','noopener'); };")
    return t
chaine_js('const SHIM=', shim)

# ---------- 2. bandeau, titres, chargement ----------
assert s.startswith('<!DOCTYPE html>\n')
s = s.replace('<!DOCTYPE html>\n', '<!DOCTYPE html>\n<!-- Version C 3.0 — 26/11/2026 · démo V4.1 (parcours A et B) en ligne : Mistral, SIRET réel, lead.php ; fichier produit par _source/construire.sh, ne pas modifier à la main -->\n', 1)
rep('<title>Portail Banque des RH — démo V4.1 (sites A et B)</title>', '<title>Portail Banque des RH — prototype (parcours A et B)</title>')
rep('<span class="bt"><b>Portail Banque des RH</b><span>Démo du parcours dirigeant</span></span>',
    '<span class="bt"><b>Portail Banque des RH</b><span>Prototype du parcours dirigeant</span></span>')
rep('<span id="tag" title="Démonstration hors ligne : données fictives, aucun envoi, réponses de Julia simulées (site B : Julia en bas à droite)">Démo · données fictives</span>',
    '<span id="tag" title="Prototype en ligne : tarifs et estimations fictifs, non contractuels ; vos demandes sont transmises avec votre accord ; Julia répond avec l’IA (Mistral)">Prototype · données fictives</span>')
rep('<div id="boot"><div><b>Portail Banque des RH — démo</b><br>Chargement…<br><span style="font-size:13px;color:#5c6b64">Si cette page reste vide, ouvrez le fichier dans un navigateur : Chrome, Edge ou Safari.</span></div></div>',
    '<div id="boot"><div><b>Portail Banque des RH</b><br>Chargement…<br><span style="font-size:13px;color:#5c6b64">Si cette page reste vide, rechargez-la ou utilisez un navigateur récent : Chrome, Edge ou Safari.</span></div></div>')
rep('Cette démo a besoin de JavaScript. Ouvrez le fichier dans un navigateur (Chrome, Edge ou Safari).',
    'Ce site a besoin de JavaScript. Activez-le ou utilisez un navigateur récent (Chrome, Edge ou Safari).')
rep("+' — Portail Banque des RH (démo)';", "+' — Portail Banque des RH (prototype)';")
rep('const STAMP="26/11/2026 · V4.1 parcours simplifiés, Julia flottante sur B · sous-sites A et B";',
    'const STAMP="26/11/2026 · C 3.0 en ligne (démo V4.1) · parcours A et B";')
# aperçu de l'e-mail simulé : retiré (le code reste, jamais affiché)
rep('<div id="prec" role="note"', '<style>#mail,#boite{display:none!important}</style>\n<div id="prec" role="note"')
rep("  if(e.data && e.data.brhMail){", "  if(e.data && e.data.brhMail && false){")

# ---------- 3. Julia flottante (site B) : sous-titre ----------
chaine_js("const JFL_TAG='<script>'+", lambda t: remplacer(t, 'Démonstration · réponses préparées', 'Assistante IA · réponses indicatives'))

# ---------- 4. Mon dossier BRH : plus de lien promis par e-mail ----------
def dossier(t):
    t = remplacer(t, "', puis laissez votre e-mail : vous recevrez le lien de votre dossier pour reprendre à tout moment.'",
                  "', puis laissez votre e-mail : vos réponses sont gardées dans votre dossier pour reprendre votre parcours.'")
    t = remplacer(t, '<span>Lien envoyé à <b>', '<span>E-mail <b>')
    t = remplacer(t, 'Laissez votre e-mail : vous recevrez un lien pour retrouver vos réponses et reprendre votre parcours plus tard, sur cet appareil ou un autre.',
                  'Laissez votre e-mail : vos réponses sont gardées dans votre dossier et un expert de votre Caisse régionale peut vous recontacter.')
    t = remplacer(t, '>Recevoir mon lien</button>', '>Sauvegarder mon dossier</button>')
    t = remplacer(t, 'conserve mes réponses dans mon dossier et m’envoie ce lien par e-mail.', 'conserve mes réponses dans mon dossier et me recontacte à ce sujet.')
    return t
chaine_js("const DOSSIER_TAG='<script>'+", dossier)

apres = [h(ligne(s, 'const PAGES=')), h(ligne(s, 'window.__BRH_MOD='))]
assert apres == avant, 'PAGES ou __BRH_MOD modifiés : interdit'
assert 'démo hors ligne : aucun appel réseau' not in s
assert s.lower().count('</script') == open(src_path, encoding='utf-8').read().lower().count('</script'), 'balise de fin de script ajoutée : interdit'

open(out_path, 'w', encoding='utf-8').write(s)
print('écrit', out_path, len(s.encode('utf-8')), 'octets')
