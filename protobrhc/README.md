# protobrhc — version C du test A/B : version Standard + couche IA

_Version C 1.6 — 15/11/2026 · renvoi vers VERSIONS.md · historique : VERSIONS.md_




Même principe que `protobrha/` et `protobrhb/` : ce dossier ne contient **que ce qui diffère** du socle `protobrh/`.
La version C reprend le parcours **Standard** et ajoute l'IA à chaque étape, sans modifier les pages du socle.

| Étape | Page | Apport de l'IA | Fichier |
|---|---|---|---|
| Découvrir | index.html | « Expliquez votre situation, l'IA vous oriente » (Assistant BRH) ; FAQ structurée ; `llms.txt` | `ia-accueil.js` |
| Diagnostiquer | diagnostic.html | « Vous hésitez ? » : priorités inspirées des entreprises similaires | `ia-diagnostic.js` |
| Simuler | diagnostic.html, devis.html | « Comprendre mon estimation » et scénarios « Et si… » recalculés par le moteur | `ia-diagnostic.js`, `ia-devis.js` |
| Préconiser | diagnostic.html, devis.html | 2 à 3 pistes justifiées et ordonnées | `ia-diagnostic.js`, `ia-devis.js` |
| Convertir | diagnostic.html, devis.html | Routage vers la Caisse régionale, e-mail de prise en charge, synthèse pour l'expert | `ia-diagnostic.js`, `ia-devis.js` |

- `variante.js` : identifiant de version (`C`) et chargement des modules de la page (devis : `entreprise-lookup.js` du socle, `idcc-devis.js`, puis `ia-devis.js`).
- `entreprise.php` (surcouche du socle, 14/11/2026) : renvoie **toutes** les conventions collectives déclarées (`idcc_liste`), et plus seulement la première.
  Sources sans clé : API publique Recherche d'entreprises, qui alimente le site public annuaire-entreprises.data.gouv.fr (champs `liste_idcc` de l'établissement et de l'entreprise, issus des DSN : c'est aussi la source de Pappers), complétée par siret2idcc (ministères sociaux) pour les intitulés officiels et le lien Légifrance (désactivable : `const IDCC_SIRET2IDCC = false;` dans config.php).
  Le site Pappers n'est pas lu page par page : ses conditions d'utilisation l'interdisent et ses pages bloquent les robots. L'API Pappers reste une option payante, comme dans le socle.
- `idcc-devis.js` (devis, étape 2) : une seule convention déclarée → préremplie ; **plusieurs → toutes affichées et le visiteur choisit** celle qui sert de base au devis (aucune présélection, sauf si elle a déjà été indiquée dans l'audit ou le diagnostic ; « Je ne sais pas » possible ; étape 2 non validée sans choix si la santé-prévoyance est demandée). Chaque choix montre l'intitulé complet, la catégorie couverte et le repère « prévoyance de branche ». Le module place ces conventions en tête de la liste déroulante, déduit le secteur des conventions (puis du NAF), rappelle les autres conventions à l'étape 4 et les transmet à l'expert (lead : `entreprise.idcc` = « 2609 — Bâtiment, ETAM (+ IDCC 2420) », détail dans `entreprise.source_donnees.conventions` ; devis PDF ; synthèse IA).
  Cas de test : BRIAND, SIRET 890 331 754 00014, NAF 70.22Z (conseil) mais IDCC 2420 (cadres du bâtiment) et 2609 (ETAM du bâtiment) → secteur BTP, les deux conventions sont proposées au choix ; la seconde est transmise à l'expert.
- `ia-assist.js` : module commun (appel à `ia.php`, mode démonstration, styles des encadrés).
- `ia.php` : relais Mistral côté serveur (clé `MISTRAL_API_KEY` dans `config.php`, porte d'accès, 80 appels/h/IP, aucune donnée personnelle transmise).
- `connaissances-version.txt` : ce que l'Assistant BRH doit savoir de la version C.

Numéros de version : chaque fichier indique en première ligne sa version (C 1.0 à C 1.6) ; historique et version de chaque fichier dans `VERSIONS.md`.

## Fiche publique de l'entreprise (14/11/2026)

- `entreprise-public.js` : si le serveur ne renvoie pas les conventions collectives (entreprise.php du socle, serveur injoignable), la fiche publique est lue dans le navigateur via l'API ouverte Recherche d'entreprises (conventions DSN, tranche d'effectif INSEE, siège).
- `diag-entreprise.js` (diagnostic) : au SIREN / SIRET, secteur déduit de la convention collective puis du NAF, tranche d'effectif publique affichée sous « Nombre de salariés » (préremplissage au bas de la tranche si rien n'est saisi, rappel si la saisie en sort), département et commune du siège, conventions multiples laissées au choix du devis.
- `idcc-devis.js` utilise le même complément : le choix entre plusieurs conventions fonctionne même avec l'entreprise.php du socle.

## Lead management (14/11/2026)

Module complet de gestion des leads, sur les règles du deck « Scénarios de distribution et niveaux de lead » : niveaux abandonniste / chaud / ultra-chaud, Dossier BRH unique par dirigeant, routage scénario A (département → CR → expert BRH, SOLEAD ou cockpit) et scénario B simulé (SIRET → base clients), workflow en 6 statuts, volets filiales, e-mails journalisés (envoi activable), console nationale.
Fichiers : `lm-base.php`, `lm-api.php`, `lead.php` (surcouche), `lm-cron.php`, `lm-suivi.php`, `suivi-dossier.html`, `cockpit-brh.html` (+ `cockpit-brh-demo.js`, démonstration `cockpit-brh.html?demo=1`), `lm-parcours.js`.
Mode d'emploi, configuration et points à valider : `LISEZMOI_LEAD_MANAGEMENT.md`.

Garde-fous : l'IA ne calcule jamais (elle cite les montants du moteur), réponses JSON imposées (température 0,2),
statut client jamais révélé, mention « orientation indicative » sur chaque réponse, mode démonstration sans clé.

À remplacer avant toute ouverture : benchmark « entreprises similaires » et table département → Caisse régionale
(`ia-assist.js`, données de démonstration), nom de l'expert dans l'e-mail, contenus GEO à valider par la Conformité.

Assemblage local : `python3 outils/assembler_variantes.py c && python3 -m http.server 8766 --directory _site/protobrhc`.
Mise en ligne : job `protobrhc` de `.github/workflows/deploy.yml`, actif dès que les secrets
`PROTOBRHC_FTP_USERNAME` et `PROTOBRHC_FTP_PASSWORD` existent dans GitHub.
