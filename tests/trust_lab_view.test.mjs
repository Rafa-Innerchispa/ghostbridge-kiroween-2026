/**
 * Evidence Trust Lab VIEW tests (docs/trust_lab_view.mjs).
 * Authored by the ui-director custom Kiro agent (Phase 6 run B); the last test (blanket re-enable) was added by Kiro's main session.
 * Run: node --test tests/trust_lab_view.test.mjs
 *
 * Hosted on tests/helpers/fake-dom.mjs (no browser) against real ledgers built with the real engine. What this cannot prove
 * (layout, focus ring, 40 px targets, localStorage and the real integrity label staying untouched) is covered by
 * tests/browser-qa/phase6-experience.qa.mjs.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {append, scenario, verify} from '../docs/engine.mjs';
import {makeForgeEvents} from '../docs/signal_forge.mjs';
import {TAMPERABLE, inspectChain} from '../docs/trust_lab.mjs';
import {mountTrustLab, HONESTY} from '../docs/trust_lab_view.mjs';
import {FakeDocument} from './helpers/fake-dom.mjs';

const ledger = async events => { const rows = []; for (const e of events) await append(rows, e); return rows; };
const night = () => ledger(scenario('night'));

async function mount(rows) {
  const doc = new FakeDocument(), host = doc.createElement('section');
  const lab = mountTrustLab({doc, host, getRows: () => rows});
  await lab.ready;
  const els = lab.elements;
  return {doc, host, lab, rows, els};
}
const blocks = root => root.allByClass('cr-tl-lab-block');
const select = (el, v) => { el.value = String(v); el.dispatch('change'); };

test('shows the honesty line, a labelled region title and one block per ledger row with icon plus text status', async () => {
  const rows = await night();
  const t = await mount(rows);
  assert.equal(HONESTY, 'Experiment on an isolated copy. The ledger above is never changed.');
  assert.equal(t.els.honesty.textContent, HONESTY);
  assert.equal(t.host.byId('cr-tl-lab-title').textContent, 'Evidence Trust Lab');
  const b = blocks(t.els.chain);
  assert.equal(b.length, rows.length);
  b.forEach((el, i) => {
    assert.equal(el.getAttribute('data-status'), 'verified');
    assert.ok(el.textContent.includes(`#${i + 1}`));
    assert.ok(el.textContent.includes('Verified'), 'status is a word, not only a colour');
    assert.ok(el.byClass('cr-tl-lab-icon'), 'and an icon');
    assert.equal(el.byClass('cr-tl-lab-hash').getAttribute('title'), rows[i].hash, 'full hash on hover');
    assert.ok(el.byClass('cr-tl-lab-hash').textContent.includes('…'), 'hash is shortened');
    assert.ok(el.textContent.includes(rows[i].payload.event.type));
  });
});

test('controls: row select 1..n, field select from TAMPERABLE, named buttons, aria-live status region', async () => {
  const rows = await night();
  const t = await mount(rows);
  assert.equal(t.els.rowSel.children.length, rows.length);
  assert.deepEqual(t.els.rowSel.children.map(o => o.getAttribute('value')), rows.map((_, i) => String(i + 1)));
  assert.deepEqual(t.els.fieldSel.children.map(o => o.getAttribute('value')), [...TAMPERABLE]);
  assert.equal(t.els.tamper.textContent, 'Tamper a copy');
  assert.equal(t.els.restore.textContent, 'Restore');
  assert.equal(t.els.tamper.tagName, 'button'); assert.equal(t.els.restore.tagName, 'button');
  assert.equal(t.els.restore.disabled, true, 'nothing to restore yet');
  assert.equal(t.els.live.getAttribute('aria-live'), 'polite');
  assert.equal(t.els.details.hasAttribute('open'), false, 'collapsed by default');
});

test('tamper row 2, field at: original verifies N of N, altered copy fails at row 2, reason/change/hashes shown, real rows untouched', async () => {
  const rows = await night();
  const snap = JSON.stringify(rows), before = structuredClone(rows);
  const t = await mount(rows);
  select(t.els.rowSel, 2); select(t.els.fieldSel, 'at');
  t.els.tamper.click();
  await new Promise(r => setImmediate(r));
  while (t.lab.state.busy) await new Promise(r => setImmediate(r));
  const orig = t.host.byId('cr-tl-lab-original-h').textContent, alt = t.host.byId('cr-tl-lab-altered-h').textContent;
  assert.equal(orig, `Original ledger: verified ${rows.length} of ${rows.length} rows`);
  assert.equal(alt, 'Altered copy: fails at row 2');
  const res = t.lab.result;
  assert.equal(res.tampered.failedAt, 2);
  const reason = t.host.byId('cr-tl-lab-reason').textContent;
  assert.equal(reason, res.tampered.rows[1].reason);
  const change = t.host.byId('cr-tl-lab-change').textContent;
  assert.ok(change.includes(String(res.change.before)) && change.includes(String(res.change.after)) && change.includes(res.change.id));
  assert.notEqual(res.change.before, res.change.after);
  const hashes = t.host.byId('cr-tl-lab-hashes');
  const [stored, recomputed] = hashes.allByClass('cr-tl-lab-mono');
  assert.equal(stored.getAttribute('title'), res.tampered.rows[1].storedHash);
  assert.equal(recomputed.getAttribute('title'), res.tampered.rows[1].recomputed);
  assert.notEqual(stored.textContent, recomputed.textContent);
  assert.ok(stored.textContent.includes('…') && recomputed.textContent.includes('…'));
  const altBlocks = blocks(t.host.byId('cr-tl-lab-altered')).map(b => b.getAttribute('data-status'));
  assert.deepEqual(altBlocks.slice(0, 3), ['verified', 'altered', 'unverifiable']);
  assert.match(t.els.live.textContent, /fails at row 2/);
  assert.match(t.els.live.textContent, new RegExp(`verified ${rows.length} of ${rows.length}`));
  // the real ledger: deep-equal, byte-identical, still verifies, and the chain on screen still says Verified
  assert.equal(JSON.stringify(rows), snap);
  assert.deepEqual(rows, before);
  assert.equal((await verify(rows)).valid, true);
  assert.ok(blocks(t.els.chain).every(b => b.getAttribute('data-status') === 'verified'));
  assert.equal(t.els.restore.disabled, false);
});

test('tampering never mutates the rows passed in, for every applicable field on every row', async () => {
  const rows = await ledger(makeForgeEvents({delaySeconds: 299, holdSeconds: 120, cameraOffline: true}));
  const snap = JSON.stringify(rows);
  const t = await mount(rows);
  let ran = 0;
  for (let seq = 1; seq <= rows.length; seq++) {
    select(t.els.rowSel, seq);
    for (const opt of t.els.fieldSel.children) {
      if (opt.hasAttribute('disabled')) continue;
      select(t.els.fieldSel, opt.getAttribute('value'));
      await t.lab.tamper();
      assert.equal(t.lab.result.tampered.failedAt, seq, `${opt.getAttribute('value')}@${seq}`);
      assert.equal(JSON.stringify(rows), snap);
      ran++;
    }
  }
  assert.ok(ran >= 6, `exercised ${ran} experiments`);
  assert.equal((await inspectChain(rows)).valid, true);
});

test('fields that do not apply to the chosen row are disabled and explained (duration on a door.closed)', async () => {
  const rows = await night();
  const closed = rows.findIndex(r => r.payload.event.type === 'door.closed') + 1;
  assert.ok(closed > 0, 'fixture has a door.closed row');
  const t = await mount(rows);
  select(t.els.rowSel, closed);
  const dur = t.els.fieldSel.children.find(o => o.getAttribute('value') === 'duration_seconds');
  assert.equal(dur.hasAttribute('disabled'), true);
  assert.match(dur.textContent, /not applicable/);
  assert.match(t.els.fieldHint.textContent, /cannot be changed/);
  assert.notEqual(t.els.fieldSel.value, 'duration_seconds');
  const timed = rows.findIndex(r => Number.isInteger(r.payload.event.data?.duration_seconds)) + 1;
  assert.ok(timed > 0);
  select(t.els.rowSel, timed);
  assert.equal(t.els.fieldSel.children.find(o => o.getAttribute('value') === 'duration_seconds').hasAttribute('disabled'), false);
});

test('Restore clears the experiment and returns to the clean chain', async () => {
  const rows = await night();
  const t = await mount(rows);
  await t.lab.tamper();
  assert.ok(t.lab.result);
  assert.ok(t.host.byId('cr-tl-lab-altered'));
  t.els.restore.click();
  assert.equal(t.lab.result, null);
  assert.equal(t.els.out.children.length, 0);
  assert.equal(t.els.restore.disabled, true);
  assert.match(t.els.live.textContent, /discarded/);
  assert.ok(blocks(t.els.chain).every(b => b.getAttribute('data-status') === 'verified'));
});

test('changing the row or field after an experiment clears the stale result', async () => {
  const rows = await night();
  const t = await mount(rows);
  await t.lab.tamper();
  select(t.els.rowSel, 3);
  assert.equal(t.lab.result, null);
  await t.lab.tamper();
  select(t.els.fieldSel, 'device');
  assert.equal(t.lab.result, null);
});

test('refresh re-inspects when the ledger changes and drops the old experiment', async () => {
  const rows = await night();
  const t = await mount(rows);
  await t.lab.tamper();
  rows.length = 0;
  for (const r of await ledger(makeForgeEvents({delaySeconds: 10, holdSeconds: 130, cameraOffline: false}))) rows.push(r);
  await t.lab.refresh();
  assert.equal(t.lab.result, null);
  assert.equal(blocks(t.els.chain).length, rows.length);
  assert.equal(t.els.rowSel.children.length, rows.length);
});

test('empty ledger: says so and disables the controls', async () => {
  const t = await mount([]);
  assert.equal(t.els.empty.hidden, false);
  assert.match(t.els.empty.textContent, /ledger is empty/i);
  assert.equal(t.els.tamper.disabled, true);
  assert.equal(t.els.restore.disabled, true);
  assert.equal(t.els.rowSel.disabled, true);
  assert.equal(t.els.fieldSel.disabled, true);
  assert.equal(blocks(t.els.chain).length, 0);
  await t.lab.tamper();   // a no-op, never throws
  assert.equal(t.lab.result, null);
  assert.equal(t.els.honesty.textContent, HONESTY, 'the honesty line stays visible');
});

test('a real ledger that is itself broken is shown as broken (the view reports, it does not repair)', async () => {
  const rows = await night();
  rows[2].payload.event.at = '2026-01-01T00:00:00Z';   // simulate damage to the stored ledger before mounting
  const t = await mount(rows);
  assert.deepEqual(blocks(t.els.chain).map(b => b.getAttribute('data-status')).slice(0, 4), ['verified', 'verified', 'altered', 'unverifiable']);
});

test('source: no innerHTML, no network, no storage; honesty line is present verbatim', () => {
  const src = readFileSync(new URL('../docs/trust_lab_view.mjs', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/.test(src));
  assert.ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|WebSocket|https?:\/\//.test(src));
  assert.ok(src.includes('Experiment on an isolated copy. The ledger above is never changed.'));
});

test('a blanket re-enable of every button (as app.js does after a run) is undone by the next refresh (qa-auditor AU2.-1)', async () => {
  const rows = await night();
  const t = await mount(rows);
  assert.equal(t.els.restore.disabled, true, 'no experiment yet');
  // app.js finally{}: document.querySelectorAll('button').forEach(b => b.disabled = false); then render() -> refresh()
  t.els.restore.disabled = false; t.els.restore.removeAttribute('disabled');
  await t.lab.refresh();
  assert.equal(t.els.restore.disabled, true, 'Restore is disabled again without an experiment');
  await t.lab.tamper();
  t.els.restore.disabled = false;
  await t.lab.refresh();
  assert.equal(t.els.restore.disabled, false, 'and stays enabled while an experiment is shown');
});
