/**
 * Bring-your-own-log tests (docs/byo_log.mjs).
 * Authored by Kiro's main session (Kiroween 2026, feat/kiro-verifiable-evidence). Run: node --test tests/byo_log.test.mjs
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {append, verify} from '../docs/engine.mjs';
import {correlate} from '../docs/correlator.mjs';
import {parseByoLog, rowsFromExport, BYO_TEMPLATE, BYO_COLUMNS, BYO_LIMITS, SOURCES} from '../docs/byo_log.mjs';

const H = BYO_COLUMNS.join(',');
const csv = (...lines) => [H, ...lines].join('\n');
const ledger = async events => { const rows = []; for (const e of events) await append(rows, e); return rows; };

test('the template parses, seals and correlates into exactly one case (299 s / 120 s) plus a camera incident', async () => {
  const r = parseByoLog(BYO_TEMPLATE);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.events.length, 4);
  assert.ok(r.events.every(e => e.id.startsWith('byo:')));
  const rows = await ledger(r.events);
  assert.equal((await verify(rows)).valid, true);
  const cases = await correlate(rows);
  assert.equal(cases.length, 1);
  assert.deepEqual(cases[0].event_ids, ['byo:B-2', 'byo:B-3']);
  assert.ok(rows.some(x => x.payload.incident?.rule === 'camera-offline'));
});

test('every source and signal maps to the right device and event type; durations only where they belong', () => {
  const lines = [], expect = [];
  let n = 0;
  for (const [name, s] of Object.entries(SOURCES)) for (const [sig, type] of Object.entries(s.signals)) {
    const timed = type === 'door.open' || type === 'presence.dwell';
    lines.push(`x${++n},2026-11-20T22:${String(n).padStart(2, '0')}:00Z,${name},${sig},${timed ? 30 : ''}`);
    expect.push([s.device, type, timed ? {duration_seconds: 30} : {}]);
  }
  const r = parseByoLog(csv(...lines));
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.deepEqual(r.events.map(e => [e.device, e.type, e.data]), expect);
});

test('header columns may come in any order and in any letter case; blank lines and a BOM are ignored', () => {
  const r = parseByoLog('\uFEFFSIGNAL,Source,at,duration_seconds,event_id\n\nDENIED,archive-reader,2026-11-20T21:58:00Z,,a\n\n');
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.deepEqual(r.events[0], {id: 'byo:a', device: 'reader-01', type: 'access.denied', at: '2026-11-20T21:58:00Z', data: {}});
});

test('all or nothing: one bad row means nothing is imported, and every problem is listed with its line number', () => {
  const r = parseByoLog(csv(
    'ok1,2026-11-20T21:58:00Z,archive-reader,DENIED,',
    'bad id!,2026-11-20T21:58:00Z,archive-reader,DENIED,',
    'ok1,2026-11-20T21:59:00Z,archive-reader,DENIED,',
    'x3,2026-11-20T21:58:00Z,front-gate,DENIED,',
    'x4,2026-11-20T21:58:00Z,north-door,DENIED,',
    'x5,2026-11-20T21:58:00Z,north-door,OPEN,',
    'x6,2026-11-20T21:58:00Z,north-door,CLOSED,10',
    'x7,2026-02-30T21:58:00Z,archive-reader,DENIED,',
    'x8,2026-11-20 21:58,archive-reader,DENIED,',
    'x9,2026-11-20T21:58:00Z,north-door,OPEN,90000',
    'x10,too,few',
  ));
  assert.equal(r.ok, false);
  assert.deepEqual(r.events, []);
  assert.deepEqual(r.errors.map(e => e.row), [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.match(r.errors[1].message, /already used on line 2/);
  assert.match(r.errors[2].message, /Unknown source "front-gate"/);
  assert.match(r.errors[3].message, /not a signal of north-door/);
  assert.match(r.errors[4].message, /needs duration_seconds/);
  assert.match(r.errors[5].message, /must be empty/);
  assert.match(r.errors[6].message, /not a valid UTC time/);
  assert.match(r.errors[8].message, /between 0 and 86400/);
  assert.match(r.summary, /10 problems found; nothing was imported/);
});

test('header, empty and size problems are explained', () => {
  assert.match(parseByoLog('').errors[0].message, /empty/);
  assert.match(parseByoLog('event_id,at,source,signal').errors[0].message, /missing: duration_seconds/);
  assert.match(parseByoLog(H + ',extra').errors[0].message, /unexpected: extra/);
  assert.match(parseByoLog(H + '\n').errors[0].message, /no data rows/);
  assert.match(parseByoLog('x'.repeat(BYO_LIMITS.maxBytes + 1)).errors[0].message, /larger than/);
  assert.equal(parseByoLog(42).ok, false);
  const many = csv(...Array.from({length: BYO_LIMITS.maxRows + 1}, (_, i) => `r${i},2026-11-20T21:58:00Z,archive-reader,GRANTED,`));
  assert.match(parseByoLog(many).errors.at(-1).message, /At most 500 rows/);
});

test('the import is pure and deterministic', () => {
  assert.deepEqual(parseByoLog(BYO_TEMPLATE), parseByoLog(BYO_TEMPLATE));
});

test('an evidence export can be read back for re-checking; anything else is refused with a reason', () => {
  assert.equal(rowsFromExport('{"ledger":[1,2]}').rows.length, 2);
  assert.equal(rowsFromExport('[1]').ok, true);
  assert.match(rowsFromExport('{').message, /not valid JSON/);
  assert.match(rowsFromExport('{"x":1}').message, /ledger/);
});
