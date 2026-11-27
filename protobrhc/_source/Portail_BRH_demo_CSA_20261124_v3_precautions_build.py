#!/usr/bin/env python3
"""Démo hors ligne Portail BRH — V3 « précautions d'usage » (24/11/2026, demande de David CHARRETIER).

Usage : python3 Portail_BRH_demo_CSA_20261124_v3_precautions_build.py <demo_v2_sites_AB.html> <sortie_v3.html>

Part de la démo v2 (sites A et B, Mon dossier BRH, aperçu de l'e-mail) et ajoute, sans rien retirer :
  - un bandeau fixe en bas de l'écran, visible sur toutes les pages :
    « Démonstration – données fictives, non contractuelles, présentées à titre d'illustration. » ;
  - precautions_demo.js (à côté de ce script), injecté dans chaque page : encadrés à côté des montants
    (simulation, Label RH, devis, document de devis imprimable, audit mutuelle, avantages fiscaux, Mon dossier BRH,
    fenêtres « En savoir plus » des offres) ;
  - la même mention dans l'aperçu de l'e-mail reçu par le dirigeant.
Les blocs PAGES, __BRH_MOD et SHIM restent identiques octet pour octet (contrôlé ci-dessous).
"""
import sys, os, json, hashlib

src_path, out_path = sys.argv[1], sys.argv[2]
s = open(src_path, encoding='utf-8').read()
here = os.path.dirname(os.path.abspath(__file__))

BANDEAU = 'Démonstration – données fictives, non contractuelles, présentées à titre d’illustration.'
TEXTE = ('Montants calculés sur des hypothèses fictives. Ils n’engagent pas le Crédit Agricole et ne valent ni offre ni devis. '
         'Seul l’expert de votre Caisse régionale peut établir une proposition.')

def blocs(t):
    L = t.split('\n')
    return [hashlib.sha256(l.encode()).hexdigest() for l in L if l.startswith(('const PAGES=', 'window.__BRH_MOD=', 'const SHIM='))]
avant = blocs(s)
assert len(avant) == 3, 'source inattendue : PAGES, __BRH_MOD ou SHIM introuvable'

def rep(a, b):
    global s
    n = s.count(a)
    assert n == 1, 'remplacement attendu une fois, trouvé %d fois : %s' % (n, a[:80])
    s = s.replace(a, b)

# 1. titre de l'onglet
rep('<title>Portail Banque des RH — démo (sites A et B)</title>', '<title>Portail Banque des RH — démo V3 (sites A et B)</title>')

# 2. bandeau « précautions d'usage » du shell, fixe en bas de l'écran, sur toutes les pages
ICO = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
       'aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>')
PREC = ('<div id="prec" role="note" aria-label="Précautions d’usage">' + ICO + '<span>' + BANDEAU + '</span></div>\n'
        '<style>\n'
        ':root{--bp:30px}\n'
        '#prec{position:fixed;left:0;right:0;bottom:0;height:var(--bp);z-index:10;display:flex;align-items:center;justify-content:center;gap:8px;'
        'padding:0 14px;background:#fffaf3;border-top:1px solid #ecdcc6;color:#5a4325;font-size:12.5px;font-weight:500;line-height:1.25;text-align:center}\n'
        '#prec svg{flex:0 0 15px;width:15px;height:15px;color:#9a5a12}\n'
        '#app{bottom:var(--bp);height:calc(100% - var(--hb) - var(--bp))}\n'
        '#boot{inset:var(--hb) 0 var(--bp) 0}\n'
        '#boite .ml-prec{font-size:12px;line-height:1.45;color:#5a4325;background:#fffaf3;border:1px solid #ecdcc6;border-left:3px solid #b26b14;border-radius:8px;padding:8px 12px;margin:0 0 12px}\n'
        '#boite .ml-prec b{color:#7a4510}\n'
        '@media(max-width:640px){:root{--bp:40px}#prec{font-size:11.5px;padding:0 10px}}\n'
        '</style>\n')
rep('<div id="boot">', PREC + '<div id="boot">')

# 3. repère de version du shell
rep('const STAMP="23/11/2026 · sous-sites A et B";', 'const STAMP="24/11/2026 · V3 précautions d’usage · sous-sites A et B";')

# 4. precautions_demo.js injecté dans chaque page, après le dossier
PJ = open(os.path.join(here, 'precautions_demo.js'), encoding='utf-8').read()
assert '</script' not in PJ.lower()
i = s.index("const DOSSIER_TAG='<script>'+")
j = s.index('\n', i)
s = s[:j + 1] + "const PREC_TAG='<script>'+" + json.dumps(PJ) + "+'<\\/script>';   /* V3 : précautions d'usage, precautions_demo.js */\n" + s[j + 1:]
rep("+(S?ctx+SITE_JS:'')+DOSSIER_TAG);", "+(S?ctx+SITE_JS:'')+DOSSIER_TAG+PREC_TAG);")

# 5. aperçu de l'e-mail : même mention, avant les lignes de bas de page
rep("    +'<p class=\"ml-pt\">Ce lien est personnel",
    "    +'<p class=\"ml-prec\"><b>Démonstration · données fictives, non contractuelles.</b> " + TEXTE.replace("'", "\\'") + "</p>'\n"
    "    +'<p class=\"ml-pt\">Ce lien est personnel")
rep('aperçu de démonstration, aucun e-mail n\'est envoyé', 'aperçu de démonstration, données fictives, aucun e-mail n\'est envoyé')

assert blocs(s) == avant, 'PAGES, __BRH_MOD ou SHIM modifiés : interdit'
open(out_path, 'w', encoding='utf-8').write(s)
print('écrit', out_path, len(s.encode('utf-8')), 'octets')
