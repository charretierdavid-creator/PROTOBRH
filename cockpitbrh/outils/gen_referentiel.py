# Module LM 2.0 — 15/11/2026 · génère le référentiel des Caisses régionales (PHP et JS) depuis l’annexe A du cahier des charges · historique : VERSIONS.md
# Génère lm2-referentiel.php et lm2-referentiel.js (Caisses régionales de démonstration, agences, CR pilotes)
# Source unique : la table ci-dessous (annexe A du cahier des charges v0.3). Usage : python3 gen_referentiel.py <dossier module>
import json, sys, os
CR = [  # code, nom, mode, [ (ville, code postal, département) ]
 ('val-de-france', 'Val de France', 'demo', [('Chartres','28000','28'),('Dreux','28100','28'),('Châteaudun','28200','28'),('Blois','41000','41'),('Vendôme','41100','41'),('Romorantin','41200','41')]),
 ('touraine-poitou', 'Touraine Poitou', 'pilote', [('Tours','37000','37'),('Amboise','37400','37'),('Chinon','37500','37'),('Poitiers','86000','86'),('Châtellerault','86100','86')]),
 ('pyrenees-gascogne', 'Pyrénées Gascogne', 'pilote', [('Pau','64000','64'),('Bayonne','64100','64'),('Tarbes','65000','65'),('Lourdes','65100','65'),('Auch','32000','32')]),
 ('centre-loire', 'Centre Loire', 'pilote', [('Bourges','18000','18'),('Vierzon','18100','18'),('Orléans','45000','45'),('Montargis','45200','45'),('Nevers','58000','58')]),
 ('franche-comte', 'Franche-Comté', 'pilote', [('Besançon','25000','25'),('Montbéliard','25200','25'),('Lons-le-Saunier','39000','39'),('Vesoul','70000','70'),('Belfort','90000','90')]),
 ('paris-idf', 'Paris et Île-de-France', 'pilote', [('Paris','75001','75'),('Versailles','78000','78'),('Évry','91000','91'),('Nanterre','92000','92'),('Bobigny','93000','93'),('Créteil','94000','94'),('Cergy','95000','95')]),
 ('anjou-maine', 'Anjou Maine', 'demo', [('Angers','49000','49'),('Cholet','49300','49'),('Laval','53000','53'),('Le Mans','72000','72')]),
 ('atlantique-vendee', 'Atlantique Vendée', 'demo', [('Nantes','44000','44'),('Saint-Nazaire','44600','44'),('La Roche-sur-Yon','85000','85'),('Les Herbiers','85500','85')]),
 ('brie-picardie', 'Brie Picardie', 'demo', [('Beauvais','60000','60'),('Compiègne','60200','60'),('Meaux','77100','77'),('Melun','77000','77'),('Amiens','80000','80')]),
 ('cmds', 'Charente-Maritime Deux-Sèvres', 'demo', [('La Rochelle','17000','17'),('Saintes','17100','17'),('Niort','79000','79')]),
 ('centre-ouest', 'Centre Ouest', 'demo', [('Châteauroux','36000','36'),('Limoges','87000','87')]),
 ('aquitaine', 'Aquitaine', 'demo', [('Bordeaux','33000','33'),('Mérignac','33700','33'),('Mont-de-Marsan','40000','40'),('Agen','47000','47')]),
 ('nord-de-france', 'Nord de France', 'demo', [('Lille','59000','59'),('Roubaix','59100','59'),('Arras','62000','62'),('Calais','62100','62')]),
 ('normandie', 'Normandie', 'demo', [('Caen','14000','14'),('Cherbourg','50100','50'),('Saint-Lô','50000','50'),('Alençon','61000','61')]),
 ('normandie-seine', 'Normandie-Seine', 'demo', [('Évreux','27000','27'),('Rouen','76000','76'),('Le Havre','76600','76')]),
 ('alpes-provence', 'Alpes Provence', 'demo', [('Gap','05000','05'),('Marseille','13001','13'),('Aix-en-Provence','13100','13'),('Avignon','84000','84')]),
 ('centre-est', 'Centre-Est', 'demo', [('Bourg-en-Bresse','01000','01'),('Lyon','69001','69'),('Villefranche-sur-Saône','69400','69'),('Mâcon','71000','71'),('Chalon-sur-Saône','71100','71')]),
 ('sud-rhone-alpes', 'Sud Rhône Alpes', 'demo', [('Privas','07000','07'),('Valence','26000','26'),('Grenoble','38000','38')]),
 ('ille-et-vilaine', 'Ille-et-Vilaine', 'demo', [('Rennes','35000','35'),('Saint-Malo','35400','35')]),
 ('cotes-d-armor', 'Côtes d’Armor', 'demo', [('Saint-Brieuc','22000','22'),('Lannion','22300','22')]),
 ('finistere', 'Finistère', 'demo', [('Brest','29200','29'),('Quimper','29000','29')]),
 ('morbihan', 'Morbihan', 'demo', [('Vannes','56000','56'),('Lorient','56100','56')]),
]
deps = {}
for code, nom, mode, villes in CR:
    for v, cp, d in villes:
        assert cp[:2] == d or (d == '75' and cp.startswith('75')), (v, cp, d)
        deps.setdefault(d, code)
        assert deps[d] == code, ('département dans deux CR', d)
data = [{'code': c, 'nom': n, 'mode': m, 'departements': sorted({d for _, _, d in vs}, key=lambda x: vs.index(next(t for t in vs if t[2] == x))),
         'agences': [{'ville': v, 'cp': cp, 'departement': d} for v, cp, d in vs]} for c, n, m, vs in CR]
out = sys.argv[1]
entete = '15/11/2026 · référentiel des Caisses régionales (annexe A du cahier des charges v0.3) : 5 CR pilotes, 17 CR de démonstration, agences des grandes villes · historique : VERSIONS.md'
php = "<?php\n/* Module LM 2.0 — " + entete + " */\n/* Fichier généré par outils/gen_referentiel.py — ne pas modifier à la main. Table département → CR de démonstration, à remplacer par la table officielle des 39 CR. */\n" \
      "declare(strict_types=1);\nif (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }\n" \
      "const LM2_REFERENTIEL = " + json.dumps(data, ensure_ascii=False, indent=1).replace('{', '[').replace('}', ']').replace('": ', '" => ') + ";\n"
open(os.path.join(out, 'lm2-referentiel.php'), 'w', encoding='utf-8').write(php)
js = "/* Module LM 2.0 — " + entete + " */\n/* Fichier généré par outils/gen_referentiel.py — ne pas modifier à la main. */\n(function (r) { r.LM2_REFERENTIEL = " + json.dumps(data, ensure_ascii=False) + "; })(typeof window !== 'undefined' ? window : globalThis);\n"
open(os.path.join(out, 'lm2-referentiel.js'), 'w', encoding='utf-8').write(js)
print(len(data), 'CR,', sum(len(d['agences']) for d in data), 'agences,', sum(1 for d in data if d['mode'] == 'pilote'), 'pilotes')
