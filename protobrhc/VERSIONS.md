# Versions de protobrhc (version C du portail)

_Version en cours : **C 2.5** — 15/11/2026_

Règle : chaque fichier porte en première ligne la version du paquet dans laquelle il a changé pour la dernière fois. Le nom du zip reprend le sous-domaine et la version (`protobrhc_AAAAMMJJ_vX.Y_objet.zip`). Dans le navigateur, la console affiche « Version C X.Y — modules chargés : … ».

## Historique des paquets

| Version | Date | Contenu | Zip |
|---|---|---|---|
| C 1.0 | 14/11/2026 | Version Standard + couche IA (Mistral) à chaque étape | CLAUDEV_protobrh_S-A-B-C_20261114.zip |
| C 1.1 | 14/11/2026 | Devis : toutes les conventions collectives déclarées (entreprise.php, idcc-devis.js) | protobrhC_20261114_IDCC.zip (1re version) |
| C 1.2 | 14/11/2026 | Devis : plusieurs conventions → le visiteur choisit, aucune présélection | protobrhC_20261114_IDCC.zip |
| C 1.3 | 14/11/2026 | Lead management : cockpit BRH, tables lm_*, routage A / B simulé, e-mails, suivi du dirigeant ; charte « look v1 » | protobrhC_20261114_LEADS.zip |
| C 1.4 | 14/11/2026 | Diagnostic et devis : fiche publique (secteur, tranche d’effectif, département) | protobrhC_20261114_a_publier.zip (22:32 UTC, celui de la PR) |
| C 1.5 | 14/11/2026 | Devis : filet de sécurité si la page remplit la fiche par son propre chemin ; repère dans la console | protobrhC_20261114_a_publier.zip (22:56 UTC) |
| C 1.6 | 15/11/2026 | lm-api.php derrière la porte d’accès ; numéros de version dans tous les fichiers | protobrhC_20261115_v1.6_publication.zip |
| C 1.7 | 15/11/2026 | Devis : mise en page du choix des conventions ; secteur BTP d’après les conventions | protobrhC_20261115_v1.7_publication.zip |
| C 1.8 | 15/11/2026 | Correctif cockpit : « Session expirée » en boucle | protobrhC_20261115_v1.8_publication.zip |
| C 1.9 | 15/11/2026 | Cohérence des informations entre écrans | protobrhC_20261115_v1.9_publication.zip |
| C 1.10 | 15/11/2026 | Mise en page cohérente avec le site pour les éléments ajoutés par la version C | protobrhC_20261115_v1.10_publication.zip |
| C 1.11 | 15/11/2026 | Devis : estimation par e-mail à l’étape « Votre estimation » ; « déjà cliente ? » en fin de devis | protobrhC_20261115_v1.11_publication.zip |
| C 1.12 | 15/11/2026 | Nom de l’entreprise reconnue par SIRET reporté dans tous les formulaires de contact | protobrhC_20261115_v1.12_publication.zip |
| C 1.13 | 15/11/2026 | Diagnostic : accès au devis (5 à 300 salariés) ; synthèse de l’IA transmise au cockpit (« Argumentaire de vente ») | protobrhC_20261115_v1.13_publication.zip |
| **C 2.0** | 15/11/2026 | **Julia**, assistante RH, en haut de chaque page (question libre, exemples de la page, réponse sous la rubrique, 2 liens au plus) à la place des encadrés IA et de la bulle Assistant BRH ; **lead management sorti de C** (module commun sur cockpitbrh.monsitedetest.com ; lead.php relaie, sinon table leads du socle) ; **fin de devis compacte** sans niveau de lead ; « Audit mutuelle » retiré du bandeau haut | protobrhc_20261115_v2.0_julia-sans-lead-management.zip |
| **C 2.1** | 15/11/2026 | Rubrique Julia allégée : fond clair, sur 2 lignes (Julia et champ de question alignés sur les deux colonnes du bandeau au-dessus, puis les exemples sur une ligne), même largeur que les blocs du dessus ; bouton flottant blanc | protobrhc+cdcbrh_20261115_v2.1_julia-allegee.zip |
| **C 2.2** | 15/11/2026 | Rubrique Julia exactement à la largeur totale du bloc du dessus (texte + carrousel ou photo : mêmes marges que son conteneur, recalculées si la fenêtre change) ; champ « Posez votre question » élargi (toute la place restante) ; texte de gauche resserré sur 2 lignes courtes (« Julia, votre assistante RH » / « vous accompagne tout au long du parcours ») | protobrhc+cdcbrh_20261115_v2.2_julia-pleine-largeur.zip |
| **C 2.3** | 15/11/2026 | Accueil : nouvelle accroche (« Prenez soin de vos équipes, et de votre budget. », sous-titre mutuelle / titres-restaurant / prime de partage / épargne salariale / retraite, « Un expert du Crédit Agricole vous accompagne à chaque étape. ») à la place de l’ancienne, jamais affichée ; « De quoi avez-vous besoin ? » au lieu de « Nos solutions » ; marges blanches entre les blocs réduites | protobrhc+cdcbrh_20261115_v2.3_accueil.zip |
| **C 2.4** | 15/11/2026 | Toutes les entreprises de **1 à 500 salariés** sur tout le parcours (plus de « 5 à 1 000 salariés » au diagnostic, devis de 1 à 500, devis proposé après l’audit de 1 à 500, Julia et consignes de l’IA alignées) ; bouton **« Faire réaliser un devis »** à droite de « 3. Nos solutions » (diagnostic) ; **obligations santé par convention collective** (étude de 150 IDCC du 14/11/2026, lignes « Confirmé » pour le dirigeant, toutes pour l’expert) dans le devis (encadré, part employeur minimale, famille incluse), l’audit mutuelle, la carte « Protéger » du diagnostic, Julia et l’argumentaire | protobrhc+cdcbrh_20261115_v2.4_1-500-sante-ccn.zip |
| **C 2.5** | 15/11/2026 | Branchement sur le module **lead management LM 2.0** : couche parcours 2.0 (identique au module) sur toutes les pages — offres consultées et pages vues transmises avec une demande consentie, « déjà client ? » au « Nous contacter » du diagnostic et à l’estimation, preuve de suite pour le lien « Suivre mon dossier » ; lead.php inchangé sur le fond | protobrhc+cdcbrh_20261115_v2.5_lead-management-2.0.zip |

