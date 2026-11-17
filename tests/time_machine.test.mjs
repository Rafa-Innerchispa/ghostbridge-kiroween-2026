/**
 * Incident Time Machine tests (docs/time_machine.mjs).
 * Authored by Kiro's main session agent (Kiroween 2026, feat/kiro-winning-experience), not by the custom agents.
 * Run: node --test tests/time_machine.test.mjs
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {append} from '../docs/engine.mjs';
import {correlate} from '../docs/correlator.mjs';
import {makeForgeEvents} from '../docs/signal_forge.mjs';
import {deriveScene, flatten} from '../docs/control_room.mjs';
import {buildTimeMachine, STEP_IDS} from '../docs/time_machine.mjs';
import {rng, randInt} from './helpers/forge-parity.mjs';

const ledger = async events => { const rows = []; for (const e of events) await append(rows, e); return rows; };
const forge = async (delaySeconds, holdSeconds) => { const rows = await ledger(makeForgeEvents({delaySeconds, holdSeconds, cameraOffline: false})); return {rows, cases: await correlate(rows)}; };
const step = (tm, id) => tm.steps.find(s => s.id === id);

test('299/120: eight beats, all reached, case and evidence read from the ledger', async () => {
  const {rows, cases} = await forge(299, 120);
  const tm = buildTimeMachine(rows, cases);
  assert.equal(tm.kind, 'case');
  assert.deepEqual(tm.steps.map(s => s.id), [...STEP_IDS]);
  assert.ok(tm.steps.every(s => s.reached), 'every beat happened');
  const c = cases[0];
  assert.equal(step(tm, 'case').caseId, c.id);
  assert.equal(step(tm, 'case').caption, c.explanation);
  assert.deepEqual(step(tm, 'evidence').events.map(e => e.hash), c.evidence_hashes);
  assert.deepEqual(step(tm, 'denied').events.map(e => e.id), [c.event_ids[0]]);
  assert.deepEqual(step(tm, 'door-open').events.map(e => e.id), [c.event_ids[1]]);
  assert.match(step(tm, 'door-open').caption, /299 s \(4m 59s\) after the denial|299 s/);
});

test('301/119: all eight beats exist, the later ones are not reached and name both failed conditions', async () => {
  const {rows, cases} = await forge(301, 119);
  const tm = buildTimeMachine(rows, cases);
  assert.equal(cases.length, 0);
  assert.equal(tm.kind, 'near-miss');
  assert.equal(tm.steps.length, 8);
  assert.equal(step(tm, 'door-held').reached, false);
  assert.equal(step(tm, 'threshold').reached, false);
  assert.equal(step(tm, 'case').reached, false);
  assert.equal(step(tm, 'case').caseId, null);
  assert.equal(step(tm, 'evidence').events.length, 0);
  assert.match(step(tm, 'threshold').caption, /1 s outside the 300 s window/);
  assert.match(step(tm, 'threshold').caption, /1 s below the 120 s threshold/);
  assert.match(tm.note, /outside the window and hold below threshold/);
});

test('each cursor renders the matching scene (caption and picture cannot disagree)', async () => {
  const {rows, cases} = await forge(299, 120);
  const tm = buildTimeMachine(rows, cases);
  const at = id => deriveScene(rows, step(tm, id).cursor, cases);
  assert.equal(at('normal').idle === false && at('normal').door, 'closed');
  assert.equal(at('normal').reader, 'idle');
  assert.equal(at('denied').reader, 'denied');
  assert.equal(at('denied').link, null);
  assert.equal(at('door-open').door, 'open');
  assert.equal(at('door-open').link, null, 'a link must not appear the instant the door opens');
  assert.equal(at('door-held').door, 'held');
  assert.equal(at('case').link?.kind, 'case');
  assert.equal(at('case').caseId, cases[0].id);
  assert.equal(at('threshold').link?.kind, 'case');
});

test('301/119 never shows a case link at any beat', async () => {
  const {rows, cases} = await forge(301, 119);
  const tm = buildTimeMachine(rows, cases);
  for (const s of tm.steps) assert.notEqual(deriveScene(rows, s.cursor, cases).link?.kind, 'case', s.id);
});

test('empty ledger and a ledger with no denial/door pair are reported plainly, not as steps', async () => {
  assert.deepEqual(buildTimeMachine([], []).steps, []);
  assert.equal(buildTimeMachine([], []).empty, true);
  const rows = await ledger([{id: 'x1', device: 'camera-01', type: 'camera.offline', at: '2026-11-08T22:00:00Z', data: {}}]);
  const tm = buildTimeMachine(rows, []);
  assert.equal(tm.kind, 'none');
  assert.deepEqual(tm.steps, []);
});

test('timestamps, ids and hashes in every step exist in the ledger (nothing invented)', async () => {
  const {rows, cases} = await forge(299, 120);
  const items = flatten(rows);
  const known = new Map(items.map(i => [i.id, i]));
  for (const s of buildTimeMachine(rows, cases).steps) for (const e of s.events) {
    assert.ok(known.has(e.id), `${s.id}: unknown event ${e.id}`);
    assert.equal(known.get(e.id).at, e.at);
    assert.ok(known.get(e.id).hash === e.hash || cases[0].evidence_hashes.includes(e.hash), `${s.id}: hash is not a ledger hash`);
  }
});

test('pure: does not mutate its inputs and is deterministic', async () => {
  const {rows, cases} = await forge(299, 120);
  const frozen = JSON.stringify([rows, cases]);
  const a = buildTimeMachine(rows, cases), b = buildTimeMachine(rows, cases);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify([rows, cases]), frozen);
});

test('property: for 400 seeded configurations the beats agree with the correlator', async () => {
  const r = rng(0xC0FFEE);
  for (let i = 0; i < 400; i++) {
    const delay = randInt(r, 1, 360), hold = randInt(r, 60, 240);
    const {rows, cases} = await forge(delay, hold);
    const tm = buildTimeMachine(rows, cases);
    const expectCase = delay <= 300 && hold >= 120;
    assert.equal(tm.kind, expectCase ? 'case' : 'near-miss', `${delay}/${hold}`);
    assert.equal(step(tm, 'case').reached, expectCase, `${delay}/${hold}`);
    assert.equal(step(tm, 'threshold').reached, expectCase, `${delay}/${hold}`);
    assert.equal(step(tm, 'door-held').reached, hold >= 120, `${delay}/${hold}`);
    assert.equal(step(tm, 'case').caseId, expectCase ? cases[0].id : null);
    // cursors never run backwards
    const cur = tm.steps.map(s => s.cursor);
    for (let k = 1; k < cur.length; k++) assert.ok(cur[k] >= cur[k - 1], `${delay}/${hold} cursor order at ${tm.steps[k].id}`);
  }
});

test('every shown time is either a recorded ledger timestamp or explicitly labelled as derived (qa-auditor M1)', async () => {
  for (const [delay, hold] of [[299, 120], [301, 119], [150, 200]]) {
    const {rows, cases} = await forge(delay, hold);
    const recorded = new Set(flatten(rows).map(i => i.at));
    for (const s of buildTimeMachine(rows, cases).steps) {
      if (s.at === null) { assert.equal(s.atKind, null, s.id); continue; }
      if (s.atKind === 'recorded') assert.ok(recorded.has(s.at), `${delay}/${hold} ${s.id}: "recorded" time ${s.at} is not in the ledger`);
      else {
        assert.equal(s.atKind, 'derived', `${delay}/${hold} ${s.id}: an unlabelled time`);
        assert.match(s.atNote, /Derived, not recorded/);
      }
    }
  }
  const view = await readFile(new URL('../docs/time_machine_view.mjs', import.meta.url), 'utf8');
  assert.match(view, /Derived UTC time/);
  assert.match(view, /Recorded UTC time/);
});

test('no rule numbers hardcoded: thresholds come from the correlator', async () => {
  const src = (await readFile(new URL('../docs/time_machine.mjs', import.meta.url), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.match(src, /from '\.\/correlator\.mjs'/);
  assert.ok(!/\b(300|120)\b/.test(src));
});
