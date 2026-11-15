# Module LM 2.0 — 15/11/2026 · aperçus autonomes (un seul fichier HTML, scripts intégrés) de la console de démonstration, pour contrôle visuel
import re, sys, os
M, OUT = sys.argv[1], sys.argv[2]
h0 = open(os.path.join(M, 'console.html'), encoding='utf-8').read()
js = ''.join('<script>\n' + open(os.path.join(M, f), encoding='utf-8').read() + '\n</script>\n' for f in ['lm2-referentiel.js', 'lm2-regles.js', 'console-demo.js', 'console.js'])
h0 = re.sub(r'<script src="lm2-referentiel.js\?v=2.0"></script>\n<script src="lm2-regles.js\?v=2.0"></script>\n<script>if .*?</script>\n<script src="console.js\?v=2.0"></script>\n', lambda _: js, h0, flags=re.S)
FICHE_SEULE = '<style>.lede,.kp,.filters,#lsLeads,main h1,.band{display:none!important}</style>'
V = {
 'liste': ('', ''),
 'fiche': (FICHE_SEULE, "var C=LM2_CONSOLE;var l=C.ST.leads.filter(function(x){return x.raison_sociale==='Boulangerie Lefort';})[0];C.ouvrir(l.id);"),
 'transfert': ('', "var C=LM2_CONSOLE;var l=C.ST.leads.filter(function(x){return x.raison_sociale==='Boulangerie Lefort';})[0];C.ouvrir(l.id).then(function(){C.dlgTransfert();});"),
 'script': ('', "var C=LM2_CONSOLE;var l=C.ST.leads.filter(function(x){return x.raison_sociale==='Garage des Vallées';})[0];C.ouvrir(l.id).then(function(){C.dlgScript();});"),
 'email': ('', "var C=LM2_CONSOLE;var l=C.ST.leads.filter(function(x){return x.raison_sociale==='Garage des Vallées';})[0];C.ouvrir(l.id).then(function(){C.dlgEmail();});"),
 'acces': ('', "LM2_DEMO.perspective('acces');LM2_CONSOLE.session();"),
 'annuaire': ('', "LM2_CONSOLE.onglet('annuaire');"),
 'admin': ('', "LM2_DEMO.perspective('admin');LM2_CONSOLE.session().then(function(){LM2_CONSOLE.onglet('admin');});"),
 'envoi': ('', "LM2_DEMO.perspective('admin');LM2_CONSOLE.session().then(function(){LM2_CONSOLE.ST.adm.sub='envoi';LM2_CONSOLE.onglet('admin');});"),
 'modeles': ('', "LM2_DEMO.perspective('admin');LM2_CONSOLE.session().then(function(){LM2_CONSOLE.ST.adm.sub='modeles';LM2_CONSOLE.onglet('admin');});"),
}
for k, (css, act) in V.items():
    h = h0.replace('</head>', css + '</head>')
    if act: h = h.replace('</body>', '<script>setTimeout(function(){' + act + '},150);</script></body>')
    open(os.path.join(OUT, 'apercu_' + k + '.html'), 'w', encoding='utf-8').write(h)
print('ok', len(V))
