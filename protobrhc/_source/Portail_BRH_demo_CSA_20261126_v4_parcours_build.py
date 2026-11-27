#!/usr/bin/env python3
"""Démo hors ligne Portail BRH — V4 « parcours simplifiés » (26/11/2026, demande de David CHARRETIER).

Usage : python3 Portail_BRH_demo_CSA_20261126_v4_parcours_build.py <demo_v3_precautions.html> <sortie_v4.html>
(la V3 se reconstruit à partir de la v2 : python3 Portail_BRH_demo_CSA_20261124_v3_precautions_build.py <v2> <v3>)

Part de la démo V3 et apporte :
  1. précautions d'usage : un seul encadré en bas de chaque écran (precautions_demo_v4.js remplace precautions_demo.js),
     bandeau fixe conservé ;
  2. menu des sites A et B limité à 4 phases : Nos solutions · Évaluez vos besoins RH · Allons plus loin ensemble ·
     En savoir plus (Ressources, qui donne accès aux avantages fiscaux et à la newsletter) ; le bandeau de démo
     affiche la phase en cours avec les mêmes termes ;
  3. parcours_v4_demo.js injecté dans chaque page : diagnostic sans SIREN / SIRET, intitulés 3-4-5, Label RH aligné,
     devis « avantages salariés seuls » réduit au minimum, titres-restaurant et cartes cadeaux seulement,
     étape 6 sans colonne Estimation.
Les blocs PAGES, __BRH_MOD et SHIM restent identiques octet pour octet (contrôlé ci-dessous).
"""
import sys, os, json, hashlib

src_path, out_path = sys.argv[1], sys.argv[2]
s = open(src_path, encoding='utf-8').read()
here = os.path.dirname(os.path.abspath(__file__))

def blocs(t):
    L = t.split('\n')
    return [hashlib.sha256(l.encode()).hexdigest() for l in L if l.startswith(('const PAGES=', 'window.__BRH_MOD=', 'const SHIM='))]
avant = blocs(s)
assert len(avant) == 3, 'source inattendue : PAGES, __BRH_MOD ou SHIM introuvable'

def rep(a, b):
    global s
    n = s.count(a)
    assert n == 1, 'remplacement attendu une fois, trouvé %d fois : %s' % (n, a[:90])
    s = s.replace(a, b)

def lire(nom):
    t = open(os.path.join(here, nom), encoding='utf-8').read()
    assert '</script' not in t.lower(), nom
    return t

# 1. titre de l'onglet et repère de version
rep('<title>Portail Banque des RH — démo V3 (sites A et B)</title>', '<title>Portail Banque des RH — démo V4 (sites A et B)</title>')
rep('const STAMP="24/11/2026 · V3 précautions d’usage · sous-sites A et B";',
    'const STAMP="26/11/2026 · V4 parcours simplifiés · sous-sites A et B";')

# 2. menu des sous-sites : 4 phases (le 3e champ liste les pages où l'entrée est active, séparées par |)
SAVOIR = 'ressources.html|avantages-fiscaux.html|newsletter.html|newsletter-archive.html|newsletter-edition.html|newsletter-2026-09.html|newsletter-2026-10.html'
def nav(evaluer):
    return ("nav:[['Nos solutions','#offres',''],['Évaluez vos besoins RH','%s','%s|audit-mutuelle.html'],"
            "['Allons plus loin ensemble','devis.html','devis.html'],\n           ['En savoir plus','ressources.html','%s']]," % (evaluer, evaluer, SAVOIR))
rep("""nav:[['Nos offres','#offres',''],['Diagnostic RH','diagnostic.html','diagnostic.html'],['Devis en ligne','devis.html','devis.html'],
           ['Avantages fiscaux','avantages-fiscaux.html','avantages-fiscaux.html'],['Ressources','ressources.html','ressources.html'],
           ['Newsletter','newsletter-edition.html','newsletter-edition.html']],""", nav('diagnostic.html'))
rep("""nav:[['Nos offres','#offres',''],['Label RH','label-brh.html','label-brh.html'],['Devis en ligne','devis.html','devis.html'],
           ['Avantages fiscaux','avantages-fiscaux.html','avantages-fiscaux.html'],['Ressources','ressources.html','ressources.html'],
           ['Newsletter','newsletter-edition.html','newsletter-edition.html']],""", nav('label-brh.html'))
rep("besoins:'Nos offres, besoin par besoin' }", "besoins:'Nos solutions, besoin par besoin' }")
rep("besoins:'Nos offres' }", "besoins:'Nos solutions' }")
rep("var on=l[2] && l[2]===P;", "var on=!!l[2] && ('|'+l[2]+'|').indexOf('|'+P+'|')>=0;")

# 3. bandeau de démo : phase en cours avec les 4 termes
i = s.index('const ETAPES={'); j = s.index('};', i) + 2
PH = {'mon-dossier.html': 'Mon dossier BRH'}
for p in ['index.html', 'accueil-4-besoins.html', 'accueil-label-rh.html']: PH[p] = 'Nos solutions'
for p in ['diagnostic.html', 'label-brh.html', 'audit-mutuelle.html']: PH[p] = 'Évaluez vos besoins RH'
PH['devis.html'] = 'Allons plus loin ensemble'
for p in SAVOIR.split('|'): PH[p] = 'En savoir plus'
s = s[:i] + 'const ETAPES=' + json.dumps(PH, ensure_ascii=False) + ';   /* V4 : les 4 phases du parcours */' + s[j:]
rep("(ETAPES[r.page]?'Étape : <b>'", "(ETAPES[r.page]?'Phase : <b>'")

# 4. précautions V4 (remplace la V3) et parcours V4, injectés dans chaque page
i = s.index("const PREC_TAG='<script>'+"); j = s.index('\n', i)
s = (s[:i] + "const PREC_TAG='<script>'+" + json.dumps(lire('precautions_demo_v4.js')) + "+'<\\/script>';   /* V4 : précautions en bas de chaque écran, precautions_demo_v4.js */\n"
     + "const V4_TAG='<script>'+" + json.dumps(lire('parcours_v4_demo.js')) + "+'<\\/script>';   /* V4 : parcours simplifiés, parcours_v4_demo.js */" + s[j:])
rep("+DOSSIER_TAG+PREC_TAG);", "+DOSSIER_TAG+PREC_TAG+V4_TAG);")

# 5. Mon dossier BRH : description des avantages salariés alignée sur le devis
i = s.index("const DOSSIER_TAG='<script>'+"); k = i + len("const DOSSIER_TAG='<script>'+")
js, fin = json.JSONDecoder().raw_decode(s[k:])
a = 'Titres-restaurant, forfait mobilités durables, cartes cadeaux : des avantages du quotidien.'
assert js.count(a) == 1
js = js.replace(a, 'Titres-restaurant et cartes cadeaux : des avantages du quotidien.')
s = s[:k] + json.dumps(js) + s[k + fin:]

assert blocs(s) == avant, 'PAGES, __BRH_MOD ou SHIM modifiés : interdit'
open(out_path, 'w', encoding='utf-8').write(s)
print('écrit', out_path, len(s.encode('utf-8')), 'octets')
