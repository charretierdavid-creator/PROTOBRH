/* Module LM 2.0 — 15/11/2026 · banc d'essai sans navigateur de la console : DOM minimal (éléments à identifiant, champs, cases) + contexte isolé (vm) · historique : VERSIONS.md */
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');

function attrs(s) { const a = {}; s.replace(/([\w:-]+)(?:="([^"]*)")?/g, (m, k, v) => { a[k] = v === undefined ? '' : v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); return m; }); return a; }
function creerDom() {
  const ids = {}; let champs = [];
  class CL { constructor(el) { this.el = el; } get s() { return new Set(String(this.el.className || '').split(/\s+/).filter(Boolean)); }
    add(...c) { const s = this.s; c.forEach(x => s.add(x)); this.el.className = [...s].join(' '); } remove(...c) { const s = this.s; c.forEach(x => s.delete(x)); this.el.className = [...s].join(' '); }
    toggle(c, on) { if (on === undefined) on = !this.s.has(c); on ? this.add(c) : this.remove(c); return on; } contains(c) { return this.s.has(c); } }
  class El {
    constructor(tag, a) { a = a || {}; this.tagName = String(tag || 'div').toUpperCase(); this.a = a; this.id = a.id || ''; this.className = a.class || ''; this.classList = new CL(this); this.style = {}; this.children = []; this.parentNode = null;
      this._h = ''; this.textContent = ''; this.type = a.type || ''; this.name = a.name || ''; this.checked = 'checked' in a; this.disabled = 'disabled' in a; this.hidden = 'hidden' in a; this.value = a.value !== undefined ? a.value : ''; this.files = null; this.srcdoc = ''; }
    get innerHTML() { return this._h; }
    set innerHTML(h) {
      h = String(h); this._h = h; this.children = [];
      champs = champs.filter(c => !this.contient(c));
      const re = /<(input|textarea|select|button|div|span|iframe|p|table|tbody|tr|td|ul|li|section|label|a|b|h1|h2|h3|dl|datalist|nav|main)\b([^>]*)>/gi; let m;
      while ((m = re.exec(h))) {
        const a = attrs(m[2]); if (!a.id && !/^(input|textarea|select)$/i.test(m[1])) continue;
        const e = new El(m[1], a); e.parentNode = this; e._hote = this;
        if (/^textarea$/i.test(m[1])) { const fin = h.indexOf('</textarea>', re.lastIndex); e.value = h.slice(re.lastIndex, fin).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); }
        if (/^select$/i.test(m[1])) { const fin = h.indexOf('</select>', re.lastIndex), inner = h.slice(re.lastIndex, fin); const opts = [...inner.matchAll(/<option(?: value="([^"]*)")?([^>]*)>([^<]*)<\/option>/g)];
          const sel = opts.find(o => /selected/.test(o[2])) || opts[0]; e.value = sel ? (sel[1] !== undefined ? sel[1] : sel[3]) : ''; e.options = opts.map(o => ({ value: o[1] !== undefined ? o[1] : o[3], textContent: o[3] })); }
        this.children.push(e); if (e.id) ids[e.id] = e; if (/^(input|textarea|select)$/i.test(m[1])) champs.push(e);
      }
    }
    contient(e) { let p = e._hote; while (p) { if (p === this) return true; p = p._hote || p.parentNode; } return false; }
    get texte() { return this._h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|\s+/g, ' ').trim(); }
    appendChild(c) { c.parentNode = this; this.children.push(c); if (c.id) ids[c.id] = c; return c; }
    insertBefore(c, r) { return this.appendChild(c); } removeChild(c) { this.children = this.children.filter(x => x !== c); return c; } remove() { if (this.parentNode) this.parentNode.removeChild(this); if (this.id && ids[this.id] === this) delete ids[this.id]; }
    getAttribute(k) { return k === 'class' ? this.className : (this.a[k] !== undefined ? this.a[k] : null); } setAttribute(k, v) { this.a[k] = String(v); if (k === 'id') { this.id = v; ids[v] = this; } } hasAttribute(k) { return k in this.a; }
    addEventListener() {} focus() {} select() {} click() {} scrollIntoView() {} closest() { return this.parentNode; }
    querySelector(s) { return null; } querySelectorAll() { return []; }
  }
  const document = {
    readyState: 'complete', head: new El('head'), body: new El('body'), listeners: {},
    getElementById(id) { return ids[id] || null; },
    createElement(t) { return new El(t); },
    querySelector(s) { const m = s.match(/^input\[name="([^"]+)"\]:checked$/); if (m) return champs.find(c => c.name === m[1] && c.checked) || null; return null; },
    querySelectorAll(s) { return []; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    execCommand() { return true; }, write() {}
  };
  return { document, ids, El, champs: () => champs, cocher(nom, val) { champs.filter(c => c.name === nom).forEach(c => { c.checked = c.value === String(val); }); } };
}
/* contexte de la console : référentiel, règles, démonstration, application */
function console2(dossier, opts) {
  opts = opts || {};
  const dom = creerDom();
  ['bands', 'app', 'dlgs', 'who', 'tabs', 'tabsIn'].forEach(id => dom.document.body.appendChild(new dom.El('div', { id })));
  const loc = { search: opts.search || '?demo=1', hash: opts.hash || '', pathname: '/console.html', href: '' };
  const D0 = Date, dec = (opts.jours || 0) * 864e5;
  class DD extends D0 { constructor(...a) { if (a.length) super(...a); else super(D0.now() + dec); } static now() { return D0.now() + dec; } }
  const ctx = { document: dom.document, location: loc, history: { replaceState() {} }, navigator: { clipboard: { writeText: t => { ctx.__copie = t; return Promise.resolve(); } } },
    matchMedia: () => ({ matches: false }), setTimeout, clearTimeout, setInterval, clearInterval, Promise, Date: DD, Math, JSON, console: { log() {}, info() {}, error: (...a) => ctx.__erreurs.push(a.join(' ')) },
    confirm: () => true, open: () => null, URL: { createObjectURL: () => 'blob:', revokeObjectURL() {} }, Blob: class { constructor(p) { ctx.__blob = p.join(''); } }, fetch: () => Promise.reject(new Error('pas de réseau')), __erreurs: [] };
  ctx.window = ctx; vm.createContext(ctx);
  const fichiers = ['lm2-referentiel.js', 'lm2-regles.js'].concat(opts.demo === false ? [] : ['console-demo.js']).concat(['console.js']);
  fichiers.forEach(f => vm.runInContext(fs.readFileSync(path.join(dossier, f), 'utf8'), ctx, { filename: f }));
  return { ctx, dom, C: ctx.LM2_CONSOLE, app: () => dom.ids.app.innerHTML, dlg: () => dom.ids.dlgs.innerHTML, toast: () => (dom.ids.lm2Toast || {}).textContent || '' };
}
const attendre = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
let ok = 0; const echecs = [];
function verifier(nom, cond, detail) { if (process.env.LM2_TRACE) console.log((cond ? 'ok ' : 'KO ') + nom); if (cond) ok++; else echecs.push(nom + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 300) : '')); }
function bilan(titre) { console.log(titre + ' : ' + ok + ' contrôle(s) réussi(s), ' + echecs.length + ' échec(s)'); echecs.forEach(e => console.log('  ÉCHEC ' + e)); process.exitCode = echecs.length ? 1 : 0; return echecs.length === 0; }
module.exports = { creerDom, console2, attendre, verifier, bilan };
