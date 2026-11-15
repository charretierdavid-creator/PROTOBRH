# Module LM 2.0 — 15/11/2026 · contrôle statique renforcé des fichiers PHP (aucun interpréteur PHP disponible dans l'atelier) · historique : VERSIONS.md
"""Contrôles :
 1. équilibre des parenthèses, crochets, accolades (chaînes et commentaires ignorés) ;
 2. requêtes lm2_q / lm2_ligne / lm2_lignes / lm_q… et bind_param : nombre de « ? » (morceaux littéraux) = longueur des types = nombre d'arguments ;
 3. fonctions appelées : définies dans les fichiers analysés ou fonctions PHP connues ;
 4. constantes en MAJUSCULES : définies (const / define) ou constantes PHP connues ;
 5. variables lues dans une fonction sans être jamais affectées (paramètres, use, foreach, list, catch, static, global, passage par référence) ;
 6. points-virgules : ligne de code qui se termine par une expression sans « ; » avant un mot-clé de début d'instruction (repérage simple).
Usage : python3 -I verif_php2.py fichier.php [...]  → « OK » ou la liste des anomalies."""
import re, sys

def scan(s):
    out = list(s); i = 0; n = len(s)
    while i < n:
        if s.startswith('/*', i):
            j = s.index('*/', i + 2) + 2
            for k in range(i, j):
                if out[k] != '\n': out[k] = ' '
            i = j; continue
        if s.startswith('//', i) or (s[i] == '#' and not s.startswith('#[', i)):
            j = s.find('\n', i); j = n if j < 0 else j
            for k in range(i, j): out[k] = ' '
            i = j; continue
        if s.startswith('<<<', i):
            m = re.match(r"<<<\s*'?\"?(\w+)'?\"?\n", s[i:])
            fin = s.index('\n' + m.group(1), i + m.end()) if m else i + 3
            for k in range(i + 3, fin):
                if out[k] != '\n': out[k] = ' '
            i = fin; continue
        if s[i] in "'\"":
            q = s[i]; j = i + 1
            while s[j] != q:
                if s[j] == '\\': j += 1
                j += 1
            for k in range(i + 1, j):
                if out[k] != '\n': out[k] = ' '
            if q == '"':   # variables interpolées dans "…" : conservées pour le contrôle des variables
                for m in re.finditer(r'(?<!\\)\$[A-Za-z_]\w*', s[i + 1:j]):
                    for k in range(i + 1 + m.start(), i + 1 + m.end()): out[k] = s[k]
            i = j + 1; continue
        i += 1
    return ''.join(out)

def ligne(s, i): return s.count('\n', 0, i) + 1

def equilibre(nom, s, c):
    pile = []; paires = {')': '(', ']': '[', '}': '{'}
    for i, ch in enumerate(c):
        if ch in '([{': pile.append((ch, i))
        elif ch in ')]}':
            if not pile or pile[-1][0] != paires[ch]:
                print(f'{nom}:{ligne(s, i)}: « {ch} » inattendu'); return False
            pile.pop()
    if pile:
        ch, i = pile[-1]; print(f'{nom}:{ligne(s, i)}: « {ch} » non fermé'); return False
    return True

def lit(s, i):
    q = s[i]; j = i + 1; v = []
    while s[j] != q:
        if s[j] == '\\': v.append(s[j:j + 2]); j += 2; continue
        v.append(s[j]); j += 1
    return ''.join(v), j + 1

def args_top(c, i):
    prof = 0; deb = i + 1; res = []
    for j in range(i, len(c)):
        ch = c[j]
        if ch in '([{': prof += 1
        elif ch in ')]}':
            prof -= 1
            if prof == 0: res.append((deb, j)); return res, j
        elif ch == ',' and prof == 1: res.append((deb, j)); deb = j + 1
    return res, len(c)

def compte_elements(c, a, b):
    t = c[a:b].strip()
    if not (t.startswith('[') and t.endswith(']')): return None
    deb = c.index('[', a); fin = c.rindex(']', a, b)
    if not c[deb + 1:fin].strip(): return 0
    prof = 0; n = 1
    for j in range(deb + 1, fin):
        ch = c[j]
        if ch in '([{': prof += 1
        elif ch in ')]}': prof -= 1
        elif ch == ',' and prof == 0: n += 1
    if c[deb + 1:fin].rstrip().endswith(','): n -= 1
    return n

