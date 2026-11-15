# Module LM 2.0 — 15/11/2026 · test des tests : chaque erreur volontairement introduite doit être détectée par la suite de non-régression · historique : VERSIONS.md
"""Usage : python3 -I mutations.py <dossier module> <dossier sites> <dossier du socle protobrh>
Copie le module dans un dossier temporaire, y introduit une erreur à la fois et vérifie qu'au moins un test échoue."""
import os, sys, shutil, subprocess, tempfile
M, SITES, SOCLE = [os.path.abspath(x) for x in sys.argv[1:4]]
T = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUT = [
  ('lm2-regles.js', "return n >= (seuil || SEUIL_PRO) ? 'entreprise' : 'pro';", "return n > (seuil || SEUIL_PRO) ? 'entreprise' : 'pro';", 'seuil Pro / Entreprise'),
  ('lm2-regles.js', "a + '-11-11', ", "", '11 novembre oublié'),
  ('lm2-regles.js', "if (lead.type !== 'devis') return [];", "", 'filiale hors demande de devis'),
  ('lm2-regles.js', "cs.sort(function (a, b) { return ((+a.charge || 0) - (+b.charge || 0))", "cs.sort(function (a, b) { return ((+b.charge || 0) - (+a.charge || 0))", 'conseiller le plus chargé'),
  ('lm2-regles.js', "if (pa !== pb) return pa - pb;", "if (pa !== pb) return pb - pa;", 'ordre des types inversé'),
  ('lm2-regles.js', "return { type_lead: (TYPES[l.type] || {}).lib,", "return { nom: l.nom, type_lead: (TYPES[l.type] || {}).lib,", 'nom envoyé à l’IA'),
  ('console.js', "['devis', 'ultra', 'qualifie'].map(function (t) {", "['devis', 'ultra', 'qualifie', 'retard'].map(function (t) {", '4e indicateur'),
  ('console.js', "if (f.etat === 'cours' && l.statut === 'cloture') return false;", "", 'clôturés visibles par défaut'),
  ('console.js', "'<button class=\"btn\" data-a=\"dlgTransfert\"' + (d.cr ? '' : ' disabled') + '>Transférer</button>", "", 'bouton Transférer absent'),
  ('console.js', "<button class=\"btn s d\" data-a=\"dlgRendre\">Rendre le lead à l’expert</button>", "<button class=\"btn\" data-a=\"dlgTransfert\">Transférer</button>", 'destinataire qui transfère'),
  ('console-demo.js', "if (S.role === 'acces') return E('Action réservée à l’expert BRH.');", "", 'transfert par un destinataire'),
  ('console-demo.js', "if (!String(b.motif || '').trim()) return E('Motif obligatoire pour un transfert à une filiale');", "", 'motif filiale facultatif'),
  ('console-demo.js', "if (b.mode === 'demo' && !DB.its.some(", "if (false && !DB.its.some(", 'annuaire fictif non régénéré'),
  ('connecteurs/lm-parcours.js', "if (!consent) return b;", "", 'parcours transmis sans consentement'),
  ('connecteurs/lm-parcours.js', "if (cfD && cfD.parentNode && !$('lmClientD'))", "if (false)", '« déjà client ? » absent du diagnostic'),
  ('connecteurs/lm-hub.js', "if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', charger); else charger();", "charger();", 'couche parcours avant la page'),
  ('suivi-dossier.html', "attente = 30;", "attente = 0;", 'renvoi du code immédiat'),
  ('lm2-base.php', "if ($interloc['donnees'] !== 'reel') return ['statut' => 'non_envoye', 'motif' => 'Interlocuteur fictif'];", "", 'e-mail à un fictif'),
  ('lm2-base.php', "if (!$map) return null;", "if (!$map) $map = ['qualifie', false];", 'newsletter = lead'),
  ('lm2-base.php', "unset($v['type'], $v['echeance']);", "", 'type de lead au dirigeant'),
  ('lm2-api.php', "lm2_admin();\nswitch ($A) {", "switch ($A) {", 'administration ouverte'),
  ('lm2-base.php', "'ssss', [$mode, $mode, $mode, $cr]", "'sss', [$mode, $mode, $mode, $cr]", 'types SQL incomplets'),
  ('collecte.php', "if (lm2_evenement() === 'nouveau' || $prouve) $rep['suivi']", "if (true) $rep['suivi']", 'lien de suivi toujours renvoyé'),
  ('lm2-suivi.php', "if (!$d || !hash_equals((string) $d['jeton'], $jeton))", "if (!$d)", 'jeton du suivi non vérifié'),
]
def lancer(d):
    r = [subprocess.run(['node', os.path.join(T, 't_console.js'), d], capture_output=True, text=True).returncode,
         subprocess.run(['node', os.path.join(T, 't_regles.js'), d], capture_output=True, text=True).returncode,
         subprocess.run(['node', os.path.join(T, 't_connecteurs.js'), d, SOCLE], capture_output=True, text=True).returncode,
         subprocess.run([sys.executable, '-I', os.path.join(T, 't_statique.py'), d, SITES], capture_output=True, text=True).returncode]
    return r
base = tempfile.mkdtemp(prefix='lm2mut_'); ref = os.path.join(base, 'ref', 'module'); shutil.copytree(M, ref); shutil.copy(os.path.join(M, '..', 'VERSIONS.md'), os.path.join(base, 'ref'))
r0 = lancer(ref)
print('référence :', 'tout passe' if not any(r0) else 'ÉCHEC ' + str(r0))
rates = 0
for i, (f, a, b, lib) in enumerate(MUT):
    d = os.path.join(base, 'm%d' % i, 'module'); shutil.copytree(M, d); shutil.copy(os.path.join(M, '..', 'VERSIONS.md'), os.path.join(base, 'm%d' % i))
    p = os.path.join(d, f); s = open(p, encoding='utf-8').read()
    if a not in s: print('  ?  mutation introuvable :', lib); rates += 1; continue
    open(p, 'w', encoding='utf-8').write(s.replace(a, b, 1))
    r = lancer(d); vu = any(r)
    print(('  ✓ détectée : ' if vu else '  ✗ NON détectée : ') + lib + ('' if not vu else '  ' + str(r)))
    if not vu: rates += 1
shutil.rmtree(base, ignore_errors=True)
print('Mutations : %d/%d détectées' % (len(MUT) - rates, len(MUT)))
sys.exit(1 if rates or any(r0) else 0)
