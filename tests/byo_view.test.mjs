/**
 * Bring-your-own-log VIEW tests (docs/byo_view.mjs).
 * Authored by the ui-director custom Kiro agent (Phase 8 run D).
 * Run: node --test tests/byo_view.test.mjs
 *
 * Hosted on tests/helpers/fake-dom.mjs (no browser). The parser itself is tested in byo_log.test.mjs. What this cannot prove
 * (layout, focus ring, 40 px targets, a real File object, the Control Room showing the case) is covered by
 * tests/browser-qa/phase8-verifiable.qa.mjs.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {append, verify} from '../docs/engine.mjs';
import {parseByoLog, BYO_TEMPLATE, SOURCES} from '../docs/byo_log.mjs';
import {mountByoLog, IMPORT_WARNING, durationNeeds} from '../docs/byo_view.mjs';
import {FakeDocument} from './helpers/fake-dom.mjs';

const tick = () => new Promise(r => setTimeout(r, 0));
const BAD = ['event_id,at,source,signal,duration_seconds', 'B-1,2026-11-20T21:58:00Z,archive-reader,DENIED,', 'B-2,not-a-time,north-door,CLOSED,', 'B-3,2026-11-20T22:00:00Z,north-door,OPEN,', ''].join('\n');

/** A bridge over a real in-memory ledger that records the order of calls. */
function mount({failOn} = {}) {
  const doc = new FakeDocument(), host = doc.createElement('div');
  const calls = [], statuses = [];
  let rows = [];
  const bridge = {
    getRows: () => rows,
    resetLab: async () => { calls.push('resetLab'); rows = []; },
    ingest: async events => {
      calls.push(['ingest', events]);
      if (failOn === 'ingest') throw new Error('storage unavailable');
      let added = 0;
      for (const e of events) if (await append(rows, e)) added++;
      return added;
    },
    status: (msg, isError) => statuses.push({msg, isError}),
  };
  const view = mountByoLog({doc, host, bridge});
  const els = view.elements;
  const typeText = t => { els.area.value = t; els.area.dispatch('input'); };
  return {doc, host, view, els, bridge, calls, statuses, typeText, get rows() { return rows; }, setRows: r => { rows = r; }};
}

