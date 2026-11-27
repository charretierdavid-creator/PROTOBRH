#!/usr/bin/env python3
"""Copies de test de la C 3.0 en ligne, avec un FAUX SERVEUR (uniquement pour les tests, jamais publié).
Usage : python3 faire_tests_en_ligne.py <protobrhc/index.html> <dossier_sortie> banc1.js [banc2.js …]
Dans la copie de test, la vraie fonction fetch du navigateur est remplacée par un faux serveur :
  lead.php → {ok:true, reference}, entreprise.php → fiche BRIAND (SIRET 890 331 754 00014, IDCC 2420 et 2609),
  ia.php → refus (Julia répond alors avec ses réponses de repli, comme sans clé Mistral), autres adresses → refus.
Chaque appel est noté dans parent.__fauxServeur (adresse et contenu), lu par les bancs.
"""
import sys, os, json

src, dest, bancs = sys.argv[1], sys.argv[2], sys.argv[3:]
s = open(src, encoding='utf-8').read()
FAUX = r"""var natif=function(u,o){
    var url=String(u&&u.url||u||''), corps=null; try{ corps=o&&typeof o.body==='string'&&o.body.charAt(0)==='{'?JSON.parse(o.body):null; }catch(e){}
    try{ (parent.__fauxServeur=parent.__fauxServeur||[]).push({url:url, body:corps}); }catch(e){}
    var rep=function(x){ return new Promise(function(r){ setTimeout(function(){ r(new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}})); },250); }); };
    if(/(^|\/)lead\.php/.test(url)) return rep({ok:true, reference:'BRH-TEST-0001'});
    if(/(^|\/)entreprise\.php/.test(url)) return /[?&]q=/.test(url) ? rep({resultats:[{nom:'BRIAND',ville:'Les Herbiers',siret:'89033175400014'}]})
      : rep({source:'API Recherche d’entreprises', siren:'890331754', siret:'89033175400014', date:'26/11/2026', nom:'BRIAND', ville:'Les Herbiers', cp:'85500',
             naf:'70.22Z', tranche:'20 à 49 salariés', idcc:'2609', idcc_confirme:false,
             idcc_liste:[{code:'2609',libelle:'',niveau:'entreprise',source:'api',legifrance:'',active:null},{code:'2420',libelle:'',niveau:'entreprise',source:'api',legifrance:'',active:null}],
             idcc_declaree:true, sans_convention:false, verifier:{}});
    if(/(^|\/)ia\.php/.test(url)) return new Promise(function(res,rej){ setTimeout(function(){ rej(new TypeError('faux serveur : IA non simulée')); },400); });
    return Promise.reject(new TypeError('faux serveur : adresse non simulée'));
  };"""
pre = 'const SHIM='
i = s.index(pre) + len(pre)
t, fin = json.JSONDecoder().raw_decode(s[i:])
assert t.count('  var natif=window.fetch;\n') == 1
t = t.replace('  var natif=window.fetch;\n', '  ' + FAUX + '\n')
s2 = s[:i] + json.dumps(t).replace('</', '<\\/') + s[i + fin:]
s2 = s2.replace('<title>Portail Banque des RH — prototype', '<title>TEST faux serveur — Portail Banque des RH — prototype', 1)
os.makedirs(dest, exist_ok=True)
k = s2.rindex('</script>')
for b in bancs:
    js = open(b, encoding='utf-8').read(); assert '</script' not in js.lower(), b
    nom = os.path.join(dest, 'test_' + os.path.basename(b).replace('.js', '') + '.html')
    open(nom, 'w', encoding='utf-8').write(s2[:k] + '\n' + js + '\n' + s2[k:])
    print('écrit', nom)