def litteraux(txt):
    """morceaux littéraux d'une expression SQL concaténée ; None si un morceau non littéral peut contenir « ? »"""
    morceaux = []; i = 0
    while i < len(txt):
        ch = txt[i]
        if ch in "'\"":
            v, j = lit(txt, i)
            if ch == '"' and re.search(r'\$\w', v): v = re.sub(r'\{?\$\w+(\[[^\]]*\]|->\w+)*\}?', '', v)
            morceaux.append(v); i = j; continue
        i += 1
    return morceaux

def points(sql):
    sql = sql.replace("\\'", '')
    sql = re.sub(r"'[^']*'", "''", sql)
    return sql.count('?')

def verifier_requetes(nom, s, c):
    ok = True
    for m in re.finditer(r'\b(lm2?_q|lm2?_ligne|lm2?_lignes)\s*\(', c):
        a, _ = args_top(c, m.end() - 1)
        if len(a) < 2: continue
        txt = s[a[1][0]:a[1][1]].strip()
        if not txt or txt[0] not in "'\"": continue
        sql_n = sum(points(x) for x in litteraux(txt))
        if len(a) == 2:
            if sql_n: print(f'{nom}:{ligne(s, m.start())}: {sql_n} « ? » sans types ni arguments'); ok = False
            continue
        tt = s[a[2][0]:a[2][1]].strip()
        if not tt or tt[0] not in "'\"": continue
        types = ''.join(litteraux(tt))
        if re.search(r'[^sidb]', types): print(f'{nom}:{ligne(s, m.start())}: types invalides {types}'); ok = False
        n_args = compte_elements(c, a[3][0], a[3][1]) if len(a) > 3 else 0
        if not (sql_n == len(types) and (n_args is None or n_args == len(types))):
            print(f'{nom}:{ligne(s, m.start())}: ? = {sql_n}, types = {len(types)} ({types}), arguments = {n_args}'); ok = False
    for m in re.finditer(r'->bind_param\s*\(', c):
        a, _ = args_top(c, m.end() - 1)
        tt = s[a[0][0]:a[0][1]].strip()
        if not tt or tt[0] not in "'\"": continue
        types, _ = lit(tt, 0)
        if '...' in s[a[1][0]:a[-1][1]] if len(a) > 1 else False: continue
        if len(types) != len(a) - 1: print(f'{nom}:{ligne(s, m.start())}: bind_param types = {len(types)}, variables = {len(a) - 1}'); ok = False
    return ok

PHP = set('''array_merge array_map array_filter array_keys array_values array_unique array_intersect array_intersect_key array_fill_keys array_key_exists array_push array_replace
array_replace_recursive array_merge_recursive array_slice array_search array_flip array_column array_sum array_combine array_reverse array_key_first array_pop array_shift array_diff
count in_array implode explode trim strtolower strtoupper str_replace str_pad str_starts_with str_ends_with str_contains strlen substr strpos strrchr preg_match preg_match_all preg_replace
preg_replace_callback preg_split preg_quote json_encode json_decode is_array is_scalar is_numeric is_int is_string is_bool is_file isset unset empty max min round floor ceil intdiv
number_format date time strtotime mktime checkdate mb_substr mb_strtoupper mb_strtolower mb_strlen mb_convert_case filter_var bin2hex random_bytes random_int hash hash_equals hash_hmac
password_hash password_verify session_name session_id session_create_id session_set_cookie_params session_start session_regenerate_id session_destroy session_write_close
session_status setcookie header headers_sent http_response_code file_get_contents file_put_contents unlink sys_get_temp_dir usleep sleep realpath dirname basename rawurlencode urlencode
http_build_query fopen fclose fwrite fgets fputcsv fgetcsv str_getcsv mysqli_report curl_init curl_setopt_array curl_exec curl_getinfo curl_error curl_close mail function_exists
defined define constant ob_start ob_end_clean ob_get_level rtrim ltrim usort uasort uksort sort ksort sprintf declare function pathinfo filesize readfile print_r var_dump exit die
echo require_once require include list ucfirst htmlspecialchars nl2br abs base64_encode base64_decode chunk_split iconv stream_socket_client stream_set_timeout
stream_context_create stream_socket_enable_crypto dns_get_record crc32 strcasecmp ini_get ini_set error_reporting set_time_limit gmdate array_walk strval intval boolval
json_last_error ctype_digit str_ends_with PHP_SAPI stripos substr_count rewind stream_get_contents fflush wordwrap str_repeat iterator_to_array mb_str_pad ucwords lcfirst array_count_values range shuffle array_rand date_default_timezone_set error_log
'''.split())
CONST_PHP = set('''JSON_UNESCAPED_UNICODE JSON_UNESCAPED_SLASHES JSON_PARTIAL_OUTPUT_ON_ERROR JSON_PRETTY_PRINT MYSQLI_ASSOC MYSQLI_REPORT_OFF ENT_QUOTES ENT_SUBSTITUTE
FILTER_VALIDATE_EMAIL FILTER_VALIDATE_INT PASSWORD_DEFAULT LOCK_EX STREAM_CLIENT_CONNECT STREAM_CRYPTO_METHOD_TLS_CLIENT CURLOPT_RETURNTRANSFER CURLOPT_POST CURLOPT_TIMEOUT
CURLOPT_CONNECTTIMEOUT CURLOPT_HTTPHEADER CURLOPT_POSTFIELDS CURLINFO_HTTP_CODE DNS_TXT PHP_EOL PHP_INT_MAX PHP_SAPI E_ALL ARRAY_FILTER_USE_KEY ARRAY_FILTER_USE_BOTH SORT_STRING
PHP_SESSION_ACTIVE PHP_SESSION_NONE TRUE FALSE NULL DB_HOST DB_USER DB_PASS DB_NAME FILE_APPEND COUNT_RECURSIVE PREG_SPLIT_NO_EMPTY'''.split())
MOTS = {'if', 'elseif', 'foreach', 'for', 'while', 'switch', 'return', 'array', 'catch', 'fn', 'use', 'match', 'isset', 'empty', 'unset', 'list', 'exit', 'die', 'echo',
        'print', 'and', 'or', 'not', 'function', 'static', 'self', 'parent', 'new', 'instanceof', 'clone', 'declare', 'require_once', 'include', 'require'}

