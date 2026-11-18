/**
 * Property-based and exhaustive-boundary tests for the correlation rule through the Signal Forge.
 *
 * Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).
 * Run: node --test tests/property.test.mjs
 *
 * Randomised inputs use a fixed seed, so every run is reproducible. Failure messages carry the seed and
 * the exact configuration. The oracle is deliberately independent of the code under test: it is just the
 * rule from the requirements (gap <= 300 s and hold >= 120 s).
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {append, verify} from '../docs/engine.mjs';
import {correlate} from '../docs/correlator.mjs';
import {makeForgeEvents, evaluateForge} from '../docs/signal_forge.mjs';
import {explainPair, deriveScene, beforeAfter, buildBoard} from '../docs/control_room.mjs';
import {buildReconstruction, ReconstructionError} from '../docs/reconstruction.mjs';
import {rng, randInt} from './helpers/forge-parity.mjs';

const SEED = 0xC0FFEE;
const RANDOM_CASES = 400;
const oracle = (gap, hold) => gap <= 300 && hold >= 120;
const build = async cfg => { const rows = []; for (const e of makeForgeEvents(cfg)) await append(rows, e); return rows; };
const sha16 = async s => 'case:' + [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
const shuffle = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const tag = c => `seed=${SEED.toString(16)} cfg=${JSON.stringify(c)}`;

test(`random configs (${RANDOM_CASES}): the engine, the explanation and the scene all agree with the rule`, async () => {
  const r = rng(SEED);
  let cases = 0, noCases = 0;
  for (let i = 0; i < RANDOM_CASES; i++) {
    const cfg = {delaySeconds: randInt(r, 1, 360), holdSeconds: randInt(r, 60, 240), cameraOffline: r() < 0.5};
    const want = oracle(cfg.delaySeconds, cfg.holdSeconds);
    const rows = await build(cfg);
    assert.equal((await verify(rows)).valid, true, tag(cfg));
    assert.equal(evaluateForge(cfg).willCorrelate, want, 'forecast ' + tag(cfg));
    const found = await correlate(rows);
    assert.equal(found.length, want ? 1 : 0, 'engine ' + tag(cfg));
    const pair = explainPair(rows);
    assert.equal(pair.kind === 'case', want, 'explainPair ' + tag(cfg));
    const scene = deriveScene(rows, null, found);
    assert.equal(scene.link?.kind, want ? 'case' : 'near-miss', 'scene ' + tag(cfg));
    assert.equal(beforeAfter(rows, found).outcome.kind, want ? 'case' : 'near-miss', 'before/after ' + tag(cfg));
    assert.equal(buildBoard(rows, found).kind, want ? 'case' : 'near-miss', 'board ' + tag(cfg));
    if (want) {
      cases++;
      const [c] = found;
      assert.deepEqual(c.event_ids, ['forge:denied', 'forge:later-door'], tag(cfg));
      assert.equal(c.id, await sha16('forge:denied|forge:later-door'), 'case id ' + tag(cfg));
      assert.deepEqual(c.evidence_hashes, [rows.find(x => x.payload.event.id === 'forge:denied').hash, rows.find(x => x.payload.event.id === 'forge:later-door').hash], tag(cfg));
      assert.equal(scene.link.gap, cfg.delaySeconds, tag(cfg));
      const model = await buildReconstruction(rows, c);
      assert.equal(model.why.gapSeconds, cfg.delaySeconds, tag(cfg));
      assert.equal(model.why.holdSeconds, cfg.holdSeconds, tag(cfg));
      assert.equal(model.why.windowSlackSeconds, 300 - cfg.delaySeconds, tag(cfg));
      assert.equal(model.why.holdMarginSeconds, cfg.holdSeconds - 120, tag(cfg));
    } else {
      noCases++;
      assert.equal(scene.caseId, null, tag(cfg));
      assert.equal(pair.windowPass === false || pair.holdPass === false, true, tag(cfg));
    }
  }
  assert.ok(cases > 50 && noCases > 50, `both outcomes exercised (cases=${cases}, noCases=${noCases})`);
});

test('exhaustive neighbourhood of both limits: gap 290..310 x hold 115..125 (231 configs)', async () => {
  let n = 0;
  for (let gap = 290; gap <= 310; gap++) {
    for (let hold = 115; hold <= 125; hold++) {
      const cfg = {delaySeconds: gap, holdSeconds: hold, cameraOffline: false};
      const rows = await build(cfg);
      assert.equal((await correlate(rows)).length, oracle(gap, hold) ? 1 : 0, tag(cfg));
      n++;
    }
  }
  assert.equal(n, 231);
});

test('monotonic: more delay can only remove a case, more hold can only create one', async () => {
  for (const hold of [60, 119, 120, 121, 200, 240]) {
    let flipped = 0, prev = null;
    for (let gap = 1; gap <= 360; gap += 7) {
      const has = (await correlate(await build({delaySeconds: gap, holdSeconds: hold, cameraOffline: false}))).length === 1;
      if (prev !== null && has !== prev) flipped++;
      if (prev === false) assert.equal(has, false, `delay is monotonic at hold=${hold}, gap=${gap}`);
      prev = has;
    }
    assert.ok(flipped <= 1, `at most one flip along the delay axis (hold=${hold})`);
  }
  for (const gap of [1, 150, 299, 300, 301, 360]) {
    let prev = null;
    for (let hold = 60; hold <= 240; hold += 5) {
      const has = (await correlate(await build({delaySeconds: gap, holdSeconds: hold, cameraOffline: false}))).length === 1;
      if (prev === true) assert.equal(has, true, `hold is monotonic at gap=${gap}, hold=${hold}`);
      prev = has;
    }
  }
});

test('determinism: building the same config twice gives identical hashes, cases and scene', async () => {
  const r = rng(SEED + 1);
  for (let i = 0; i < 60; i++) {
    const cfg = {delaySeconds: randInt(r, 1, 360), holdSeconds: randInt(r, 60, 240), cameraOffline: r() < 0.5};
    const a = await build(cfg), b = await build(cfg);
    assert.deepEqual(a, b, tag(cfg));
    assert.deepEqual(await correlate(a), await correlate(b), tag(cfg));
    assert.deepEqual(deriveScene(a, null, await correlate(a)), deriveScene(b, null, await correlate(b)), tag(cfg));
  }
});

test('idempotency: replaying the same events never changes the ledger or the outcome', async () => {
  const r = rng(SEED + 2);
  for (let i = 0; i < 80; i++) {
    const cfg = {delaySeconds: randInt(r, 1, 360), holdSeconds: randInt(r, 60, 240), cameraOffline: r() < 0.5};
    const events = makeForgeEvents(cfg), rows = [];
    for (const e of events) assert.equal(await append(rows, e), true, tag(cfg));
    const snapshot = structuredClone(rows), cases = await correlate(rows);
    for (const e of events) assert.equal(await append(rows, e), false, tag(cfg));
    assert.deepEqual(rows, snapshot, tag(cfg));
    assert.deepEqual(await correlate(rows), cases, tag(cfg));
  }
});

test('arrival order does not change the outcome: shuffled ingestion gives the same case and links', async () => {
  const r = rng(SEED + 3);
  for (let i = 0; i < 120; i++) {
    const cfg = {delaySeconds: randInt(r, 1, 360), holdSeconds: randInt(r, 60, 240), cameraOffline: r() < 0.5};
    const inOrder = await build(cfg);
    const shuffled = []; for (const e of shuffle(makeForgeEvents(cfg), r)) await append(shuffled, e);
    assert.equal((await verify(shuffled)).valid, true, tag(cfg));
    const a = await correlate(inOrder), b = await correlate(shuffled);
    assert.deepEqual(b.map(c => [c.id, c.event_ids]), a.map(c => [c.id, c.event_ids]), tag(cfg));
    const byId = Object.fromEntries(shuffled.map(x => [x.payload.event.id, x.hash]));
    for (const c of b) assert.deepEqual(c.evidence_hashes, c.event_ids.map(id => byId[id]), 'hashes follow the shuffled ledger ' + tag(cfg));
    assert.equal(explainPair(shuffled).kind, explainPair(inOrder).kind, tag(cfg));
  }
});

test('a camera-offline event is independent: it never creates or removes a case', async () => {
  const r = rng(SEED + 4);
  for (let i = 0; i < 100; i++) {
    const base = {delaySeconds: randInt(r, 1, 360), holdSeconds: randInt(r, 60, 240)};
    const without = await correlate(await build({...base, cameraOffline: false}));
    const withCam = await correlate(await build({...base, cameraOffline: true}));
    assert.deepEqual(withCam.map(c => c.id), without.map(c => c.id), tag(base));
  }
});

test('tampering with any recorded value in a random ledger is caught before a reconstruction is drawn', async () => {
  const r = rng(SEED + 5);
  let tried = 0;
  while (tried < 40) {
    const cfg = {delaySeconds: randInt(r, 1, 300), holdSeconds: randInt(r, 120, 240), cameraOffline: false};
    const rows = await build(cfg), [c] = await correlate(rows);
    const bad = structuredClone(rows);
    const victim = bad[randInt(r, 0, bad.length - 1)];
    const how = randInt(r, 0, 2);
    if (how === 0) victim.payload.event.at = '2026-11-08T23:59:59Z';
    else if (how === 1) victim.payload.event.id = victim.payload.event.id + 'x';
    else victim.hash = victim.hash.replace(/./, victim.hash[0] === 'a' ? 'b' : 'a');
    await assert.rejects(buildReconstruction(bad, c), e => e instanceof ReconstructionError, tag(cfg));
    tried++;
  }
});

test('a case taken from one ledger can never be reconstructed against a different ledger', async () => {
  const [a, b] = [await build({delaySeconds: 250, holdSeconds: 130, cameraOffline: false}), await build({delaySeconds: 251, holdSeconds: 130, cameraOffline: false})];
  const [ca] = await correlate(a);
  await assert.rejects(buildReconstruction(b, ca), e => e instanceof ReconstructionError);
});
