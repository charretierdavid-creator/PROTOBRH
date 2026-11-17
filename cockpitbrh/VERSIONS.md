# Module lead management BRH — historique des versions

_Version en cours : **LM 2.0.1** — 15/11/2026_

_En démonstration : **LM 3.0** — 16/11/2026 (`console3.html`, données fictives ; la LM 2.0.1 reste en service)_

Module autonome, déployé sur le sous-domaine `cockpitbrh.monsitedetest.com` (dossier `cockpitbrh/` du dépôt), commun aux sites du portail S (socle `protobrh`), A, B et C. Depuis la LM 2.0, il applique le cahier des charges « Lead management simplifié » v0.3 du 15/11/2026, avec les propositions par défaut des questions Q1 à Q22 retenues par David CHARRETIER.

## Paquets

| Version | Date | Contenu |
|---|---|---|
| LM 1.0 | 15/11/2026 | Première version autonome, extraite de la version C 1.13 : niveaux abandonniste, chaud, ultra-chaud ; Dossier BRH ; routage A / B ; 6 statuts ; volets filiales ; e-mails journalisés ; trois modes de branchement ; `collecte.php`, `sites/lead.php`, `lm-hub.js`. |
| LM 1.1 | 15/11/2026 | Adresse du module : `cockpitbrh.monsitedetest.com`. Aucune règle de gestion modifiée. |
| LM 2.0 | 15/11/2026 | **Lead management simplifié** (cahier des charges v0.3). Trois types de leads (qualifié, ultra-qualifié, demande de devis) et cinq statuts ; console de l’expert BRH réduite à 3 indicateurs, une liste, une fiche et 5 actions ; statut client déclaratif puis vérifié ; aide au choix de l’expert BRH PRO ou du conseiller pro, expliquée ; transferts avec accès ponctuel (lien personnel 14 jours, code par e-mail si l’envoi réel est actif) ; script d’appel et e-mail personnalisé par l’IA (Mistral, sans donnée personnelle) avec repli sans IA ; compte rendu d’appel ; « Mon dossier » du dirigeant en 5 étapes et accès Universels par code SMS (simulé) ; administration : 5 CR pilotes (Touraine Poitou, Pyrénées Gascogne, Centre Loire, Franche-Comté, Paris et Île-de-France) et 17 CR de démonstration, annuaire réel ou fictif, import CSV, envoi réel des e-mails depuis contact@monsitedetest.com (SMTP), modèles, délais, file « à attribuer », journal ; démonstration sans serveur (`console.html?demo=1`). Nouvelles tables `lm2_*` (les tables `lm_*` de la 1.x ne sont ni lues ni modifiées) ; reprise de la table `leads`. Couche parcours 2.0 : offres consultées et pages vues (session, avec consentement), « déjà client ? » au diagnostic et à l’estimation. Relecture indépendante du PHP : 30 remarques corrigées (sécurité du lien de suivi, accès après réouverture, alertes, tâches planifiées). |
| LM 2.0.1 | 15/11/2026 | Correctif de la console : l’onglet « Annuaire pro et filiales » ne reste plus sur « Chargement… ». Vu par l’administrateur (rattaché à aucune CR), il renvoie vers Administration → Caisses régionales et annuaire ; en cas d’erreur du serveur, le message s’affiche avec « Réessayer ». `console.js` et ses tests uniquement ; aucune règle de gestion modifiée. |
| LM 3.0 (démonstration) | 16/11/2026 | **Console simplifiée** selon le cahier des charges V2.13 (pages P1 et P4, maquettes cibles G3) : trois types de lead (Simulation réalisée, Devis en cours ou réalisé, Être rappelé ; le type reflète l’étape la plus avancée, un rappel joint devient « Rappel demandé ») ; trois statuts de traitement (Nouveau, En cours, Clôturé), « Transmis » devenant un changement de propriétaire suivi par le filtre « Transmis par moi » ; décision « Entreprise ou Pro ? » par l’expert, segment « Entreprise a priori » à partir de 50 salariés ; même console et compte permanent (identifiant = e-mail pro) pour l’expert BRH, l’expert BRH Pro et le conseiller Pro ; transmission à un collègue avec mot, prise en charge ou renvoi motivé ; prochaine étape, rendez-vous, note, téléphone, clôture avec motif et réouverture ; échéance d’origine conservée, en médaillon bordeaux ou vert ; dates sans heure ; e-mails journalisés ; vue administrateur en lecture seule avec compteurs par type ; annuaire ; arrivée simulée de demandes des sites S, A, B et C avec rattachement au lead ouvert de la même entreprise. **Démonstration sans serveur** (`console3.html`, état gardé dans le navigateur, réinitialisable) : le raccordement à l’API et aux tables MySQL viendra après validation. Tests : `t_lm3.js` (69 contrôles) et parcours navigateur (33 contrôles). |

