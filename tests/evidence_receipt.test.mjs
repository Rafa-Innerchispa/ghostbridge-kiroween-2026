/**
 * Evidence receipt tests (docs/evidence_receipt.mjs), plus a cross-language check with the independent Python verifier.
 * Authored by Kiro's main session (Kiroween 2026, feat/kiro-verifiable-evidence). Run: node --test tests/evidence_receipt.test.mjs
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {append, digest, scenario} from '../docs/engine.mjs';
import {makeForgeEvents} from '../docs/signal_forge.mjs';
import {makeReceipt, checkReceipt, receiptProblem, fingerprint, RECEIPT_SCHEMA} from '../docs/evidence_receipt.mjs';
import {rng, randInt} from './helpers/forge-parity.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ledger = async events => { const rows = []; for (const e of events) await append(rows, e); return rows; };
const NOW = new Date('2026-11-20T23:00:00Z');
const later = {id: 'later-1', device: 'reader-01', type: 'access.granted', at: '2026-10-30T23:00:00Z', data: {}};

/** Rewrite history the way an insider would: change an early event and recompute every hash after it so the chain verifies again. */
async function rewrite(rows, seq) {
  const copy = structuredClone(rows);
  copy[seq - 1].payload.event.at = '2026-10-30T21:00:00Z';
  let previous = seq === 1 ? '0'.repeat(64) : copy[seq - 2].hash;
  for (let i = seq - 1; i < copy.length; i++) { copy[i].previous = previous; copy[i].hash = await digest(previous, copy[i].payload); previous = copy[i].hash; }
  return copy;
}

test('a receipt records the head, the row count, the first and last event and a readable fingerprint', async () => {
  const rows = await ledger(scenario('night'));
  const r = await makeReceipt(rows, {now: NOW});
  assert.equal(r.schema, RECEIPT_SCHEMA);
  assert.equal(r.rows, 5);
  assert.equal(r.head, rows.at(-1).hash);
  assert.equal(r.sealed_at, '2026-11-20T23:00:00Z');
  assert.deepEqual(r.first_event, {id: 'night-1', at: '2026-10-30T22:00:00Z'});
  assert.deepEqual(r.last_event, {id: 'night-5', at: '2026-10-30T22:04:00Z'});
  assert.match(r.fingerprint, /^[0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4}$/);
  assert.equal(r.fingerprint.replace(/ /g, ''), r.head.slice(0, 16));
  assert.equal(receiptProblem(r), null);
});

test('an empty or broken ledger cannot be sealed', async () => {
  await assert.rejects(makeReceipt([]), /empty/);
  const rows = await ledger(scenario('night'));
  rows[1].payload.event.at = '2026-10-30T21:00:00Z';
  await assert.rejects(makeReceipt(rows), /fails verification at row 2/);
});

test('matches, extended, truncated, rewritten and broken are told apart', async () => {
  const rows = await ledger(scenario('night'));
  const r = await makeReceipt(rows, {now: NOW});
  assert.equal((await checkReceipt(rows, r)).status, 'matches');
  const more = structuredClone(rows); await append(more, later);
  const ext = await checkReceipt(more, r);
  assert.deepEqual([ext.status, ext.ok, ext.added], ['extended', true, 1]);
  const short = (await checkReceipt(rows.slice(0, 3), r));
  assert.deepEqual([short.status, short.ok], ['truncated', false]);
  const rew = await rewrite(rows, 2);
  assert.equal((await checkReceipt(rew, r)).status, 'rewritten', 'a fully re-hashed history verifies on its own but not against the receipt');
  const bad = structuredClone(rows); bad[2].payload.event.device = 'door-01';
  assert.equal((await checkReceipt(bad, r)).status, 'broken');
});

