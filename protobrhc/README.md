# protobrhc — version C du test A/B : version Standard + Julia, l’assistante RH

_Version C 2.0 — 15/11/2026 · présentation de la C 2.0 · historique : VERSIONS.md_

Même principe que `protobrha/` et `protobrhb/` : ce dossier ne contient **que ce qui diffère** du socle `protobrh/`. La version C reprend le parcours **Standard** et y ajoute **Julia**, sans modifier les pages du socle.

## Julia, sur chaque page

« Julia, votre assistante RH vous accompagne tout au long du parcours » : une rubrique claire et discrète en haut de chaque page (sous le bandeau d’accueil, ou sous le titre de la page), sur 2 lignes et exactement à la largeur totale du bloc du dessus — ligne 1 : « Julia, votre assistante RH » (texte court sur 2 lignes) puis le champ « Posez votre question », qui prend toute la place restante ; ligne 2 : 3 ou 4 exemples propres à la page — la réponse développée juste en dessous et au plus 2 liens vers les pages utiles. Un bouton « Julia » flottant ramène à la rubrique. La bulle « Assistant BRH » du socle n’est plus affichée sur C (ses appels ouvrent Julia).

| Page | Exemples | Branché sur le moteur |
|---|---|---|
| Accueil | fidéliser, pouvoir d’achat, mutuelle | — |
| Diagnostic RH | entreprises similaires, estimation, « Et si j’avais 10 salariés de plus ? », par où commencer | oui (calculateFiscalGain, priorités) |
| Devis en ligne | estimation, « Et si… » selon les solutions choisies, ordre des solutions, charges sur la prime | oui (compute, RH) |
| Label BRH, audit mutuelle, avantages fiscaux, ressources, newsletter | questions sur la page | — |

Fichiers : `ia-julia.js` (rubrique, exemples, liens, réponses de démonstration), `ia-assist.js` (appel à `ia.php`, benchmark et table département → Caisse de démonstration), `ia.php` (relais Mistral, action `julia`), `connaissances-version.txt`.

Garde-fous : le moteur calcule, Julia cite ; « Estimation indicative et non contractuelle » dès qu’un montant apparaît ; aucune donnée personnelle envoyée à l’IA ; liens limités à une liste fermée ; jamais de niveau de lead ni de statut client ; mode démonstration sans clé.

## Fin de parcours

`fin-parcours.js` : après un devis, une seule phrase (Caisse régionale, délai de rappel), la référence du dossier et le bouton « Suivre mon dossier » à côté des autres boutons. Après une demande de contact du diagnostic, une phrase. La synthèse de l’IA pour l’expert (argumentaire de vente) part avec le dossier, sans être affichée. Limite connue : si le module ne répond pas au moment de la demande (demande mise en file d’attente), l’argumentaire de cette demande n’est pas transmis ; la demande elle-même est renvoyée dès que le module répond.

## Lead management : sorti de C

Le cockpit, les dossiers, les e-mails et le suivi du dirigeant sont dans le module commun aux sites S, A, B et C, sur **cockpitbrh.monsitedetest.com** (module LM). `lead.php` de C :

- **module branché** (`LM_HUB_URL` et `LM_HUB_CLE` dans le `config.php` de protobrhc) : relaie chaque demande au module, avec file d’attente si le module ne répond pas ;
- **module non branché** : enregistre la demande dans la table `leads` du socle, comme S, A et B (rien n’est perdu ; le module en mode « base partagée » la reprendra).

`lm-parcours.js` garde la couche parcours (coordonnées partagées entre écrans, estimation par e-mail, « déjà client ? »).

## Autres fichiers propres à C

- `entreprise.php`, `entreprise-public.js`, `diag-entreprise.js`, `idcc-devis.js` : conventions collectives déclarées et fiche publique (secteur, tranche d’effectif, département). Cas de test : BRIAND, SIRET 890 331 754 00014 (IDCC 2420 et 2609).
- `acces-devis.js` : devis ouvert jusqu’à 300 salariés.
- `variante.js` et `variante.css` : accueil propre à C — accroche « Prenez soin de vos équipes, et de votre budget. », titre « De quoi avez-vous besoin ? » au lieu de « Nos solutions », marges entre les blocs réduites (textes modifiables dans `ACCUEIL`, en tête de `variante.js`) ; « Audit mutuelle » retiré du bandeau haut.
- `llms.txt` : résumé pour les IA tierces (GEO).

À remplacer avant toute ouverture : benchmark « entreprises similaires » et table département → Caisse régionale (`ia-assist.js`), contenus GEO à valider par la Conformité.

Assemblage local : `python3 outils/assembler_variantes.py c && python3 -m http.server 8766 --directory _site/protobrhc`.
