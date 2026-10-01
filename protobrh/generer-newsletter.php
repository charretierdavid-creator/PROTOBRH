<?php
/* =============================================================================
   generer-newsletter.php  —  « Banque des RH info »
   -----------------------------------------------------------------------------
   Génère l'édition mensuelle de la newsletter :
     1. lit des flux RSS de sources OFFICIELLES / PROFESSIONNELLES,
     2. filtre par mots-clés + fenêtre de dates + liste noire (concurrents),
     3. demande à Mistral de reformuler un résumé court et de classer par rubrique,
     4. écrit newsletter-AAAA-MM.html (édition du mois),
     5. met à jour newsletter-index.json + régénère newsletter-archive.html.

   À lancer UNE FOIS PAR MOIS via une tâche cron Hostinger, par ex. :
     0 8 1 * *  php /home/uXXXX/public_html/protobrh/generer-newsletter.php

   IMPORTANT (garde-fous éditoriaux) :
   - on ne publie que des LIENS SORTANTS vers la source (jamais l'article entier),
   - les résumés sont REFORMULÉS par Mistral (pas de copier-coller),
   - aucune source concurrente n'est référencée (voir $BLOCKLIST).
   Conseil : relire le fichier généré avant de le laisser en ligne (validation humaine).
   ========================================================================== */

date_default_timezone_set('Europe/Paris');
mb_internal_encoding('UTF-8');

/* =========================== 1) CONFIGURATION ============================== */

// Clé API Mistral : de préférence en variable d'environnement (plus sûr que dans le code).
require_once __DIR__ . '/config.php';
$MISTRAL_API_KEY = getenv('MISTRAL_API_KEY') ?: MISTRAL_API_KEY;
$MISTRAL_MODEL   = 'mistral-small-latest';

$OUTPUT_DIR       = __DIR__;   // dossier où écrire les pages (= dossier du site)
$MAX_PAR_RUBRIQUE = 6;         // nb max d'articles retenus par rubrique
$FENETRE_JOURS    = 60;        // ne garder que les items publiés dans les N derniers jours
$MAX_CANDIDATS    = 50;        // nb max d'items envoyés à Mistral (maîtrise du coût)
$MOIS_VEILLE      = 12;        // nb de mois de newsletter injectés dans la base du chatbot

// Flux RSS de sources fiables (À COMPLÉTER avec les vraies URLs de flux).
// Vérifie chaque flux dans un navigateur ; laisse le tableau vide pour tester la mise en page.
$FEEDS = [
  // --- Sources validées au diagnostic (à garder) ---
  'Ministère du Travail'                => 'https://travail-emploi.gouv.fr/rss.xml',
  'Actuel RH'                           => 'https://www.actuel-rh.fr/rss-all/16912',
  'myRHline'                            => 'https://www.myrhline.com/feed/',
  'Miroir Social'                       => 'https://www.miroirsocial.com/rss.xml',
  'France Assureurs'                    => 'https://www.franceassureurs.fr/feed/',
  'Parlons RH'                          => 'https://www.parlonsrh.com/feed/',

  // --- Flux "sur mesure" Google News, un par thème (toujours à jour) ---
  'Google News · épargne salariale'     => 'https://news.google.com/rss/search?q=%22%C3%A9pargne%20salariale%22&hl=fr&gl=FR&ceid=FR:fr',
  'Google News · PPV'                   => 'https://news.google.com/rss/search?q=%22prime%20de%20partage%20de%20la%20valeur%22&hl=fr&gl=FR&ceid=FR:fr',
  'Google News · prévoyance collective' => 'https://news.google.com/rss/search?q=%22pr%C3%A9voyance%20collective%22&hl=fr&gl=FR&ceid=FR:fr',
  'Google News · retraite entreprise'   => 'https://news.google.com/rss/search?q=%22%C3%A9pargne%20retraite%20entreprise%22&hl=fr&gl=FR&ceid=FR:fr',
  'Google News · complémentaire santé'  => 'https://news.google.com/rss/search?q=%22compl%C3%A9mentaire%20sant%C3%A9%20entreprise%22&hl=fr&gl=FR&ceid=FR:fr',
  'Google News · NAO'                   => 'https://news.google.com/rss/search?q=%22n%C3%A9gociation%20annuelle%20obligatoire%22&hl=fr&gl=FR&ceid=FR:fr',
  'Google News · titre-restaurant'      => 'https://news.google.com/rss/search?q=%22titre-restaurant%22&hl=fr&gl=FR&ceid=FR:fr',
];

