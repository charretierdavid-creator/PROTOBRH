/* Module LM 2.0 — 15/11/2026 · banc d’essai des pages du socle (DOM simulé, repris de la version C 1.8, inchangé) · historique : VERSIONS.md */
/* ==============================================================
   Banc d'essai sans navigateur : DOM simulé minimal + contexte isolé (vm) pour exécuter
   les scripts du socle et de la version C comme dans une page. Version C 1.8 — 15/11/2026, repris par le module LM 1.0 ; inchangé en LM 2.0 (pages du socle).
   ============================================================== */
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');

class CL { constructor(){ this.s = new Set(); } add(...a){ a.forEach(x => this.s.add(x)); } remove(...a){ a.forEach(x => this.s.delete(x)); }
  toggle(x, on){ if (on === undefined) on = !this.s.has(x); on ? this.s.add(x) : this.s.delete(x); return on; } contains(x){ return this.s.has(x); } }

function creerDom(idsConnus, selects) {
  const els = {};
  class El {
    constructor(tag, id){ this.tagName = (tag || 'div').toUpperCase(); this._id = id || ''; this._v = ''; this.textContent = ''; this._h = ''; this.children = []; this.style = {}; this.classList = new CL();
      this.dataset = {}; this.attrs = {}; this.listeners = {}; this.parentNode = null; this.checked = false; this.type = ''; this.disabled = false; this.label = ''; this.hidden = false; this.className = ''; }
    get id(){ return this._id; } set id(v){ this._id = v; if (v) els[v] = this; }
    get value(){ if (this.tagName === 'SELECT') { const o = this.opts().find(o => o.selected) || this.opts()[0]; return o ? o.value : ''; } return this._v; }
    set value(v){ if (this.tagName === 'SELECT') this.opts().forEach(o => o.selected = (o.value === String(v))); else this._v = String(v); }
    opts(){ const r = []; const w = e => e.children.forEach(c => { if (c.tagName === 'OPTION') r.push(c); else w(c); }); w(this); return r; }
    get options(){ return this.opts(); }
    get innerHTML(){ return this._h; }
    set innerHTML(h){ this._h = h; this.children = [];
      if (this.tagName === 'SELECT') { let cur = this; const re = /<optgroup label="([^"]*)">|<\/optgroup>|<option(?: value="([^"]*)")?( selected)?>([^<]*)<\/option>/g; let m;
        while ((m = re.exec(h))) { if (m[1] !== undefined) { const g = new El('optgroup'); g.label = m[1]; this.appendChild(g); cur = g; }
          else if (m[0] === '</optgroup>') cur = this; else { const o = new El('option'); o.value = m[2] !== undefined ? m[2] : m[4]; o.selected = !!m[3]; o.textContent = m[4]; cur.appendChild(o); } } }
      else { /* éléments à identifiant contenus dans le HTML inséré : créés pour getElementById */
        const re = /<(\w+)([^>]*?)\bid="([\w-]+)"([^>]*)>/g; let m;
        while ((m = re.exec(h))) { const e = new El(m[1], m[3]); const t = (m[2] + m[4]).match(/type="(\w+)"/); if (t) e.type = t[1]; this.appendChild(e); } } }
    get texte(){ return (this._h || this.textContent || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
    appendChild(c){ if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); if (c.id) els[c.id] = c; return c; }
    insertBefore(c, ref){ if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); if (c.id) els[c.id] = c; return c; }
    removeChild(c){ const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; }
    remove(){ if (this.parentNode) this.parentNode.removeChild(this); }
    get nextSibling(){ const p = this.parentNode; if (!p) return null; return p.children[p.children.indexOf(this) + 1] || null; }
    get nextElementSibling(){ return this._nx || (this._nx = new El('span')); }
    querySelectorAll(sel){ const all = []; const w = e => e.children.forEach(c => { all.push(c); w(c); }); w(this);
      let m = sel.match(/^option\[value="([^"]*)"\]$/); if (m) return all.filter(e => e.tagName === 'OPTION' && e.value === m[1]);
      if (sel === 'optgroup') return all.filter(e => e.tagName === 'OPTGROUP');
      m = sel.match(/^\.([\w-]+)$/); if (m) return all.filter(e => (' ' + e.className + ' ').indexOf(' ' + m[1] + ' ') >= 0);
      return []; }
    querySelector(sel){ const m = sel.match(/^\.([\w-]+)$/); if (m) { const r = this.querySelectorAll(sel)[0]; if (r) return r; if (m[1] === 'dv-ccn-resume') return null; }
      const k = '__q' + sel; if (!this[k]) { this[k] = new El('span'); this[k].parentNode = this; } return this[k]; }
    closest(sel){ if (sel === '.field') { let p = this.parentNode; while (p && !p.classList.contains('field')) p = p.parentNode; return p || this.parentNode; } return this.parentNode || null; }
    addEventListener(t, f){ (this.listeners[t] = this.listeners[t] || []).push(f); }
    emettre(t, extra){ (this.listeners[t] || []).forEach(f => f(Object.assign({ target:this, preventDefault(){} }, extra || {}))); }
    insertAdjacentHTML(){} focus(){} click(){ this.emettre('click'); } scrollIntoView(){} getBoundingClientRect(){ return { top:0 }; }
    setAttribute(k, v){ this.attrs[k] = String(v); } getAttribute(k){ return this.attrs[k]; } hasAttribute(k){ return k in this.attrs; }
  }
  const grille = new El('div', 'grille-test');
  const document = {
    readyState:'complete', head:new El('head'), body:new El('body'), documentElement:new El('html'),
    getElementById(id){ if (els[id]) return els[id]; if (!idsConnus.has(id)) return null;
      const e = new El(selects.includes(id) ? 'select' : 'div', id); const f = new El('div'); f.classList.add('field'); f.className = 'field'; f.appendChild(e); grille.appendChild(f); return e; },
    querySelector(q){ if (q === '[data-st="idcc"]') return this._st || (this._st = new El('span')); if (q === '#results-gate .rg-form') return this._gate || (this._gate = new El('div')); return null; },
    querySelectorAll(){ return []; }, createElement(t){ return new El(t); }, addEventListener(){}
  };
  return { els, document, El };
}

