# Source du cahier des charges interactif

`index.html` (dossier parent) est **généré** : ne le modifiez pas à la main.

| Fichier | Contenu |
|---|---|
| `app_data.json` | Les 28 pages (titre, objectif, récit, exigences, règles, données produites) et le dictionnaire des 84 données |
| `static_tpl.html` | Le gabarit : mise en page, styles, scripts (commentaires, statuts, journal, Focus CRM) |
| `app_imgs.json` | Les captures d'écran du prototype (encodées) |
| `map3.jpg` + `geo3.json` | Le schéma du parcours et la position des zones cliquables |
| `gen_static.py` | Le script de génération |

Régénérer après toute modification :

```
python3 cdcbrh/_source/gen_static.py
```

Le journal des évolutions est lu depuis `../journal.json`.
