# Prompts types pour Claude Code — Portail BRH

À copier-coller dans Claude Code (claude.ai/code), dépôt `portail-brh` sélectionné.
Remplacez ce qui est entre crochets. Claude Code relit `CLAUDE.md` à chaque session : inutile de rappeler les règles.

---

## Mise en place (une seule fois)

### 0. Importer le kit et le prototype
> Décompresse portail-brh-kit.zip à la racine du dépôt, puis prototype.zip dans le dossier protobrh/ en excluant .htaccess et .htpasswd. Supprime les deux archives, vérifie que .gitignore est bien présent et ouvre une pull request « V0.5 — Import initial ».

### 1. Vérifier l'installation
> Lis CLAUDE.md et le README, puis fais-moi un état des lieux du dépôt : structure, fichiers présents dans protobrh/ et cdcbrh/, éventuels fichiers sensibles qui ne devraient pas être là. Ne modifie rien.

### 2. Sécuriser la clé du chatbot
> Dans protobrh/, vérifie si une clé d'API (Mistral) est écrite en clair dans chatbot.php ou ailleurs. Si oui, déplace-la dans protobrh/config.php (ignoré par Git), crée protobrh/config.example.php sans la vraie clé, et explique-moi ce que je dois créer sur Hostinger. Ouvre une pull request « V0.5.1 — Sécurisation de la clé du chatbot ».

### 3. Contrôle de cohérence initial
> Compare le prototype (protobrh/) et le cahier des charges (cdcbrh/_source/app_data.json) : liste les écrans ou fonctionnalités présents dans l'un mais pas dans l'autre. Présente le résultat sous forme de tableau. Ne modifie rien.

---

## Routine hebdomadaire

### 4. Intégrer le backlog validé
> Lis le backlog validé : https://cdcbrh.monsitedetest.com/comments.php?action=backlog
> Pour chaque commentaire, propose l'évolution correspondante et classe-la : « à intégrer maintenant » ou « arbitrage COPIL ». Attends mon accord avant de modifier quoi que ce soit.

### 5. Lancer l'intégration après accord
> OK pour les évolutions [numéros]. Intègre-les en version [V0.6] en respectant la Definition of Done de CLAUDE.md (prototype + cahier des charges + journal), puis ouvre la pull request.

### 6. Après la mise en ligne
> La version [V0.6] est en ligne. Donne-moi la liste des identifiants de commentaires à passer au statut « Intégré », avec le numéro de version à saisir.

---

## Demandes ponctuelles

### 7. Ajouter une fonctionnalité
> Ajoute au prototype [description précise : écran, comportement, libellés]. Mets à jour la page [É..] du cahier des charges (exigences, règles, données produites) et le journal. Version [V0.x]. Ouvre une pull request.

### 8. Modifier uniquement le cahier des charges
> Sans toucher au prototype, mets à jour la page [É..] du cahier des charges : [modification]. Ajoute l'entrée de journal de type « Cahier des charges ». Version [V0.x].

### 9. Corriger un défaut
> Sur [URL ou écran], [description du problème constaté, avec capture si possible]. Corrige-le, vérifie que rien d'autre n'est cassé et ajoute une entrée de journal « Correction ».

### 10. Revenir en arrière
> La version [V0.x] pose problème : [symptôme]. Propose-moi de revenir à la version précédente [v0.y] et explique ce qui sera annulé avant de le faire.

---

## Bonnes pratiques

- **Une demande = une version** : regroupez ce qui va ensemble, évitez les versions fourre-tout.
- **Soyez précis** : écran, libellé exact, comportement attendu, exemple de donnée.
- **Joignez une capture** quand c'est visuel.
- **Relisez toujours la pull request** avant d'accepter : c'est le sas avant la mise en ligne.