// Pages LUES directement (SANS flux RSS) : le script récupère la page HTML et en extrait les articles.
// Utile pour un site officiel sans flux RSS exploitable.
$PAGES = [
  'Ministère du Travail' => 'https://travail-emploi.gouv.fr/',
  // ex. supplémentaire : 'URSSAF' => 'https://www.urssaf.fr/accueil/actualites.html',
];

// Au moins un de ces mots-clés doit apparaître dans le titre ou le résumé de l'item.
$KEYWORDS = [
  'épargne salariale','intéressement','participation','abondement','pee','pereco','per ',
  'prime de partage','ppv','forfait social','complémentaire santé','mutuelle','frais de santé',
  'prévoyance','retraite','pero','article 39','indemnités de fin de carrière','ifc',
  'nao','négociation annuelle','titres-restaurant','titre-restaurant','avantages salariés','avantages sociaux',
  "pouvoir d'achat",'mobilités durables','forfait mobilités','cesu','csg','télétravail','management','qvt','chèque carburant',
  // termes plus courants (pour élargir le volume)
  'rémunération','salaires','augmentation salariale','smic','protection sociale',
  'arrêt maladie','absentéisme','qvct','qualité de vie au travail',
  'dialogue social','cse',"accord d'entreprise","plan d'épargne",
];

// Domaines INTERDITS : tout item dont le lien pointe vers l'un d'eux est rejeté.
$BLOCKLIST = [
  'swile.co','swile.com','edenred','sodexo','glady','bimpli','pluxee',
  'up.coop','benefiz','payfit','lucca', // concurrents / hors périmètre — à ajuster
];

// Noms de concurrents à exclure aussi d'après le TITRE/résumé (utile car Google News masque le domaine réel).
$BLOCK_NAMES = ['swile','edenred','sodexo','glady','bimpli','pluxee','payfit','lucca','benefiz','up déjeuner'];

// Liste FERMÉE des rubriques (Mistral doit choisir exactement l'une d'elles).
$RUBRIQUES = [
  'Épargne salariale & partage de la valeur',
  'Santé & prévoyance collectives',
  'Retraite collective',
  'NAO & politique salariale',
  'Avantages salariés & pouvoir d\'achat',
];

/* =========================== 2) OUTILS RSS ================================= */

function http_fetch($url, $timeout = 25) {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => $timeout,
    CURLOPT_ENCODING       => '',            // accepte gzip/deflate
    CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; BanqueRH-Info/1.0; veille RH)',
    CURLOPT_HTTPHEADER     => ['Accept: application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8'],
    CURLOPT_SSL_VERIFYPEER => true,
  ]);
  $body = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err  = curl_error($ch);
  curl_close($ch);
  return ['body' => ($body !== false ? $body : null), 'code' => $code, 'err' => $err];
}
function http_get($url, $timeout = 25) {
  $r = http_fetch($url, $timeout);
  return ($r['body'] && $r['code'] >= 200 && $r['code'] < 400) ? $r['body'] : null;
}

/* Lit un flux RSS/Atom et renvoie une liste d'items normalisés. */
function parse_feed($xmlStr, $sourceName) {
  $items = [];
  if (!$xmlStr) return $items;
  $prev = libxml_use_internal_errors(true);
  $xml = simplexml_load_string($xmlStr);
  libxml_use_internal_errors($prev);
  if (!$xml) return $items;

  // RSS 2.0
  if (isset($xml->channel->item)) {
    foreach ($xml->channel->item as $it) {
      $items[] = [
        'title'  => trim((string)$it->title),
        'link'   => trim((string)$it->link),
        'desc'   => trim(strip_tags((string)$it->description)),
        'date'   => strtotime((string)$it->pubDate) ?: time(),
        'source' => $sourceName,
      ];
    }
  }
  // Atom
  elseif (isset($xml->entry)) {
    foreach ($xml->entry as $it) {
      $href = '';
      foreach ($it->link as $l) { if ((string)$l['rel'] === 'alternate' || $href === '') $href = (string)$l['href']; }
      $items[] = [
        'title'  => trim((string)$it->title),
        'link'   => trim($href),
        'desc'   => trim(strip_tags((string)($it->summary ?: $it->content))),
        'date'   => strtotime((string)($it->updated ?: $it->published)) ?: time(),
        'source' => $sourceName,
      ];
    }
  }
  return $items;
}

