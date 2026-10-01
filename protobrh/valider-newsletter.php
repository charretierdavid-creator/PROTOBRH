<?php
/* ============================================================================
   valider-newsletter.php — Validation avant publication (« Banque des RH info »)
   ----------------------------------------------------------------------------
   1. generer-newsletter.php (cron) prépare un BROUILLON : newsletter-brouillon.json
   2. Cette page affiche chaque article avec une CASE À COCHER + titre/résumé
      éditables. Tu décoches les indésirables, tu ajustes, puis « Publier ».
   3. Elle génère alors newsletter-AAAA-MM.html (édition finale), met à jour
      l'archive et la base de connaissances du chatbot (newsletter-savoir.txt).
   Accès protégé par mot de passe (à changer ci-dessous).
   ============================================================================ */

declare(strict_types=1);
mb_internal_encoding('UTF-8');
date_default_timezone_set('Europe/Paris');

/* ===================== CONFIG (à adapter) ===================== */
$OUTPUT_DIR  = __DIR__;
$MOIS_VEILLE = 12;                         // nb de mois de veille injectés au chatbot
$RUBRIQUES = [
  'Épargne salariale & partage de la valeur',
  'Santé & prévoyance collectives',
  'Retraite collective',
  'NAO & politique salariale',
  'Avantages salariés & pouvoir d\'achat',
];
$moisFr = [1=>'Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
$BROUILLON = "$OUTPUT_DIR/newsletter-brouillon.json";

function e($s){ return htmlspecialchars((string)($s ?? ''), ENT_QUOTES, 'UTF-8'); }

/* ===================== CHROME (charte BRH compacte) ===================== */
function page_top(string $title): void {
  echo '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">'
     . '<meta name="viewport" content="width=device-width, initial-scale=1">'
     . '<title>' . e($title) . '</title><style>'
     . ":root{--green:#065145;--banner:#016265;--lime:#8fb822;--mint:#e9f1ea;--ink:#233029;--slate:#5c6b64;--line:#e7ece9;--fh:'Poppins',system-ui,sans-serif;--fb:'Inter',system-ui,sans-serif}"
     . "*{box-sizing:border-box}body{margin:0;background:#f6f8f7;color:var(--ink);font-family:var(--fb);line-height:1.5}"
     . ".wrap{max-width:920px;margin:0 auto;padding:28px 20px 60px}"
     . "h1{font-family:var(--fh);color:var(--green);font-size:1.6rem;margin:.2rem 0}"
     . ".sub{color:var(--slate);margin-bottom:22px}"
     . ".card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:0 1px 2px rgba(0,0,0,.04)}"
     . ".rub{font-family:var(--fh);font-weight:700;color:var(--green);margin:26px 0 10px;display:flex;align-items:center;gap:9px}"
     . ".rub::before{content:'';width:9px;height:9px;border-radius:50%;background:var(--lime)}"
     . ".art{display:grid;grid-template-columns:auto 1fr;gap:12px;margin-bottom:14px}"
     . ".art input[type=checkbox]{width:20px;height:20px;margin-top:4px;accent-color:var(--green)}"
     . ".art .f{display:flex;flex-direction:column;gap:6px}"
     . ".art input[type=text],.art textarea{width:100%;border:1px solid var(--line);border-radius:9px;padding:.55rem .7rem;font-family:var(--fb);font-size:.92rem;color:var(--ink)}"
     . ".art input[type=text]{font-weight:600;font-family:var(--fh)}"
     . ".art textarea{min-height:78px;resize:vertical}"
     . ".art .meta{font-size:.78rem;color:var(--slate)}"
     . ".art .meta a{color:var(--green)}"
     . "label.pw{display:block;font-family:var(--fh);font-weight:600;margin:0 0 6px}"
     . "input[type=password]{width:100%;border:1px solid var(--line);border-radius:10px;padding:.7rem .9rem;font-size:1rem}"
     . "button{margin-top:14px;background:var(--green);color:#fff;border:none;border-radius:11px;font-family:var(--fh);font-weight:700;font-size:1rem;padding:.85rem 1.4rem;cursor:pointer}"
     . "button:hover{background:#02392f}.bar{position:sticky;bottom:0;background:#f6f8f7;padding:16px 0;border-top:1px solid var(--line);margin-top:20px}"
     . ".err{color:#c0392b;font-weight:600}.ok{background:var(--mint);border:1px solid #cfe3cf;border-radius:12px;padding:20px;color:var(--green);font-family:var(--fh);font-weight:600}"
     . "a.btn{display:inline-block;margin-top:10px;color:var(--green);font-weight:700}"
     . '</style></head><body><div class="wrap">';
}
function page_bottom(): void { echo '</div></body></html>'; }

/* Accès protégé au niveau du DOSSIER par .htaccess/.htpasswd (login Apache).
   Pas de second mot de passe ici : une seule authentification pour tout le site. */
$action = (string)($_POST['action'] ?? '');

/* ===================== PUBLICATION ===================== */
if ($action === 'publier') {
  $mois = (string)($_POST['mois'] ?? ($moisFr[(int)date('n')].' '.date('Y')));
  $slug = preg_replace('/[^0-9\-]/', '', (string)($_POST['slug'] ?? date('Y-m'))) ?: date('Y-m');

  // rassembler les articles cochés (titres/résumés éventuellement édités)
  $sel = array_fill_keys($RUBRIQUES, []);
  $keep = $_POST['keep'] ?? [];
  foreach ($keep as $i => $on) {
    $rub = (string)($_POST['rub'][$i] ?? '');
    if (!isset($sel[$rub])) continue;
    $titre = trim((string)($_POST['titre'][$i] ?? ''));
    if ($titre === '') continue;
    $sel[$rub][] = [
      'titre'  => $titre,
      'resume' => trim((string)($_POST['resume'][$i] ?? '')),
      'lien'   => trim((string)($_POST['lien'][$i] ?? '')),
      'source' => trim((string)($_POST['source'][$i] ?? '')),
      'date'   => trim((string)($_POST['date'][$i] ?? '')),
    ];
  }
  $total = 0; foreach ($sel as $r) { $total += count($r); }

  // ---- construire le HTML de l'édition (charte BRH, cartes pleine largeur) ----
  $fleche = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  $sections = ''; $briefs = [];
  foreach ($RUBRIQUES as $rub) {
    if (empty($sel[$rub])) continue;
    $cards = '';
    foreach ($sel[$rub] as $c) {
      $briefs[] = ['rubrique'=>$rub] + $c;
      $cards .= '<article class="nl-card"><h3>'.e($c['titre']).'</h3><p>'.nl2br(e($c['resume'])).'</p>'
        .'<div class="nl-meta"><span class="nl-src">Source : '.e($c['source']).' · '.e($c['date']).'</span>'
        .'<a class="nl-link" href="'.e($c['lien']).'" target="_blank" rel="noopener">Lire la source '.$fleche.'</a></div></article>';
    }
    $sections .= '<div class="nl-rubrique"><h2>'.e($rub).'</h2><div class="nl-cards">'.$cards.'</div></div>';
  }
  if ($total === 0) $sections = '<p class="nl-note">Aucun article sélectionné.</p>';
  $dateGen = date('d/m/Y');

  $html = <<<HTML
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Banque des RH info — $mois</title>
<style>
:root{--green:#065145;--banner:#016265;--lime:#8fb822;--mint:#e9f1ea;--ink:#233029;--slate:#5c6b64;--line:#e7ece9;--fh:'Poppins',system-ui,sans-serif;--fb:'Inter',system-ui,sans-serif}
*{box-sizing:border-box}body{margin:0;font-family:var(--fb);color:var(--ink);background:#f6f8f7;line-height:1.5}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.hd{background:#fff;border-bottom:1px solid var(--line)}.hd .wrap{display:flex;align-items:center;justify-content:space-between;height:70px}
.hd .brand{font-family:var(--fh);font-weight:800;color:var(--green);text-decoration:none}
.hd nav a{font-family:var(--fh);font-weight:500;color:#3f4c47;text-decoration:none;margin-left:20px}
.sec{padding:40px 0}.nl-kicker{font-family:var(--fh);font-weight:700;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--banner)}
h1{font-family:var(--fh);font-weight:800;font-size:2.1rem;color:var(--ink);margin:6px 0 10px}.lead{color:var(--slate);max-width:72ch}
.nl-rubrique{margin-top:32px}.nl-rubrique>h2{font-family:var(--fh);font-weight:700;font-size:1.2rem;color:var(--green);display:flex;align-items:center;gap:10px;margin-bottom:14px}
.nl-rubrique>h2::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--lime)}
.nl-cards{display:grid;grid-template-columns:1fr;gap:16px}
.nl-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px}
.nl-card h3{font-family:var(--fh);font-weight:600;font-size:1.02rem;margin:0 0 8px}
.nl-card p{font-size:.9rem;color:var(--slate);margin:0 0 14px}
.nl-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.nl-src{font-size:.76rem;color:var(--slate);font-weight:600}
.nl-link{display:inline-flex;align-items:center;gap:.4rem;font-family:var(--fh);font-weight:600;font-size:.84rem;color:var(--green);text-decoration:none}
.nl-note{margin-top:30px;font-size:.78rem;color:var(--slate);border-top:1px solid var(--line);padding-top:16px}.nl-note a{color:var(--green);font-weight:600}
.ft{background:var(--green);color:#fff;padding:26px 0;font-size:.85rem;margin-top:20px}
</style></head><body>
<header class="hd"><div class="wrap">
  <a class="brand" href="index.html">Banque des Ressources Humaines</a>
  <nav><a href="index.html">Accueil</a><a href="ressources.html">Ressources</a><a href="newsletter-archive.html">Éditions</a><a href="newsletter.html">S'abonner</a></nav>
</div></header>
<main><section class="sec"><div class="wrap">
  <div class="nl-kicker">Banque des RH info</div>
  <h1>L'essentiel du mois — $mois</h1>
  <p class="lead">Votre veille mensuelle RH — épargne salariale, santé/prévoyance, retraite, NAO, avantages salariés. Chaque brève renvoie vers sa source.</p>
  $sections
  <p class="nl-note">Résumés reformulés renvoyant vers la source ; aucun article n'est reproduit et aucune source concurrente n'est référencée. — <a href="newsletter-archive.html">Voir toutes les éditions</a> · <a href="newsletter.html">S'abonner</a></p>
</div></section></main>
<footer class="ft"><div class="wrap">Banque des Ressources Humaines · by CA Entreprises — Édition publiée le $dateGen</div></footer>
</body></html>
HTML;

  $fichier = "newsletter-$slug.html";
  file_put_contents("$OUTPUT_DIR/$fichier", $html);
  // Solution B : republie aussi sous un nom FIXE = toujours la dernière édition.
  // C'est ce fichier que vise le lien « Newsletter du mois » du header et la page d'abonnement.
  file_put_contents("$OUTPUT_DIR/newsletter-edition.html", $html);

  // ---- index + archive ----
  $indexPath = "$OUTPUT_DIR/newsletter-index.json";
  $index = is_file($indexPath) ? (json_decode((string)file_get_contents($indexPath), true) ?: []) : [];
  $index = array_values(array_filter($index, fn($ed) => ($ed['file'] ?? '') !== $fichier));
  array_unshift($index, ['file'=>$fichier, 'mois'=>$mois, 'nb'=>$total, 'date'=>date('c'), 'briefs'=>$briefs]);
  file_put_contents($indexPath, json_encode($index, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

  $archivePath = "$OUTPUT_DIR/newsletter-archive.html";
  if (is_file($archivePath)) {
    $arch = file_get_contents($archivePath);
    $cards = '';
    foreach ($index as $ed) {
      $cards .= '<a href="'.e($ed['file']).'"><div class="na-month">'.e($ed['mois']).'</div>'
        .'<div class="na-desc">'.(int)($ed['nb'] ?? 0).' brèves — épargne salariale, santé/prévoyance, retraite, NAO.</div></a>';
    }
    $arch = preg_replace('#<div class="nl-arch" id="nl-archive">.*?</div>\s*(?=<p class="nl-note")#s',
                         '<div class="nl-arch" id="nl-archive">'.$cards.'</div>'."\n    ", $arch, 1);
    file_put_contents($archivePath, $arch);
  }

  // ---- base de connaissances du chatbot ----
  $savoir = "VEILLE « BANQUE DES RH INFO » — actualités RH récentes (résumés + sources).\n"
          . "Utilise ces informations pour répondre sur l'actualité RH ; cite la source et la date, n'invente rien.\n\n";
  foreach (array_slice($index, 0, $MOIS_VEILLE) as $ed) {
    if (empty($ed['briefs'])) continue;
    $savoir .= "=== Édition " . ($ed['mois'] ?? '') . " ===\n";
    foreach ($ed['briefs'] as $b) {
      $savoir .= "[" . ($b['rubrique'] ?? '') . "] " . ($b['titre'] ?? '') . " — " . ($b['resume'] ?? '')
               . " (Source : " . ($b['source'] ?? '') . ", " . ($b['date'] ?? '') . " — " . ($b['lien'] ?? '') . ")\n";
    }
    $savoir .= "\n";
  }
  file_put_contents("$OUTPUT_DIR/newsletter-savoir.txt", $savoir);

  // supprime le brouillon (édition publiée)
  @unlink($BROUILLON);

  page_top('Newsletter publiée');
  echo '<div class="ok">✅ Édition « '.e($mois).' » publiée : '.$total.' article(s).</div>';
  echo '<a class="btn" href="'.e($fichier).'" target="_blank">Voir l\'édition publiée →</a><br>';
  echo '<a class="btn" href="newsletter-archive.html" target="_blank">Voir l\'archive →</a>';
  page_bottom();
  exit;
}

/* ===================== REVUE DU BROUILLON ===================== */
page_top('Valider la newsletter');
if (!is_file($BROUILLON)) {
  echo '<h1>Aucun brouillon</h1><p class="sub">Lance d\'abord <code>generer-newsletter.php</code> pour préparer le brouillon du mois.</p>';
  page_bottom(); exit;
}
$draft = json_decode((string)file_get_contents($BROUILLON), true) ?: [];
$mois  = (string)($draft['mois'] ?? '');
$slug  = (string)($draft['slug'] ?? date('Y-m'));
$rubs  = $draft['rubriques'] ?? [];

echo '<h1>Valider l\'édition « '.e($mois).' »</h1>';
echo '<p class="sub">Décoche les articles à écarter, ajuste les titres/résumés si besoin, puis publie. Rien n\'est mis en ligne tant que tu ne cliques pas sur « Publier ».</p>';
echo '<form method="post">';
echo '<input type="hidden" name="action" value="publier">';
echo '<input type="hidden" name="mois" value="'.e($mois).'">';
echo '<input type="hidden" name="slug" value="'.e($slug).'">';

$i = 0; $any = false;
foreach ($RUBRIQUES as $rub) {
  $list = $rubs[$rub] ?? [];
  if (empty($list)) continue;
  echo '<div class="rub">'.e($rub).'</div>';
  foreach ($list as $c) {
    $any = true;
    echo '<div class="art card">';
    echo '<input type="checkbox" name="keep['.$i.']" value="1" checked aria-label="Garder cet article">';
    echo '<div class="f">';
    echo '<input type="text" name="titre['.$i.']" value="'.e($c['titre'] ?? '').'">';
    echo '<textarea name="resume['.$i.']">'.e($c['resume'] ?? '').'</textarea>';
    echo '<div class="meta">Source : '.e($c['source'] ?? '').' · '.e($c['date'] ?? '')
       . ' — <a href="'.e($c['lien'] ?? '').'" target="_blank" rel="noopener">ouvrir la source</a></div>';
    echo '<input type="hidden" name="rub['.$i.']" value="'.e($rub).'">';
    echo '<input type="hidden" name="source['.$i.']" value="'.e($c['source'] ?? '').'">';
    echo '<input type="hidden" name="date['.$i.']" value="'.e($c['date'] ?? '').'">';
    echo '<input type="hidden" name="lien['.$i.']" value="'.e($c['lien'] ?? '').'">';
    echo '</div></div>';
    $i++;
  }
}
if (!$any) echo '<p class="sub">Le brouillon ne contient aucun article (vérifie les flux via generer-newsletter.php?diag=1).</p>';
echo '<div class="bar"><button type="submit">✅ Publier l\'édition</button></div>';
echo '</form>';
page_bottom();
