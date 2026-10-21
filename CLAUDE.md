# Portail Banque des RH — consignes permanentes pour Claude Code

> Ce fichier est relu par Claude Code au début de chaque session. Il fixe les règles du projet.
> Business Owner : David CHARRETIER. Langue de travail : **français**.

## 1. Contexte

Projet 15C « Portail Banque des RH » (Crédit Agricole Entreprises) : un portail qui attire les dirigeants,
diagnostique leurs besoins RH, simule les gains, propose un devis et **transmet un lead qualifié à l'expert
BRH de la Caisse Régionale** (Web-to-CR via SOLEAD). Le portail alimente les CR, il ne les contourne jamais.

Le dépôt contient deux sites qui évoluent **ensemble** :

| Dossier | Site | Rôle |
|---|---|---|
| `protobrh/` | protobrh.monsitedetest.com | Prototype exploratoire (support de test, pas le produit final) |
| `cdcbrh/` | cdcbrh.monsitedetest.com | Cahier des charges interactif (spécification vivante du prototype) |
| `protobrha/` | protobrha.monsitedetest.com | Test A/B — version A : parcours simplifié, design épuré et moderne |
| `protobrhb/` | protobrhb.monsitedetest.com | Test A/B — version B : parcours complet, design institutionnel |

### Test A/B : un socle, trois versions

- `protobrh/` est la version **Standard** (code `REF`) et le **socle commun** : contenus, offres, calculs, audit, assistant, devis, PHP.
- `protobrha/` et `protobrhb/` ne contiennent **que ce qui diffère** : `variante.css` (design) et `variante.js`
  (identifiant de version + adaptations du parcours), et si besoin une page entière qui remplace celle du socle.
- `outils/assembler_variantes.py` assemble socle + fichiers propres dans `_site/protobrha/` et `_site/protobrhb/`
  (ignoré par Git) ; le déploiement le lance avant l'envoi FTP. Test local :
  `python3 outils/assembler_variantes.py && python3 -m http.server 8766 --directory _site/protobrha`.
- Chaque page du socle charge `variante.css` et `variante.js` (fin du `<head>`) : toute nouvelle page doit les charger.
- Les règles de `variante.css` portent sur `html[data-variante="A"]` (ou `B`) pour passer devant les styles des pages.
- La version (`REF`, `A`, `B`) est jointe à chaque événement de mesure et à chaque demande transmise
  (`window.BRH_VARIANTE`, donnée D104). Toute nouvelle demande transmise doit l'inclure.
- Avis « Votre avis » : les trois sites écrivent dans la même base MySQL (celle de protobrh, `config.php` commun) ;
  `feedback.php` remplit la colonne `version` (S, A, B) d'après l'adresse du site.
