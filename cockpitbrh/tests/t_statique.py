# Module LM 2.0.1 — 15/11/2026 · contrôles statiques du module (syntaxe, PHP, sécurité, contrat console ↔ API ↔ démonstration, tables, traçabilité du cahier des charges) · historique : VERSIONS.md
"""Usage : python3 -I t_statique.py <dossier module> <dossier sites>
 1. syntaxe : node --check (JS), php -l si PHP est installé, sinon lib/verif_php2.py (requêtes, variables, fonctions, constantes) ;
 2. en-tête « Module LM 2.0 — 15/11/2026 » en tête de chaque fichier et VERSIONS.md à jour ;
 3. sécurité : aucun secret ni config.php, bibliothèques PHP non exécutables seules et bloquées par .htaccess,
    requêtes préparées (pas de variable dans une requête SQL hors entiers et constantes), adresses e-mail fictives non routables ;
 4. contrat : chaque action appelée par la console existe dans lm2-api.php ET dans console-demo.js ; « Mon dossier » ↔ lm2-suivi.php ;
 5. base : chaque table et chaque colonne écrite existent dans les CREATE TABLE ;
 6. traçabilité : chaque règle RG-xx et suggestion Sx du cahier des charges v0.3 est appliquée quelque part (code ou test)."""
import os, re, sys, shutil, subprocess
M, SITES = sys.argv[1], sys.argv[2]
ICI = os.path.dirname(os.path.abspath(__file__))
ok = 0; echecs = []
def verifier(nom, cond, detail=''):
    global ok
    if cond: ok += 1
    else: echecs.append(nom + (' — ' + str(detail)[:400] if detail else ''))
def fichiers(d):
    r = []
    for b, _, fs in os.walk(d):
        for f in fs: r.append(os.path.relpath(os.path.join(b, f), d))
    return sorted(r)
F = fichiers(M); S = fichiers(SITES)
lire = lambda d, f: open(os.path.join(d, f), encoding='utf-8').read()
TEXTE = [f for f in F if not f.endswith('.png')]

# 1. syntaxe
for f in F:
    if f.endswith('.js'):
        r = subprocess.run(['node', '--check', os.path.join(M, f)], capture_output=True, text=True)
        verifier('syntaxe JavaScript : ' + f, r.returncode == 0, r.stderr.strip())
for f in F:
    if f.endswith('.html'):
        for i, js in enumerate(re.findall(r'<script>\n?([\s\S]*?)</script>', lire(M, f))):
            t = os.path.join('/tmp', 'lm2_inline_%d.js' % i); open(t, 'w').write(js)
            r = subprocess.run(['node', '--check', t], capture_output=True, text=True)
            verifier('syntaxe JavaScript (script de %s)' % f, r.returncode == 0, r.stderr.strip())
php = [os.path.join(M, f) for f in F if f.endswith('.php')] + [os.path.join(SITES, f) for f in S if f.endswith('.php') and f != 'config-site.ajout.php']
if shutil.which('php'):
    for f in php:
        r = subprocess.run(['php', '-l', f], capture_output=True, text=True); verifier('php -l : ' + os.path.basename(f), r.returncode == 0, r.stdout + r.stderr)
mod = [os.path.join(M, f) for f in F if f.endswith('.php')]
r = subprocess.run([sys.executable, '-I', os.path.join(ICI, 'lib', 'verif_php2.py')] + mod, capture_output=True, text=True)
verifier('PHP du module : requêtes, variables, fonctions, constantes (verif_php2)', r.stdout.strip().endswith('OK'), r.stdout[-1500:])
r = subprocess.run([sys.executable, '-I', os.path.join(ICI, 'lib', 'verif_php2.py'), os.path.join(SITES, 'lead.php')], capture_output=True, text=True)
verifier('PHP du connecteur des sites : parenthèses et requêtes', 'inattendu' not in r.stdout and 'non fermé' not in r.stdout, r.stdout[-600:])

# 2. en-têtes et versions
for f in TEXTE:
    if f.startswith('.git'): continue
    t = lire(M, f).split('\n')
    tete = '\n'.join(t[:2])
    verifier('en-tête de version : ' + f, re.search(r'Module LM [23]\.0(\.\d+)? — \d\d/\d\d/\d{4}', tete) or f == 'robots.txt' or f == '.gitignore', t[0][:120])
VERS = lire(os.path.join(M, '..'), 'VERSIONS.md') if os.path.isfile(os.path.join(M, '..', 'VERSIONS.md')) else ''
verifier('VERSIONS.md : version en cours LM 2.0', re.search(r'_Version en cours : \*\*LM 2\.0(\.\d+)?\*\*', VERS))
for f in TEXTE:
    if f in ('robots.txt', '.gitignore'): continue
    verifier('VERSIONS.md : fichier listé ' + f, '`module/' + f + '`' in VERS, f)