/* contexte d'une page : charge les scripts dans l'ordre, renvoie des aides */
function page(o) {
  const html = fs.readFileSync(o.html, 'utf8');
  const ids = new Set((html.match(/\bid="([\w-]+)"/g) || []).map(x => x.slice(4, -1)));
  const dom = creerDom(ids, o.selects || []);
  const store = Object.assign({}, o.store || {});
  const envois = [];
  const ctx = { console:{ log(){}, info(){}, warn(){}, error: console.error }, document:dom.document, URLSearchParams, Promise, setTimeout, clearTimeout, Date, Math, JSON,
    btoa:s => Buffer.from(s, 'binary').toString('base64'), atob:s => Buffer.from(s, 'base64').toString('binary'), encodeURIComponent, unescape,
    sessionStorage:{ getItem:k => k in store ? store[k] : null, setItem:(k, v) => { store[k] = String(v); }, removeItem:k => { delete store[k]; } },
    location:{ pathname:'/' + path.basename(o.html), search:'', href:'', hash:'', protocol:'https:' }, navigator:{}, scrollTo(){}, print(){}, alert(){}, history:{ replaceState(){} } };
  ctx.window = ctx; ctx.self = ctx;
  ctx.fetch = async (u, opt) => {
    const b = opt && typeof opt.body === 'string' ? JSON.parse(opt.body) : null; envois.push({ url:String(u), body:b });
    const r = await o.repondre(String(u), b);
    const json = r === undefined ? { ok:false } : r; const s = JSON.stringify(json);
    return { ok:r !== undefined, status:r === undefined ? 404 : 200, json:async () => JSON.parse(s), clone(){ return { json:async () => JSON.parse(s) }; } };
  };
  vm.createContext(ctx);
  const run = (f, code) => vm.runInContext(code != null ? code : fs.readFileSync(f, 'utf8'), ctx, { filename:f });
  const g = c => vm.runInContext(c, ctx);
  return { ctx, run, g, els:dom.els, document:dom.document, store, envois, attendre:ms => new Promise(r => setTimeout(r, ms || 30)) };
}
/* script principal (inline) d'une page du socle */
function scriptPage(html) {
  const s = fs.readFileSync(html, 'utf8'), m = [...s.matchAll(/<script>\n?([\s\S]*?)<\/script>/g)].map(x => x[1]);
  return m.sort((a, b) => b.length - a.length)[0];
}

/* assertions */
let ok = 0, ko = 0; const echecs = [];
function verifier(nom, cond, detail) { if (cond) { ok++; } else { ko++; echecs.push(nom + (detail !== undefined ? ' — obtenu : ' + JSON.stringify(detail).slice(0, 200) : '')); } }
function bilan(titre) { console.log((ko ? '✗ ' : '✓ ') + titre + ' : ' + ok + ' contrôle(s) réussi(s)' + (ko ? ', ' + ko + ' en échec' : ''));
  echecs.forEach(e => console.log('    ✗ ' + e)); return ko; }
module.exports = { page, scriptPage, verifier, bilan };