def verifier_noms(fichiers):
    defs = set(); consts = set(); ok = True
    for nom, s, c in fichiers:
        defs |= set(re.findall(r'\bfunction\s+([a-zA-Z_]\w*)\s*\(', c))
        consts |= set(re.findall(r'\bconst\s+([A-Z_][A-Z0-9_]*)\s*=', c))
        consts |= set(re.findall(r"define\(\s*'([A-Z_][A-Z0-9_]*)'", s))
        consts |= set(re.findall(r'(?:const|,)\s*([A-Z_][A-Z0-9_]*)\s*=', c))
    for nom, s, c in fichiers:
        for m in re.finditer(r'(?<![\w$>:\\])([a-zA-Z_]\w*)\s*\(', c):
            f = m.group(1); avant = c[max(0, m.start() - 12):m.start()]
            if re.search(r'(function|new|fn)\s*$', avant) or f in MOTS: continue
            if f not in defs and f not in PHP: print(f'{nom}:{ligne(s, m.start())}: fonction inconnue {f}()'); ok = False
        for m in re.finditer(r'(?<![\w$>:\\\'"])([A-Z][A-Z0-9]*_[A-Z0-9_]+)\b(?!\s*\()', c):
            k = m.group(1)
            if k in consts or k in CONST_PHP: continue
            print(f'{nom}:{ligne(s, m.start())}: constante inconnue {k}'); ok = False
    return ok

SUPER = {'_SERVER', '_GET', '_POST', '_COOKIE', '_SESSION', '_FILES', '_ENV', '_REQUEST', 'GLOBALS', 'this'}
REFS = {'preg_match': [2], 'preg_match_all': [2], 'stream_socket_client': [1, 2], 'parse_str': [1], 'exec': [1, 2], 'dns_get_record': [2, 3], 'getmxrr': [1, 2]}

def corps_fonctions(c):
    """(début, fin) des corps des fonctions nommées de premier niveau, et texte de leurs paramètres"""
    res = []
    for m in re.finditer(r'\bfunction\s+[a-zA-Z_]\w*\s*\(', c):
        a, fin_par = args_top(c, m.end() - 1)
        k = c.index('{', fin_par); prof = 0
        for j in range(k, len(c)):
            if c[j] == '{': prof += 1
            elif c[j] == '}':
                prof -= 1
                if prof == 0: res.append((m.start(), m.end(), fin_par, k, j)); break
    return res