test('a rewritten history that still verifies on its own is exactly what the receipt catches', async () => {
  const {verify} = await import('../docs/engine.mjs');
  const rows = await ledger(scenario('night'));
  const r = await makeReceipt(rows, {now: NOW});
  for (let seq = 1; seq <= rows.length; seq++) {
    const rew = await rewrite(rows, seq);
    assert.equal((await verify(rew)).valid, true, `rewrite at ${seq} verifies without a receipt`);
    const c = await checkReceipt(rew, r);
    assert.equal(c.status, 'rewritten', `rewrite at ${seq}`);
    assert.equal(c.expected, r.head);
  }
});

test('bad receipts are reported, never thrown', async () => {
  const rows = await ledger(scenario('night'));
  for (const bad of [null, [], {}, {schema: RECEIPT_SCHEMA}, {schema: RECEIPT_SCHEMA, rows: 0, head: 'a'.repeat(64)}, {schema: RECEIPT_SCHEMA, rows: 5, head: 'xyz'}, {schema: 'other', rows: 5, head: 'a'.repeat(64)}]) {
    const c = await checkReceipt(rows, bad);
    assert.equal(c.status, 'invalid-receipt', JSON.stringify(bad));
    assert.equal(c.ok, false);
  }
  assert.equal((await checkReceipt('nope', await makeReceipt(rows))).status, 'broken');
  assert.equal(fingerprint('short'), null);
});

test('property: for 150 seeded Forge ledgers, every rewrite before the seal is caught and every append after it is accepted', async () => {
  const r = rng(0x5EA1ED);
  for (let i = 0; i < 150; i++) {
    const rows = await ledger(makeForgeEvents({delaySeconds: randInt(r, 1, 360), holdSeconds: randInt(r, 60, 240), cameraOffline: r() < 0.5}));
    const receipt = await makeReceipt(rows, {now: NOW});
    const seq = randInt(r, 1, rows.length);
    assert.equal((await checkReceipt(await rewrite(rows, seq), receipt)).status, 'rewritten');
    const more = structuredClone(rows); await append(more, {...later, id: `later-${i}`});
    assert.equal((await checkReceipt(more, receipt)).status, 'extended');
  }
});

test('the independent Python verifier agrees with the browser on exports and receipts (cross-language)', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'gb-verify-'));
  const py = process.env.PYTHON || 'python';
  const run = (...a) => spawnSync(py, [path.join(ROOT, 'docs', 'verify', 'verify_evidence.py'), ...a], {encoding: 'utf8'});
  const put = (name, obj) => { const f = path.join(dir, name); writeFileSync(f, JSON.stringify(obj, null, 2)); return f; };
  try {
    const rows = await ledger(makeForgeEvents({delaySeconds: 299, holdSeconds: 120, cameraOffline: true}));
    const receipt = await makeReceipt(rows, {now: NOW});
    const exp = put('export.json', {schema: 'ghostbridge-evidence-v1', ledger: rows});
    const rec = put('receipt.json', receipt);
    let p = run(exp, '--receipt', rec);
    assert.equal(p.status, 0, p.stdout + p.stderr);
    assert.match(p.stdout, new RegExp(`VERIFIED: ${rows.length} row\\(s\\); head ${receipt.head}`));
    assert.match(p.stdout, /RECEIPT OK/);
    const tampered = structuredClone(rows); tampered[1].payload.event.at = '2026-11-08T23:00:30Z';
    p = run(put('t.json', {ledger: tampered}));
    assert.equal(p.status, 1);
    assert.match(p.stdout, /NOT VERIFIED: row 2/);
    p = run(put('r.json', {ledger: await rewrite(rows, 1)}), '--receipt', rec);
    assert.equal(p.status, 1, 'rewritten history: verifies alone, fails the receipt');
    assert.match(p.stdout, /VERIFIED: .*\r?\n.*RECEIPT FAILED: rewritten/);
    const more = structuredClone(rows); await append(more, later);
    p = run(put('m.json', {ledger: more}), '--receipt', rec);
    assert.equal(p.status, 0);
    assert.match(p.stdout, /1 row\(s\) appended after the seal/);
    assert.equal(run(path.join(dir, 'missing.json')).status, 2);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
