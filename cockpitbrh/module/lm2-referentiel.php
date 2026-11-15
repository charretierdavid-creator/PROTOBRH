<?php
/* Module LM 2.0 — 15/11/2026 · référentiel des Caisses régionales (annexe A du cahier des charges v0.3) : 5 CR pilotes, 17 CR de démonstration, agences des grandes villes · historique : VERSIONS.md */
/* Fichier généré par outils/gen_referentiel.py — ne pas modifier à la main. Table département → CR de démonstration, à remplacer par la table officielle des 39 CR. */
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }
const LM2_REFERENTIEL = [
 [
  "code" => "val-de-france",
  "nom" => "Val de France",
  "mode" => "demo",
  "departements" => [
   "28",
   "41"
  ],
  "agences" => [
   [
    "ville" => "Chartres",
    "cp" => "28000",
    "departement" => "28"
   ],
   [
    "ville" => "Dreux",
    "cp" => "28100",
    "departement" => "28"
   ],
   [
    "ville" => "Châteaudun",
    "cp" => "28200",
    "departement" => "28"
   ],
   [
    "ville" => "Blois",
    "cp" => "41000",
    "departement" => "41"
   ],
   [
    "ville" => "Vendôme",
    "cp" => "41100",
    "departement" => "41"
   ],
   [
    "ville" => "Romorantin",
    "cp" => "41200",
    "departement" => "41"
   ]
  ]
 ],
 [
  "code" => "touraine-poitou",
  "nom" => "Touraine Poitou",
  "mode" => "pilote",
  "departements" => [
   "37",
   "86"
  ],
  "agences" => [
   [
    "ville" => "Tours",
    "cp" => "37000",
    "departement" => "37"
   ],
   [
    "ville" => "Amboise",
    "cp" => "37400",
    "departement" => "37"
   ],
   [
    "ville" => "Chinon",
    "cp" => "37500",
    "departement" => "37"
   ],
   [
    "ville" => "Poitiers",
    "cp" => "86000",
    "departement" => "86"
   ],
   [
    "ville" => "Châtellerault",
    "cp" => "86100",
    "departement" => "86"
   ]
  ]
 ],
 [
  "code" => "pyrenees-gascogne",
  "nom" => "Pyrénées Gascogne",
  "mode" => "pilote",
  "departements" => [
   "64",
   "65",
   "32"
  ],
  "agences" => [
   [
    "ville" => "Pau",
    "cp" => "64000",
    "departement" => "64"
   ],
   [
    "ville" => "Bayonne",
    "cp" => "64100",
    "departement" => "64"
   ],
   [
    "ville" => "Tarbes",
    "cp" => "65000",
    "departement" => "65"
   ],
   [
    "ville" => "Lourdes",
    "cp" => "65100",
    "departement" => "65"
   ],
   [
    "ville" => "Auch",
    "cp" => "32000",
    "departement" => "32"
   ]
  ]
 ],
 [
  "code" => "centre-loire",
  "nom" => "Centre Loire",
  "mode" => "pilote",
  "departements" => [
   "18",
   "45",
   "58"
  ],
  "agences" => [
   [
    "ville" => "Bourges",
    "cp" => "18000",
    "departement" => "18"
   ],
   [
    "ville" => "Vierzon",
    "cp" => "18100",
    "departement" => "18"
   ],
   [
    "ville" => "Orléans",
    "cp" => "45000",
    "departement" => "45"
   ],
   [
    "ville" => "Montargis",
    "cp" => "45200",
    "departement" => "45"
   ],
   [
    "ville" => "Nevers",
    "cp" => "58000",
    "departement" => "58"
   ]
  ]
 ],
 [
  "code" => "franche-comte",
  "nom" => "Franche-Comté",
  "mode" => "pilote",
  "departements" => [
   "25",
   "39",
   "70",
   "90"
  ],
  "agences" => [
   [
    "ville" => "Besançon",
    "cp" => "25000",
    "departement" => "25"
   ],
   [
    "ville" => "Montbéliard",
    "cp" => "25200",
    "departement" => "25"
   ],
   [
    "ville" => "Lons-le-Saunier",
    "cp" => "39000",
    "departement" => "39"
   ],
   [
    "ville" => "Vesoul",
    "cp" => "70000",
    "departement" => "70"
   ],
   [
    "ville" => "Belfort",
    "cp" => "90000",
    "departement" => "90"
   ]
  ]
 ],
 [
  "code" => "paris-idf",
  "nom" => "Paris et Île-de-France",
  "mode" => "pilote",
  "departements" => [
   "75",
   "78",
   "91",
   "92",
   "93",
   "94",
   "95"
  ],
  "agences" => [
   [
    "ville" => "Paris",
    "cp" => "75001",
    "departement" => "75"
   ],
   [
    "ville" => "Versailles",
    "cp" => "78000",
    "departement" => "78"
   ],
   [
    "ville" => "Évry",
    "cp" => "91000",
    "departement" => "91"
   ],
   [
    "ville" => "Nanterre",
    "cp" => "92000",
    "departement" => "92"
   ],
   [
    "ville" => "Bobigny",
    "cp" => "93000",
    "departement" => "93"
   ],
   [
    "ville" => "Créteil",
    "cp" => "94000",
    "departement" => "94"
   ],
   [
    "ville" => "Cergy",
    "cp" => "95000",
    "departement" => "95"
   ]
  ]
 ],
 [
  "code" => "anjou-maine",
  "nom" => "Anjou Maine",
  "mode" => "demo",
  "departements" => [
   "49",
   "53",
   "72"
  ],
  "agences" => [
   [
    "ville" => "Angers",
    "cp" => "49000",
    "departement" => "49"
   ],
   [
    "ville" => "Cholet",
    "cp" => "49300",
    "departement" => "49"
   ],
   [
    "ville" => "Laval",
    "cp" => "53000",
    "departement" => "53"
   ],
   [
    "ville" => "Le Mans",
    "cp" => "72000",
    "departement" => "72"
   ]
  ]
 ],
 [
  "code" => "atlantique-vendee",
  "nom" => "Atlantique Vendée",
  "mode" => "demo",
  "departements" => [
   "44",
   "85"
  ],
  "agences" => [
   [
    "ville" => "Nantes",
    "cp" => "44000",
    "departement" => "44"
   ],
   [
    "ville" => "Saint-Nazaire",
    "cp" => "44600",
    "departement" => "44"
   ],
   [
    "ville" => "La Roche-sur-Yon",
    "cp" => "85000",
    "departement" => "85"
   ],
   [
    "ville" => "Les Herbiers",
    "cp" => "85500",
    "departement" => "85"
   ]
  ]
 ],
 [
  "code" => "brie-picardie",
  "nom" => "Brie Picardie",
  "mode" => "demo",
  "departements" => [
   "60",
   "77",
   "80"
  ],
  "agences" => [
   [
    "ville" => "Beauvais",
    "cp" => "60000",
    "departement" => "60"
   ],
   [
    "ville" => "Compiègne",
    "cp" => "60200",
    "departement" => "60"
   ],
   [
    "ville" => "Meaux",
    "cp" => "77100",
    "departement" => "77"
   ],
   [
    "ville" => "Melun",
    "cp" => "77000",
    "departement" => "77"
   ],
   [
    "ville" => "Amiens",
    "cp" => "80000",
    "departement" => "80"
   ]
  ]
 ],
 [
  "code" => "cmds",
  "nom" => "Charente-Maritime Deux-Sèvres",
  "mode" => "demo",
  "departements" => [
   "17",
   "79"
  ],
  "agences" => [
   [
    "ville" => "La Rochelle",
    "cp" => "17000",
    "departement" => "17"
   ],
   [
    "ville" => "Saintes",
    "cp" => "17100",
    "departement" => "17"
   ],
   [
    "ville" => "Niort",
    "cp" => "79000",
    "departement" => "79"
   ]
  ]
 ],
 [
  "code" => "centre-ouest",
  "nom" => "Centre Ouest",
  "mode" => "demo",
  "departements" => [
   "36",
   "87"
  ],
  "agences" => [
   [
    "ville" => "Châteauroux",
    "cp" => "36000",
    "departement" => "36"
   ],
   [
    "ville" => "Limoges",
    "cp" => "87000",
    "departement" => "87"
   ]
  ]
 ],
 [
  "code" => "aquitaine",
  "nom" => "Aquitaine",
  "mode" => "demo",
  "departements" => [
   "33",
   "40",
   "47"
  ],
  "agences" => [
   [
    "ville" => "Bordeaux",
    "cp" => "33000",
    "departement" => "33"
   ],
   [
    "ville" => "Mérignac",
    "cp" => "33700",
    "departement" => "33"
   ],
   [
    "ville" => "Mont-de-Marsan",
    "cp" => "40000",
    "departement" => "40"
   ],
   [
    "ville" => "Agen",
    "cp" => "47000",
    "departement" => "47"
   ]
  ]
 ],
 [
  "code" => "nord-de-france",
  "nom" => "Nord de France",
  "mode" => "demo",
  "departements" => [
   "59",
   "62"
  ],
  "agences" => [
   [
    "ville" => "Lille",
    "cp" => "59000",
    "departement" => "59"
   ],
   [
    "ville" => "Roubaix",
    "cp" => "59100",
    "departement" => "59"
   ],
   [
    "ville" => "Arras",
    "cp" => "62000",
    "departement" => "62"
   ],
   [
    "ville" => "Calais",
    "cp" => "62100",
    "departement" => "62"
   ]
  ]
 ],
 [
  "code" => "normandie",
  "nom" => "Normandie",
  "mode" => "demo",
  "departements" => [
   "14",
   "50",
   "61"
  ],
  "agences" => [
   [
    "ville" => "Caen",
    "cp" => "14000",
    "departement" => "14"
   ],
   [
    "ville" => "Cherbourg",
    "cp" => "50100",
    "departement" => "50"
   ],
   [
    "ville" => "Saint-Lô",
    "cp" => "50000",
    "departement" => "50"
   ],
   [
    "ville" => "Alençon",
    "cp" => "61000",
    "departement" => "61"
   ]
  ]
 ],
 [
  "code" => "normandie-seine",
  "nom" => "Normandie-Seine",
  "mode" => "demo",
  "departements" => [
   "27",
   "76"
  ],
  "agences" => [
   [
    "ville" => "Évreux",
    "cp" => "27000",
    "departement" => "27"
   ],
   [
    "ville" => "Rouen",
    "cp" => "76000",
    "departement" => "76"
   ],
   [
    "ville" => "Le Havre",
    "cp" => "76600",
    "departement" => "76"
   ]
  ]
 ],
 [
  "code" => "alpes-provence",
  "nom" => "Alpes Provence",
  "mode" => "demo",
  "departements" => [
   "05",
   "13",
   "84"
  ],
  "agences" => [
   [
    "ville" => "Gap",
    "cp" => "05000",
    "departement" => "05"
   ],
   [
    "ville" => "Marseille",
    "cp" => "13001",
    "departement" => "13"
   ],
   [
    "ville" => "Aix-en-Provence",
    "cp" => "13100",
    "departement" => "13"
   ],
   [
    "ville" => "Avignon",
    "cp" => "84000",
    "departement" => "84"
   ]
  ]
 ],
 [
  "code" => "centre-est",
  "nom" => "Centre-Est",
  "mode" => "demo",
  "departements" => [
   "01",
   "69",
   "71"
  ],
  "agences" => [
   [
    "ville" => "Bourg-en-Bresse",
    "cp" => "01000",
    "departement" => "01"
   ],
   [
    "ville" => "Lyon",
    "cp" => "69001",
    "departement" => "69"
   ],
   [
    "ville" => "Villefranche-sur-Saône",
    "cp" => "69400",
    "departement" => "69"
   ],
   [
    "ville" => "Mâcon",
    "cp" => "71000",
    "departement" => "71"
   ],
   [
    "ville" => "Chalon-sur-Saône",
    "cp" => "71100",
    "departement" => "71"
   ]
  ]
 ],
 [
  "code" => "sud-rhone-alpes",
  "nom" => "Sud Rhône Alpes",
  "mode" => "demo",
  "departements" => [
   "07",
   "26",
   "38"
  ],
  "agences" => [
   [
    "ville" => "Privas",
    "cp" => "07000",
    "departement" => "07"
   ],
   [
    "ville" => "Valence",
    "cp" => "26000",
    "departement" => "26"
   ],
   [
    "ville" => "Grenoble",
    "cp" => "38000",
    "departement" => "38"
   ]
  ]
 ],
 [
  "code" => "ille-et-vilaine",
  "nom" => "Ille-et-Vilaine",
  "mode" => "demo",
  "departements" => [
   "35"
  ],
  "agences" => [
   [
    "ville" => "Rennes",
    "cp" => "35000",
    "departement" => "35"
   ],
   [
    "ville" => "Saint-Malo",
    "cp" => "35400",
    "departement" => "35"
   ]
  ]
 ],
 [
  "code" => "cotes-d-armor",
  "nom" => "Côtes d’Armor",
  "mode" => "demo",
  "departements" => [
   "22"
  ],
  "agences" => [
   [
    "ville" => "Saint-Brieuc",
    "cp" => "22000",
    "departement" => "22"
   ],
   [
    "ville" => "Lannion",
    "cp" => "22300",
    "departement" => "22"
   ]
  ]
 ],
 [
  "code" => "finistere",
  "nom" => "Finistère",
  "mode" => "demo",
  "departements" => [
   "29"
  ],
  "agences" => [
   [
    "ville" => "Brest",
    "cp" => "29200",
    "departement" => "29"
   ],
   [
    "ville" => "Quimper",
    "cp" => "29000",
    "departement" => "29"
   ]
  ]
 ],
 [
  "code" => "morbihan",
  "nom" => "Morbihan",
  "mode" => "demo",
  "departements" => [
   "56"
  ],
  "agences" => [
   [
    "ville" => "Vannes",
    "cp" => "56000",
    "departement" => "56"
   ],
   [
    "ville" => "Lorient",
    "cp" => "56100",
    "departement" => "56"
   ]
  ]
 ]
];
