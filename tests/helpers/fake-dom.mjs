/**
 * Minimal, dependency-free DOM stand-in for exercising docs/reconstruction-view.mjs in Node.
 *
 * Authored by Kiro (Kiroween 2026, feat/evidence-reconstruction).
 * Implements only what the view uses: element creation (HTML + SVG namespace), attributes,
 * classList, append / replaceChildren, textContent, listeners, click / dispatch, focus.
 */
class FakeClassList {
  constructor() { this.set = new Set(); }
  add(...names) { names.forEach(n => this.set.add(n)); }
  remove(...names) { names.forEach(n => this.set.delete(n)); }
  contains(name) { return this.set.has(name); }
  toggle(name, force) {
    const on = force === undefined ? !this.set.has(name) : !!force;
    if (on) this.set.add(name); else this.set.delete(name);
    return on;
  }
}

export class FakeNode {
  constructor(doc, tagName, namespaceURI = 'html') {
    this.ownerDocument = doc;
    this.tagName = tagName;
    this.namespaceURI = namespaceURI;
    this.attrs = new Map();
    this.children = [];
    this.parent = null;
    this.listeners = {};
    this.classList = new FakeClassList();
    this.style = {props: {}, setProperty(k, v) { this.props[k] = v; }};
    this._text = '';
    this.hidden = false;
    this.disabled = false;
    this.value = '';
  }
  setAttribute(name, value) {
    const v = String(value);
    this.attrs.set(name, v);
    if (name === 'class') this.classList.set = new Set(v.split(/\s+/).filter(Boolean));
    if (name === 'value') this.value = v;
    if (name === 'hidden') this.hidden = true;
  }
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
  hasAttribute(name) { return this.attrs.has(name); }
  removeAttribute(name) { this.attrs.delete(name); if (name === 'hidden') this.hidden = false; }
  append(...nodes) {
    for (const n of nodes) {
      if (typeof n === 'string') { this._text += n; continue; }
      n.parent = this;
      this.children.push(n);
    }
  }
  replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
  set textContent(v) { this.children = []; this._text = String(v); }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatch(type) { for (const fn of this.listeners[type] || []) fn({type, target: this}); }
  click() { if (!this.disabled) this.dispatch('click'); }
  focus() { this.ownerDocument.activeElement = this; }
  get isConnected() { return true; }
  walk(visit) { visit(this); for (const c of this.children) c.walk(visit); }
  find(pred) { let hit = null; this.walk(n => { if (!hit && pred(n)) hit = n; }); return hit; }
  findAll(pred) { const out = []; this.walk(n => { if (pred(n)) out.push(n); }); return out; }
  byId(id) { return this.find(n => n.getAttribute('id') === id); }
  byClass(name) { return this.find(n => n.classList.contains(name)); }
  allByClass(name) { return this.findAll(n => n.classList.contains(name)); }
  hasClass(name) { return this.classList.contains(name); }
}

export class FakeDocument {
  constructor() { this.activeElement = null; }
  createElement(tag) { return new FakeNode(this, tag, 'html'); }
  createElementNS(ns, tag) { return new FakeNode(this, tag, ns); }
}

/** Manual scheduler: nothing runs until the test calls tick(). */
export function manualScheduler() {
  let id = 0;
  const pending = new Map();
  return {
    schedule(fn, ms) { pending.set(++id, {fn, ms}); return id; },
    cancel(handle) { pending.delete(handle); },
    tick() {
      const first = pending.entries().next();
      if (first.done) throw new Error('no pending timer');
      const [handle, t] = first.value;
      pending.delete(handle);
      t.fn();
    },
    get size() { return pending.size; },
    get delay() { const v = pending.values().next(); return v.done ? null : v.value.ms; },
  };
}