function domaine_interdit($url, $blocklist) {
  $host = strtolower(parse_url($url, PHP_URL_HOST) ?: '');
  foreach ($blocklist as $bad) { if ($bad !== '' && strpos($host, $bad) !== false) return true; }
  return false;
}

function contient_motcle($texte, $keywords) {
  $t = ' ' . mb_strtolower($texte) . ' ';
  foreach ($keywords as $kw) { if ($kw !== '' && mb_strpos($t, mb_strtolower($kw)) !== false) return true; }
  return false;
}

/* Lit une PAGE HTML (sans flux RSS) et en extrait les liens d'articles (titre + URL). */
function scrape_page($html, $baseUrl, $source) {
  $items = [];
  if (!$html) return $items;
  $host = parse_url($baseUrl, PHP_URL_HOST) ?: '';
  $root = (parse_url($baseUrl, PHP_URL_SCHEME) ?: 'https') . '://' . $host;
  if (preg_match_all('/<a\\s[^>]*href="([^"#]+)"[^>]*>(.*?)<\\/a>/is', $html, $m, PREG_SET_ORDER)) {
    $seen = [];
    foreach ($m as $a) {
      $href = trim($a[1]);
      $text = trim(preg_replace('/\\s+/', ' ', html_entity_decode(strip_tags($a[2]), ENT_QUOTES, 'UTF-8')));
      if (mb_strlen($text) < 25 || mb_strlen($text) > 180) continue;      // écarte menus, boutons, pictos
      if (strpos($href, 'http') !== 0) $href = (strpos($href, '/') === 0 ? $root . $href : $root . '/' . ltrim($href, '/'));
      if (strpos((string) parse_url($href, PHP_URL_HOST), $host) === false) continue; // garde les liens internes au site
      if (isset($seen[$href])) continue; $seen[$href] = true;
      $items[] = ['title' => $text, 'link' => $href, 'desc' => '', 'date' => time(), 'source' => $source];
    }
  }
  return $items;
}

/* =========================== 3) COLLECTE ================================== */

/* --- MODE TEST : ?test=1 ignore la fraîcheur (garde les items anciens) --- */
if (isset($_GET['test'])) { $FENETRE_JOURS = 3650; }

/* --- MODE DIAGNOSTIC : ouvre generer-newsletter.php?diag=1 dans le navigateur ---
   Affiche, flux par flux : code HTTP, nb d'items lus, nb d'items contenant un mot-clé. */
