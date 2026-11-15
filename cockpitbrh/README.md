# cockpitbrh

Répertoire réservé au **cockpit BRH**.

Module lead management (LM 2.0) : console, cockpit, API, suivi des dossiers.
Installation : `LISEZMOI_INSTALLATION.md` ; historique : `VERSIONS.md`.

Mise en ligne : le job `cockpitbrh` de `.github/workflows/deploy.yml` envoie le contenu de `module/` vers
cockpitbrh.monsitedetest.com dès que les secrets `COCKPITBRH_FTP_USERNAME` et `COCKPITBRH_FTP_PASSWORD` existent.
Le `.htaccess` du module et `config.php` ne sont jamais dans le dépôt : ils sont déposés à la main sur le serveur,
avant la création des secrets.
