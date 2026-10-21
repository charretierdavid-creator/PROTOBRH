import json, html, base64, io, re, os
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
# Génère ../index.html à partir de app_data.json (contenu), app_imgs.json (captures), map3.jpg + geo_map.json (parcours, produits par gen_map.py), static_tpl.html (gabarit) et ../journal.json
from PIL import Image
D = json.load(open('app_data.json')); IM = json.load(open('app_imgs.json')); G = json.load(open('geo_map.json'))
PAGES = D['pages']; DICT = D['data']
BY = {p['code']: p for p in PAGES}
DNAME = {r[0]: r[1] for g in DICT for r in g['rows']}
e = lambda s: html.escape(str(s), quote=True)
aid = lambda code: 'p-' + code.replace('É', 'E')
STEP_PAGES = {'A':['É01'],'1.1':['É01','É04'],'1.2':['É02','É03','É27'],'2.1':['É05'],'2.2':['É06'],'2.3':['É06'],'3.1':['É07'],'3.2':['É07'],'4.1':['É07','É27'],'4.2':['É09','É22'],'5.1':['É10','É11'],'5.2':['É12','É13','É14'],'5.3':['É15','É16','É17','É18','É19','É20'],'6.1':['É21','P2'],'5.L':['P1'],'6.L':['P1','É22'],'R':['É08','É23','É24','É25'],'AS':['H'],'AM':['É26']}
LAB = {'A':'Acquisition','1.1':'1.1 Accueil portail 360°','1.2':'1.2 Explore les 4 besoins RH','2.1':'2.1 Décrit son entreprise','2.2':'2.2 Note ses priorités RH','2.3':'2.3 Se compare','3.1':'3.1 Gain fiscal annuel','3.2':"3.2 Pouvoir d'achat / salarié",'4.1':'4.1 Solutions priorisées','4.2':'4.2 Transmet ses coordonnées','5.1':'5.1 Choisit ses solutions','5.2':'5.2 Identifie son entreprise','5.3':'5.3 Configure et estime','5.L':'Lead qualifié','6.1':'6.1 Reçoit son devis','6.L':'Rappel expert BRH de la CR','R':'Complément · Ressources & newsletter','AS':'Complément · Assistant BRH','AM':'Complément · Audit mutuelle et prévoyance'}
STEP_ORDER = ['A','1.1','1.2','2.1','2.2','2.3','3.1','3.2','4.1','4.2','5.1','5.2','5.3','5.L','6.1','6.L','R','AS','AM']
GROUPS = [('Accueil & découverte',['É01','É02','É03','É04','É27']),('Diagnostic RH',['É05','É06','É07','É08','É09','É26']),('Devis — données communes',['É10','É11','É12','É13','É14']),('Devis — configuration',['É15','É16','É17','É18']),('Estimation, proposition, devis',['É19','É20','É21','É22']),('Ressources & newsletter',['É23','É24','É25']),('Back-office & transverse',['P1','P2','H']),('Test A/B',['VA','VB'])]
ORDER = [c for g in GROUPS for c in g[1]]
PRIO = {'MVP':'MVP','V2':'V2','ARB':'À arbitrer'}
VERS = ['REF', 'A', 'B']
VLAB = {'REF': 'Standard', 'A': 'Version A', 'B': 'Version B'}
VURL = {'REF': 'protobrh.monsitedetest.com', 'A': 'protobrha.monsitedetest.com', 'B': 'protobrhb.monsitedetest.com'}
VHYP = {'REF': 'Version standard : parcours et design actuels (V1.0.4), le point de comparaison.', 'A': 'Parcours simplifié, design épuré et moderne.', 'B': 'Parcours complet, design institutionnel.'}
pvar = lambda p: p.get('var') or VERS
def vtags(v, full=False):
    if set(v) == set(VERS): return '<span class="vtag v-ALL">Toutes versions</span>' if full else ''
    return ''.join(f'<span class="vtag v-{x}">{VLAB[x]}</span>' for x in v)
def story(t): return re.sub(r"(En tant que |je veux |afin (?:de |d'|que ))", r'<b>\1</b>', e(t))

# ---- schéma du parcours : un par version du prototype (gen_map.py)
GV = {'REF': G['S'], 'A': G['A'], 'B': G['B']}
def stepid(label):
    if label == 'Acquisition': return 'A'
    if label == 'Lead qualifié': return '5.L'
    if label.startswith('Rappel expert'): return '6.L'
    return label.split(' ')[0]
