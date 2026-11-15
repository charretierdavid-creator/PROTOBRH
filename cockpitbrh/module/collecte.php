<?php
/* Module LM 2.0 — 15/11/2026 · point d'entrée des sites (modes « relais » et « navigateur ») : demandes intégrées aux dossiers lm2_* (3 types de leads), parcours et « déjà client ? » · historique : VERSIONS.md */
/* Module LM 1.0 — 15/11/2026 · point d'entrée des sites (modes « relais » et « navigateur ») · repris de lead.php C 1.13 · historique : VERSIONS.md */
/* ============================================================================
   collecte.php — reçoit les demandes des dirigeants envoyées par les sites S, A, B, C (ou tout autre site).
   Même format JSON que lead.php du portail : un site branché n'a rien à changer dans ses pages.
   Deux façons d'appeler ce script (voir LISEZMOI_BRANCHEMENT.txt) :
     - MODE RELAIS (recommandé) : le lead.php du site transmet la demande de serveur à serveur
       (connecteurs/lead.php), avec l'en-tête  X-LM-Cle: <clé du site>  (LM_CLES dans config.php) ;
     - MODE NAVIGATEUR : la page du site appelle directement ce script (connecteurs/lm-hub.js) ;
       le site est reconnu par son adresse (en-tête Origin) parmi LM_SITES ; nombre d'envois limité par adresse IP.
   Actions :
     - (aucune)       : enregistre la demande (consentement obligatoire), l'intègre au Dossier BRH du dirigeant
                        (type de lead, fusion, Caisse régionale, e-mails) et renvoie { ok, id, jeton, dossier, suivi, caisse } ;
     - « etape »      : étape atteinte d'un devis en cours (id + jeton remis à la création) ;
     - « argumentaire » : synthèse de l'IA rattachée au dossier (rubrique « Argumentaire de vente » du cockpit).
   Le type de lead, le délai interne et le statut client ne sont jamais renvoyés (RG-06).
   Champs LM 2.0 lus en plus (connecteur 2.0) : parcours { offres_consultees, pages } et client_declare (oui, non, nsp), avec le consentement seulement.
   ============================================================================ */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');
ob_start();   // un avertissement PHP éventuel ne doit pas corrompre la réponse JSON lue par le connecteur
if (is_file(__DIR__ . '/config.php')) { ob_start(); try { require_once __DIR__ . '/config.php'; } catch (\Throwable $e) {} ob_end_clean(); }
require_once __DIR__ . '/lm2-base.php';
if (!defined('LM_CLES'))            define('LM_CLES', []);      // ['clé longue et secrète' => 'S', …] : une clé par site (mode relais)
if (!defined('LM_ENVOIS_PAR_IP'))   define('LM_ENVOIS_PAR_IP', 30);   // mode navigateur : demandes créées par adresse IP et par heure

function lm_c_sortir(array $r, int $code = 200): void { while (ob_get_level() > 0) ob_end_clean(); http_response_code($code); echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }

/* ---------- 1. identification du site appelant ---------- */
$version = null; $mode = '';
$cle = (string) ($_SERVER['HTTP_X_LM_CLE'] ?? '');
if ($cle !== '') {
  foreach (LM_CLES as $k => $v) if (strlen((string) $k) >= 24 && hash_equals((string) $k, $cle)) { $version = (string) $v; $mode = 'relais'; }
  if (!$version) { usleep(300000); lm_c_sortir(['ok' => false, 'error' => 'Clé de site inconnue'], 403); }
} else {
  $origine = rtrim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
  foreach (LM_SITES as $v => $url) if ($origine !== '' && strcasecmp(rtrim((string) $url, '/'), $origine) === 0) { $version = (string) $v; $mode = 'navigateur'; }
  if ($version) {
    header('Access-Control-Allow-Origin: ' . $origine);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 600');
  }
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code($version ? 204 : 403); exit; }
  if (!$version) lm_c_sortir(['ok' => false, 'error' => 'Site non autorisé : ajoutez son adresse dans LM_SITES (config.php du module).'], 403);
}
if (!in_array($version, LM_VERSIONS, true)) lm_c_sortir(['ok' => false, 'error' => 'Version non suivie par le module (LM_VERSIONS)'], 403);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') lm_c_sortir(['ok' => false, 'error' => 'POST attendu'], 405);

