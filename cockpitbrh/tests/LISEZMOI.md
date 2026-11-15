# Tests de non-régression — module lead management (LM 2.0)

_Module LM 2.0 — 15/11/2026_

À lancer avant chaque livraison du module, et après chaque modification du socle `protobrh/` ou du connecteur :

```bash
cd tests && ./lancer_tests.sh ../module ../sites ~/PROTOBRH/protobrh            # environ 30 secondes
cd tests && ./lancer_tests.sh ../module ../sites ~/PROTOBRH/protobrh --mutations   # + test des tests (environ 5 minutes)
```

Prérequis : `node` 18 ou plus et `python3`. Si `php` est installé, `php -l` est lancé en plus du contrôle statique. Code de sortie 0 si tout passe, 1 sinon.

| Fichier | Ce qui est vérifié |
|---|---|
| `t_statique.py` | Syntaxe JavaScript (fichiers et scripts des pages) ; PHP : requêtes préparées (nombre de « ? », de types et d’arguments), variables lues sans être affectées, fonctions et constantes inconnues (`lib/verif_php2.py`) ; en-tête de version de chaque fichier et `VERSIONS.md` ; aucun secret, aucun `config.php`, adresses e-mail fictives ; `.htaccess` ; sessions, jeton anti-falsification, droits sur chaque lead ; chaque action de la console présente dans l’API et dans la démonstration ; tables et colonnes écrites existantes ; tables `lm_*` jamais modifiées ; chaque règle RG-01 à RG-68 et suggestion S1 à S12 du cahier des charges appliquée quelque part |
| `t_regles.js` | Jours ouvrés et fériés ; délais par type ; 3 types, 5 statuts, issues, statuts client, filiales (JavaScript = PHP) ; déclencheurs des types (§ 3, Q2, RG-07) ; référentiel des CR (annexe A, Q15) ; aide au choix du destinataire dans les 6 cas du § 4.3 ; ordre de la liste et échéances ; contexte de l’IA sans donnée personnelle ; scripts et e-mails de repli ; modèles d’e-mails (serveur = démonstration) ; règles d’envoi réel (RG-60 à RG-68) ; corrections de la relecture indépendante |
| `t_console.js` | Console de démonstration complète : E1 (indicateurs, liste, filtres, fiche), E2 (transfert, « pourquoi », filiales, hors annuaire), E7 (script, compte rendu), E3 (e-mail IA), clôture, rendez-vous, statut client, E6, export CSV, E4 (point de vue du conseiller pro, droits), E8 (annuaire, contrôles, import CSV, changement de mode réversible, désactivation), E9 (envoi), modèles, délais, file « à attribuer », journal, « voir comme l’expert » ; démonstration ouverte chaque jour de la semaine |
| `t_connecteurs.js` | `lm-hub.js` (modes, chargement après la page) ; couche parcours sur les pages du socle S : coordonnées reportées, offres consultées et pages vues seulement avec consentement, « déjà client ? », estimation, devis, preuve de suite ; « Mon dossier » (5 étapes, jamais le type de lead, code SMS Universels) |
| `outils/mutations.py` | Test des tests : 24 erreurs volontaires (seuil, jours fériés, droits, envoi à un fictif, consentement…) doivent toutes être détectées |