test('no innerHTML, outerHTML or insertAdjacentHTML in the module', () => {
  const src = readFileSync(new URL('../docs/byo_view.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML/);
});

test('opener card, labelled region, ids prefixed cr-byo-, every button and field has an accessible name', () => {
  const t = mount();
  const opener = t.host.byId('cr-byo-open');
  assert.equal(opener.tagName, 'button');
  assert.ok(opener.textContent.includes('Your own log') && opener.textContent.includes('Write or upload events. Nothing leaves your browser.'));
  assert.equal(opener.getAttribute('aria-expanded'), 'false');
  assert.equal(opener.getAttribute('aria-controls'), 'cr-byo-panel');
  const panel = t.host.byId('cr-byo-panel');
  assert.equal(panel.getAttribute('role'), 'region');
  assert.equal(panel.getAttribute('aria-label'), 'Bring your own log');
  assert.ok(panel.hidden, 'closed until opened');
  const ids = t.host.findAll(n => n.hasAttribute('id')).map(n => n.getAttribute('id'));
  assert.ok(ids.every(id => id.startsWith('cr-byo-')), ids.join(','));
  for (const b of t.host.findAll(n => n.tagName === 'button')) assert.ok(b.textContent.trim().length > 1, `button ${b.getAttribute('id')} has a name`);
  const labels = t.host.findAll(n => n.tagName === 'label').map(l => l.getAttribute('for'));
  assert.ok(labels.includes('cr-byo-text') && labels.includes('cr-byo-file'), 'textarea and file input are labelled');
  assert.equal(t.els.area.getAttribute('rows'), '10');
  assert.equal(t.els.file.getAttribute('accept'), '.csv,.txt');
  for (const name of ['Use the template', 'Check', 'Import into the lab', 'Close']) assert.ok(t.host.find(n => n.tagName === 'button' && n.textContent === name), name);
  assert.equal(t.els.result.getAttribute('aria-live'), 'polite');
});

test('opening shows the panel and moves focus into it; Close hides it and returns focus to the opener', () => {
  const t = mount();
  t.els.opener.click();
  assert.ok(!t.els.panel.hidden);
  assert.equal(t.els.opener.getAttribute('aria-expanded'), 'true');
  assert.equal(t.doc.activeElement, t.els.title);
  t.els.close.click();
  assert.ok(t.els.panel.hidden);
  assert.equal(t.els.opener.getAttribute('aria-expanded'), 'false');
  assert.equal(t.doc.activeElement, t.els.opener);
});

test('the reference table lists every source, its signals, and which signals need a duration (asked of the parser)', () => {
  const t = mount();
  const rows = t.els.table.allByClass ? t.els.table.findAll(n => n.tagName === 'tr' && n.hasAttribute('data-source')) : [];
  assert.deepEqual(rows.map(r => r.getAttribute('data-source')), Object.keys(SOURCES));
  const needs = durationNeeds();
  assert.deepEqual(needs, {'north-door': ['OPEN'], 'archive-reader': [], 'loading-camera': [], 'archive-corridor': ['DWELL']});
  const door = rows[0];
  const cells = door.findAll(n => n.tagName === 'th' || n.tagName === 'td').map(c => c.textContent);
  assert.deepEqual(cells, ['north-door', 'OPEN, CLOSED', 'OPEN']);
  assert.equal(rows[1].findAll(n => n.tagName === 'td')[1].textContent, 'none');
});

test('"Use the template" fills the textarea with BYO_TEMPLATE and does not enable Import by itself', () => {
  const t = mount();
  t.els.template.click();
  assert.equal(t.els.area.value, BYO_TEMPLATE);
  assert.ok(t.els.import.disabled);
  assert.ok(/press Check/.test(t.els.result.textContent));
});

test('Import is disabled until a successful Check of the CURRENT text, and is disabled again when the text changes', () => {
  const t = mount();
  assert.ok(t.els.import.disabled, 'disabled on open');
  t.els.check.click();   // empty text: a problem, not a success
  assert.ok(t.els.import.disabled);
  t.els.template.click();
  assert.ok(t.els.import.disabled, 'template alone is not a check');
  t.els.check.click();
  assert.ok(!t.els.import.disabled, 'enabled after a successful check');
  assert.equal(t.els.result.getAttribute('data-tone'), 'ok');
  assert.equal(t.els.result.byClass('cr-byo-sum').textContent, '4 events ready to import.');
  t.typeText(BYO_TEMPLATE + '\n');
  assert.ok(t.els.import.disabled, 'edited text must be checked again');
  assert.ok(/Check it again/.test(t.els.result.textContent));
  t.els.check.click();
  assert.ok(!t.els.import.disabled);
  t.els.area.value = BYO_TEMPLATE.replace('B-4', 'B-9');   // changed without an input event (paste by script): still not the checked text
  t.view.refresh();
  assert.ok(t.els.import.disabled);
  t.typeText(BAD); t.els.check.click();
  assert.ok(t.els.import.disabled, 'a failed check never enables Import');
});

test('problems are listed with their line numbers and nothing is imported', async () => {
  const t = mount();
  t.typeText(BAD); t.els.check.click();
  const items = t.els.result.findAll(n => n.tagName === 'li').map(n => n.textContent);
  const expected = parseByoLog(BAD).errors;
  assert.equal(expected.length, 2);
  assert.equal(items.length, 2);
  expected.forEach((e, i) => assert.equal(items[i], `Line ${e.row}: ${e.message}`));
  assert.ok(items[0].startsWith('Line 3:') && items[1].startsWith('Line 4:'));
  assert.equal(t.els.result.byClass('cr-byo-sum').textContent, '2 problems found; nothing was imported.');
  assert.ok(t.els.import.disabled);
  await t.view.import();
  assert.deepEqual(t.calls, [], 'a disabled Import never reaches the bridge');
  assert.equal(t.rows.length, 0);
});

test('whole-file problems (no line number) are shown without a "Line" prefix', () => {
  const t = mount();
  t.typeText('   \n'); t.els.check.click();
  const li = t.els.result.findAll(n => n.tagName === 'li')[0];
  assert.ok(li && !li.textContent.startsWith('Line'), li && li.textContent);
});

test('Import calls resetLab, then ingest with exactly the parsed events, then reports the ledger\u2019s own row count', async () => {
  const t = mount();
  t.setRows([{stale: true}]);
  t.els.template.click(); t.els.check.click();
  t.els.import.click();
  for (let i = 0; i < 50 && !t.statuses.length; i++) await tick();
  assert.equal(t.calls[0], 'resetLab');
  assert.equal(t.calls[1][0], 'ingest');
  assert.deepEqual(t.calls[1][1], parseByoLog(BYO_TEMPLATE).events);
  assert.equal(t.calls.length, 2);
  assert.equal(t.rows.length, 4, 'the ledger holds exactly the imported events');
  assert.ok((await verify(t.rows)).valid);
  const msg = t.els.result.byClass('cr-byo-sum').textContent;
  assert.ok(msg.startsWith('4 events sealed into the ledger'), msg);
  assert.equal(t.statuses.at(-1).isError, false);
  assert.ok(t.statuses.at(-1).msg.includes('4 events sealed'));
});

test('the number reported is read from the ledger, not from the parser, when the ledger disagrees', async () => {
  const t = mount();
  t.els.template.click(); t.els.check.click();
  const realIngest = t.bridge.ingest;
  t.bridge.ingest = async events => (await realIngest(events.slice(0, 2)));   // the store only accepted two
  await t.view.import();
  const msg = t.els.result.byClass('cr-byo-sum').textContent;
  assert.ok(msg.startsWith('2 events sealed'), msg);
  assert.ok(/2 of your 4 were not added/.test(msg), msg);
});

test('a failing import is reported as a problem, never as success', async () => {
  const t = mount({failOn: 'ingest'});
  t.els.template.click(); t.els.check.click();
  await t.view.import();
  assert.ok(/did not finish/.test(t.els.result.textContent));
  assert.ok(!/sealed/.test(t.els.result.textContent));
  assert.equal(t.statuses.at(-1).isError, true);
});

test('the action is labelled honestly and shows how many rows it would replace', () => {
  const t = mount();
  assert.equal(IMPORT_WARNING, 'Replaces this lab\u2019s evidence. Export it first if you want to keep it.');
  assert.equal(t.els.warn.textContent, IMPORT_WARNING);
  assert.equal(t.els.import.getAttribute('aria-describedby'), 'cr-byo-warn');
  t.setRows([{}, {}, {}]);
  t.view.refresh();
  assert.ok(t.els.warn.textContent.includes('It holds 3 ledger rows now.'));
});

test('app.js re-enables every button after a run: refresh() puts Import back to disabled when the text is not checked', () => {
  const t = mount();
  t.typeText(BAD); t.els.check.click();
  for (const b of t.host.findAll(n => n.tagName === 'button')) b.disabled = false;   // the blanket re-enable
  t.els.import.removeAttribute('disabled');
  assert.ok(!t.els.import.disabled);
  t.view.refresh();
  assert.ok(t.els.import.disabled && t.els.import.hasAttribute('disabled'));
  t.els.template.click(); t.els.check.click();
  t.view.refresh();
  assert.ok(!t.els.import.disabled, 'and stays enabled when the current text was checked');
});

test('choosing a file puts its text in the box (read locally) and still requires a Check', async () => {
  const t = mount();
  t.els.file.files = [{name: 'night.csv', size: BYO_TEMPLATE.length, text: async () => BYO_TEMPLATE}];
  t.els.file.dispatch('change');
  await tick();
  assert.equal(t.els.area.value, BYO_TEMPLATE);
  assert.ok(t.els.import.disabled);
  assert.ok(t.els.result.textContent.includes('night.csv'));
  t.els.check.click();
  assert.ok(!t.els.import.disabled);
});

test('an oversized file is refused without reading it', async () => {
  const t = mount();
  let read = false;
  t.els.file.files = [{name: 'big.csv', size: 10 * 1024 * 1024, text: async () => { read = true; return 'x'; }}];
  t.els.file.dispatch('change');
  await tick();
  assert.equal(read, false);
  assert.ok(/larger than 128 KB/.test(t.els.result.textContent));
});
