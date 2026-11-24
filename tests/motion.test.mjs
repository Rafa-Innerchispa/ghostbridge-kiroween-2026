/**
 * Motion grammar (docs/motion.mjs): storage key, pause logic, header toggle, entrance arming. No browser needed.
 * Run: node --test tests/motion.test.mjs
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY, readPaused, writePaused, motionAllowed, initMotion} from '../docs/motion.mjs';

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