h = lire(M, 'console.html')
for src in re.findall(r'<script src="([^"?]+)\?v=([\d.]+)"', h):
    verifier('console.html charge ' + src[0] + ' (présent, ?v=2.0)', src[0] in F and re.fullmatch(r'2\.0(\.\d+)?', src[1]), src)
verifier('console.html charge la démonstration seulement avec ?demo=1', "demo=1" in h and 'console-demo.js?v=2.0' in h)

# 3. sécurité
verifier('aucun config.php livré', 'config.php' not in F and 'config.php' not in S)
CX = lire(M, 'config.example.php')
for k in ['DB_PASS', 'LM_ADMIN_PASSWORD', 'LM_SMTP_PASS', 'MISTRAL_API_KEY', 'LM_CRON_TOKEN', 'LM_SMTP_USER', 'LM2_TEST_DIRIGEANTS']:
    m = re.search(r"const " + k + r"\s*=\s*'([^']*)'", CX)
    verifier('config.example.php : ' + k + ' vide', m is not None and m.group(1) == '', m and m.group(0))
for f in [os.path.join(M, x) for x in TEXTE] + [os.path.join(SITES, x) for x in S]:
    t = open(f, encoding='utf-8').read()
    verifier('aucune clé ni mot de passe en clair : ' + f, not re.search(r"(sk-[A-Za-z0-9]{20,}|['\"][0-9a-f]{40,}['\"]|PASSWORD\s*=\s*'[^']+'|PASS\s*=\s*'[^']+'|API_KEY\s*=\s*'[^']+')", t), f)
