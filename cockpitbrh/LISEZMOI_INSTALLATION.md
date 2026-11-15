# Lead management simplifié (LM 2.0) — installation et premier test

_Module LM 2.0 — 15/11/2026 · cockpitbrh.monsitedetest.com · cahier des charges v0.3 (Q1 à Q22 : propositions par défaut retenues)_

Ce paquet remplace le module 1.1. Il contient le module (`module/`), les fichiers à copier sur les sites (`sites/`), les outils (`outils/`) et les tests (`tests/`). Les tables `lm_*` de la version 1.x restent en base, intactes : la LM 2.0 utilise de nouvelles tables `lm2_*`, créées toutes seules à la première ouverture.

## 1. Tester d’abord sans rien installer (démonstration)

1. Ouvrez `module/console.html?demo=1` (ou, une fois en ligne, `https://cockpitbrh.monsitedetest.com/console.html?demo=1`).
2. Le sélecteur du bandeau ardoise change de point de vue : expert BRH de Val de France (CR en démonstration), expert BRH de Touraine Poitou (CR pilote, annuaire d’illustration), conseiller pro qui a reçu un lien d’accès ponctuel, administrateur.
3. `module/suivi-dossier.html?demo=1` montre « Mon dossier » d’un dirigeant, avec le code SMS simulé de l’espace Universels.

Rien n’est enregistré ni envoyé en démonstration.

## 2. Mettre en ligne le module (Hostinger)

1. hPanel → Fichiers → gestionnaire de fichiers → dossier du sous-domaine `cockpitbrh.monsitedetest.com` (`public_html` du sous-domaine).
2. Supprimez les anciens fichiers 1.x devenus inutiles : `cockpit-brh-demo.js`, `lm-api.php`, `lm-base.php`, `lm-suivi.php`. Gardez votre `config.php`.
3. Déposez **le contenu** du dossier `module/` (y compris `.htaccess` et le dossier `connecteurs/`). L’ancienne adresse `cockpit-brh.html` renvoie vers la nouvelle console.
4. Complétez `config.php` à partir de `config.example.php` (ne le déposez jamais sur GitHub) :
   - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` : la même base que les sites en mode « base partagée » ;
   - `LM_ADMIN_LOGIN`, `LM_ADMIN_PASSWORD` (10 caractères au moins) : votre compte administrateur ;
   - `LM_SITE_URL = 'https://cockpitbrh.monsitedetest.com'` : obligatoire, sinon aucun e-mail réel ne part ;
   - `LM_CLES` : une clé par site en mode relais (inchangé depuis la 1.1) ;
   - facultatif : `MISTRAL_API_KEY` (script d’appel et e-mail par l’IA ; sans clé, la console propose des textes types), `LM_SMTP_*` (§ 4), `LM2_TEST_DIRIGEANTS` (adresse de test pour les e-mails aux dirigeants), `LM2_DOMAINES_CA` (domaines du Crédit Agricole acceptés pour un destinataire hors annuaire).
5. Tâche planifiée : hPanel → Avancé → Tâches Cron, toutes les 15 minutes : `php /home/…/domains/cockpitbrh.monsitedetest.com/public_html/lm-cron.php`. Sans elle, les tâches tournent à l’ouverture de la console.

## 3. Brancher les sites

- **S, A, B** : remplacez `?v=1.1` par `?v=2.0` dans le bloc ajouté à la fin de leur `variante.js` (voir `sites/variante.ajout.js`). Le `lead.php` connecteur (`sites/lead.php`) ne change pas sur le fond ; il peut être recopié tel quel.
- **C** : déposez la version C 2.5 (zip séparé) ; elle contient la même couche parcours.
- Les pages du socle ne sont pas modifiées.

## 4. Envoi réel des e-mails (désactivé par défaut)

1. hPanel → E-mails : créez la boîte `contact@monsitedetest.com` ; notez son mot de passe.
2. hPanel → DNS : vérifiez les enregistrements SPF, DKIM et DMARC du domaine (Hostinger les propose à la création de la boîte).
3. Dans `config.php` : `LM_SMTP_HOST = 'smtp.hostinger.com'`, `LM_SMTP_PORT = 465`, `LM_SMTP_SECURE = 'ssl'`, `LM_SMTP_USER = 'contact@monsitedetest.com'`, `LM_SMTP_PASS = '…'`.
4. Console → Administration → Envoi des e-mails : vérifiez l’état SMTP / SPF / DKIM / DMARC, puis « Envoyer un e-mail de test » vers votre adresse.
5. Activez ensuite, dans cet ordre : l’interrupteur général, la catégorie « Interlocuteurs », puis la CR pilote concernée. Seuls les interlocuteurs **Réel**, actifs, d’une CR **PILOTE** dont l’envoi est activé reçoivent de vrais e-mails. Les e-mails aux dirigeants restent redirigés vers `LM2_TEST_DIRIGEANTS` tant que la catégorie « Dirigeants » est coupée (accord de la Conformité).

## 5. Saisir l’annuaire des 5 CR pilotes

Console → Administration → Caisses régionales et annuaire → choisir la CR pilote → « Ajouter un interlocuteur » ou « Importer un fichier CSV » (modèle téléchargeable dans la fenêtre d’import, annexe D du cahier des charges : séparateur point-virgule, UTF-8). L’aperçu signale les lignes refusées avant tout enregistrement. Pour qu’un expert BRH se connecte, donnez-lui un mot de passe dans sa fiche (champ « Mot de passe de la console ») : il se connecte avec son e-mail professionnel.

## 6. Reprendre les demandes existantes

Console → Administration → Délais et paramètres → « Reprendre les demandes existantes des … derniers jours » : les demandes de la table `leads` déjà reçues deviennent des dossiers LM 2.0, **sans e-mail** aux dirigeants ni aux experts.

## 7. Tests de non-régression

```bash
cd tests && ./lancer_tests.sh ../module ../sites ~/PROTOBRH/protobrh
```

Résultat attendu : « RÉSULTAT : tous les tests passent. » (655 contrôles ; `--mutations` en plus : 24 erreurs volontaires détectées sur 24).

Limite : aucun interpréteur PHP n’était disponible dans l’atelier. Le PHP a été contrôlé statiquement et relu par une seconde analyse indépendante (30 remarques, corrigées ou vérifiées) ; le premier test réel est celui du serveur (§ 2 et § 4).