def affectes(c, deb, fin):
    t = c[deb:fin]; d = set()
    d |= set(re.findall(r'\$(\w+)\s*(?:=(?![=>])|\.=|\+=|-=|\*=|\?\?=|\|=|\[[^\]]*\]\s*=(?![=>]))', t))
    for m in re.finditer(r'\bas\s+(?:&?\$(\w+)\s*=>\s*)?(&?\$\w+|\[[^\]]*\])', t):
        if m.group(1): d.add(m.group(1))
        d |= set(re.findall(r'\$(\w+)', m.group(2)))
    for m in re.finditer(r'\[([^\[\]]*)\]\s*=(?![=>])', t): d |= set(re.findall(r'\$(\w+)', m.group(1)))
    for m in re.finditer(r'\blist\s*\(([^)]*)\)\s*=', t): d |= set(re.findall(r'\$(\w+)', m.group(1)))
    d |= set(re.findall(r'\bcatch\s*\([\w\\|\s]+\$(\w+)', t))
    for m in re.finditer(r'\b(?:static|global)\s+(\$\w+(?:\s*=[^;]*)?(?:\s*,\s*\$\w+(?:\s*=[^;,]*)?)*);', t): d |= set(re.findall(r'\$(\w+)', m.group(1)))
    for m in re.finditer(r'\b(?:function|fn)\s*&?\s*\(([^)]*)\)', t): d |= set(re.findall(r'\$(\w+)', m.group(1)))
    for m in re.finditer(r'\buse\s*\(([^)]*)\)', t): d |= set(re.findall(r'\$(\w+)', m.group(1)))
    for f, pos in REFS.items():
        for m in re.finditer(r'\b' + f + r'\s*\(', t):
            a, _ = args_top(t, m.end() - 1)
            for p in pos:
                if p < len(a): d |= set(re.findall(r'^\s*\$(\w+)', t[a[p][0]:a[p][1]]))
    return d

def verifier_variables(nom, s, c):
    ok = True
    for (fs, fe, fp, k, j) in corps_fonctions(c):
        params = set(re.findall(r'\$(\w+)', c[fe:fp]))
        d = params | affectes(c, k, j) | SUPER
        for m in re.finditer(r'\$(\w+)', c[k:j]):
            v = m.group(1)
            if v not in d: print(f'{nom}:{ligne(s, k + m.start())}: variable ${v} lue sans être affectée'); ok = False; d.add(v)
    # code de premier niveau (hors fonctions nommées)
    masque = list(c)
    for (fs, fe, fp, k, j) in corps_fonctions(c):
        for x in range(fs, j + 1):
            if masque[x] != '\n': masque[x] = ' '
    top = ''.join(masque)
    d = affectes(top, 0, len(top)) | SUPER
    for m in re.finditer(r'\$(\w+)', top):
        v = m.group(1)
        if v not in d: print(f'{nom}:{ligne(s, m.start())}: variable ${v} lue sans être affectée (niveau fichier)'); ok = False; d.add(v)
    return ok

def verifier_pv(nom, s, c):
    """instruction non terminée : ligne finissant par ) ] ' " ou un mot, suivie d'une ligne débutant par $var = ou un mot-clé d'instruction"""
    ok = True; L = c.split('\n')
    for i in range(len(L) - 1):
        a = L[i].rstrip(); b = L[i + 1].lstrip()
        if not a or a.startswith('<?php') or a.endswith((';', '{', '}', ',', '(', '[', '.', '?', ':', '=', '&&', '||', '>', '<', '+', '-', '*', '/', '!', '??')): continue
        if re.match(r'^(\$\w+\s*=[^=>]|if\s*\(|foreach\s*\(|return\b|function\b|lm2?_\w+\(\$db)', b) and not re.search(r'\b(if|elseif|foreach|for|while|else)\b.*\)$|\belse$|=>\s*$', a):
            print(f'{nom}:{i + 1}: « ; » manquant ?  {a.strip()[:70]}'); ok = False
    return ok

fichiers = []; tout = True
for nom in sys.argv[1:]:
    s = open(nom, encoding='utf-8').read(); c = scan(s)
    fichiers.append((nom, s, c))
    tout &= equilibre(nom, s, c)
    tout &= verifier_requetes(nom, s, c)
    tout &= verifier_variables(nom, s, c)
    tout &= verifier_pv(nom, s, c)
tout &= verifier_noms(fichiers)
print('OK' if tout else 'ÉCHEC')
