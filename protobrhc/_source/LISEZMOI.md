# _source : fabrication de protobrhc/index.html (C 3.0)

Ce dossier n’est pas servi au public : son `.htaccess` est « Require all denied », et `acces.php` refuse `_source/`.

## Reconstruire index.html

`bash protobrhc/_source/construire.sh` (python3 requis)

La chaîne part de la démo v2 des sites A et B (`Portail_BRH_demo_CSA_20261123_v2_sites_AB.html`, 23/11/2026). Chaque étape ajoute une couche sans modifier les blocs PAGES et `__BRH_MOD` (contrôlé à chaque étape) :

| Étape | Script | Couches ajoutées |
|---|---|---|
| V3 (24/11) | `…v3_precautions_build.py` | bandeau et précautions d’usage (`precautions_demo.js`) |
| V4 (26/11) | `…v4_parcours_build.py` | menu en 4 phases, précautions en bas de chaque écran (`precautions_demo_v4.js`), parcours simplifiés (`parcours_v4_demo.js`) |
| V4.1 (26/11) | `…v4.1_julia_B_build.py` | site B : Julia en fenêtre flottante (`julia_flottante_b.js`) |
| C 3.0 (26/11) | `Portail_BRH_C3.0_en_ligne_build.py` | réseau réel (ia.php, entreprise.php, lead.php avec `parcours_ab`), liens externes en nouvel onglet, aperçu d’e-mail simulé retiré, mentions « prototype » |

Le script de la v2 (`…v2_sites_AB_build.py`, avec `julia_fermer_demo.js`, `dossier_brh_demo.js` et `boite_mail_demo.js`) est gardé pour référence. La démo source dont il part n’est pas dans le dépôt.

**Pour faire évoluer le site** : modifier la couche concernée (par exemple `parcours_v4_demo.js`), relancer `construire.sh`, puis lancer les tests. Ne jamais modifier `index.html` à la main : `t_c30.py` le refuse.

## Tests dans le navigateur

`python3 faire_tests_en_ligne.py ../index.html /tmp/tests_c3 Portail_BRH_C3.0_banc_test_en_ligne.js Portail_BRH_C3.0_banc_test_dossier_en_ligne.js Portail_BRH_demo_CSA_20261126_v4_banc_test.js Portail_BRH_demo_CSA_20261126_v4.1_banc_test_julia_A.js Portail_BRH_demo_CSA_20261126_v4.1_banc_test_julia_B.js`

La commande crée une copie de la page avec un faux serveur, qui répond à lead.php et entreprise.php (fiche BRIAND) et refuse ia.php. Ouvre ensuite chaque fichier créé et attends 1 à 2 minutes : le rapport s’affiche par-dessus la page. Résultats du 26/11/2026 : en ligne 14/14, parcours V4 106/106, Julia B 43/43, Julia A 58/58, Mon dossier 31/31.
