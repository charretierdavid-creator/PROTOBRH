import json, html, os, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
# Redessine le schéma du parcours (map3.jpg) et ses zones cliquables (geo_map.json) à partir de geo3.json.
# Le parcours principal reste sur la courbe ; les modules complémentaires (hors chemin critique) sont dans une ligne dédiée en dessous.
# Usage : python3 cdcbrh/_source/gen_map.py   (Playwright + Chromium requis), puis python3 cdcbrh/_source/gen_static.py
G = json.load(open('geo3.json'))
e = lambda s: html.escape(str(s), quote=True)

LANE_Y, LANE_H = 572, 120           # ligne des modules complémentaires
SHIFT = LANE_H + 14                 # décalage du bandeau « Un expert BRH à chaque étape »
MAPH = 666 + SHIFT

# ---- corrections de contenu du parcours principal
cards = [dict(c) for c in G['cards'] if not c['b'].startswith('1.3')]
for c in cards:
    if c['b'].startswith('1.2'): c['txt'], c['ref'] = '4 solutions et leurs fiches « En savoir plus »', 'É02 · É03'
    if c['b'].startswith('2.1'): c['txt'] = 'Secteur, effectif, localisation'
circles = [c for c in G['circles'] if (c['cx'], c['cy']) != (425, 300)]
lines = [l for l in G['lines'] if (l['x1'], l['y1']) != (425, 300)]

# ---- modules complémentaires
ADDONS = [
    {'sid': 'R', 'x': 202, 'w': 300, 'b': 'Ressources & newsletter', 'txt': 'Guides, avantages fiscaux, newsletter', 'acc': 'Accès : menu du haut', 'ref': 'É08 · É23 – É25'},
    {'sid': 'AS', 'x': 521, 'w': 341, 'b': 'Assistant BRH', 'txt': '« Besoin d’aide ? » sur chaque écran (IA Mistral)', 'acc': 'Accès : bouton flottant', 'ref': 'H'},
    {'sid': 'AM', 'x': 886, 'w': 451, 'b': 'Audit mutuelle et prévoyance', 'txt': '3 minutes, résultat immédiat sans coordonnées', 'acc': 'Accès : menu · vignette « Protéger mes salariés » · « Bon à savoir » du diagnostic', 'ref': 'É26'},
]
for a in ADDONS: a.update(y=LANE_Y + 14, h=LANE_H - 28, kind='addon')
OUT_AM = {'x': 1361, 'y': LANE_Y + 14, 'w': 515, 'h': LANE_H - 28}
CONNECT = [(215, 360, 'R', 'Menu'), (1140, 335, 'AM', 'Bon à savoir')]   # points de la courbe reliés à un module

ebs = [dict(x, y=x['y'] + SHIFT) for x in G['ebs']]
ettl = dict(G['ettl'], y=G['ettl']['y'] + SHIFT)

def box(x, y, w, h, cls, inner, style=''):
    return f'<div class="{cls}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;{style}">{inner}</div>'

H = []
t1, t2, ps = G['t1'], G['t2'], G['persona']
H.append(f'<div class="t1" style="left:{t1["x"]}px;top:{t1["y"]}px">{e(t1["text"])}</div>')
H.append(box(t2['x'], t2['y'], t2['w'], t2['h'], 't2', f'{e(t2["a"])}<span>{e(t2["b"])}</span>'))
H.append(box(ps['x'], ps['y'], ps['w'], ps['h'], 'persona', '<b>Dirigeant d’entreprise · DRH · DAF</b><br>PRO-TPE 5–50 sal. · PME-ETI 50–500 sal.<br><i>Visiteur du prototype protobrh, de bout en bout</i>'))
for p in G['phases']:
    H.append(box(p['x'], p['y'], p['w'], p['h'], 'phase', e(p['text']), f'background:{p["bg"]}'))
