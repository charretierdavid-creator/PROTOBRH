#!/usr/bin/env python3
"""Démo hors ligne Portail BRH — V4.1 « Julia en fenêtre flottante sur le site B » (26/11/2026, demande de David CHARRETIER).

Usage : python3 Portail_BRH_demo_CSA_20261126_v4.1_julia_B_build.py <demo_v4_parcours.html> <sortie_v4.1.html>
Chaîne complète : v2 → v3_precautions_build.py → v4_parcours_build.py → ce script.

Ajoute julia_flottante_b.js (à côté de ce script), injecté en dernier dans chaque page. Sur le site B seulement :
bouton « Besoin d'aide ? » en bas à droite, fenêtre flottante avec Julia, plus aucun accès à Julia au milieu des écrans.
Le site A est inchangé. Les blocs PAGES, __BRH_MOD et SHIM restent identiques octet pour octet (contrôlé ci-dessous).
"""
import sys, os, json, hashlib

src_path, out_path = sys.argv[1], sys.argv[2]
s = open(src_path, encoding='utf-8').read()
here = os.path.dirname(os.path.abspath(__file__))

def blocs(t):
    return [hashlib.sha256(l.encode()).hexdigest() for l in t.split('\n') if l.startswith(('const PAGES=', 'window.__BRH_MOD=', 'const SHIM='))]
avant = blocs(s)
assert len(avant) == 3, 'source inattendue'

def rep(a, b):
    global s
    n = s.count(a)
    assert n == 1, 'remplacement attendu une fois, trouvé %d fois : %s' % (n, a[:90])
    s = s.replace(a, b)

JS = open(os.path.join(here, 'julia_flottante_b.js'), encoding='utf-8').read()
assert '</script' not in JS.lower()

rep('<title>Portail Banque des RH — démo V4 (sites A et B)</title>', '<title>Portail Banque des RH — démo V4.1 (sites A et B)</title>')
rep('const STAMP="26/11/2026 · V4 parcours simplifiés · sous-sites A et B";',
    'const STAMP="26/11/2026 · V4.1 parcours simplifiés, Julia flottante sur B · sous-sites A et B";')
i = s.index("const V4_TAG='<script>'+"); j = s.index('\n', i)
s = s[:j + 1] + "const JFL_TAG='<script>'+" + json.dumps(JS) + "+'<\\/script>';   /* V4.1 : site B, Julia en fenêtre flottante, julia_flottante_b.js */\n" + s[j + 1:]
rep("+DOSSIER_TAG+PREC_TAG+V4_TAG);", "+DOSSIER_TAG+PREC_TAG+V4_TAG+JFL_TAG);")
rep('title="Démonstration hors ligne : données fictives, aucun envoi, réponses de Julia simulées"',
    'title="Démonstration hors ligne : données fictives, aucun envoi, réponses de Julia simulées (site B : Julia en bas à droite)"')

assert blocs(s) == avant, 'PAGES, __BRH_MOD ou SHIM modifiés : interdit'
open(out_path, 'w', encoding='utf-8').write(s)
print('écrit', out_path, len(s.encode('utf-8')), 'octets')
