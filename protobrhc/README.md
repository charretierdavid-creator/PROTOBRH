# protobrhc — version C du test A/B

Même principe que `protobrha/` et `protobrhb/` : ce dossier ne contient **que ce qui diffère** du socle `protobrh/`.

- `variante.js` : identifiant de version (`C`), ajouté à chaque événement de mesure et à chaque demande transmise.
- `variante.css` : design propre à la version C (règles sur `html[data-variante="C"]`).
- Une page entière placée ici remplace celle du socle.

Assemblage local : `python3 outils/assembler_variantes.py c && python3 -m http.server 8766 --directory _site/protobrhc`.
Mise en ligne : job `protobrhc` de `.github/workflows/deploy.yml`, actif dès que les secrets
`PROTOBRHC_FTP_USERNAME` et `PROTOBRHC_FTP_PASSWORD` existent dans GitHub.