for c in G['cols']:
    H.append(box(c['x'], c['y'], c['w'], 66, 'col', ''))
    H.append(f'<div class="num" style="left:{c["n"]["x"]}px;top:{c["n"]["y"]}px;background:{c["nbg"]}">{c["num"]}</div>')
    H.append(f'<div class="cl{" big" if c["num"]=="0" else ""}" style="left:{c["l"]["x"]}px;top:{c["l"]["y"]}px">{e(c["l"]["text"])}</div>')
    H.append(f'<div class="cs{" ctr" if c["num"]=="0" else ""}" style="left:{c["s"]["x"]}px;top:{c["s"]["y"]}px;width:{c["s"]["w"]}px">{e(c["s"]["text"])}</div>')

svg = [f'<svg width="1920" height="{MAPH}" viewBox="0 0 1920 {MAPH}">']
for p in G['paths']:
    svg.append(f'<path d="{p["d"]}" fill="none" stroke="{p["stroke"]}" stroke-width="{p["w"]}" stroke-linecap="round"' + (f' stroke-dasharray="{p["dash"]}"' if p['dash'] else '') + '/>')
for l in lines:
    svg.append(f'<line x1="{l["x1"]}" y1="{l["y1"]}" x2="{l["x2"]}" y2="{l["y2"]}" stroke="#B9CEC7" stroke-width="2"/>')
for (cx, cy, sid, lab) in CONNECT:
    svg.append(f'<line x1="{cx}" y1="{cy}" x2="{cx}" y2="{LANE_Y + 14}" stroke="#016265" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round"/>')
    svg.append(f'<path d="M{cx-6},{LANE_Y+5} L{cx},{LANE_Y+13} L{cx+6},{LANE_Y+5}" fill="none" stroke="#016265" stroke-width="2"/>')
ax = OUT_AM['x'] - 22; ay = OUT_AM['y'] + OUT_AM['h'] / 2
svg.append(f'<line x1="{ADDONS[2]["x"] + ADDONS[2]["w"]}" y1="{ay}" x2="{OUT_AM["x"] - 4}" y2="{ay}" stroke="#016265" stroke-width="2" stroke-dasharray="3 5"/>')
svg.append(f'<path d="M{OUT_AM["x"]-12},{ay-6} L{OUT_AM["x"]-4},{ay} L{OUT_AM["x"]-12},{ay+6}" fill="none" stroke="#016265" stroke-width="2"/>')
for c in circles:
    svg.append(f'<circle cx="{c["cx"]}" cy="{c["cy"]}" r="{c["r"]}" fill="{c["fill"]}" stroke="#fff" stroke-width="2.5"/>')
svg.append('</svg>')
H.append('\n'.join(svg))
for (cx, cy, sid, lab) in CONNECT:
    H.append(f'<div class="clab" style="left:{cx + 8}px;top:{LANE_Y - 22}px">{e(lab)}</div>')

for c in cards:
    H.append(box(c['x'], c['y'], c['w'], c['h'], 'card ' + c['kind'], f'<b>{e(c["b"])}</b><span>{e(c["txt"])}</span>' + (f'<i>{e(c["ref"])}</i>' if c['ref'] else '')))
for m in G['emos']:
    H.append(f'<div class="emo" style="left:{m["x"]}px;top:{m["y"]}px"><span style="background:{m["dot"]}"></span>{e(m["text"])}</div>')
for t in G['tags']:
    H.append(f'<div class="tag" style="left:{t["x"]}px;top:{t["y"]}px;background:{t["bg"]};color:{t["color"]}">{e(t["text"])}</div>')

# ligne des modules complémentaires
H.append(box(36, LANE_Y, 1848, LANE_H, 'lane', ''))
H.append(box(36, LANE_Y, 150, LANE_H, 'lttl', '<b>Modules complémentaires</b><span>Hors chemin critique, accessibles à tout moment</span>'))
for a in ADDONS:
    H.append(box(a['x'], a['y'], a['w'], a['h'], 'card addon', f'<em>Complément</em><b>{e(a["b"])}</b><span>{e(a["txt"])}</span><small>{e(a["acc"])}</small><i>{e(a["ref"])}</i>'))
