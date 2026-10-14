# Source du cahier des charges interactif

`index.html` (dossier parent) est **généré** : ne le modifiez pas à la main.

| Fichier | Contenu |
|---|---|
| `app_data.json` | Les pages (titre, objectif, récit, exigences, règles, données produites) et le dictionnaire des données |
| `static_tpl.html` | Le gabarit : mise en page, styles, scripts (commentaires, statuts, journal, onglet Data) |
| `app_imgs.json` | Les captures d'écran du prototype (encodées) |
| `gen_map.py` | Redessine le schéma du parcours : produit `map3.jpg` et `geo_map.json` (zones cliquables) à partir de `geo3.json` |
| `map3.jpg` + `geo_map.json` | Le schéma du parcours et la position des zones cliquables (générés) |
| `gen_static.py` | Le script de génération |

Après une modification du schéma du parcours (`gen_map.py`, nécessite Playwright) :

```
python3 cdcbrh/_source/gen_map.py
```

Régénérer après toute modification :

```
python3 cdcbrh/_source/gen_static.py
```

Le journal des évolutions est lu depuis `../journal.json`.