$raw = (string) file_get_contents('php://input');
if (strlen($raw) > 200000) lm_c_sortir(['ok' => false, 'error' => 'Demande trop volumineuse'], 413);
$in = json_decode($raw, true);
if (!is_array($in)) lm_c_sortir(['ok' => false, 'error' => 'Requête invalide'], 400);
/* mode relais : le site transmet l'adresse IP et la page du visiteur */
$ip = $mode === 'relais' ? (string) ($_SERVER['HTTP_X_LM_IP'] ?? '') : (string) ($_SERVER['REMOTE_ADDR'] ?? '');
$ip = mb_substr($ip !== '' ? $ip : (string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64);

$db = lm2_db();
if (!$db) lm_c_sortir(['ok' => false, 'error' => 'Connexion base impossible'], 500);
$T = LM_TABLE_LEADS;
$lead = static function (int $id, string $jeton) use ($db, $T, $version): bool {
  return (bool) lm2_ligne($db, "SELECT id FROM $T WHERE id = ? AND jeton = ? AND version = ?", 'iss', [$id, $jeton, $version]);
};

/* ---------- 2. étape d'un devis en cours ---------- */
if (($in['action'] ?? '') === 'etape') {
  $id = (int) ($in['id'] ?? 0); $jeton = (string) ($in['jeton'] ?? ''); $et = lm2_txt($in['etape'] ?? '', 60);
  if ($id < 1 || !preg_match('/^[0-9a-f]{32}$/', $jeton) || $et === '') lm_c_sortir(['ok' => false, 'error' => 'Requête invalide']);
  if (!$lead($id, $jeton)) lm_c_sortir(['ok' => false, 'error' => 'Demande inconnue']);
  lm2_q($db, "UPDATE $T SET etape = ? WHERE id = ?", 'si', [$et, $id]);
  try { lm2_etape($db, $id, $et); } catch (\Throwable $x) {}
  lm_c_sortir(['ok' => true]);
}

/* ---------- 3. argumentaire de vente préparé par l'IA ---------- */
if (($in['action'] ?? '') === 'argumentaire') {
  $id = (int) ($in['id'] ?? 0); $jeton = (string) ($in['jeton'] ?? '');
  if ($id < 1 || !preg_match('/^[0-9a-f]{32}$/', $jeton) || !is_array($in['argumentaire'] ?? null)) lm_c_sortir(['ok' => false, 'error' => 'Requête invalide']);
  if (!$lead($id, $jeton)) lm_c_sortir(['ok' => false, 'error' => 'Demande inconnue']);
  $okA = false;
  try { $okA = lm2_argumentaire($db, $id, $in['argumentaire'], (string) ($in['source'] ?? '')); } catch (\Throwable $x) {}
  lm_c_sortir(['ok' => $okA]);
}

/* ---------- 4. limite d'envois (mode navigateur) ---------- */
if ($mode === 'navigateur') {
  $n = lm2_ligne($db, "SELECT COUNT(*) n FROM $T WHERE ip = ? AND cree_le > (NOW() - INTERVAL 1 HOUR)", 's', [$ip]);
  if ($n && (int) $n['n'] >= LM_ENVOIS_PAR_IP) lm_c_sortir(['ok' => false, 'error' => 'Trop de demandes : réessayez dans une heure.'], 429);
}

/* ---------- 5. lecture tolérante (mêmes noms de champs que lead.php du portail) ---------- */
$t = static fn($v, int $n = 190): string => lm2_txt($v, $n);
$c = is_array($in['contact'] ?? null) ? $in['contact'] : (is_array($in['contexte'] ?? null) ? $in['contexte'] : []);
$e = is_array($in['entreprise'] ?? null) ? $in['entreprise'] : (is_array($in['company'] ?? null) ? $in['company'] : []);
if (!$e && is_array($c['entreprise'] ?? null)) $e = $c['entreprise'];
$prem = static function (array $a, array $cles) { foreach ($cles as $k) if (isset($a[$k]) && $a[$k] !== '' && $a[$k] !== null) return $a[$k]; return null; };

$prenom = $t($prem($c, ['prenom']), 100);
$nom    = $t($prem($c, ['nom', 'name']), 120);
if ($prenom === '' && $nom !== '' && !isset($c['prenom']) && str_contains($nom, ' ')) { [$prenom, $nom] = explode(' ', $nom, 2); }
$email  = $t($prem($c, ['email', 'mail']));
$tel    = $t($prem($c, ['telephone', 'tel', 'phone']), 40);
$fonct  = $t($prem($c, ['fonction', 'poste']), 120);
$consent = (bool) ($prem($c, ['consentement', 'consent']) ?? ($in['consentement'] ?? $in['consent'] ?? false));
$consentLe = $t($prem($c, ['consentement_date', 'consentDate']) ?? '', 40);
$rappel = (int) (bool) ($prem($c, ['rappel_expert', 'rappel']) ?? (($in['type'] ?? '') === 'rappel_expert'));

$raison = $t($prem($e, ['raison_sociale', 'nom', 'raison', 'companyName']) ?? $prem($c, ['companyName', 'entreprise']), 190);
$siret  = substr(preg_replace('/\D/', '', (string) ($prem($e, ['siret', 'siren']) ?? '')), 0, 14);
$cp     = $t($prem($e, ['code_postal', 'cp']), 10);
$ville  = $t($prem($e, ['ville']), 120);
$dep    = $t($prem($e, ['departement']) ?? ($cp !== '' ? substr($cp, 0, 2) : ''), 3);
$eff    = (int) ($prem($e, ['effectif', 'employeeCount']) ?? ($in['rh']['salaries_concernes'] ?? 0));
$secteur = $t($prem($e, ['secteur', 'sector']), 120);
$idcc   = $t($prem($e, ['idcc']), 120);

$type = $t($in['type'] ?? '', 40);
if ($type === '') $type = isset($in['panier']) ? 'devis' : (isset($in['labelBrh']) ? 'label_contact' : (isset($in['fiscalGain']) ? 'diagnostic_contact' : 'contact'));
$type = preg_replace('/[^a-z0-9_]/', '', strtolower($type));
$ref     = $t($in['reference'] ?? '', 40);
$montant = isset($in['estimation_totale']) ? (int) $in['estimation_totale'] : (isset($in['fiscalGain']['total']) ? (int) $in['fiscalGain']['total'] : null);
$score   = isset($in['labelBrh']['score']) ? (int) $in['labelBrh']['score'] : (isset($in['score']) ? (int) $in['score'] : null);
$page    = $t($in['page'] ?? ($_SERVER['HTTP_X_LM_PAGE'] ?? ($_SERVER['HTTP_REFERER'] ?? '')), 255);
$etape   = $t($in['etape'] ?? '', 60);
$jeton   = bin2hex(random_bytes(16));

/* ---------- 6. contrôles : rien sans le consentement du dirigeant ---------- */
if (!$consent) lm_c_sortir(['ok' => false, 'error' => 'Consentement requis : rien n\'a été enregistré.']);
if ($email === '' && $tel === '') lm_c_sortir(['ok' => false, 'error' => 'E-mail ou téléphone requis']);
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) lm_c_sortir(['ok' => false, 'error' => 'E-mail non valide']);
$donnees = json_encode($in, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);

