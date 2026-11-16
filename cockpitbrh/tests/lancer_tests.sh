#!/usr/bin/env bash
# Module LM 2.0 — 15/11/2026 · tests de non-régression du module lead management simplifié · historique : VERSIONS.md
# =============================================================================
# Usage : ./lancer_tests.sh <dossier module> <dossier sites> <dossier du socle protobrh> [--mutations]
#   ex. : cd tests && ./lancer_tests.sh ../module ../sites ~/PROTOBRH/protobrh
# Prérequis : node (18 ou plus) et python3 ; php facultatif (sinon contrôle statique renforcé du PHP).
# --mutations : vérifie en plus que les tests détectent 24 erreurs volontaires (environ 5 minutes).
# Code de sortie 0 si tout passe, 1 sinon. À lancer avant chaque livraison du module.
# =============================================================================
set -u
ICI="$(cd "$(dirname "$0")" && pwd)"
M="${1:?dossier module}"; S="${2:?dossier sites}"; SOCLE="${3:?dossier du socle protobrh}"
echo "Tests de non-régression — module lead management ($(grep -o 'Version en cours : \*\*LM [0-9.]*' "$M/../VERSIONS.md" 2>/dev/null | sed 's/.*\*\*//'))"
echo "  module : $M"; echo "  sites : $S"; echo "  socle : $SOCLE"; echo
KO=0
python3 -I "$ICI/t_statique.py" "$M" "$S" || KO=1
node "$ICI/t_regles.js" "$M" || KO=1
node "$ICI/t_lm3.js" "$M" || KO=1
node "$ICI/t_console.js" "$M" || KO=1
node "$ICI/t_connecteurs.js" "$M" "$SOCLE" || KO=1
if [ "${4:-}" = "--mutations" ]; then python3 -I "$ICI/outils/mutations.py" "$M" "$S" "$SOCLE" || KO=1; fi
echo
if [ $KO -eq 0 ]; then echo "RÉSULTAT : tous les tests passent."; else echo "RÉSULTAT : ÉCHEC — ne pas publier."; fi
exit $KO