- Où coder une évolution : **Toutes versions** ou **Référence** → socle `protobrh/` (attention : une évolution du
  socle s'applique aussi à A et B, sauf si leur `variante.js`/`variante.css` la neutralise) ; **Version A** ou
  **Version B** → uniquement dans `protobrha/` ou `protobrhb/`.

Chaque push sur `main` est **déployé automatiquement** par Hostinger. Ne jamais pousser sur `main` sans l'accord explicite de David.

## 2. Règle d'or — Definition of Done d'une évolution

Une évolution n'est terminée que si les **trois** éléments suivants sont livrés dans la même pull request :

1. **Le prototype** est modifié dans `protobrh/`.
2. **Le cahier des charges** est mis à jour : modifier `cdcbrh/_source/app_data.json` (page de l'écran concerné :
   exigences, règles de gestion, données produites), puis régénérer avec `python3 cdcbrh/_source/gen_static.py`.
   Ne jamais modifier `cdcbrh/index.html` à la main.
   Test A/B : une page propre à une version porte `"var":["A"]` (ou `["B"]`) ; une exigence propre à une version
   prend un 3ᵉ élément, ex. `["Texte", "MVP", ["A"]]`. Sans indication, la page ou l'exigence vaut pour toutes les versions.
   Si l'évolution change le parcours (nouvelle étape ou nouveau module), mettre à jour le schéma avec
   `python3 cdcbrh/_source/gen_map.py` : les étapes du chemin critique restent sur la courbe ; les modules
   complémentaires (ressources, assistant, audit mutuelle…) vont dans la liste `ADDONS`, sous le parcours principal.
3. **Le journal** `cdcbrh/journal.json` reçoit une nouvelle entrée **en tête de liste** :

```json
{"version":"V0.6","date":"JJ/MM/AAAA","type":"Prototype + cahier des charges","cible":"TOUTES","pages":["É07"],
 "desc":"Ce qui a changé, en une phrase claire.","origine":"Commentaire validé [id] — Auteur"}
```

`type` vaut `Prototype`, `Cahier des charges` ou `Prototype + cahier des charges`.
`cible` vaut `TOUTES`, `REF`, `A`, `B` ou une liste (ex. `["A","B"]`) : la version du prototype concernée.
Un commentaire ou une idée porte la même « Version cible », confirmée par David à la validation (« Affecter à ») :
la respecter pour choisir le dossier à modifier.
Si l'évolution vient d'un commentaire, citer son identifiant dans `origine`.

Si une demande ne touche qu'un des deux sites, le dire explicitement dans le résumé.

## 3. Ce qu'il ne faut jamais faire

- Ne jamais modifier, lire pour les publier ou committer : `cdcbrh/data/` (commentaires), `cdcbrh/config.php` (clé
  d'administration), `protobrh/config.php`, `protobrha/config.php`, `protobrhb/config.php`, les fichiers `.htpasswd`, ni aucune clé d'API.
- Ne jamais écrire une clé d'API dans le code : elle se lit dans `config.php` (ignoré par Git).
- Aucune donnée client réelle dans le dépôt (noms, SIRET réels, e-mails) : données fictives uniquement.
- Ne jamais supprimer une exigence ou une page du cahier des charges sans l'accord de David.
- Ne pas introduire de framework, d'étape de build ni de dépendance externe lourde.

## 4. Conventions du projet

- **Pages du cahier des charges** : codes `É01` à `É26` (écrans), `P1`, `P2` (processus back-office), `H` (Assistant BRH),
  `VA`, `VB` (fiches des versions A et B du test A/B).
  Une nouvelle page d'écran prend le code suivant libre (`É27`…) et doit être reliée à une étape du parcours.
- **Priorités** : `MVP`, `V2`, `ARB` (à arbitrer).
- **Données produites** : identifiants `D01`… `D104` ; une nouvelle donnée prend le code suivant libre et s'ajoute au
  dictionnaire (`data` dans `app_data.json`) avec écran, nature (P, E, C, T) et exemple.
- **Technique** : fichiers HTML/CSS/JS autonomes, sans framework ; images intégrées quand c'est possible.
- **Accès protégé** : les deux sites passent par `acces.php` (même modèle que Diagnostic Conseil BRH :
  identifiant et mot de passe communs dans `config.php` — `ACCES_LOGIN`, `ACCES_PASSWORD` —, session 10 h, blocage
  après 8 essais). Tout nouveau script PHP appelé par les pages commence par `require_once __DIR__ . '/acces.php'; brh_acces_api();`.
  `acces.php` est identique dans `protobrh/` et `cdcbrh/` : le modifier aux deux endroits.
- **Cache navigateur** : toute modification d'un script partagé (`chatbot-widget.js`, `feedback-widget.js`,
  `formules-amundi.js`, `conventions.js`) impose de changer son numéro de version (`?v=AAAAMMJJ`) dans **toutes** les pages
  de `protobrh/` qui le chargent, sinon les visiteurs gardent l'ancienne version.
- **Version hors ligne** : `python3 outils/generer_hors_ligne.py protobrh <sortie.html> https://protobrh.monsitedetest.com/assistant-demo.php <jeton>`
  produit un fichier unique (pages embarquées). Le jeton est celui de `ASSISTANT_DEMO_TOKEN` dans `config.php` (serveur) :
  ne jamais le committer ni committer le fichier généré. L'assistant passe par `assistant-demo.php` (relais à jeton).
- **Listes partagées** : secteurs d'activité et conventions collectives dans `conventions.js` (diagnostic, audit mutuelle,
  devis) ; textes et tarifs des formules Amundi dans `formules-amundi.js`.
- **Charte BRH** : vert pin `#065145` (titres, boutons), teal `#016265`, vert lime `#8FB822` (accents),
  menthe `#E3EFEA` (fonds), `#006A4E` (bandeaux).
- **Vocabulaire Crédit Agricole** : Caisse Régionale (CR), BRH, CABD, PNB, SOLEAD, lead, CRM Entreprise.
- **Règles de calcul du diagnostic** : gain fiscal = N salariés × 600 € × dispositifs actifs ;
  pouvoir d'achat = 400 € × dispositifs actifs par salarié ; un dispositif est actif si sa priorité est > 1.
  Toujours afficher « estimation indicative et non contractuelle ».
- **Principes non négociables** : la valeur avant les coordonnées (résultats affichés sans e-mail),
  consentement explicite avant toute transmission, Web-to-CR, diagnostic en moins de 5 minutes, sans compte.

## 5. Mode opératoire

1. Travailler dans une **branche** nommée `evol/vX.Y-sujet`.
2. Avant de modifier, **reformuler la demande** et lister les fichiers touchés.
3. Après modification : ouvrir les pages concernées, vérifier l'absence d'erreur JavaScript et le rendu sur tablette.
4. Ouvrir une **pull request** dont le titre est la version (ex. `V0.6 — Question CSE dans le diagnostic`) et dont la
   description contient : résumé en langage simple, écrans touchés, entrée du journal, points à vérifier par David.
5. Ne fusionner dans `main` qu'après accord de David. Après fusion, créer le tag de version (`v0.6`).
6. Terminer en listant les **identifiants des commentaires** à passer au statut « Intégré » dans le cahier des charges.

## 6. Backlog validé

Les commentaires validés par David sont disponibles en JSON :
`https://cdcbrh.monsitedetest.com/comments.php?action=backlog`

Les **idées** (code page `NF`, bouton « Suggérer une idée ») décrivent une fonctionnalité absente du portail
(champs : titre, besoin, nom). Une idée validée donne un **nouvel écran** (`É27`…) rattaché à une étape du parcours,
ou, si elle touche le périmètre, le budget ou la conformité, une proposition d'**arbitrage COPIL**.

Pour chaque commentaire validé : proposer l'évolution correspondante, la regrouper avec les autres dans une même
version si elles sont cohérentes, et signaler ce qui relève d'un arbitrage COPIL (périmètre, budget, conformité)
plutôt que de l'implémenter directement.