/* ---------- 7. enregistrement ---------- */
$stmt = $db->prepare("INSERT INTO $T (cree_le, version, type, reference, prenom, nom, email, telephone, fonction, rappel_expert,
    consentement, consentement_le, raison_sociale, siret, code_postal, ville, departement, effectif, secteur, idcc, montant_estime, score_label,
    donnees, page, ip, etape, jeton) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
if (!$stmt) lm_c_sortir(['ok' => false, 'error' => 'Préparation impossible'], 500);
$stmt->bind_param('ssssssssissssssissiisssss', $version, $type, $ref, $prenom, $nom, $email, $tel, $fonct, $rappel,
  $consentLe, $raison, $siret, $cp, $ville, $dep, $eff, $secteur, $idcc, $montant, $score, $donnees, $page, $ip, $etape, $jeton);
if (!$stmt->execute()) lm_c_sortir(['ok' => false, 'error' => 'Enregistrement impossible'], 500);
$leadId = (int) $db->insert_id;
$rep = ['ok' => true, 'id' => $leadId, 'jeton' => $jeton];

/* ---------- 8. lead management : dossier unique du dirigeant, type de lead, Caisse régionale, e-mails ---------- */
try {
  $dos = lm2_integrer($db, $leadId);
  if ($dos && ($d = lm2_dossier($db, $dos))) {
    $rep['dossier'] = $d['reference'];   // RG-06 : jamais le type de lead, le délai interne ni le statut client
    $crD = lm2_cr($db, $d['cr_code']); if ($crD) $rep['caisse'] = 'Crédit Agricole ' . $crD['nom'];
    /* sécurité : le lien de suivi (jeton secret) n'est renvoyé que si cette demande a créé le dossier, ou si le navigateur prouve
       qu'il a fait la demande précédente du même dossier (identifiant et jeton remis alors : « suite ») ; sinon il part par e-mail au dirigeant */
    $suite = is_array($in['suite'] ?? null) ? $in['suite'] : [];
    $prouve = isset($suite['id'], $suite['jeton']) && preg_match('/^[0-9a-f]{32}$/', (string) $suite['jeton']) && $lead((int) $suite['id'], (string) $suite['jeton'])
      && lm2_ligne($db, 'SELECT id FROM lm2_demandes WHERE lead_id = ? AND dossier_id = ?', 'ii', [(int) $suite['id'], (int) $d['id']]);
    if (in_array($type, ['devis', 'rappel_expert', 'diagnostic_contact', 'label_contact', 'audit_mutuelle_prevoyance', 'contact'], true)) {
      if (lm2_evenement() === 'nouveau' || $prouve) $rep['suivi'] = lm2_lien_suivi($d); else $rep['suivi_email'] = true;
    }
  }
} catch (\Throwable $x) { /* la demande est enregistrée ; le dossier sera créé par la tâche planifiée (lm-cron.php) */ }
lm_c_sortir($rep);