H.append(box(OUT_AM['x'], OUT_AM['y'], OUT_AM['w'], OUT_AM['h'], 'outam', '<b>Retour au parcours principal</b><span>→ 5.3 Devis santé & prévoyance (convention et formule reprises)</span><span>→ Lead qualifié : comparaison chiffrée par un expert BRH</span><span>→ Retour au diagnostic ou aux solutions</span>'))

H.append(box(ettl['x'], ettl['y'], ettl['w'], ettl['h'], 'ettl', '<b>Un expert BRH à chaque étape</b><span><i class="k"></i>moment clé</span><span><i></i>appui à la demande</span>'))
for x in ebs:
    H.append(box(x['x'], x['y'], x['w'], x['h'], 'eb' + (' key' if x['key'] else ''), e(x['text'])))

CSS = '''*{box-sizing:border-box;margin:0;padding:0}body{width:1920px;height:%dpx;position:relative;background:#fff;font-family:Lato,Arial,sans-serif;color:#233029;overflow:hidden}
body>div{position:absolute}svg{position:absolute;left:0;top:0}
.t1{font:800 35px/1 Poppins;color:#065145;letter-spacing:.2px;white-space:nowrap}
.t2{background:#065145;color:#fff;font:700 24px/41px Poppins;padding:0 14px;white-space:nowrap}.t2 span{color:#C7DD8A;font-weight:500}
.persona{background:#E3EFEA;border-left:4px solid #8FB822;padding:7px 14px;font-size:13.5px;line-height:1.4;color:#233029}.persona b{color:#065145;font-size:14.5px}.persona i{color:#5C6B64;font-style:normal}
.phase{color:#fff;font:700 10px/14px Poppins;letter-spacing:2.5px;text-align:center}
.col{border-right:1.5px dashed #D5E2DD}
.num{width:22px;height:22px;border-radius:50%%;color:#fff;font:700 12px/22px Poppins;text-align:center}
.cl{font:700 17.5px/24px Poppins;color:#065145;white-space:nowrap}.cl.big{font-size:17px}
.cs{font-size:11.5px;line-height:15px;color:#5C6B64}.cs.ctr{text-align:center}
.card{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:5px 8px;background:#E3EFEA;border:1px solid #CADDD6;font-size:11.5px;line-height:1.3}
.card b{font-size:12px;color:#065145;line-height:1.25}.card i{font-style:normal;font-weight:700;color:#5C6B64;font-size:9.5px;margin-top:3px}
.card.target{background:#fff;border:1.5px dashed #8FB822}
.card.start,.card.end{background:#065145;border-color:#065145;color:#fff}.card.start b,.card.end b{color:#fff}.card.start i,.card.end i{color:#C7DD8A}
.emo{font:italic 700 11.5px/15px Lato;color:#065145;white-space:nowrap}.emo span{display:inline-block;width:8px;height:8px;border-radius:50%%;margin-right:5px;vertical-align:0}
.tag{font:700 11.5px/21px Lato;padding:0 8px;white-space:nowrap}
.lane{background:#F4F8F6;border-top:2px dashed #9DBDB2;border-bottom:2px dashed #9DBDB2}
.lttl{display:flex;flex-direction:column;justify-content:center;padding:0 10px;background:#016265;color:#fff}.lttl b{font:700 13px/1.2 Poppins}.lttl span{font-size:10.5px;color:#D6EAE3;margin-top:4px;line-height:1.3}
.card.addon{background:#fff;border:1.5px solid #016265;border-left-width:5px;align-items:flex-start;text-align:left;padding:5px 12px;gap:1px}
.card.addon em{font:700 8.5px/1 Poppins;letter-spacing:1.4px;text-transform:uppercase;color:#fff;background:#8FB822;padding:3px 6px;border-radius:3px;font-style:normal;margin-bottom:2px}
.card.addon b{font-size:13.5px}.card.addon small{font-size:10.5px;color:#016265;font-weight:700}.card.addon i{margin-top:1px}
.clab{font:700 10.5px/14px Lato;color:#016265;background:#fff;padding:1px 5px;border:1px solid #9DBDB2;border-radius:3px;white-space:nowrap}
.outam{background:#E3EFEA;border:1px solid #CADDD6;padding:6px 12px;font-size:11.5px;line-height:1.35;display:flex;flex-direction:column;justify-content:center}.outam b{color:#065145;font-size:12.5px;margin-bottom:1px}
.ettl{background:#E3EFEA;padding:8px 10px;font-size:10.5px;color:#5C6B64;line-height:1.35;display:flex;flex-direction:column}.ettl b{font:700 13.5px/1.2 Poppins;color:#065145;margin-bottom:5px}
.ettl i{display:inline-block;width:10px;height:10px;background:#D7E6E0;margin-right:5px;vertical-align:-1px}.ettl i.k{background:#065145}
.eb{display:flex;align-items:center;padding:7px 12px;font-size:13.5px;line-height:1.25;background:#E3EFEA}.eb.key{background:#065145;color:#fff;font-weight:700}
''' % MAPH