pct = lambda v, t: f'{v / t * 100:.3f}%'
def parcours(v):
    g = GV[v]; MAPH = g['maph']
    im = Image.open(g['img']).convert('RGB').resize((2400, round(2400 * MAPH / 1920)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=78, optimize=True)
    hot, sids = [], []
    for c in g['cards']:
        sid = c.get('sid') or stepid(c['b']); pages = [x for x in STEP_PAGES[sid] if v in pvar(BY[x])]; sids.append(sid)
        hot.append(f'<a class="hot" href="#{aid(pages[0])}" style="left:{pct(c["x"]-4,1920)};top:{pct(c["y"]-4,MAPH)};width:{pct(c["w"]+8,1920)};height:{pct(c["h"]+8,MAPH)}" title="{e(LAB[sid])} — pages : {", ".join(pages)}" aria-label="{e(LAB[sid])} : ouvrir {len(pages)} page(s)"><span>{len(pages)}</span></a>')
    for x, code in zip(g['ebs'], ['É22','É06','É07','É20','É15','É22']):
        hot.append(f'<a class="hot eb" href="#{aid(code)}" style="left:{pct(x["x"],1920)};top:{pct(x["y"],MAPH)};width:{pct(x["w"],1920)};height:{pct(x["h"],MAPH)}" title="{e(x["text"])} — voir {code}" aria-label="{e(x["text"])} : voir {code}"></a>')
    steps = ''.join(f'<div class="step"><h3>{e(LAB[s])}</h3><div class="chips">' + ''.join(f'<a class="chip{" v2" if BY[c]["statut"]=="V2" else ""}" href="#{aid(c)}">{c}</a>' for c in STEP_PAGES[s] if v in pvar(BY[c])) + '</div></div>' for s in STEP_ORDER if s in sids)
    img = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
    return (f'<div class="mapv" data-v="{v}"><div class="mapwrap"><div class="mapimg"><img src="{img}" alt="Parcours du dirigeant — {VLAB[v]}" loading="lazy">' + '\n'.join(hot) +
            f'</div></div><div class="steps">{steps}</div></div>')
maps_html = '\n'.join(parcours(v) for v in VERS)

toc = ''.join(f'<h4>{e(g)}</h4>' + ''.join(f'<a href="#{aid(c)}" data-code="{c}" data-var="{" ".join(pvar(BY[c]))}"><b>{c}</b><span>{e(BY[c]["title"])}</span><i class="cc" data-cc="{c}"></i></a>' for c in cs) for g, cs in GROUPS) + '<h4>Données</h4><a href="#crm"><b>DATA</b><span>Tableau des data outputs</span></a>'

# ---- pages
pages_html = []
for i, code in enumerate(ORDER):
    p = BY[code]
    steps = [s for s in STEP_ORDER if code in STEP_PAGES[s]]
    rel = ''.join(f'<div class="rel"><span>Dans le parcours : <b>{e(LAB[s])}</b></span>' + ''.join(f'<a class="chip{" cur" if c==code else ""}" href="#{aid(c)}" data-var="{" ".join(pvar(BY[c]))}">{c} · {e(BY[c]["title"].split(" — ")[-1])}</a>' for c in STEP_PAGES[s]) + '</div>' for s in steps)
    tile = 'proc' if p.get('process') else ('v2' if p['statut'] == 'V2' else '')
    if p.get('imgs'):
        figs = ''.join(f'<figure><img src="{IM[imn]}" alt="Capture de l\'écran {code}" loading="lazy" data-zoom><figcaption>{("Capture de la version " + imn[1].upper() + " du 21/10/2026 (V1.1)") if imn[:3] in ("va_", "vb_") else ("Capture de la version B du 21/10/2026 (V1.3)" if imn.startswith("e27_") else "Capture du prototype du 14/10/2026 (V1.0.3)")}{" — vue " + str(k+1) if len(p["imgs"])>1 else ""}</figcaption></figure>' for k, imn in enumerate(p['imgs']))
    else:
        figs = f'<div class="noimg"><b>{"Processus back-office" if p.get("process") else "Écran à maquetter"}</b><br>Pas d\'écran côté dirigeant</div>'
    reqs = ''.join(f'<tr data-var="{" ".join(r[2] if len(r) > 2 else pvar(p))}"><td>{k+1:02d}</td><td>{e(r[0])}{" " + vtags(r[2]) if len(r) > 2 else ""}</td><td><span class="prio {r[1]}">{PRIO[r[1]]}</span></td></tr>' for k, r in enumerate(p['reqs']))
    rules = ''.join(f'<li>{e(r)}</li>' for r in p['rules'])
    data = ''.join(f'<a class="dchip" href="#d-{d}" title="Voir dans Data"><b>{d}</b>{e(DNAME.get(d, ""))}</a>' for d in p.get('data', []))
    kpi = ('<h3>Indicateurs</h3><ul class="rules">' + ''.join(f'<li>{e(k)}</li>' for k in p['kpi']) + '</ul>') if p.get('kpi') else ''
    alert = f'<p class="alert"><b>Point d\'attention.</b> {e(p["alert"])}</p>' if p.get('alert') else ''
    prev = f'<a class="btn" href="#{aid(ORDER[i-1])}">Page précédente · {ORDER[i-1]}</a>' if i > 0 else '<span></span>'
    nxt = f'<a class="btn" href="#{aid(ORDER[i+1])}">Page suivante · {ORDER[i+1]}</a>' if i < len(ORDER) - 1 else '<span></span>'
    pages_html.append(f'''<section class="view pg" id="{aid(code)}" data-code="{code}" data-var="{" ".join(pvar(p))}">
{rel}
<article class="page">
<header class="ph"><div class="tile {tile}"><strong>{code}</strong><span>{("Étape " if p["ref"][:1].isdigit() else "") + e(p["ref"])}</span></div>
<div class="tt"><h2>{e(p["title"])}</h2><p class="obj"><b>Objectif.</b> {e(p["desc"])}</p></div>
<dl class="meta"><dt>Versions</dt><dd>{vtags(pvar(p), True)}</dd><dt>Phase</dt><dd>{p["phase"]}</dd><dt>Priorité</dt><dd class="p-{p["statut"]}">{PRIO[p["statut"]]}</dd><dt>Zone</dt><dd>{e(p["zone"])}</dd></dl></header>
<p class="chap">{story(p.get("chap",""))}</p>
<div class="pgrid"><div>
<h3>Composants et exigences</h3><table class="req"><thead><tr><th>ID</th><th>Exigence fonctionnelle</th><th>Priorité</th></tr></thead><tbody>{reqs}</tbody></table>
<h3>Règles de gestion</h3><ul class="rules">{rules}</ul>
<h3>Données produites</h3><div class="dchips">{data}</div>
</div><div>{figs}<h3>Appui humain</h3><p class="human">{e(p.get("human",""))}</p>{kpi}{alert}</div></div>
<div class="thread" data-page="{code}"><div class="tlist" aria-live="polite"></div>
<form class="comment" data-page="{code}"><label for="cm-{aid(code)}">Commentaires de l'équipe</label><input class="who" name="author" maxlength="60" placeholder="Votre nom" aria-label="Votre nom" required><input id="cm-{aid(code)}" name="text" maxlength="2000" placeholder="Ajouter un commentaire…" required><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn primary sm" type="submit">Publier</button></form></div>
<nav class="pager">{prev}<a class="btn primary" href="#parcours">Retour au parcours</a>{nxt}</nav>
</article></section>''')

# ---- CRM table
pagesOf = {}
for p in PAGES:
    for d in p.get('data', []): pagesOf.setdefault(d, []).append(p['code'])
UC = ['CRM', 'Tracking', 'SOLEAD (web to CR)', 'Nurturing', 'Filiale (devis)']
rows = ''
for g in DICT:
    rows += f'<tr class="g"><td colspan="{6+len(UC)}">{e(g["g"])}</td></tr>'
    for r in g['rows']:
        pg = ' '.join(f'<a class="chip sm" href="#{aid(c)}">{c}</a>' for c in pagesOf.get(r[0], [])) or e(r[2])
        rows += f'<tr id="d-{r[0]}"><td class="id">{r[0]}</td><td>{e(r[1])}</td><td>{pg}</td><td class="c"><span class="nat {r[3]}">{r[3]}</span></td><td>{e(r[4])}</td>' + ''.join(f'<td class="c"><input type="checkbox" data-d="{r[0]}" data-k="{k}" aria-label="{u} pour {r[0]}"></td>' for k, u in enumerate(UC)) + f'<td><input type="text" data-d="{r[0]}" data-k="note" aria-label="Commentaire {r[0]}"></td></tr>'
thead = '<thead><tr><th>ID</th><th>Donnée (output)</th><th>Pages</th><th>Nature</th><th>Format / exemple</th>' + ''.join(f'<th class="u">{u}</th>' for u in UC) + '<th>Commentaire</th></tr></thead>'

versions_html = ''.join(f'<button type="button" class="vcard v-{v}" data-vpick="{v}" aria-pressed="false"><span class="vtag v-{v}">{VLAB[v]}</span><b>{VURL[v]}</b><span class="vh">{e(VHYP[v])}</span><span class="vgo">Voir le parcours de cette version</span></button>' for v in VERS)
tpl = open('static_tpl.html').read()
out = (tpl.replace('%%MAPS%%', maps_html)
       .replace('%%TOC%%', toc).replace('%%VERSIONS%%', versions_html).replace('%%PAGES%%', '\n'.join(pages_html)).replace('%%CRM%%', thead + '<tbody>' + rows + '</tbody>')
       .replace('%%ORDER%%', json.dumps(ORDER, ensure_ascii=False)).replace('%%DICT%%', json.dumps(DICT, ensure_ascii=False)).replace('%%JOURNAL%%', open('../journal.json').read()).replace('%%TITLES%%', json.dumps({c: BY[c]['title'] for c in ORDER}, ensure_ascii=False)))
open('../index.html', 'w').write(out)
print(len(out) / 1e6, 'MB')