## Version de chaque fichier

| Fichier | Version | Dernière modification |
|---|---|---|
| `llms.txt` | C 1.0 | contenus GEO (pas d’en-tête : le format llms.txt commence par le titre) |
| `entreprise.php` | C 1.1 | toutes les conventions collectives déclarées (idcc_liste) |
| `entreprise-public.js` | C 1.4 | fiche publique lue dans le navigateur |
| `diag-entreprise.js` | C 1.9 | reprise de l’effectif, du secteur, du département et de l’entreprise déjà indiqués ailleurs |
| `idcc-devis.js` | C 1.10 | une seule convention : ligne discrète ; cohérence entre écrans (1.9) |
| `acces-devis.js` | C 2.4 | 1 à 500 salariés (diagnostic, devis, audit), bouton « Faire réaliser un devis » à droite de « 3. Nos solutions » ; forfait social à partir de 50 salariés (1.13) |
| `ia-julia.js` | C 2.4 | 1 à 500 salariés ; convention santé dans les réponses et les pistes ; pleine largeur (2.2) ; Julia sur chaque page (2.0) |
| `fin-parcours.js` | C 2.4 | argumentaire enrichi de la convention santé (toutes les lignes, statut compris) ; fin de parcours compacte (2.0) |
| `ia-assist.js` | C 2.4 | pistes de démonstration : devis en ligne de 1 à 500 salariés ; module IA commun (2.0) |
| `ia.php` | C 2.4 | 1 à 500 salariés (consignes, base documentaire et grille ajustées sans modifier le socle), convention santé pour Julia ; action « julia » (2.0) |
| `lead.php` | C 2.5 | relais vers le module LM 2.0 (protocole inchangé) si LM_HUB_URL / LM_HUB_CLE, sinon table leads du socle (2.0) |
| `lm-parcours.js` | C 2.5 | couche parcours identique au module LM 2.0 : offres consultées, « déjà client ? », preuve de suite ; encart de suivi laissé à fin-parcours.js (2.0) |
| `variante.js` | C 2.5 | version 2.5 ; lm-parcours.js sur toutes les pages ; sante-ccn.js et acces-devis.js (2.4) |
| `variante.css` | C 2.3 | accueil : anciens textes masqués le temps du remplacement, marges entre les blocs réduites ; « Audit mutuelle » masqué dans le bandeau haut (2.0) |
| `connaissances-version.txt` | C 2.4 | 1 à 500 salariés, complémentaire santé et convention collective ; Julia (2.0) |
| `README.md` | C 2.0 | présentation de la C 2.0 |
| `sante-ccn.js` | C 2.4 | nouveau : obligations santé par convention collective (150 IDCC, étude du 14/11/2026) : devis, audit, diagnostic, Julia, argumentaire |

## Fichiers retirés en C 2.0

| Fichier | Où se trouve désormais la fonction |
|---|---|
| `cockpit-brh.html`, `cockpit-brh-demo.js`, `lm-api.php`, `lm-base.php`, `lm-cron.php`, `lm-suivi.php`, `suivi-dossier.html`, `LISEZMOI_LEAD_MANAGEMENT.md` | module lead management (LM 1.1), sous-domaine cockpitbrh.monsitedetest.com |
| `ia-accueil.js`, `ia-diagnostic.js`, `ia-devis.js` | `ia-julia.js` (aides de l’IA) et `fin-parcours.js` (fin de parcours, argumentaire) |

**À faire sur le serveur protobrhc lors de la mise en ligne** : supprimer ces fichiers s’ils y sont encore (le déploiement FTP ne supprime pas toujours les fichiers retirés), en particulier `lm-api.php` et `cockpit-brh.html`.

Fichiers du socle `protobrh/` : non modifiés par la version C.
