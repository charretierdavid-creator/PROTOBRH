# Lead management du Portail BRH — version C (protobrhc)

_Version C 1.3 — 14/11/2026 · mode d’emploi du lead management · historique : VERSIONS.md_




Module de gestion des leads du prototype, construit sur les règles du deck « Scénarios de distribution et niveaux de lead » du 14/11/2026 et sur la base MySQL existante (table `leads` de `lead.php`). Il ne modifie ni le socle `protobrh/` ni les versions A et B : tous les fichiers sont dans `protobrhc/`.

## Ce que fait le module

| Étape | Règle appliquée | Où |
|---|---|---|
| Qualifier le lead | Trois niveaux selon l'avancée : **abandonniste** (simulation ou label RH, e-mail laissé), **chaud** (offre choisie, devis non terminé, ou demande de contact), **ultra-chaud** (devis configuré, coordonnées données = Dossier BRH transmis) | `lm-base.php` |
| Un dossier par dirigeant | Les demandes successives (même e-mail, ou même SIREN) sont fusionnées dans un seul Dossier BRH ouvert ; le niveau ne fait que monter | `lm-base.php` |
| Délais cibles | Ultra-chaud : 24 h ouvrées ; chaud : 48 h ouvrées ; abandonniste : relances J+1 et J+7. Les jours ouvrés excluent les week-ends et les jours fériés. Un rappel demandé fixe le délai à 24 h ouvrées | `lm-base.php` |
| Identifier et router (scénario A, pilote) | Département de l'entreprise → Caisse régionale → expert BRH référent, par SOLEAD ou dans le cockpit selon la CR. L'expert confie les pros au conseiller pro. Département inconnu : file nationale | `lm-base.php` |
| Identifier et router (scénario B, cible, **simulé**) | SIRET rapproché d'une base clients de démonstration. Client vérifié → sa CR, son marché et son portefeuille (CRM PART/PRO ou ENTREPRISE + alerte PUC, simulés). Prospect → scénario A. Rien n'est affiché au visiteur | `lm-base.php`, Paramétrage du cockpit |
| Workflow commun | 6 statuts : Déposé → Attribué → Pris en charge → Qualifié → Proposé → Clôturé (issue : signé, perdu, sans suite, injoignable, doublon) | cockpit, suivi dirigeant |
| Une vue par filiale | CA Assurances (Prévis), Amundi / CA Titres (Universels), Worklife (devis e-mail) font avancer leur volet ; l'expert BRH reste maître du dossier | cockpit |
| E-mails | Au dirigeant : « votre expert vous rappelle », reprise du devis, relances J+1 / J+7, prise en charge « par M. X de la CR Y », rendez-vous. En interne : SOLEAD, nouveau lead, CRM simulé, alerte de délai. **Générés et journalisés ; envoi réel seulement si `LM_EMAIL_ENVOI = true`** | `lm-base.php` |
| Console nationale | Tableau de bord (niveaux, délais tenus par CR, délai moyen, volets, e-mails), distribution (à qui chaque lead est allé), paramétrage (CR, comptes, base clients B, règles) | cockpit |

## Fichiers (tous dans `protobrhc/`)

| Fichier | Rôle |
|---|---|
| `lm-base.php` | Schéma MySQL (tables `lm_*`), référentiels, règles, fusion, routage, e-mails, tâches planifiées. Inclus par les autres scripts |
| `lm-api.php` | API JSON du cockpit : connexion, droits par rôle, file, fiche, actions, statistiques, paramétrage |
| `lead.php` | Surcouche du `lead.php` du socle : enregistre la demande comme avant, puis l'intègre au lead management et renvoie la référence du dossier et le lien de suivi |
| `lm-cron.php` | Tâches planifiées : rattrapage, relances, e-mail de reprise, alertes de délai |
| `lm-suivi.php` + `suivi-dossier.html` | Page de suivi du dirigeant (lien des e-mails et de la fin de devis) : 6 statuts, interlocuteur, rendez-vous, « être rappelé », arrêt des relances |
| `cockpit-brh.html` | Le cockpit : console de l'expert BRH, des filiales et de la console nationale, à la charte de la maquette « Parcours dirigeant Prévis / Universels / Worklife » (look v1) |
| `cockpit-brh-demo.js` | Démonstration sans serveur : `cockpit-brh.html?demo=1` (données fictives, mêmes règles) |
| `lm-parcours.js` | Remontée des leads depuis le parcours C : case facultative au déverrouillage du diagnostic (abandonniste), e-mail facultatif et « déjà client ? » à l'étape « Votre entreprise » du devis (chaud), suivi de l'étape, encart « Suivre mon dossier » en fin de devis |
| `variante.js` | Charge `lm-parcours.js` sur le diagnostic et le devis |

