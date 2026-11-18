/**
 * Evidence Trust Lab tests (docs/trust_lab.mjs).
 * Authored by Kiro's main session agent (Kiroween 2026, feat/kiro-winning-experience), not by the custom agents.
 * Run: node --test tests/trust_lab.test.mjs
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {append, verify, scenario} from '../docs/engine.mjs';
import {makeForgeEvents} from '../docs/signal_forge.mjs';
import {inspectChain, tamperCopy, compareWithTamper, TAMPERABLE} from '../docs/trust_lab.mjs';
import {rng, randInt} from './helpers/forge-parity.mjs';

const ledger = async events => { const rows = []; for (const e of events) await append(rows, e); return rows; };
const night = () => ledger(scenario('night'));
const forge = () => ledger(makeForgeEvents({delaySeconds: 299, holdSeconds: 120, cameraOffline: true}));

test('a clean ledger verifies row by row and agrees with the engine', async () => {
  const rows = await night();
  const r = await inspectChain(rows);
  assert.equal(r.valid, true);
  assert.equal(r.checked, 5);
  assert.equal(r.failedAt, null);
  assert.ok(r.rows.every(x => x.status === 'verified'));
  assert.equal(r.head, (await verify(rows)).head);
  assert.deepEqual(r.rows.map(x => x.storedHash), rows.map(x => x.hash));
  assert.deepEqual(r.rows.map(x => x.recomputed), rows.map(x => x.hash), 'recomputed hashes are measured, not copied');
});

test('tampering with row 3 fails exactly at row 3; later rows are unverifiable; earlier rows stay verified', async () => {
  const rows = await night();
  const {rows: bad, change} = tamperCopy(rows, 3, 'at');
  const r = await inspectChain(bad);
  assert.equal(r.valid, false);
  assert.equal(r.failedAt, 3);
  assert.equal(r.checked, 2);
  assert.deepEqual(r.rows.map(x => x.status), ['verified', 'verified', 'altered', 'unverifiable', 'unverifiable']);
  assert.notEqual(r.rows[2].recomputed, r.rows[2].storedHash);
  assert.equal(r.rows[2].recomputed !== null, true);
  assert.notEqual(change.before, change.after);
  assert.deepEqual(await verify(bad), {valid: false, checked: 2, failed_at: 3}, 'the engine reports the same failing row');
});

test('the original ledger is never modified, and tampering a copy leaves the original valid', async () => {
  const rows = await night();
  const snapshot = JSON.stringify(rows);
  for (const f of TAMPERABLE.filter(f => f !== 'duration_seconds')) { try { tamperCopy(rows, 2, f); } catch (e) { assert.ok(e instanceof RangeError); } }
  tamperCopy(rows, 1, 'duration_seconds');
  assert.equal(JSON.stringify(rows), snapshot);
  assert.equal((await verify(rows)).valid, true);
  const {rows: copy} = tamperCopy(rows, 1, 'at');
  assert.notStrictEqual(copy, rows);
  assert.notStrictEqual(copy[0], rows[0]);
  assert.notStrictEqual(copy[0].payload.event, rows[0].payload.event);
});

test('every tamperable field on every row is detected at that exact row', async () => {
  const rows = await night();
  let n = 0;
  for (let seq = 1; seq <= rows.length; seq++) for (const f of TAMPERABLE) {
    let t; try { t = tamperCopy(rows, seq, f); } catch (e) { assert.ok(e instanceof RangeError); continue; }
    const r = await inspectChain(t.rows);
    assert.equal(r.failedAt, seq, `${f}@${seq}`);
    assert.equal((await verify(t.rows)).failed_at, seq, `${f}@${seq} engine`);
    n++;
  }
  assert.ok(n >= 15, `exercised ${n} tamper cases`);
});

test('a forged hash that fits the altered content still breaks the next link', async () => {
  const rows = await night();
  const {rows: bad} = tamperCopy(rows, 2, 'at');
  const {digest} = await import('../docs/engine.mjs');
  bad[1].hash = await digest(bad[1].previous, bad[1].payload);   // attacker re-seals row 2
  const r = await inspectChain(bad);
  assert.equal(r.failedAt, 3, 'row 3 still points at the original row-2 hash');
  assert.equal(r.rows[2].status, 'broken-link');
  assert.equal(r.rows[1].status, 'verified');
});

test('deleting a row and reordering rows are detected', async () => {
  const rows = await night();
  const dropped = structuredClone(rows); dropped.splice(1, 1);
  assert.equal((await inspectChain(dropped)).failedAt, 2);
  const swapped = structuredClone(rows); [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
  assert.equal((await inspectChain(swapped)).valid, false);
});

test('empty ledger is valid with zero rows; malformed rows are reported, never thrown', async () => {
  const e = await inspectChain([]);
  assert.deepEqual([e.valid, e.checked, e.rows.length, e.head], [true, 0, 0, null]);
  const r = await inspectChain([{seq: 1, payload: null, previous: '0'.repeat(64), hash: 'x'}]);
  assert.equal(r.valid, false);
  assert.equal(r.failedAt, 1);
});

test('tamperCopy validates its arguments', async () => {
  const rows = await night();
  for (const bad of [0, 6, 1.5, '2', null, NaN]) assert.throws(() => tamperCopy(rows, bad), RangeError, String(bad));
  assert.throws(() => tamperCopy(rows, 1, 'hash'), RangeError);
  assert.throws(() => tamperCopy(rows, 4, 'duration_seconds'), RangeError, 'door.closed has no duration');
});

test('compareWithTamper returns both verdicts and the change that explains the difference', async () => {
  const rows = await forge();
  const c = await compareWithTamper(rows, 2, 'at');
  assert.equal(c.original.valid, true);
  assert.equal(c.tampered.valid, false);
  assert.equal(c.tampered.failedAt, 2);
  assert.equal(c.change.id, rows[1].payload.event.id);
  assert.equal(c.engineAgrees, true);
});

test('property: 300 seeded tampers of random Forge ledgers always fail at the tampered row', async () => {
  const r = rng(0xBADC0DE);
  for (let i = 0; i < 300; i++) {
    const rows = await ledger(makeForgeEvents({delaySeconds: randInt(r, 1, 360), holdSeconds: randInt(r, 60, 240), cameraOffline: r() < 0.5}));
    const seq = randInt(r, 1, rows.length);
    const field = TAMPERABLE[randInt(r, 0, 2)];
    const t = tamperCopy(rows, seq, field);
    const res = await inspectChain(t.rows);
    assert.equal(res.failedAt, seq, `${field}@${seq} of ${rows.length}`);
    assert.equal((await inspectChain(rows)).valid, true);
  }
});
