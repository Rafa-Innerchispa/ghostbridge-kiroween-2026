/**
 * Seal-and-verify VIEW tests (docs/receipt_view.mjs).
 * Authored by the ui-director custom Kiro agent (Phase 8 run D).
 * Run: node --test tests/receipt_view.test.mjs
 *
 * Hosted on tests/helpers/fake-dom.mjs (no browser) against real ledgers built with the real engine. The receipt model itself is tested in
 * evidence_receipt.test.mjs. What this cannot prove (layout, focus ring, 40 px targets, a real download, the verifier link serving)
 * is covered by tests/browser-qa/phase8-verifiable.qa.mjs.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {append, scenario} from '../docs/engine.mjs';
import {makeReceipt, fingerprint} from '../docs/evidence_receipt.mjs';
import {mountReceipt, VERIFY_COMMAND, RECEIPT_FILE, EMPTY_REASON, VERDICTS} from '../docs/receipt_view.mjs';
import {FakeDocument} from './helpers/fake-dom.mjs';

const tick = () => new Promise(r => setTimeout(r, 0));
const ledger = async events => { const rows = []; for (const e of events) await append(rows, e); return rows; };
const NOW = new Date('2026-11-20T23:00:00.456Z');

function mount(initial = []) {
  const doc = new FakeDocument(), host = doc.createElement('section');
  const downloads = [];
  let rows = initial;
  const view = mountReceipt({doc, host, getRows: () => rows, now: () => NOW, download: (name, text, type) => downloads.push({name, text, type}), copy: async () => {}});
  return {doc, host, view, els: view.elements, downloads, get rows() { return rows; }, setRows: r => { rows = r; }};
}
const seal = async t => { t.els.seal.click(); for (let i = 0; i < 20 && !t.view.state.sealed; i++) await tick(); };
const check = async (t, receiptText) => { t.els.paste.value = receiptText; const r = await t.view.check(); return r && r.status; };
const tone = t => t.els.result.getAttribute('data-tone');

test('no innerHTML, outerHTML or insertAdjacentHTML in the module', () => {
  const src = readFileSync(new URL('../docs/receipt_view.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML/);
});

test('titled sections, ids prefixed cr-rc-, every button, field and link has a name', async () => {
  const t = mount(await ledger(scenario('night')));
  assert.equal(t.host.byId('cr-rc-title').textContent, 'Seal and verify it yourself');
  const ids = t.host.findAll(n => n.hasAttribute('id')).map(n => n.getAttribute('id'));
  assert.ok(ids.every(id => id.startsWith('cr-rc-')), ids.join(','));
  for (const b of t.host.findAll(n => n.tagName === 'button')) assert.ok(b.textContent.trim().length > 1, b.getAttribute('id'));
  for (const a of t.host.findAll(n => n.tagName === 'a')) assert.ok(a.textContent.trim().length > 1);
  const labels = t.host.findAll(n => n.tagName === 'label').map(l => l.getAttribute('for'));
  assert.ok(labels.includes('cr-rc-paste') && labels.includes('cr-rc-file'));
  assert.equal(t.els.file.getAttribute('accept'), '.json,application/json');
  assert.deepEqual(t.host.findAll(n => n.tagName === 'h4').map(n => n.textContent), ['1. Seal this ledger', '2. Check against a receipt', '3. Verify without GhostBridge']);
  for (const el of [t.els.live, t.els.result]) assert.equal(el.getAttribute('aria-live'), 'polite');
});

test('Seal is disabled with a stated reason when the ledger is empty, and enabled when it has rows', async () => {
  const t = mount([]);
  assert.ok(t.els.seal.disabled);
  assert.equal(t.els.reason.textContent, EMPTY_REASON);
  assert.equal(t.els.seal.getAttribute('aria-describedby'), 'cr-rc-seal-reason');
  assert.ok(t.els.sealOut.hidden);
  t.setRows(await ledger(scenario('night')));
  t.view.refresh();
  assert.ok(!t.els.seal.disabled);
  assert.equal(t.els.reason.textContent, '');
});

test('Seal shows the fingerprint, row count and time that makeReceipt produced, and nothing else', async () => {
  const rows = await ledger(scenario('night'));
  const t = mount(rows);
  await seal(t);
  const expected = await makeReceipt(rows, {now: NOW});
  assert.deepEqual(t.view.receipt, expected);
  assert.equal(t.els.fp.textContent, expected.fingerprint);
  assert.equal(t.els.fp.textContent, fingerprint(rows.at(-1).hash));
  assert.match(t.els.fp.textContent, /^[0-9a-f]{4}( [0-9a-f]{4}){3}$/);
  assert.equal(t.els.head.textContent, rows.at(-1).hash);
  const meta = t.els.meta.textContent;
  assert.ok(meta.includes(String(rows.length)) && meta.includes('2026-11-20T23:00:00Z'), meta);
  assert.ok(!t.els.sealOut.hidden);
  assert.ok(t.els.live.textContent.includes(expected.fingerprint));
});

test('Download receipt hands over the receipt JSON as application/json named ghostbridge-receipt.json', async () => {
  const t = mount(await ledger(scenario('night')));
  t.els.download.click();   // nothing sealed yet
  assert.equal(t.downloads.length, 0);
  await seal(t);
  t.els.download.click();
  assert.equal(t.downloads.length, 1);
  const d = t.downloads[0];
  assert.equal(RECEIPT_FILE, 'ghostbridge-receipt.json');
  assert.equal(d.name, 'ghostbridge-receipt.json');
  assert.equal(d.type, 'application/json');
  assert.deepEqual(JSON.parse(d.text), t.view.receipt);
});

test('the default download uses a Blob object URL on an anchor with a download name, and revokes the URL afterwards', async () => {
  const doc = new FakeDocument(), host = doc.createElement('section'), rows = await ledger(scenario('night'));
  const made = [], revoked = [], real = {c: URL.createObjectURL, r: URL.revokeObjectURL};
  URL.createObjectURL = blob => { made.push(blob); return 'blob:fake-1'; };
  URL.revokeObjectURL = u => revoked.push(u);
  try {
    const view = mountReceipt({doc, host, getRows: () => rows, revokeMs: 0});
    const anchors = [];
    const create = doc.createElement.bind(doc);
    doc.createElement = tag => { const n = create(tag); if (tag === 'a') anchors.push(n); return n; };
    view.seal(); for (let i = 0; i < 20 && !view.state.sealed; i++) await tick();
    view.elements.download.click();
    assert.equal(made.length, 1);
    assert.equal(made[0].type, 'application/json');
    const a = anchors.at(-1);
    assert.equal(a.getAttribute('download'), 'ghostbridge-receipt.json');
    assert.equal(a.getAttribute('href'), 'blob:fake-1');
    assert.deepEqual(revoked, [], 'not revoked synchronously');
    await tick(); await tick();
    assert.deepEqual(revoked, ['blob:fake-1']);
  } finally { URL.createObjectURL = real.c; URL.revokeObjectURL = real.r; }
});

test('a matching or extended ledger is Verified against receipt (ok); the model message is shown', async () => {
  const events = scenario('night');
  const rows = await ledger(events.slice(0, 3));
  const t = mount(rows);
  await seal(t);
  const receiptText = JSON.stringify(t.view.receipt);
  assert.equal(await check(t, receiptText), 'matches');
  assert.equal(tone(t), 'ok');
  const v = t.els.result.byClass('cr-rc-verdict');
  assert.ok(v.hasClass('is-ok') && v.textContent.includes('Verified against receipt') && v.byClass('cr-rc-icon').textContent === '\u2713');
  assert.equal(t.host.byId('cr-rc-msg').textContent, 'All 3 sealed rows are present and unchanged.');
  // the same ledger grows after the seal: the check is a new action on the new ledger
  const grown = await ledger(events.slice(0, 5));
  t.setRows(grown); t.view.refresh();
  assert.equal(await check(t, receiptText), 'extended');
  assert.equal(tone(t), 'ok');
  assert.ok(t.els.result.textContent.includes('Verified against receipt'));
  assert.ok(t.host.byId('cr-rc-msg').textContent.includes('2 row(s) were appended after the seal'));
});

test('truncated, rewritten and broken ledgers are failed integrity (crit) with a word and an icon, never colour alone', async () => {
  const night = scenario('night');
  const sealed = mount(await ledger(night.slice(0, 4)));
  await seal(sealed);
  const receiptText = JSON.stringify(sealed.view.receipt);

  const t = mount(await ledger(night.slice(0, 2)));
  assert.equal(await check(t, receiptText), 'truncated');
  assert.equal(tone(t), 'crit');
  let v = t.els.result.byClass('cr-rc-verdict');
  assert.ok(v.hasClass('is-crit') && v.textContent.includes('truncated') && v.byClass('cr-rc-icon').textContent === '\u2715');
  assert.ok(t.host.byId('cr-rc-msg').textContent.includes('2 sealed row(s) are missing'));

  // rewritten: a different history with at least as many rows whose chain still verifies
  const other = scenario('normal');
  t.setRows(await ledger(other.length >= 4 ? other : [...other, ...night])); t.view.refresh();
  assert.equal(await check(t, receiptText), 'rewritten');
  assert.equal(tone(t), 'crit');
  assert.ok(t.els.result.textContent.includes('rewritten'));

  // broken: edit a field of a row in a copy of the real chain
  const bad = structuredClone(await ledger(night.slice(0, 4)));
  bad[1].payload.event.at = '2026-01-01T00:00:00Z';
  t.setRows(bad); t.view.refresh();
  assert.equal(await check(t, receiptText), 'broken');
  assert.equal(tone(t), 'crit');
  assert.ok(t.els.result.byClass('cr-rc-verdict').textContent.includes('chain broken'));
});

test('anything that is not a usable receipt is informative (info), not a failure of the evidence', async () => {
  const t = mount(await ledger(scenario('night')));
  for (const text of ['', '   ', 'not json', '[1,2]', '{"schema":"other"}', JSON.stringify({schema: 'ghostbridge-receipt-v1', rows: 0, head: 'zz'})]) {
    assert.equal(await check(t, text), 'invalid-receipt', JSON.stringify(text));
    assert.equal(tone(t), 'info');
    const v = t.els.result.byClass('cr-rc-verdict');
    assert.ok(v.hasClass('is-info') && v.byClass('cr-rc-icon').textContent === 'i');
    assert.ok(t.host.byId('cr-rc-msg').textContent.length > 5);
  }
});

test('verdict tones map one-to-one: ok only for matches/extended, crit only for integrity failures, info only for invalid-receipt', () => {
  const by = tone => Object.entries(VERDICTS).filter(([, v]) => v.tone === tone).map(([k]) => k).sort();
  assert.deepEqual(by('ok'), ['extended', 'matches']);
  assert.deepEqual(by('crit'), ['broken', 'rewritten', 'truncated']);
  assert.deepEqual(by('info'), ['invalid-receipt']);
});

test('choosing a receipt file reads it locally and checks it', async () => {
  const rows = await ledger(scenario('night'));
  const t = mount(rows);
  await seal(t);
  const text = JSON.stringify(t.view.receipt, null, 2);
  t.els.file.files = [{name: 'ghostbridge-receipt.json', text: async () => text}];
  t.els.file.dispatch('change');
  for (let i = 0; i < 20 && !t.view.state.verdict; i++) await tick();
  assert.equal(t.els.paste.value, text);
  assert.equal(t.view.state.verdict, 'matches');
  assert.equal(tone(t), 'ok');
});

test('a ledger change clears the shown seal and the last verdict (a receipt belongs to a moment)', async () => {
  const events = scenario('night');
  const t = mount(await ledger(events.slice(0, 3)));
  await seal(t);
  const receiptText = JSON.stringify(t.view.receipt);
  await check(t, receiptText);
  assert.ok(t.view.state.sealed && t.view.state.verdict);
  t.view.refresh();   // same ledger: nothing is cleared
  assert.ok(t.view.state.sealed && t.view.state.verdict);
  t.setRows(await ledger(events.slice(0, 4))); t.view.refresh();
  assert.equal(t.view.state.sealed, false);
  assert.equal(t.view.state.verdict, null);
  assert.ok(t.els.sealOut.hidden);
  assert.equal(t.els.fp.textContent, '');
  assert.equal(tone(t), 'none');
  assert.equal(t.els.paste.value, receiptText, 'the pasted receipt is the visitor\u2019s text and is kept');
  assert.ok(t.els.live.textContent.includes('previous seal'));
  t.setRows([]); t.view.refresh();
  assert.ok(t.els.seal.disabled);
});

test('a seal that finishes after the ledger moved on is dropped', async () => {
  const events = scenario('night');
  const t = mount(await ledger(events.slice(0, 3)));
  const longer = await ledger(events.slice(0, 4));
  const pending = t.view.seal();
  t.setRows(longer);
  t.view.refresh();
  assert.equal(await pending, null);
  assert.equal(t.view.state.sealed, false);
  assert.ok(t.els.sealOut.hidden);
});

test('app.js re-enables every button after a run: refresh() puts Seal back to disabled on an empty ledger', () => {
  const t = mount([]);
  for (const b of t.host.findAll(n => n.tagName === 'button')) { b.disabled = false; b.removeAttribute('disabled'); }
  assert.ok(!t.els.seal.disabled);
  t.view.refresh();
  assert.ok(t.els.seal.disabled && t.els.seal.hasAttribute('disabled'));
});

test('independent verifier section: download link, README link, the exact command, and a pointer to Export evidence JSON', async () => {
  const t = mount(await ledger(scenario('night')));
  assert.equal(t.els.verifierLink.textContent, 'Download the independent verifier');
  assert.equal(t.els.verifierLink.getAttribute('href'), 'verify/verify_evidence.py');
  assert.ok(t.els.verifierLink.hasAttribute('download'));
  assert.equal(t.els.howLink.textContent, 'How it works');
  assert.equal(t.els.howLink.getAttribute('href'), 'verify/README.md');
  assert.equal(VERIFY_COMMAND, 'python verify_evidence.py ghostbridge-evidence.json --receipt ghostbridge-receipt.json');
  assert.equal(t.els.cmd.textContent, VERIFY_COMMAND);
  assert.ok(t.host.textContent.includes('Export evidence JSON'));
  const all = t.host.textContent;
  assert.ok(!/@/.test(all) && !/https?:\/\//.test(all), 'no contact data or external URLs invented here');
});

test('Copy command reports success or admits it is unavailable', async () => {
  const doc = new FakeDocument(), host = doc.createElement('section');
  let copied = null;
  const ok = mountReceipt({doc, host, getRows: () => [], copy: async s => { copied = s; }});
  ok.elements.copy.click(); await tick();
  assert.equal(copied, VERIFY_COMMAND);
  assert.equal(host.byId('cr-rc-copy-live').textContent, 'Command copied.');
  const host2 = doc.createElement('section');
  const no = mountReceipt({doc, host: host2, getRows: () => [], copy: async () => { throw new Error('denied'); }});
  no.elements.copy.click(); await tick();
  assert.ok(/not available/.test(host2.byId('cr-rc-copy-live').textContent));
});