if (isset($_GET['diag'])) {
  header('Content-Type: text/html; charset=utf-8');
  echo "<h2 style='font-family:sans-serif'>Diagnostic des flux RSS &mdash; Banque des RH info</h2>";
  echo "<table cellpadding='7' style='border-collapse:collapse;font-family:sans-serif;font-size:14px'>";
  echo "<tr style='background:#065145;color:#fff'><th>Source</th><th>HTTP</th><th>Items lus</th><th>Avec mot-clé</th><th>Exemple / erreur</th></tr>";
  foreach ($FEEDS as $name => $url) {
    $r = http_fetch($url);
    $ok = ($r['code'] >= 200 && $r['code'] < 400);
    $items = $ok ? parse_feed($r['body'], $name) : [];
    $kw = 0; $ex = '';
    foreach ($items as $it) { if (contient_motcle($it['title'].' '.$it['desc'], $KEYWORDS)) { $kw++; if ($ex === '') $ex = $it['title']; } }
    $info = $r['err'] ? ('Erreur : '.$r['err']) : ($items ? $ex : 'Aucun item lu (URL ou flux invalide ?)');
    $bg = (!$ok || !$items) ? '#fdecec' : ($kw ? '#eef7e6' : '#fff9e6');
    printf("<tr style='background:%s'><td>%s</td><td align='center'>%d</td><td align='center'>%d</td><td align='center'>%d</td><td>%s</td></tr>",
      $bg, htmlspecialchars($name), (int)$r['code'], count($items), $kw, htmlspecialchars(mb_substr($info,0,120)));
  }
  echo "</table>";
  echo "<p style='font-family:sans-serif;font-size:13px;max-width:760px'>Vert = flux OK avec des articles pertinents. Jaune = flux OK mais aucun mot-clé ce mois-ci. Rouge = à corriger (HTTP 403/404 ou 0 item : l'URL du flux est invalide ou bloquée). "
     . "Corrige/retire les lignes rouges dans <code>\$FEEDS</code>, puis relance. Astuce : <code>?diag=1&amp;test=1</code> teste aussi les articles plus anciens.</p>";
  echo "<h3 style='font-family:sans-serif'>Pages lues sans RSS</h3>";
  echo "<table cellpadding='7' style='border-collapse:collapse;font-family:sans-serif;font-size:14px'>";
  echo "<tr style='background:#065145;color:#fff'><th>Source</th><th>HTTP</th><th>Liens extraits</th><th>Avec mot-clé</th><th>Exemple / erreur</th></tr>";
  foreach ($PAGES as $name => $url) {
    $r = http_fetch($url);
    $ok = ($r['code'] >= 200 && $r['code'] < 400);
    $items = $ok ? scrape_page($r['body'], $url, $name) : [];
    $kw = 0; $ex = '';
    foreach ($items as $it) { if (contient_motcle($it['title'].' '.$it['desc'], $KEYWORDS)) { $kw++; if ($ex==='') $ex = $it['title']; } }
    $info = $r['err'] ? ('Erreur : '.$r['err']) : ($items ? $ex : 'Aucun lien exploitable extrait (structure de page ?)');
    $bg = (!$ok || !$kw) ? '#fdecec' : '#eef7e6';
    printf("<tr style='background:%s'><td>%s</td><td align='center'>%d</td><td align='center'>%d</td><td align='center'>%d</td><td>%s</td></tr>",
      $bg, htmlspecialchars($name), (int)$r['code'], count($items), $kw, htmlspecialchars(mb_substr($info,0,120)));
  }
  echo "</table>";
  exit;
}

$candidats = [];
$vus = [];
$limite = time() - $FENETRE_JOURS * 86400;

foreach ($FEEDS as $name => $url) {
  $items = parse_feed(http_get($url), $name);
  foreach ($items as $it) {
    if (!$it['link'] || !$it['title']) continue;
    if ($it['date'] < $limite) continue;                          // trop ancien
    if (domaine_interdit($it['link'], $BLOCKLIST)) continue;       // concurrent
    if (!contient_motcle($it['title'].' '.$it['desc'], $KEYWORDS)) continue; // hors-sujet
    if (contient_motcle($it['title'].' '.$it['desc'], $BLOCK_NAMES)) continue; // concurrent cité
    $key = md5($it['link']);
    if (isset($vus[$key])) continue;                               // doublon
    $vus[$key] = true;
    $candidats[] = $it;
  }
}
/* Sources PAGE (lecture HTML directe, sans RSS) */
foreach ($PAGES as $name => $url) {
  $items = scrape_page(http_get($url), $url, $name);
  foreach ($items as $it) {
    if (!$it['link'] || !$it['title']) continue;
    if (domaine_interdit($it['link'], $BLOCKLIST)) continue;
    if (!contient_motcle($it['title'] . ' ' . $it['desc'], $KEYWORDS)) continue;
    if (contient_motcle($it['title'] . ' ' . $it['desc'], $BLOCK_NAMES)) continue; // concurrent cité
    $key = md5($it['link']);
    if (isset($vus[$key])) continue;
    $vus[$key] = true;
    $candidats[] = $it;
  }
}

usort($candidats, fn($a,$b) => $b['date'] <=> $a['date']);
$candidats = array_slice($candidats, 0, $MAX_CANDIDATS);

/* =========================== 4) MISTRAL =================================== */