## Version de chaque fichier

| Fichier | Version | Rôle |
|---|---|---|
| `module/lm2-base.php` | LM 2.0 | Cœur : tables `lm2_*`, 3 types de leads, dossier unique, routage, statut client, transferts et accès, e-mails (SMTP), IA, Universels, tâches |
| `module/lm2-referentiel.php` | LM 2.0 | Référentiel des Caisses régionales, agences et CR pilotes (généré par `outils/gen_referentiel.py`) |
| `module/lm2-referentiel.js` | LM 2.0 | Même référentiel pour la console et la démonstration (généré) |
| `module/lm2-regles.js` | LM 2.0 | Règles partagées : types, statuts, jours ouvrés, suggestion du destinataire, scripts et e-mails de repli |
| `module/lm2-api.php` | LM 2.0 | API de la console : expert BRH, accès ponctuel, administration |
| `module/lm2-suivi.php` | LM 2.0 | « Mon dossier » du dirigeant, code SMS Universels |
| `module/collecte.php` | LM 2.0 | Point d’entrée des sites (modes relais et navigateur), demandes intégrées aux dossiers `lm2_*` |
| `module/lm-cron.php` | LM 2.0 | Tâches planifiées : intégration, relances, alertes, récapitulatif de 8 h, nouvel essai des e-mails |
| `module/lm-db.php` | LM 2.0 | Connexion MySQL et table des demandes `leads` (inchangée depuis 1.0) |
| `module/console.html` | LM 2.0 | Console : écrans E1 à E9 (look console v1) |
| `module/console.js` | LM 2.0.1 | Application de la console |
| `module/console-demo.js` | LM 2.0 | Démonstration sans serveur (`console.html?demo=1`), mêmes réponses que l’API |
| `module/suivi-dossier.html` | LM 2.0 | « Mon dossier » du dirigeant (E5), démonstration `?demo=1` |
| `module/universels-demo.html` | LM 2.0 | Espace Universels de démonstration (Q10) |
| `module/index.html` | LM 3.0 | Accueil du sous-domaine (lien vers la démonstration LM 3.0) |
| `module/cockpit-brh.html` | LM 2.0 | Ancienne adresse du cockpit 1.x : redirection vers la console |
| `module/config.example.php` | LM 2.0 | Modèle de `config.php` (à ne jamais committer) |
| `module/.htaccess` | LM 2.0 | Protection : configuration, bibliothèques, dossiers techniques |
| `module/connecteurs/lm-hub.js` | LM 2.0 | Chargeur côté site ; couche parcours chargée après les scripts de la page |
| `module/connecteurs/lm-parcours.js` | LM 2.0 | Couche parcours commune : coordonnées, estimation, « déjà client ? », offres consultées, suivi |
| `module/logo-brh.png` | LM 1.0 | Logo de la page « Mon dossier » |
| `module/console3.html` | LM 3.0 | Console simplifiée (démonstration) : page et styles, piste graphique G3 |
| `module/console3.js` | LM 3.0 | Application de la console simplifiée (démonstration, état dans le navigateur) |
| `module/lm3-regles.js` | LM 3.0 | Règles de gestion de la console simplifiée : types, statuts, échéances, segment, transmission, renvoi, clôture, arrivée des demandes |
| `module/lm3-demo.js` | LM 3.0 | Données fictives de la démonstration (7 comptes, 17 leads) |
| `sites/lead.php` | LM 2.0 | Connecteur relais : remplace le `lead.php` d’un site (protocole inchangé) |
| `sites/config-site.ajout.php` | LM 2.0 | Deux constantes à ajouter au `config.php` du site |
| `sites/variante.ajout.js` | LM 2.0 | Bloc à ajouter au `variante.js` des sites S, A, B |
| `outils/gen_referentiel.py` | LM 2.0 | Génère le référentiel PHP et JS (annexe A) |
| `outils/apercus.py` | LM 2.0 | Aperçus autonomes de la démonstration (contrôle visuel) |
| `tests/lancer_tests.sh` | LM 2.0 | Tests de non-régression du module (un seul lancement) |

## Fichiers du module 1.x à retirer du serveur

`cockpit-brh-demo.js`, `lm-api.php`, `lm-base.php`, `lm-suivi.php` ne sont plus utilisés. Les tables `lm_*` restent en base, intactes ; elles peuvent être supprimées plus tard.

Règle : la première ligne de chaque fichier porte « Module LM X.Y — date · objet », où X.Y est la version de sa dernière modification. Le numéro est incrémenté à chaque livraison. Nom du zip : `cockpitbrh_AAAAMMJJ_vX.Y_objet.zip`.
