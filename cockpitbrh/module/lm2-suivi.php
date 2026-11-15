<?php
/* Module LM 2.0 — 15/11/2026 · « Mon dossier » du dirigeant (frise en 5 étapes, interlocuteur, rendez-vous, e-mails reçus) et accès Universels par code SMS · historique : VERSIONS.md */
/* ============================================================================
   lm2-suivi.php — appelé par suivi-dossier.html?d=BRH-26-000123&j=<jeton> (lien des e-mails E1 et E3).
   RG-40 : lien sans mot de passe, jeton secret, valable pendant la vie du dossier et 30 jours après sa clôture.
   RG-41 : frise (Demande reçue, Prise en charge, Étude, Proposition, Finalisé), interlocuteur, rendez-vous, e-mails reçus ;
           « Demander à être rappelé », « Ne plus recevoir les relances ».
   RG-42 : jamais le type de lead, le délai interne, le segment, le statut client ni les notes internes.
   RG-43 : « Accéder à mon espace Universels » si épargne salariale ou retraite, après la prise en charge (Q10) ;
           code à 6 chiffres par SMS (simulé sur le prototype), 10 minutes, 3 essais, renvoi après 30 secondes.
   RG-44 : le numéro de mobile ne se modifie jamais ici (un numéro donné pour être rappelé est transmis à l'expert, sans changer le dossier).
   ============================================================================ */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');
ob_start();
if (is_file(__DIR__ . '/config.php')) { ob_start(); try { require_once __DIR__ . '/config.php'; } catch (\Throwable $e) {} ob_end_clean(); }
require_once __DIR__ . '/lm2-base.php';
function lm2_s_sortir(array $r, int $c = 200): void { while (ob_get_level() > 0) ob_end_clean(); http_response_code($c); echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }

$post = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
$in = $post ? json_decode((string) file_get_contents('php://input'), true) : $_GET;
if (!is_array($in)) $in = [];
$ref = lm2_txt($in['d'] ?? '', 20); $jeton = (string) ($in['j'] ?? '');
if (!preg_match('/^BRH-\d{2}-\d{6}$/', $ref) || !preg_match('/^[0-9a-f]{32}$/', $jeton)) lm2_s_sortir(['ok' => false, 'error' => 'Lien de suivi incomplet.'], 400);
$db = lm2_db(); if (!$db) lm2_s_sortir(['ok' => false, 'error' => 'Service momentanément indisponible.'], 500);
$d = lm2_ligne($db, 'SELECT * FROM lm2_dossiers WHERE reference = ?', 's', [$ref]);
if (!$d || !hash_equals((string) $d['jeton'], $jeton)) { usleep(400000); lm2_s_sortir(['ok' => false, 'error' => 'Dossier introuvable : vérifiez le lien reçu par e-mail.'], 404); }
if ($d['statut'] === 'cloture' && strtotime((string) $d['statut_le']) < time() - 30 * 86400) lm2_s_sortir(['ok' => false, 'error' => 'Ce dossier est clos depuis plus de 30 jours : contactez votre Caisse régionale.'], 410);
$id = (int) $d['id'];

if ($post) {
  $a = (string) ($in['action'] ?? '');
  if ($a === 'stop') {
    lm2_maj($db, $id, ['consent_relance' => 0]);
    lm2_journal($db, $id, 'Dirigeant', 'relance', 'Le dirigeant ne souhaite plus recevoir de relances (lien de suivi)', false);
    lm2_s_sortir(['ok' => true, 'message' => 'C’est noté : vous ne recevrez plus de relances. Votre dossier reste consultable ici.']);
  }
  if ($a === 'rappel') {
    $tel = lm2_txt($in['telephone'] ?? '', 40); $cren = lm2_txt($in['creneau'] ?? '', 60);
    if (!$d['telephone'] && strlen(preg_replace('/\D/', '', $tel)) < 10) lm2_s_sortir(['ok' => false, 'error' => 'Indiquez un numéro de téléphone (10 chiffres).'], 400);
    if ($d['statut'] === 'cloture') lm2_s_sortir(['ok' => false, 'error' => 'Ce dossier est clôturé : faites une nouvelle demande sur le portail.'], 400);
    if (lm2_ligne($db, "SELECT id FROM lm2_journal WHERE dossier_id = ? AND action = 'rappel' AND cree_le > NOW() - INTERVAL 10 MINUTE", 'i', [$id])) lm2_s_sortir(['ok' => true, 'message' => 'Votre demande de rappel est déjà transmise à votre expert.']);
    $maj = ['rappel' => 1];
    if ($d['statut'] === 'nouveau' && $d['type'] === 'qualifie' && !(int) $d['rappel']) { $e = lm2_echeance($db, 'qualifie', lm2_maintenant(), true); if (!$d['echeance'] || $e < $d['echeance']) $maj['echeance'] = $e; $maj['alerte_le'] = null; }
    lm2_maj($db, $id, $maj);
    lm2_journal($db, $id, 'Dirigeant', 'rappel', 'Le dirigeant demande à être rappelé' . ($cren !== '' ? ' (' . $cren . ')' : '') . (!$d['telephone'] && $tel !== '' ? ' au ' . $tel . ' — numéro à confirmer avant de l’enregistrer dans le dossier' : ''), false);
    $d2 = lm2_dossier($db, $id);
    $dest = $d2['assigne_id'] ? array_filter([lm2_interlocuteur($db, (int) $d2['assigne_id'])]) : ($d2['expert_id'] ? array_filter([lm2_interlocuteur($db, (int) $d2['expert_id'])]) : lm2_experts_cr($db, $d2['cr_code']));
    foreach ($dest as $x) lm2_email_interlocuteur($db, 'E7', $d2, $x, ['raison' => 'le dirigeant demande à être rappelé' . ($cren !== '' ? ' (' . $cren . ')' : '')]);
    lm2_s_sortir(['ok' => true, 'message' => 'C’est noté : votre demande de rappel est transmise à votre expert.']);
  }
  if ($a === 'universels_code') { $r = lm2_otp_envoyer($db, $d); lm2_s_sortir($r, $r['ok'] ? 200 : 400); }
  if ($a === 'universels_verifier') { $r = lm2_otp_verifier($db, $d, (string) ($in['code'] ?? '')); lm2_s_sortir($r, $r['ok'] ? 200 : 400); }
  lm2_s_sortir(['ok' => false, 'error' => 'Action inconnue.'], 400);
}

