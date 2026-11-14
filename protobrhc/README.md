# protobrhc — version C du test A/B : version Standard + couche IA

Même principe que `protobrha/` et `protobrhb/` : ce dossier ne contient **que ce qui diffère** du socle `protobrh/`.
La version C reprend le parcours **Standard** et ajoute l'IA à chaque étape, sans modifier les pages du socle.

| Étape | Page | Apport de l'IA | Fichier |
|---|---|---|---|
| Découvrir | index.html | « Expliquez votre situation, l'IA vous oriente » (Assistant BRH) ; FAQ structurée ; `llms.txt` | `ia-accueil.js` |
| Diagnostiquer | diagnostic.html | « Vous hésitez ? » : priorités inspirées des entreprises similaires | `ia-diagnostic.js` |
| Simuler | diagnostic.html, devis.html | « Comprendre mon estimation » et scénarios « Et si… » recalculés par le moteur | `ia-diagnostic.js`, `ia-devis.js` |
| Préconiser | diagnostic.html, devis.html | 2 à 3 pistes justifiées et ordonnées | `ia-diagnostic.js`, `ia-devis.js` |
| Convertir | diagnostic.html, devis.html | Routage vers la Caisse régionale, e-mail de prise en charge, synthèse pour l'expert | `ia-diagnostic.js`, `ia-devis.js` |

- `variante.js` : identifiant de version (`C`) et chargement des modules IA de la page.
- `ia-assist.js` : module commun (appel à `ia.php`, mode démonstration, styles des encadrés).
- `ia.php` : relais Mistral côté serveur (clé `MISTRAL_API_KEY` dans `config.php`, porte d'accès, 80 appels/h/IP, aucune donnée personnelle transmise).
- `connaissances-version.txt` : ce que l'Assistant BRH doit savoir de la version C.

Garde-fous : l'IA ne calcule jamais (elle cite les montants du moteur), réponses JSON imposées (température 0,2),
statut client jamais révélé, mention « orientation indicative » sur chaque réponse, mode démonstration sans clé.

À remplacer avant toute ouverture : benchmark « entreprises similaires » et table département → Caisse régionale
(`ia-assist.js`, données de démonstration), nom de l'expert dans l'e-mail, contenus GEO à valider par la Conformité.

Assemblage local : `python3 outils/assembler_variantes.py c && python3 -m http.server 8766 --directory _site/protobrhc`.
Mise en ligne : job `protobrhc` de `.github/workflows/deploy.yml`, actif dès que les secrets
`PROTOBRHC_FTP_USERNAME` et `PROTOBRHC_FTP_PASSWORD` existent dans GitHub.