AUTORISES = r'(monsitedetest\.com|\.invalid|exemple\.fr|exemple-ca-[a-z]+\.fr|exemple\.invalid|^prenom\.nom@entreprise\.fr)$'
for f in TEXTE:
    for a in set(re.findall(r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+', lire(M, f))):
        if re.search(r'\.(png|js|php|html)$', a) or a.startswith('@'): continue
        verifier('adresse e-mail fictive ou du projet : %s (%s)' % (a, f), re.search(AUTORISES, a) is not None, a)
HT = lire(M, '.htaccess')
for lib in ['config.php', 'lm2-base', 'lm2-referentiel', 'lm-db', 'VERSIONS']:
    verifier('.htaccess bloque ' + lib, lib.replace('.', r'\.') in HT or lib in HT)
verifier('.htaccess bloque tests/, sites/, outils/', 'RewriteRule ^(tests|sites|outils)/ - [F,L]' in HT)
for f in ['lm2-base.php', 'lm2-referentiel.php', 'lm-db.php']:
    verifier(f + ' : non exécutable seul', "if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }" in lire(M, f))
for f in [x for x in F if x.endswith('.php')]:
    t = lire(M, f)
    for m in re.finditer(r'->query\(([^;]*)\);', t):
        q = m.group(1)
        interp = re.findall(r'\$(\w+)', q)
        bad = [v for v in interp if v not in ('T', 'mois', 'db', 'c', 't')]
        verifier('%s : requête directe sans variable externe (%s…)' % (f, q[:50]), not bad, bad)
    if f != 'config.example.php': verifier(f + ' : strict_types', 'declare(strict_types=1);' in t)
API = lire(M, 'lm2-api.php')
verifier('API : session propre (cookie BRHLM2), HttpOnly, SameSite=Strict', "session_name('BRHLM2')" in API and "'httponly' => true, 'samesite' => 'Strict'" in API)
verifier('API : jeton anti-falsification X-LM-CSRF sur chaque POST', "hash_equals((string) $S['csrf'], (string) ($_SERVER['HTTP_X_LM_CSRF'] ?? ''))" in API)
verifier('API : 8 essais erronés = blocage 15 minutes', 'LM2_ESSAIS = 8, LM2_BLOCAGE = 900' in API)
verifier('API : administration réservée (lm2_admin avant toute action admin_)', API.index('lm2_admin();\nswitch ($A) {') < API.index("case 'admin_cr':"))
verifier('API : droits vérifiés sur chaque lead (lm2_charger)', all(('$d = lm2_charger($id)' in blk) for blk in re.findall(r"case '(?:traiter|proposition|transferer|rendre|cloturer|rdv|note|telephone|client|compte_rendu|script|emails_ia|email_note)':[\s\S]*?lm2_sortir", API)))
verifier('Accès ponctuel : jeton aléatoire de 48 caractères, haché en base (sha256)', "bin2hex(random_bytes(24))" in lire(M, 'lm2-base.php') and "hash('sha256', $jeton)" in lire(M, 'lm2-base.php'))
verifier('RG-40 : lien de suivi vérifié (référence + jeton de 32 caractères, comparaison à temps constant)', "if (!$d || !hash_equals((string) $d['jeton'], $jeton))" in lire(M, 'lm2-suivi.php') and "preg_match('/^[0-9a-f]{32}$/', $jeton)" in lire(M, 'lm2-suivi.php'))
verifier('RG-43 : code SMS vérifié à temps constant, haché avec le jeton du dossier', "hash_equals((string) $o['code_hash'], hash('sha256', $d['jeton']" in lire(M, 'lm2-base.php'))
verifier('RG-44 : lm2-suivi.php ne modifie jamais le téléphone du dossier', not re.search(r"lm2_maj\([^;]*'telephone'", lire(M, 'lm2-suivi.php')))
verifier('RG-06 / RG-42 : collecte.php et lm2-suivi.php ne renvoient ni type, ni délai, ni statut client', not re.search(r"\$rep\['(type|echeance|client_statut)'\]", lire(M, 'collecte.php')) and not re.search(r"'(type|echeance|client_statut|segment)' =>", lire(M, 'lm2-suivi.php').split('lm2_s_sortir([\'ok\' => true, \'dossier\'')[-1]))

# 4. contrat console ↔ API ↔ démonstration
CJ = lire(M, 'console.js'); DJ = lire(M, 'console-demo.js')
acts = sorted(set(re.findall(r"api\('([a-z_]+)'", CJ)))
cases_api = set(re.findall(r"case '([a-z_]+)':", API)) | set(re.findall(r"\$A === '([a-z_]+)'", API))
cases_demo = set(re.findall(r"case '([a-z_]+)':", DJ))
for a in acts:
    verifier('action « %s » de la console : présente dans lm2-api.php' % a, a in cases_api)
    verifier('action « %s » de la console : présente dans la démonstration' % a, a in cases_demo or a in ('connexion', 'deconnexion', 'acces_ouvrir', 'acces_code'))
SV = lire(M, 'suivi-dossier.html'); SP = lire(M, 'lm2-suivi.php')
for a in set(re.findall(r"action: '([a-z_]+)'", SV)):
    verifier('« Mon dossier » : action « %s » traitée par lm2-suivi.php' % a, "$a === '" + a + "'" in SP)

# 5. tables et colonnes
BASE = lire(M, 'lm2-base.php')
tables = {}
for m in re.finditer(r'CREATE TABLE IF NOT EXISTS (lm2_\w+) \(([\s\S]*?)\) \$T', BASE):
    cols = set(re.findall(r'(?:^|,)\s*(\w+) (?:INT|VARCHAR|CHAR|DATETIME|TINYINT|TEXT|MEDIUMTEXT)', m.group(2)))
    tables[m.group(1)] = cols
verifier('13 tables lm2_* créées automatiquement', len(tables) == 13, sorted(tables))
tout = ''.join(lire(M, f) for f in F if f.endswith('.php'))
for t in sorted(set(re.findall(r'\b(lm2_[a-z_]+)\b(?=\s|\)|$)', ' '.join(re.findall(r"(?:FROM|JOIN|INTO|UPDATE|TABLE IF NOT EXISTS|DELETE FROM)\s+(lm2_\w+)", tout))))):
    verifier('table utilisée et créée : ' + t, t in tables)
for m in re.finditer(r'INSERT (?:IGNORE )?INTO (lm2_\w+) \(([^)]*)\)', tout):
    cs = [c.strip() for c in m.group(2).split(',')]
    verifier('colonnes de INSERT INTO %s existent' % m.group(1), m.group(1) in tables and all(c in tables[m.group(1)] for c in cs), [c for c in cs if c not in tables.get(m.group(1), set())])
for m in re.finditer(r'UPDATE (lm2_\w+) SET ([^\']*?) WHERE', tout):
    cs = re.findall(r'(\w+) = ', m.group(2))
    verifier('colonnes de UPDATE %s existent' % m.group(1), all(c in tables.get(m.group(1), set()) for c in cs), [c for c in cs if c not in tables.get(m.group(1), set())])
wl = re.search(r"static \$ok = \[([\s\S]*?)\];", BASE).group(1)
manq = [c for c in re.findall(r"'(\w+)'", wl) if c not in tables['lm2_dossiers']]
verifier('lm2_maj : colonnes autorisées = colonnes de lm2_dossiers', not manq, manq)
verifier('tables lm_* du module 1.x jamais modifiées', not re.search(r'(INSERT INTO|UPDATE|DELETE FROM|DROP TABLE|ALTER TABLE) lm_(?!2)', tout))

# 6. traçabilité du cahier des charges v0.3
RG = ['RG-%02d' % n for n in list(range(1, 8)) + list(range(10, 39)) + list(range(40, 45)) + list(range(50, 58)) + list(range(60, 69))]
SG = ['S%d' % n for n in range(1, 13)]
corpus = ''.join(lire(M, f) for f in TEXTE) + ''.join(open(os.path.join(ICI, f), encoding='utf-8').read() for f in os.listdir(ICI) if f.startswith('t_'))
for x in RG + SG:
    verifier('cahier des charges : %s appliquée (référencée dans le code ou les tests)' % x, re.search(r'\b' + x + r'\b', corpus) is not None)

print('Contrôles statiques LM 2.0 : %d réussi(s), %d échec(s)' % (ok, len(echecs)))
for e in echecs: print('  ÉCHEC ' + e)
sys.exit(1 if echecs else 0)