/* ---------- lecture (RG-41, RG-42) ---------- */
$etape = ['nouveau' => 1, 'transfere' => $d['pris_le'] ? 2 : 1, 'pris_en_charge' => 2, 'proposition' => 4, 'cloture' => 5][$d['statut']] ?? 1;
if ($etape === 2 && ($d['rdv_le'] || lm2_ligne($db, 'SELECT id FROM lm2_comptes_rendus WHERE dossier_id = ? LIMIT 1', 'i', [$id]))) $etape = 3;
$cr = lm2_cr($db, $d['cr_code']);
$qui = null;
$trPris = $d['statut'] === 'transfere' && $d['transfert_id'] && lm2_ligne($db, 'SELECT id FROM lm2_transferts WHERE id = ? AND pris_le IS NOT NULL', 'i', [(int) $d['transfert_id']]);
if (in_array($d['statut'], ['pris_en_charge', 'proposition', 'cloture'], true) || ($d['statut'] === 'transfere' && $d['pris_le'])) {
  /* transfert pas encore accepté : le dirigeant voit toujours son expert BRH */
  $i = lm2_interlocuteur($db, $d['statut'] === 'transfere' && !$trPris ? ($d['expert_id'] ? (int) $d['expert_id'] : null) : ($d['assigne_id'] ? (int) $d['assigne_id'] : ($d['expert_id'] ? (int) $d['expert_id'] : null)));
  if ($i && $i['role'] !== 'filiale') $qui = ['nom' => lm2_nom($i), 'role' => ['expert_brh' => 'Expert Banque des Ressources Humaines', 'expert_brh_pro' => 'Expert Banque des Ressources Humaines – professionnels',
    'conseiller_pro' => 'Conseiller professionnel', 'hors_annuaire' => 'Votre conseiller Crédit Agricole'][$i['role']] ?? 'Votre interlocuteur', 'agence' => $i['role'] === 'conseiller_pro' ? $i['ville_agence'] : null,
    'telephone' => $i['donnees'] === 'reel' ? $i['telephone'] : null, 'email' => $i['donnees'] === 'reel' ? $i['email'] : null];
}
$mails = array_map(static fn($e) => ['le' => $e['cree_le'], 'objet' => preg_replace('/^\[Test – destinataire prévu : [^\]]*\] /u', '', (string) $e['objet']), 'envoye' => $e['statut'] === 'envoye'],
  lm2_lignes($db, "SELECT cree_le, objet, statut FROM lm2_emails WHERE dossier_id = ? AND categorie = 'dirigeant' ORDER BY id DESC LIMIT 30", 'i', [$id]));
$mob = lm2_mobile((string) $d['telephone']);
lm2_s_sortir(['ok' => true, 'dossier' => [
  'reference' => $d['reference'], 'cree_le' => $d['cree_le'], 'entreprise' => $d['raison_sociale'], 'prenom' => $d['prenom'], 'etape' => $etape,
  'etapes' => ['Demande reçue', 'Prise en charge', 'Étude', 'Proposition', $d['statut'] === 'cloture' && $d['issue'] !== 'signe' ? 'Clôturé' : 'Finalisé'],
  'caisse' => $cr ? 'Crédit Agricole ' . $cr['nom'] : null, 'interlocuteur' => $qui, 'rdv' => $d['rdv_le'] ? ['le' => $d['rdv_le'], 'note' => $d['rdv_note']] : null,
  'solutions' => array_map(static fn($s) => LM2_SOLUTIONS[$s] ?? $s, lm2_liste($d['solutions'])), 'emails' => $mails, 'relances' => (int) $d['consent_relance'] === 1,
  'rappel' => (int) $d['rappel'] === 1, 'telephone_connu' => (bool) $d['telephone'], 'clos' => $d['statut'] === 'cloture',
  'universels' => ['propose' => (bool) array_intersect(['epargne', 'retraite'], lm2_liste($d['solutions'])), 'ouvert' => lm2_universels_possible($d),
    'mobile' => $mob !== '' ? substr($mob, 0, 2) . ' •• •• •• ' . substr($mob, -2) : null, 'simule' => (bool) LM2_SMS_SIMULE]]]);