/* Demande à Mistral : pour chaque item -> garder (bool), rubrique (liste fermée), resume (reformulé). */
function mistral_traiter($candidats, $rubriques, $apiKey, $model) {
  if (empty($candidats)) return [];
  $liste = [];
  foreach ($candidats as $i => $c) {
    $liste[] = ['i'=>$i, 'titre'=>$c['title'], 'extrait'=>mb_substr($c['desc'],0,1200), 'source'=>$c['source']];
  }
  $system = "Tu es l'éditeur de « Banque des RH info », une veille mensuelle pour dirigeants et DRH. "
    . "Pour chaque item, garde-le (garder=true) s'il a un lien, même indirect, avec la RH, la rémunération, "
    . "l'épargne salariale, la santé/prévoyance collective, la retraite, la NAO ou les avantages salariés ; "
    . "mets garder=false seulement s'il est clairement hors sujet. "
    . "Rédige une SYNTHÈSE REFORMULÉE en français de 5 lignes MAXIMUM (3 à 5 phrases), neutre et structurée : "
    . "de quoi il s'agit, ce qui change, les échéances ou plafonds éventuels, et ce que l'employeur doit retenir ; "
    . "n'invente rien au-delà de la source et ne copie pas le texte. Classe "
    . "l'item dans EXACTEMENT une rubrique parmi la liste fournie. Réponds uniquement en JSON.";
  $user = "Rubriques autorisées : " . json_encode($rubriques, JSON_UNESCAPED_UNICODE) . "\n"
    . "Items : " . json_encode($liste, JSON_UNESCAPED_UNICODE) . "\n"
    . 'Format de réponse : {"items":[{"i":0,"garder":true,"rubrique":"...","resume":"..."}]}';

  $payload = json_encode([
    'model' => $model,
    'temperature' => 0.2,
    'response_format' => ['type' => 'json_object'],
    'messages' => [
      ['role'=>'system','content'=>$system],
      ['role'=>'user','content'=>$user],
    ],
  ], JSON_UNESCAPED_UNICODE);

  $ch = curl_init('https://api.mistral.ai/v1/chat/completions');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer '.$apiKey, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_TIMEOUT => 120,
  ]);
  $resp = curl_exec($ch);
  curl_close($ch);
  if (!$resp) return [];
  $data = json_decode($resp, true);
  $content = $data['choices'][0]['message']['content'] ?? '';
  $parsed = json_decode($content, true);
  return $parsed['items'] ?? [];
}

$traites = mistral_traiter($candidats, $RUBRIQUES, $MISTRAL_API_KEY, $MISTRAL_MODEL);

/* Regroupe par rubrique, en respectant la liste fermée + le plafond par rubrique. */
$parRubrique = array_fill_keys($RUBRIQUES, []);
foreach ($traites as $t) {
  if (empty($t['garder'])) continue;
  $i = $t['i'] ?? -1;
  if (!isset($candidats[$i])) continue;
  $rub = $t['rubrique'] ?? '';
  if (!in_array($rub, $RUBRIQUES, true)) continue;
  if (count($parRubrique[$rub]) >= $MAX_PAR_RUBRIQUE) continue;
  $c = $candidats[$i];
  if (domaine_interdit($c['link'], $BLOCKLIST)) continue; // double sécurité
  $parRubrique[$rub][] = [
    'titre'  => $c['title'],
    'resume' => mb_substr(trim(preg_replace('/\s+/', ' ', (string)($t['resume'] ?? $c['desc']))), 0, 600),
    'lien'   => $c['link'],
    'source' => $c['source'],
    'date'   => date('d/m/Y', $c['date']),
  ];
}

/* =========================== 5) ÉCRITURE DU BROUILLON ===================== */
/* On NE PUBLIE PLUS directement : on prépare un brouillon que l'on valide
   (cases à cocher) dans valider-newsletter.php avant publication. */

$moisFr = [1=>'Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
$mois = $moisFr[(int)date('n')] . ' ' . date('Y');   // ex. « Septembre 2026 »
$slug = date('Y-m');                                  // ex. « 2026-09 »
$total = 0; foreach ($parRubrique as $r) { $total += count($r); }

$brouillon = [
  'mois'      => $mois,
  'slug'      => $slug,
  'genere_le' => date('c'),
  'rubriques' => $parRubrique,   // rubrique => [ {titre,resume,lien,source,date}, ... ]
];
file_put_contents("$OUTPUT_DIR/newsletter-brouillon.json",
                  json_encode($brouillon, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

header('Content-Type: text/plain; charset=utf-8');
echo "OK — brouillon préparé : $total article(s) pour l'édition « $mois ».\n";
echo "Étape suivante : ouvre valider-newsletter.php pour vérifier, cocher et publier.\n";
