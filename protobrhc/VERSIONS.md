# Versions de protobrhc (version C du portail)

_Version en cours : **C 1.12** — 15/11/2026_

Règle : chaque fichier porte en première ligne la version du paquet dans laquelle il a changé pour la dernière fois. Le nom du zip reprend la version (`protobrhC_AAAAMMJJ_vX.Y_objet.zip`). Dans le navigateur, la console affiche « Version C X.Y — modules chargés : … » ; le cockpit affiche la version dans son en-tête.

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
| C 1.7 | 15/11/2026 | Devis : mise en page du choix des conventions (pleine largeur, compacte, sans champs en double) ; secteur BTP d’après les conventions | protobrhC_20261115_v1.7_publication.zip |
| C 1.8 | 15/11/2026 | Correctif cockpit : « Session expirée » en boucle (la connexion au cockpit détruisait la session de la porte d’accès) | protobrhC_20261115_v1.8_publication.zip |
| C 1.9 | 15/11/2026 | Cohérence des informations entre écrans : contact partagé, demandes complétées, convention et entreprise transmises entre diagnostic, devis et audit, fin de devis alignée sur le dossier | protobrhC_20261115_v1.9_publication.zip |
| C 1.10 | 15/11/2026 | Mise en page cohérente avec le site : éléments ajoutés par la version C (e-mail, consentement, « déjà client ? », conventions, suivi du dossier) aux styles du socle | protobrhC_20261115_v1.10_publication.zip |
| C 1.11 | 15/11/2026 | Devis : e-mail demandé à l’étape « Votre estimation » (« Recevoir mon estimation par e-mail », envoi immédiat) ; « Votre entreprise est-elle déjà cliente ? » en fin de devis ; étape « Votre entreprise » allégée | protobrhC_20261115_v1.11_publication.zip |
| C 1.12 | 15/11/2026 | Nom de l’entreprise reconnue par SIRET reporté dans tous les formulaires de contact (diagnostic, label, audit, newsletter), y compris quand le SIRET est saisi sur la page même | protobrhC_20261115_v1.12_publication.zip |

## Version de chaque fichier

| Fichier | Version | Dernière modification |
|---|---|---|
| `ia-accueil.js` | C 1.0 | IA de l’accueil |
| `ia-assist.js` | C 1.0 | module IA commun |
| `ia-diagnostic.js` | C 1.0 | IA du diagnostic |
| `ia.php` | C 1.0 | relais Mistral (couche IA) |
| `llms.txt` | C 1.0 | contenus GEO (pas d’en-tête : le format llms.txt commence par le titre) |
| `variante.css` | C 1.0 | design de la version C |
| `entreprise.php` | C 1.1 | toutes les conventions collectives déclarées (idcc_liste) |
| `idcc-devis.js` | C 1.10 | une seule convention : ligne discrète, saisie libre masquée ; intitulés de 26 conventions ajoutés (176 Industrie pharmaceutique…) ; cohérence entre écrans (1.9) |
| `suivi-dossier.html` | C 1.10 | page de suivi aux couleurs du site (en-tête, logo, navigation, boutons, pied de page) |
| `LISEZMOI_LEAD_MANAGEMENT.md` | C 1.11 | parcours du devis mis à jour (estimation par e-mail, « déjà client ? » en fin de devis) |
| `cockpit-brh.html` | C 1.11 | tableau de bord : e-mails « estimation demandée » |
| `lm-base.php` | C 1.11 | e-mail « Votre estimation » envoyé à la demande du dirigeant ; e-mail de reprise sans promesse de réponses conservées |
| `lm-parcours.js` | C 1.12 | nom de l’entreprise reconnue par SIRET reporté dans tous les formulaires de contact (même page et écrans suivants), newsletter incluse ; e-mail à l’étape Estimation (1.11) |
| `variante.js` | C 1.12 | version 1.12 ; lm-parcours.js aussi sur la newsletter |
| `cockpit-brh-demo.js` | C 1.3 | démonstration du cockpit |
| `connaissances-version.txt` | C 1.3 | connaissances de l’Assistant BRH |
| `lm-cron.php` | C 1.3 | tâches planifiées |
| `lm-suivi.php` | C 1.3 | suivi du dossier par le dirigeant |
| `entreprise-public.js` | C 1.4 | fiche publique lue dans le navigateur |
| `README.md` | C 1.6 | renvoi vers VERSIONS.md |
| `lm-api.php` | C 1.8 | correctif : session du cockpit séparée de celle de la porte d’accès (le cockpit ne détruit plus la connexion au site) |
| `diag-entreprise.js` | C 1.9 | reprise de l’effectif, du secteur, du département et de l’entreprise déjà indiqués ailleurs |
| `ia-devis.js` | C 1.9 | fin de devis : référence du dossier, Caisse régionale et e-mail identiques au lead management |
| `lead.php` | C 1.9 | réponse : Caisse régionale et canal du dossier |

Fichiers du socle `protobrh/` : non modifiés par la version C ; ne pas redéployer le socle des zips (le socle en ligne est plus récent).
