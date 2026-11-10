/**
 * Evidence reconstruction projection tests (docs/reconstruction.mjs).
 *
 * Authored by Kiro (Kiroween 2026, feat/evidence-reconstruction).
 * Run with: node --test tests/reconstruction.test.mjs
 *
 * Covers: the 270 s / 130 s demonstration, ordering, source hashes, exclusion reasons,
 * 300 s and 120 s boundaries, out-of-order ingest, forged / tampered / empty evidence,
 * immutability, ledger-derived (not hardcoded) output, scene state, and CI wiring.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {append, verify, scenario} from '../docs/engine.mjs';
import {correlate, WINDOW_SECONDS, DOOR_HELD_THRESHOLD} from '../docs/correlator.mjs';
import {parseRelayCsv, parseAccessWebhook} from '../docs/fixture_replay.mjs';
import {RELAY_NIGHT_CSV, ACCESS_DENIED_JSON} from '../docs/fixtures.js';
import {buildReconstruction, sceneStateAt, formatSeconds, ReconstructionError, ERROR_CODES} from '../docs/reconstruction.mjs';

const read = rel => readFile(new URL('../' + rel, import.meta.url), 'utf8');

async function ledger(events) {
  const rows = [];
  for (const e of events) await append(rows, e);
  return rows;
}
async function fixtureRows() {
  return ledger([parseAccessWebhook(ACCESS_DENIED_JSON), ...parseRelayCsv(RELAY_NIGHT_CSV)]);
}
const ev = (id, type, at, duration) => ({
  id, type, at,
  device: type.startsWith('access') ? 'reader-01' : 'door-01',
  data: duration === undefined ? {} : {duration_seconds: duration},
});
const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
async function build(rows) {
  const [c] = await correlate(rows);
  return buildReconstruction(rows, c);
}
async function rejectsWith(promise, code) {
  await assert.rejects(promise, err => { assert.ok(err instanceof ReconstructionError, 'must be a ReconstructionError'); assert.equal(err.code, code); return true; });
}

// ---------------------------------------------------------------- demonstration fixture

test('fixture: ordered steps are excluded, anchor, match, case', async () => {
  const model = await build(await fixtureRows());
  assert.deepEqual(model.steps.map(s => s.kind), ['excluded', 'anchor', 'match', 'case']);
  assert.deepEqual(model.steps.map(s => s.eventId), ['relay:R001', 'access:A001', 'relay:R003', null]);
  assert.deepEqual(model.steps.map(s => s.at), ['2026-11-08T22:00:00Z', '2026-11-08T22:00:30Z', '2026-11-08T22:05:00Z', '2026-11-08T22:05:00Z']);
  assert.deepEqual(model.steps.map(s => s.index), [0, 1, 2, 3]);
});

test('fixture: offsets are to scale and the span is 300 s of ledger time', async () => {
  const model = await build(await fixtureRows());
  assert.deepEqual(model.steps.map(s => s.offsetSeconds), [0, 30, 300, 300]);
  assert.equal(model.totalSeconds, 300);
  assert.equal(model.startAt, '2026-11-08T22:00:00Z');
  assert.equal(model.endAt, '2026-11-08T22:05:00Z');
});

test('fixture: 270 s gap inside the 300 s window and 130 s hold above the 120 s threshold', async () => {
  const {why} = await build(await fixtureRows());
  assert.equal(why.gapSeconds, 270);
  assert.equal(why.windowSeconds, 300);
  assert.equal(why.windowSlackSeconds, 30);
  assert.equal(why.holdSeconds, 130);
  assert.equal(why.thresholdSeconds, 120);
  assert.equal(why.holdMarginSeconds, 10);
  assert.equal(why.deniedEventId, 'access:A001');
  assert.equal(why.doorEventId, 'relay:R003');
  assert.ok(why.checks.every(c => c.passed));
  assert.deepEqual(why.checks.map(c => c.id), ['order', 'window', 'hold', 'hashes', 'chain']);
});

test('fixture: relay:R001 is excluded because it precedes the denial by 30 s', async () => {
  const model = await build(await fixtureRows());
  assert.equal(model.why.exclusions.length, 1);
  const [x] = model.why.exclusions;
  assert.equal(x.eventId, 'relay:R001');
  assert.equal(x.code, 'before-denial');
  assert.equal(x.deltaSeconds, -30);
  assert.match(x.reason, /30 s before the denial/);
  assert.equal(model.steps[0].reason, x.reason);
});

test('fixture: every step hash and previous hash is read from its ledger row', async () => {
  const rows = await fixtureRows();
  const model = await build(rows);
  const byId = new Map(rows.map(r => [r.payload.event.id, r]));
  for (const s of model.steps.filter(s => s.kind !== 'case')) {
    const row = byId.get(s.eventId);
    assert.equal(s.hash, row.hash);
    assert.equal(s.previous, row.previous);
    assert.equal(s.rowSeq, row.seq);
    assert.equal(s.at, row.payload.event.at);
    assert.equal(s.deviceId, row.payload.event.device);
  }
  const c = model.steps.at(-1);
  assert.deepEqual(c.hashes, [byId.get('access:A001').hash, byId.get('relay:R003').hash]);
  assert.deepEqual(c.eventIds, ['access:A001', 'relay:R003']);
});

test('fixture: durations and rules come from the recorded events and incidents', async () => {
  const model = await build(await fixtureRows());
  const [r001, a001, r003] = model.steps;
  assert.equal(r001.durationSeconds, 185);
  assert.equal(r003.durationSeconds, 130);
  assert.equal(a001.durationSeconds, null);
  assert.equal(a001.incident.rule, 'access-denied');
  assert.equal(r003.incident.rule, 'door-held');
  assert.equal(r003.incident.severity, 'high');
});

test('fixture: case step matches the derived case and the verified chain head', async () => {
  const rows = await fixtureRows();
  const [derived] = await correlate(rows);
  const model = await buildReconstruction(rows, derived);
  const c = model.steps.at(-1);
  assert.equal(model.caseId, derived.id);
  assert.equal(c.caseId, derived.id);
  assert.equal(c.severity, 'high');
  assert.equal(c.rule, derived.rule);
  assert.equal(c.explanation, derived.explanation);
  const v = await verify(rows);
  assert.deepEqual(model.integrity, {valid: true, checked: 5, head: v.head});
});

test('fixture: step narration names the real times and identifiers', async () => {
  const model = await build(await fixtureRows());
  assert.match(model.steps[1].narration, /22:00:30 UTC.*access:A001/);
  assert.match(model.steps[2].narration, /270 s \(4 min 30 s\) after the denial.*held 130 s.*relay:R003/);
});

test('model is deterministic: two builds are deep-equal', async () => {
  const rows = await fixtureRows();
  assert.deepEqual(await build(rows), await build(rows));
});

test('the case passed from the Python API shape (same ids and hashes) is accepted', async () => {
  const rows = await fixtureRows();
  const [derived] = await correlate(rows);
  const wire = JSON.parse(JSON.stringify(derived));
  const model = await buildReconstruction(rows, wire);
  assert.equal(model.caseId, derived.id);
});

// ---------------------------------------------------------------- ordering and boundaries

test('out-of-order ingest yields the same story (hashes follow each ledger)', async () => {
  const inOrder = await build(await fixtureRows());
  const shuffledRows = await ledger([...parseRelayCsv(RELAY_NIGHT_CSV).reverse(), parseAccessWebhook(ACCESS_DENIED_JSON)]);
  const shuffled = await build(shuffledRows);
  const shape = m => m.steps.map(s => [s.kind, s.eventId, s.at, s.offsetSeconds]);
  assert.deepEqual(shape(shuffled), shape(inOrder));
  const byId = new Map(shuffledRows.map(r => [r.payload.event.id, r]));
  for (const s of shuffled.steps.filter(s => s.eventId)) assert.equal(s.hash, byId.get(s.eventId).hash);
  assert.notEqual(shuffled.integrity.head, inOrder.integrity.head, 'different arrival order, different chain');
});

test('boundary: exactly 300 s is accepted with zero margin', async () => {
  const model = await build(await ledger([ev('D', 'access.denied', '2026-11-08T10:00:00Z'), ev('R', 'door.open', '2026-11-08T10:05:00Z', 120)]));
  assert.equal(model.why.gapSeconds, 300);
  assert.equal(model.why.windowSlackSeconds, 0);
  assert.equal(model.why.holdMarginSeconds, 0);
  assert.ok(model.why.checks.every(c => c.passed));
});

test('boundary: 299 s leaves 1 s of margin', async () => {
  const model = await build(await ledger([ev('D', 'access.denied', '2026-11-08T10:00:00Z'), ev('R', 'door.open', '2026-11-08T10:04:59Z', 150)]));
  assert.equal(model.why.windowSlackSeconds, 1);
  assert.equal(model.why.holdMarginSeconds, 30);
});

test('boundary: 301 s is not a case, so a forged case cannot be reconstructed', async () => {
  const rows = await ledger([ev('D', 'access.denied', '2026-11-08T10:00:00Z'), ev('R', 'door.open', '2026-11-08T10:05:01Z', 150)]);
  assert.deepEqual(await correlate(rows), []);
  const forged = {id: 'case:forged', event_ids: ['D', 'R'], evidence_hashes: [rows[0].hash, rows[1].hash]};
  await rejectsWith(buildReconstruction(rows, forged), ERROR_CODES.CASE_NOT_DERIVABLE);
});

test('boundary: 119 s hold is not a case', async () => {
  const rows = await ledger([ev('D', 'access.denied', '2026-11-08T10:00:00Z'), ev('R', 'door.open', '2026-11-08T10:01:00Z', 119)]);
  const forged = {id: 'x', event_ids: ['D', 'R'], evidence_hashes: [rows[0].hash, rows[1].hash]};
  await rejectsWith(buildReconstruction(rows, forged), ERROR_CODES.CASE_NOT_DERIVABLE);
});

test('boundary: a door event before, or in the same second as, the denial is not a case', async () => {
  for (const at of ['2026-11-08T09:59:59Z', '2026-11-08T10:00:00Z']) {
    const rows = await ledger([ev('D', 'access.denied', '2026-11-08T10:00:00Z'), ev('R', 'door.open', at, 150)]);
    const forged = {id: 'x', event_ids: ['D', 'R'], evidence_hashes: [rows[0].hash, rows[1].hash]};
    await rejectsWith(buildReconstruction(rows, forged), ERROR_CODES.CASE_NOT_DERIVABLE);
  }
});

test('exclusion codes: outside window, later candidate, and paired with another case', async () => {
  const rows = await ledger([
    ev('D', 'access.denied', '2026-11-08T10:00:00Z'),
    ev('R1', 'door.open', '2026-11-08T10:02:00Z', 130),
    ev('R2', 'door.open', '2026-11-08T10:03:00Z', 140),
    ev('R3', 'door.open', '2026-11-08T10:06:00Z', 200),
    ev('S', 'door.open', '2026-11-08T10:01:00Z', 30),
  ]);
  const model = await build(rows);
  assert.equal(model.why.doorEventId, 'R1');
  const code = id => model.why.exclusions.find(x => x.eventId === id)?.code;
  assert.equal(code('R2'), 'later-candidate');
  assert.equal(code('R3'), 'outside-window');
  assert.equal(code('S'), undefined, 'a short hold is never a candidate, so it is not listed');
  assert.match(model.why.exclusions.find(x => x.eventId === 'R3').reason, /360 s \(6 min\) after the denial.*300 s window/);
});

test('exclusion code: an event already linked to a different case', async () => {
  const rows = await ledger([
    ev('D1', 'access.denied', '2026-11-08T10:00:00Z'),
    ev('D2', 'access.denied', '2026-11-08T10:01:00Z'),
    ev('R1', 'door.open', '2026-11-08T10:02:00Z', 130),
    ev('R2', 'door.open', '2026-11-08T10:03:00Z', 140),
  ]);
  const cases = await correlate(rows);
  assert.equal(cases.length, 2);
  const second = await buildReconstruction(rows, cases.find(c => c.event_ids[0] === 'D2'));
  assert.equal(second.why.doorEventId, 'R2');
  assert.equal(second.why.exclusions.find(x => x.eventId === 'R1').code, 'paired-elsewhere');
  const first = await buildReconstruction(rows, cases.find(c => c.event_ids[0] === 'D1'));
  assert.equal(first.why.doorEventId, 'R1');
});

// ---------------------------------------------------------------- refusal: no scene from bad evidence

test('refuses a ledger whose chain fails verification', async () => {
  const rows = await fixtureRows();
  const [c] = await correlate(rows);
  const tampered = structuredClone(rows);
  tampered[2].payload.event.data.duration_seconds = 131;
  await rejectsWith(buildReconstruction(tampered, c), ERROR_CODES.INTEGRITY);
});

test('refuses a ledger with a deleted record', async () => {
  const rows = await fixtureRows();
  const [c] = await correlate(rows);
  const gap = structuredClone(rows);
  gap.splice(1, 1);
  await rejectsWith(buildReconstruction(gap, c), ERROR_CODES.INTEGRITY);
});

test('refuses non-array and malformed ledgers', async () => {
  const rows = await fixtureRows();
  const [c] = await correlate(rows);
  for (const bad of [null, undefined, {}, 'rows', 42]) await rejectsWith(buildReconstruction(bad, c), ERROR_CODES.INTEGRITY);
  await rejectsWith(buildReconstruction([null], c), ERROR_CODES.INTEGRITY);
});

test('refuses a missing case', async () => {
  const rows = await fixtureRows();
  for (const bad of [null, undefined, 0, '']) await rejectsWith(buildReconstruction(rows, bad), ERROR_CODES.NO_CASE);
});

test('refuses a case without two events and two hashes', async () => {
  const rows = await fixtureRows();
  const [c] = await correlate(rows);
  for (const patch of [{event_ids: undefined}, {event_ids: ['access:A001']}, {evidence_hashes: undefined}, {evidence_hashes: ['x']}, {event_ids: 'ab'}]) {
    await rejectsWith(buildReconstruction(rows, {...c, ...patch}), ERROR_CODES.EVIDENCE_MISSING);
  }
});

test('refuses a forged case id', async () => {
  const rows = await fixtureRows();
  const [c] = await correlate(rows);
  await rejectsWith(buildReconstruction(rows, {...c, id: 'case:0000000000000000'}), ERROR_CODES.CASE_NOT_DERIVABLE);
});

test('refuses a case whose source hash does not match the ledger row', async () => {
  const rows = await fixtureRows();
  const [c] = await correlate(rows);
  const wrong = [c.evidence_hashes[0], '0'.repeat(64)];
  await rejectsWith(buildReconstruction(rows, {...c, evidence_hashes: wrong}), ERROR_CODES.EVIDENCE_MISMATCH);
  await rejectsWith(buildReconstruction(rows, {...c, evidence_hashes: [...c.evidence_hashes].reverse()}), ERROR_CODES.EVIDENCE_MISMATCH);
});

test('refuses a case whose event ids were changed or swapped', async () => {
  const rows = await fixtureRows();
  const [c] = await correlate(rows);
  await rejectsWith(buildReconstruction(rows, {...c, event_ids: ['access:A001', 'relay:R001']}), ERROR_CODES.EVIDENCE_MISMATCH);
  await rejectsWith(buildReconstruction(rows, {...c, event_ids: [...c.event_ids].reverse()}), ERROR_CODES.EVIDENCE_MISMATCH);
});

test('empty ledger and ledgers with no cross-source case have nothing to reconstruct', async () => {
  const stub = {id: 'case:x', event_ids: ['a', 'b'], evidence_hashes: ['h1', 'h2']};
  await rejectsWith(buildReconstruction([], stub), ERROR_CODES.CASE_NOT_DERIVABLE);
  for (const name of ['night', 'normal', 'denied']) {
    const rows = await ledger(scenario(name));
    assert.deepEqual(await correlate(rows), []);
    await rejectsWith(buildReconstruction(rows, stub), ERROR_CODES.CASE_NOT_DERIVABLE);
  }
});

test('reconstruction errors carry a name, a code and a readable message', async () => {
  const err = await buildReconstruction([], null).catch(e => e);
  assert.equal(err.name, 'ReconstructionError');
  assert.equal(err.code, ERROR_CODES.NO_CASE);
  assert.ok(err.message.length > 10);
});

// ---------------------------------------------------------------- immutability and no hardcoding

test('building never mutates the ledger or the case (frozen inputs)', async () => {
  const rows = deepFreeze(await fixtureRows());
  const [c] = deepFreeze(await correlate(rows));
  const before = JSON.stringify({rows, c});
  await buildReconstruction(rows, c);
  assert.equal(JSON.stringify({rows, c}), before);
  assert.equal((await verify(rows)).valid, true);
});

test('exported evidence JSON and the ledger are identical before and after reconstruction and playback state', async () => {
  const rows = await fixtureRows();
  const exportOf = r => JSON.stringify({schema: 'ghostbridge-evidence-v1', integrity: null, ledger: r});
  const before = exportOf(rows);
  const model = await build(rows);
  for (let i = 0; i <= model.steps.length; i++) sceneStateAt(model, i);
  assert.equal(exportOf(rows), before);
});

test('output is derived from the ledger: different data produces different, correct output', async () => {
  const rows = await ledger([
    ev('badge:Q9', 'access.denied', '2027-02-03T04:05:06Z'),
    ev('gate:Z7', 'door.open', '2027-02-03T04:06:36Z', 500),
  ]);
  const model = await build(rows);
  assert.equal(model.why.gapSeconds, 90);
  assert.equal(model.why.holdSeconds, 500);
  assert.equal(model.why.holdMarginSeconds, 380);
  assert.equal(model.totalSeconds, 90);
  assert.deepEqual(model.steps.map(s => s.eventId), ['badge:Q9', 'gate:Z7', null]);
  assert.equal(model.steps[0].time, '04:05:06');
  const dump = JSON.stringify(model);
  for (const fixtureValue of ['A001', 'R001', 'R003', '22:00', '2026-11-08']) assert.ok(!dump.includes(fixtureValue), `${fixtureValue} must not leak into other data`);
});

test('source scan: no fixture literals, no storage or network, no innerHTML', async () => {
  for (const file of ['docs/reconstruction.mjs', 'docs/reconstruction-view.mjs', 'docs/playback.mjs']) {
    const src = await read(file);
    assert.ok(!/\b(A001|R001|R002|R003|R004)\b/.test(src), `${file} must not hardcode fixture event ids`);
    assert.ok(!/2026-11-0\d/.test(src), `${file} must not hardcode fixture dates`);
    assert.ok(!/\b(270|130|185)\b/.test(src), `${file} must not hardcode fixture durations`);
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(src), `${file} must not inject HTML`);
    assert.ok(!/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|WebSocket/.test(src), `${file} must not persist or use the network`);
  }
});

test('thresholds are imported from the correlator, never redefined', async () => {
  const src = await read('docs/reconstruction.mjs');
  assert.match(src, /from '\.\/correlator\.mjs'/);
  assert.ok(!/(WINDOW_SECONDS|DOOR_HELD_THRESHOLD)\s*=\s*\d/.test(src));
  assert.equal(WINDOW_SECONDS, 300);
  assert.equal(DOOR_HELD_THRESHOLD, 120);
});

// ---------------------------------------------------------------- scene state

test('formatSeconds', () => {
  assert.equal(formatSeconds(0), '0 s');
  assert.equal(formatSeconds(45), '45 s');
  assert.equal(formatSeconds(60), '1 min');
  assert.equal(formatSeconds(130), '2 min 10 s');
  assert.equal(formatSeconds(270), '4 min 30 s');
  assert.equal(formatSeconds(-30), '30 s');
});

test('sceneStateAt walks the fixture story', async () => {
  const model = await build(await fixtureRows());
  const at = i => sceneStateAt(model, i);
  const s0 = at(0);
  assert.deepEqual([s0.reader, s0.door, s0.link, s0.caseVisible, s0.clock, s0.current], ['idle', 'closed', false, false, null, null]);
  assert.match(s0.narration, /Ready\. 4 recorded steps spanning 5 min/);
  assert.equal(s0.valueText, 'Start, step 0 of 4');
  const s1 = at(1);
  assert.deepEqual([s1.reader, s1.door, s1.excludedIds, s1.clock], ['idle', 'closed', ['relay:R001'], '22:00:00']);
  const s2 = at(2);
  assert.deepEqual([s2.reader, s2.door, s2.link, s2.clock, s2.elapsedSeconds], ['denied', 'closed', false, '22:00:30', 30]);
  const s3 = at(3);
  assert.deepEqual([s3.reader, s3.door, s3.link, s3.caseVisible, s3.elapsedSeconds], ['denied', 'held-open', true, false, 300]);
  const s4 = at(4);
  assert.deepEqual([s4.caseVisible, s4.done, s4.cursor], [true, true, 4]);
  assert.match(s4.narration, /derives one high priority case/);
  assert.match(s4.valueText, /^Step 4 of 4: HIGH priority case derived, 22:05:00 UTC$/);
});

test('sceneStateAt clamps and sanitises the cursor', async () => {
  const model = await build(await fixtureRows());
  assert.equal(sceneStateAt(model, -3).cursor, 0);
  assert.equal(sceneStateAt(model, 99).cursor, 4);
  assert.equal(sceneStateAt(model, NaN).cursor, 0);
  assert.equal(sceneStateAt(model, undefined).cursor, 0);
  assert.equal(sceneStateAt(model, 1.9).cursor, 1);
});

test('scene only shows the link and case after the evidence that causes them', async () => {
  const model = await build(await fixtureRows());
  for (let i = 0; i <= 4; i++) {
    const s = sceneStateAt(model, i);
    if (s.link) assert.ok(i >= 3, 'link requires both source events');
    if (s.caseVisible) assert.equal(i, 4);
    if (s.reader === 'denied') assert.ok(i >= 2);
  }
});

// ---------------------------------------------------------------- wiring and CI

test('dashboard wiring: host section, Reconstruct button and ledger-change cleanup', async () => {
  const html = await read('docs/index.html');
  assert.match(html, /<section[^>]*id="reconstruction"[^>]*hidden/);
  const app = await read('docs/app.js');
  assert.match(app, /from '\.\/reconstruction\.mjs'/);
  assert.match(app, /from '\.\/reconstruction-view\.mjs'/);
  assert.match(app, /Reconstruct case/);
  assert.match(app, /\$\('reset'\)\.onclick=async\(\)=>\{try\{closeReconstruction\(\)/);
  assert.match(app, /async function run\(name,replay=false\)\{if\(busy\)return;closeReconstruction\(\)/);
  assert.match(app, /if\(busy\)return;closeReconstruction\(\);busy=true/);
});

test('CI and Pages run the new syntax checks and test files', async () => {
  for (const wf of ['.github/workflows/ci.yml', '.github/workflows/pages.yml']) {
    const y = await read(wf);
    for (const m of ['reconstruction.mjs', 'reconstruction-view.mjs', 'playback.mjs']) assert.ok(y.includes(`node --check docs/${m}`), `${wf} must check ${m}`);
    for (const t of ['reconstruction.test.mjs', 'reconstruction-view.test.mjs', 'playback.test.mjs']) assert.ok(y.includes(`node --test tests/${t}`), `${wf} must run ${t}`);
  }
});
