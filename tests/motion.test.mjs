/**
 * Motion grammar (docs/motion.mjs): storage key, pause logic, header toggle, entrance arming. No browser needed.
 * Run: node --test tests/motion.test.mjs
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STORAGE_KEY, readPaused, writePaused, motionAllowed, initMotion, TILT_MAX, tiltFor, countValue, activeSection, SECTIONS} from '../docs/motion.mjs';

const store = (init = {}) => { const m = {...init}; return {getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, m}; };

function fakeEnv({reduced = false, top = 2000, storage = store()} = {}) {
  const attrs = {};
  const el = () => { const n = {attrs: {}, cls: new Set(), listeners: {}, setAttribute(k, v) { n.attrs[k] = v; }, addEventListener(t, f) { n.listeners[t] = f; }, append() {},
    classList: {add: c => n.cls.add(c), remove: (...c) => c.forEach(x => n.cls.delete(x))}, getBoundingClientRect: () => ({top})}; return n; };
  const band = el(), header = el();
  const doc = {documentElement: {setAttribute: (k, v) => { attrs[k] = v; }}, createElement: () => el(), querySelector: () => header, querySelectorAll: () => [band]};
  const observed = [];
  class IO { constructor(cb) { this.cb = cb; } observe(t) { observed.push(t); } unobserve() {} disconnect() { observed.length = 0; } }
  const win = {innerHeight: 900, matchMedia: () => ({matches: reduced}), IntersectionObserver: IO, requestAnimationFrame: f => f(), setTimeout: () => 0};
  return {doc, win, storage, attrs, band, observed, init: () => initMotion({doc, win, storage})};
}

test('storage key and pause logic', () => {
  assert.equal(STORAGE_KEY, 'ghostbridge-motion');
  assert.equal(readPaused(store()), false);
  assert.equal(readPaused(store({[STORAGE_KEY]: 'paused'})), true);
  const s = store(); writePaused(s, true); assert.equal(s.m[STORAGE_KEY], 'paused'); writePaused(s, false); assert.equal(readPaused(s), false);
  assert.equal(readPaused({getItem() { throw new Error('blocked'); }}), false);
  assert.equal(motionAllowed({paused: false, reduced: false}), true);
  assert.equal(motionAllowed({paused: true, reduced: false}), false);
  assert.equal(motionAllowed({paused: false, reduced: true}), false);
});

test('a band below the fold is armed only after the module runs; one already in view is never hidden', () => {
  const below = fakeEnv({top: 2000}); below.init();
  assert.ok(below.band.cls.has('is-armed')); assert.equal(below.attrs['data-motion'], 'on');
  const inView = fakeEnv({top: 100}); inView.init();
  assert.ok(!inView.band.cls.has('is-armed'));
});

test('Pause motion toggles aria-pressed, persists, and releases armed bands; nothing is written on load', () => {
  const e = fakeEnv(); const m = e.init();
  assert.deepEqual(e.storage.m, {});
  assert.equal(m.button.attrs['aria-pressed'], 'false');
  m.button.listeners.click();
  assert.equal(m.button.attrs['aria-pressed'], 'true'); assert.equal(e.storage.m[STORAGE_KEY], 'paused');
  assert.equal(e.attrs['data-motion'], 'off'); assert.ok(!e.band.cls.has('is-armed'));
  m.button.listeners.click();
  assert.equal(e.storage.m[STORAGE_KEY], 'running'); assert.equal(e.attrs['data-motion'], 'on');
});

test('a stored pause or prefers-reduced-motion means no entrance and motion off', () => {
  const paused = fakeEnv({storage: store({[STORAGE_KEY]: 'paused'})}); paused.init();
  assert.equal(paused.attrs['data-motion'], 'off'); assert.ok(!paused.band.cls.has('is-armed'));
  const reduced = fakeEnv({reduced: true}); const m = reduced.init();
  assert.equal(reduced.attrs['data-motion'], 'off'); assert.ok(!reduced.band.cls.has('is-armed'));
  assert.equal(m.button.attrs['aria-disabled'], 'true');
  m.button.listeners.click(); assert.deepEqual(reduced.storage.m, {});
});

test('depth: tilt never exceeds 6 degrees and is centred at rest', () => {
  assert.equal(TILT_MAX, 6);
  assert.deepEqual(tiltFor(0.5, 0.5), {rx: 0, ry: 0});
  for (const [x, y] of [[0, 0], [1, 1], [0, 1], [1, 0], [-3, 9], [4, -7]]) { const t = tiltFor(x, y); assert.ok(Math.abs(t.rx) <= 6 && Math.abs(t.ry) <= 6, JSON.stringify(t)); }
  assert.equal(tiltFor(1, 0.5).ry, 6); assert.equal(tiltFor(0.5, 0).rx, 6);
});

test('depth: count-up is monotonic, integer, and ends on the exact markup value', () => {
  let prev = -1;
  for (let i = 0; i <= 10; i++) { const v = countValue(300, i / 10); assert.ok(Number.isInteger(v) && v >= prev); prev = v; }
  assert.equal(countValue(300, 0), 0); assert.equal(countValue(300, 1), 300); assert.equal(countValue(120, 5), 120); assert.equal(countValue(10, -1), 0);
});

test('depth: the section rail follows the scroll position and covers real page sections', () => {
  assert.deepEqual(SECTIONS.map(s => s.id), ['control-room', 'how', 'architecture', 'workspace', 'vision']);
  assert.equal(activeSection([0, 900, 1800, 2700, 3600], 800), 0);
  assert.equal(activeSection([-1200, 100, 900, 1800, 2700], 800), 1);
  assert.equal(activeSection([-3000, -2000, -900, 200, 1100], 800), 3);
  const html = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
  for (const s of SECTIONS) assert.ok(html.includes('id="' + s.id + '"'), s.id);
});

test('depth.css: every animation and pointer transform is gated by data-motion="on" and no-preference; no remote requests', () => {
  const css = readFileSync(new URL('../docs/depth.css', import.meta.url), 'utf8');
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(css) && !/@import/.test(css), 'third-party request in depth.css');
  const gated = css.slice(css.indexOf('@media(prefers-reduced-motion:no-preference)'));
  const before = css.slice(0, css.indexOf('@media(prefers-reduced-motion:no-preference)'));
  assert.ok(!/animation\s*:|animation-name/.test(before.replace(/\/\*[\s\S]*?\*\//g, '')), 'ungated animation');
  for (const m of gated.matchAll(/(^|\})\s*(:root\[data-motion="on"\][^{]*)\{[^}]*animation:/g)) assert.ok(m[2].includes('data-motion="on"'));
  assert.match(css, /:root\[data-motion="off"\]/);
  const html = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
  assert.match(html, /href="depth\.css"/);
  assert.ok(!/<i class="cr-aurora"[^>]*>[^<]+</.test(html), 'hero light layers carry no text');
});