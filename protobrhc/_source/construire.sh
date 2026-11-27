#!/bin/bash
# Reconstruit protobrhc/index.html (version C 3.0) à partir de la démo v2 des sites A et B.
# Usage : bash protobrhc/_source/construire.sh        (python3 requis)
# Chaîne : v2 → V3 précautions → V4 parcours → V4.1 Julia flottante sur B → C 3.0 en ligne.
set -euo pipefail
ICI="$(cd "$(dirname "$0")" && pwd)"; T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
cd "$ICI"
python3 Portail_BRH_demo_CSA_20261124_v3_precautions_build.py Portail_BRH_demo_CSA_20261123_v2_sites_AB.html "$T/v3.html"
python3 Portail_BRH_demo_CSA_20261126_v4_parcours_build.py "$T/v3.html" "$T/v4.html"
python3 Portail_BRH_demo_CSA_20261126_v4.1_julia_B_build.py "$T/v4.html" "$T/v41.html"
python3 Portail_BRH_C3.0_en_ligne_build.py "$T/v41.html" "${1:-$ICI/../index.html}"
echo "✓ index.html reconstruit. Tests : python3 faire_tests_en_ligne.py ../index.html /tmp/tests_c3 *banc_test*.js, puis ouvrir les fichiers créés."
