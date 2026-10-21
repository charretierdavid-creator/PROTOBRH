#!/usr/bin/env python3
"""Assemble les versions A et B du prototype pour le test A/B.

Chaque version = le socle commun (dossier protobrh/, version de référence)
                 + les fichiers propres à la version (dossier protobrha/ ou protobrhb/), qui remplacent ceux du socle.

Usage : python3 outils/assembler_variantes.py [a] [b]   (sans argument : les deux)
Résultat : _site/protobrha/ et _site/protobrhb/ (dossier ignoré par Git), envoyés sur Hostinger par le déploiement.
Test local : python3 -m http.server 8766 --directory _site/protobrha
"""
import os, shutil, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOCLE = os.path.join(RACINE, 'protobrh')
# Propres à chaque site sur Hostinger : jamais copiés depuis le dépôt
EXCLUS = {'config.php', 'data', '.ftp-deploy-sync-state.json'}


def assembler(v):
    src = os.path.join(RACINE, 'protobrh' + v)
    out = os.path.join(RACINE, '_site', 'protobrh' + v)
    if not os.path.isdir(src):
        sys.exit(f'Dossier introuvable : {src}')
    shutil.rmtree(out, ignore_errors=True)
    shutil.copytree(SOCLE, out, ignore=lambda d, noms: [n for n in noms if n in EXCLUS])
    propres = []
    for d, _, fichiers in os.walk(src):
        for f in fichiers:
            if f in EXCLUS:
                continue
            chemin = os.path.join(d, f)
            cible = os.path.join(out, os.path.relpath(chemin, src))
            os.makedirs(os.path.dirname(cible), exist_ok=True)
            shutil.copy2(chemin, cible)
            propres.append(os.path.relpath(chemin, src))
    print(f'Version {v.upper()} : socle protobrh/ + {len(propres)} fichier(s) propre(s) ({", ".join(sorted(propres))}) -> {os.path.relpath(out, RACINE)}/')


for v in (sys.argv[1:] or ['a', 'b']):
    assembler(v.lower())