# polices Poppins + Lato embarquées (sous-ensemble latin), pour un rendu identique quel que soit le poste
import re, base64
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
get = lambda u: subprocess.run(['curl', '-sSL', '-A', UA, u], capture_output=True, check=True).stdout
fcss = get('https://fonts.googleapis.com/css2?family=Poppins:wght@500;700;800&family=Lato:ital,wght@0,400;0,700;1,700&display=swap').decode()
FONTS = ''
for sub, body in re.findall(r'/\* (\S+) \*/\s*@font-face \{(.*?)\}', fcss, re.S):
    if sub != 'latin': continue
    url = re.search(r'url\((.*?)\)', body).group(1)
    body = body.replace(url, 'data:font/woff2;base64,' + base64.b64encode(get(url)).decode())
    FONTS += '@font-face{' + body + '}'

page = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8">
<style>{FONTS}{CSS}</style></head><body>
{chr(10).join(H)}
</body></html>'''

tmp = tempfile.mkdtemp()
open(os.path.join(tmp, 'map.html'), 'w').write(page)
js = f'''const {{ chromium }} = require('playwright');
(async()=>{{ const b=await chromium.launch(); const p=await b.newPage({{viewport:{{width:1920,height:{MAPH}}},deviceScaleFactor:2}});
await p.goto('file://{tmp}/map.html'); await p.waitForLoadState('networkidle'); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(300);
await p.screenshot({{path:'{tmp}/map.png'}}); await b.close(); }})();'''
open(os.path.join(tmp, 'shot.js'), 'w').write(js)
env = dict(os.environ); env.setdefault('NODE_PATH', subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip())
subprocess.run(['node', os.path.join(tmp, 'shot.js')], check=True, env=env)
from PIL import Image
Image.open(os.path.join(tmp, 'map.png')).convert('RGB').save('map3.jpg', 'JPEG', quality=88, optimize=True)

geo = {'maph': MAPH,
       'cards': [{k: c[k] for k in ('x', 'y', 'w', 'h', 'b')} for c in cards] + [{'x': a['x'], 'y': a['y'], 'w': a['w'], 'h': a['h'], 'b': a['b'], 'sid': a['sid']} for a in ADDONS],
       'ebs': [{k: x[k] for k in ('x', 'y', 'w', 'h', 'text')} for x in ebs]}
json.dump(geo, open('geo_map.json', 'w'), ensure_ascii=False, indent=1)
print('map3.jpg', MAPH, 'px de haut (repère 1920) ·', len(geo['cards']), 'zones')