## Tables MySQL créées au premier appel

`lm_dossiers` (dossiers), `lm_dossier_leads` (demandes rattachées), `lm_journal` (historique), `lm_emails` (e-mails générés), `lm_users` (comptes du cockpit), `lm_cr` (Caisses régionales, préremplie avec la table de démonstration département → CR d'`ia-assist.js`), `lm_clients` (base clients du scénario B simulé), `lm_meta`. Conservation : 12 mois après la dernière mise à jour, comme les demandes.

## Mise en ligne

1. Déployer `protobrhc/` comme d'habitude (assemblage socle + surcouche).
2. Compléter `config.php` sur le serveur de la version C (rien n'est obligatoire, ces valeurs ont un défaut) :

```php
// Lead management (version C)
const LM_ADMIN_LOGIN    = 'national';            // compte national d'amorçage (à défaut : ADMIN_LOGIN)
const LM_ADMIN_PASSWORD = 'au moins 10 caractères';
const LM_EMAIL_ENVOI    = false;                 // true = envoi réel par mail() ; false = e-mails journalisés
const LM_EMAIL_REDIRECTION = 'equipe-projet@…';  // prototype : tous les e-mails envoyés à cette adresse
const LM_EMAIL_FROM     = 'Banque des RH <ne-pas-repondre@…>';
const LM_SITE_URL       = 'https://protobrhc.monsitedetest.com';
const LM_CRON_TOKEN     = 'jeton-long-et-aleatoire';
```

3. Ouvrir `cockpit-brh.html`, se connecter avec le compte national, puis Paramétrage → Comptes → « Créer les comptes de démonstration » (3 experts référents : Touraine Poitou, Atlantique Vendée, Pyrénées Gascogne ; 3 filiales). Les mots de passe ne s'affichent qu'une fois.
4. Paramétrage → Caisses régionales : choisir le canal (SOLEAD ou cockpit), l'adresse SOLEAD et le scénario (A ou B) de chaque CR pilote. Pour montrer le scénario B : passer une CR en B et ajouter quelques SIREN dans « Base clients ».
5. Tâche cron Hostinger toutes les 15 minutes : `php …/lm-cron.php` (sinon les tâches tournent à l'ouverture du cockpit, au plus toutes les 10 minutes). En ligne de commande, `LM_SITE_URL` est obligatoire : c'est la base des liens des e-mails.
6. Heures : PHP et MySQL sont alignés sur Europe/Paris (délais, jours fériés, heures de relance).

## Points à valider

- Délais cibles et règle « pro / entrepreneur » (moins de 50 salariés **ou** moins de 3 M€ de CA : ET / OU à trancher) : avec les CR, lors du diagnostic de la gestion des leads.
- Classement des demandes de contact (diagnostic, label, audit mutuelle) en « chaud » : extension proposée, absente du deck.
- Table département → CR, adresses SOLEAD et experts référents : données de démonstration à remplacer.
- Scénario B : simulé sur une base de démonstration ; dans la cible, rapprochement côté serveur avec la base clients centralisée des CR (à cadrer avec CATS : secret bancaire, consentement), flux CRM et alerte PUC.
- Page de suivi du dirigeant (`suivi-dossier.html`, `lm-suivi.php`) : derrière la porte d'accès du prototype, comme tout le site ; à en sortir avant tout envoi réel d'e-mails à des dirigeants.
- Textes des e-mails au dirigeant et mentions de consentement : à faire valider par la Conformité avant tout envoi réel.

## Tests réalisés

- Règles, parcours et cockpit testés en JavaScript (banc node et démonstration rendue à l'écran : file, fiche, données transmises, journal, tableau de bord, vue filiale, suivi dirigeant).
- Relecture indépendante du PHP (plantages, SQL, sécurité, règles) : corrections intégrées (CA en BIGINT, heure de Paris, routage sans recul de statut, rappel à 24 h idempotent, verrou des tâches, niveau jamais renvoyé au navigateur…).
- PHP **non exécuté** (aucun interpréteur dans l'environnement de travail) : contrôle statique des parenthèses, des fonctions appelées et de chaque requête préparée (nombre de « ? », de types et d'arguments). Premier passage à faire sur le serveur de test, en commençant par `cockpit-brh.html?demo=1`, puis une demande réelle de bout en bout (diagnostic → devis commencé → devis envoyé).
