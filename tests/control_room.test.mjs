/**
 * Control Room pure model tests (docs/control_room.mjs).
 * Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).
 * Run: node --test tests/control_room.test.mjs
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {append, verify, scenario} from '../docs/engine.mjs';
import {correlate} from '../docs/correlator.mjs';
import {makeForgeEvents} from '../docs/signal_forge.mjs';
import {
  SOURCE_NODES, deriveScene, explainPair, validCases, buildTimeline, beforeAfter, buildBoard, recommend, nodeInfo,
  stateLabel, exclusionReason, flatten, toSeconds, WINDOW_SECONDS, DOOR_HELD_THRESHOLD,
} from '../docs/control_room.mjs';

const ledger = async events => { const rows = []; for (const e of events) await append(rows, e); return rows; };
const forge = (delaySeconds, holdSeconds, cameraOffline = false) => ledger(makeForgeEvents({delaySeconds, holdSeconds, cameraOffline}));
const deepFreeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(deepFreeze); } return o; };
const read = rel => readFile(new URL('../' + rel, import.meta.url), 'utf8');

test('constants come from the correlator, not copies', async () => {
  assert.equal(WINDOW_SECONDS, 300);
  assert.equal(DOOR_HELD_THRESHOLD, 120);
  const src = await read('docs/control_room.mjs');
  assert.match(src, /from '\.\/correlator\.mjs'/);
  assert.ok(!/(WINDOW_SECONDS|DOOR_HELD_THRESHOLD)\s*=\s*\d/.test(src));
  assert.ok(!/\b(300|120)\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'no rule numbers hardcoded in code');
});

test('four source nodes map to the four synthetic devices', () => {
  assert.deepEqual(SOURCE_NODES.map(n => n.id), ['door', 'reader', 'camera', 'presence']);
  assert.deepEqual(SOURCE_NODES.map(n => n.deviceId), ['door-01', 'reader-01', 'camera-01', 'zone-01']);
});

test('empty ledger: idle scene, no link, no bounds', () => {
  const s = deriveScene([]);
  assert.deepEqual([s.idle, s.reader, s.door, s.camera, s.presence, s.link, s.caseId, s.clock, s.bounds], [true, 'idle', 'closed', 'unknown', 'idle', null, null, null, null]);
  assert.equal(s.nodes.length, 4);
});

test('non-array input never throws', () => {
  for (const bad of [null, undefined, {}, 'x', 5]) assert.equal(deriveScene(bad).idle, true);
  assert.deepEqual(flatten(null), []);
});

test('Challenge A (299/120): reader denied, door held, case link with 299 s', async () => {
  const rows = await forge(299, 120);
  const cases = await correlate(rows);
  const s = deriveScene(rows, null, cases);
  assert.deepEqual([s.reader, s.door, s.idle], ['denied', 'held', false]);
  assert.equal(s.link.kind, 'case');
  assert.equal(s.link.gap, 299);
  assert.equal(s.link.hold, 120);
  assert.equal(s.caseId, cases[0].id);
});

test('Challenge B (301/119): near-miss link with both reasons, no case id', async () => {
  const rows = await forge(301, 119);
  const cases = await correlate(rows);
  assert.equal(cases.length, 0);
  const s = deriveScene(rows, null, cases);
  assert.equal(s.link.kind, 'near-miss');
  assert.deepEqual([s.link.gap, s.link.hold, s.link.windowPass, s.link.holdPass, s.caseId], [301, 119, false, false, null]);
  assert.equal(s.door, 'open', 'a 119 s hold is not a held-open door incident');
});

test('cursor walks the story: before the denial, after the denial, after the door, end', async () => {
  const rows = await forge(270, 130);
  const cases = await correlate(rows);
  const items = flatten(rows);
  const t0 = items[0].sec;
  const at = off => deriveScene(rows, t0 + off, cases);
  assert.deepEqual([at(-1).idle, at(-1).reader, at(-1).door], [false, 'idle', 'closed'], 'one second before the first event the devices are still quiet');
  assert.equal(at(0).door, 'open', 'the earlier door has just opened: open, not yet held');
  assert.equal(at(119).door, 'open');
  assert.equal(at(120).door, 'held', 'it becomes held exactly when the threshold is reached');
  assert.equal(at(30).reader, 'denied');
  assert.equal(at(30).link, null, 'no link until both events are visible');
  assert.equal(at(299).link, null);
  assert.equal(at(300).door, 'open', 'the qualifying door has just opened');
  assert.equal(at(300).link, null, 'the case does not exist the instant the door opens');
  assert.equal(at(419).link, null, 'one second before the hold threshold is reached');
  assert.equal(at(420).link.kind, 'case', 'door opened at +300 and held for 120 s: the case exists at +420');
  assert.equal(at(420).door, 'held');
  assert.equal(deriveScene(rows, null, cases).link.kind, 'case');
});

test('the hold threshold is read from the correlator for every gap and the clock follows the cursor', async () => {
  for (const gap of [30, 150, 299]) {
    const rows = await forge(gap, 130), cases = await correlate(rows);
    const door = flatten(rows).find(i => i.id === 'forge:later-door');
    assert.equal(deriveScene(rows, door.sec, cases).link, null, `gap ${gap}: not at the instant the door opens`);
    assert.equal(deriveScene(rows, door.sec + DOOR_HELD_THRESHOLD - 1, cases).link, null, `gap ${gap}: not one second early`);
    assert.equal(deriveScene(rows, door.sec + DOOR_HELD_THRESHOLD, cases).link.gap, gap, `gap ${gap}: exactly at the threshold`);
  }
  const rows = await forge(270, 130);
  const first = flatten(rows)[0].sec;
  assert.equal(deriveScene(rows, first + 45).clock, '2026-11-08T22:00:45Z', 'finite cursor: the clock shows the cursor moment');
  assert.equal(deriveScene(rows, null).clock, flatten(rows).at(-1).at, 'live: the latest recorded event');
});

test('near-miss link appears when the door opens (no hold to wait for)', async () => {
  const rows = await forge(301, 119), door = flatten(rows).find(i => i.id === 'forge:later-door');
  assert.equal(deriveScene(rows, door.sec - 1, []).link, null);
  assert.equal(deriveScene(rows, door.sec, []).link.kind, 'near-miss');
});

test('cursor null and cursor at the last event give the same scene', async () => {
  const rows = await forge(270, 130);
  const cases = await correlate(rows);
  const end = flatten(rows).at(-1).sec + DOOR_HELD_THRESHOLD; // the last door has now been held for the threshold
  const strip = s => ({...s, cursor: null, clock: null});
  assert.deepEqual(strip(deriveScene(rows, end, cases)), strip(deriveScene(rows, null, cases)));
});

test('camera offline event drives the camera node; presence dwell drives presence', async () => {
  const withCam = await forge(299, 120, true);
  assert.equal(deriveScene(withCam).camera, 'offline');
  assert.equal(deriveScene(await forge(299, 120, false)).camera, 'unknown');
  const night = await ledger(scenario('night'));
  const s = deriveScene(night);
  assert.deepEqual([s.camera, s.presence, s.reader, s.door], ['offline', 'long', 'granted', 'closed']);
});

test('Normal Shift is calm: camera online, short dwell, nothing held', async () => {
  const s = deriveScene(await ledger(scenario('normal')));
  assert.deepEqual([s.camera, s.presence, s.door, s.reader, s.link], ['online', 'dwell', 'closed', 'granted', null]);
});

test('stale or forged cases never draw a link (hashes must match the ledger)', async () => {
  const rows = await forge(299, 120);
  const [c] = await correlate(rows);
  assert.equal(validCases(rows, [c]).length, 1);
  assert.equal(validCases(rows, [{...c, evidence_hashes: ['0'.repeat(64), c.evidence_hashes[1]]}]).length, 0);
  assert.equal(validCases(rows, [{...c, event_ids: ['nope', 'forge:later-door']}]).length, 0);
  assert.equal(validCases(rows, [{...c, event_ids: ['forge:denied']}]).length, 0);
  assert.equal(validCases([], [c]).length, 0);
  assert.equal(validCases(rows, null).length, 0);
  const stale = deriveScene(await forge(301, 119), null, [c]);
  assert.equal(stale.link.kind, 'near-miss', 'a case from another ledger is ignored');
  assert.equal(stale.caseId, null);
});

test('explainPair: numbers and sentences for pass, fail-window, fail-hold, fail-both, none', async () => {
  let p = explainPair(await forge(299, 120));
  assert.deepEqual([p.kind, p.gap, p.hold, p.windowPass, p.holdPass], ['case', 299, 120, true, true]);
  assert.match(p.reasons[0].text, /1 s inside the 300 s window/);
  assert.match(p.reasons[1].text, /0 s above the 120 s threshold/);
  p = explainPair(await forge(301, 130));
  assert.deepEqual([p.kind, p.windowPass, p.holdPass], ['near-miss', false, true]);
  assert.match(p.summary, /1 s outside the 300 s window/);
  p = explainPair(await forge(270, 119));
  assert.deepEqual([p.kind, p.windowPass, p.holdPass], ['near-miss', true, false]);
  assert.match(p.summary, /1 s below the 120 s threshold/);
  p = explainPair(await forge(360, 60));
  assert.equal(p.reasons.filter(r => !r.pass).length, 2);
  assert.equal(explainPair([]).kind, 'none');
  assert.equal(explainPair(await ledger(scenario('night'))).kind, 'none');
  assert.match(explainPair(await ledger(scenario('denied'))).summary, /no door opening followed/);
});

test('explainPair agrees with correlate() on every boundary', async () => {
  for (const [g, h] of [[1, 60], [1, 120], [299, 120], [300, 120], [301, 120], [300, 119], [301, 119], [360, 240], [150, 121]]) {
    const rows = await forge(g, h);
    const kind = explainPair(rows).kind, cases = await correlate(rows);
    assert.equal(kind === 'case', cases.length === 1, `${g}/${h}`);
  }
});

test('timeline: to-scale offsets, kinds, hashes from the ledger', async () => {
  const rows = await forge(270, 130);
  const cases = await correlate(rows);
  const t = buildTimeline(rows, cases);
  assert.equal(t.empty, false);
  assert.equal(t.span, 300);
  assert.deepEqual(t.items.map(i => i.kind), ['excluded', 'anchor', 'match']);
  assert.deepEqual(t.items.map(i => Math.round(i.pct)), [0, 10, 100]);
  const byId = Object.fromEntries(rows.map(r => [r.payload.event.id, r.hash]));
  for (const i of t.items) assert.equal(i.hash, byId[i.id]);
  assert.equal(buildTimeline([], []).empty, true);
});

test('timeline: near-miss kinds, and a single event sits in the middle', async () => {
  const t = buildTimeline(await forge(301, 119), []);
  assert.deepEqual(t.items.map(i => i.kind), ['event', 'anchor', 'near']);
  const one = buildTimeline(await ledger(scenario('denied')), []);
  assert.equal(one.items[0].pct, 50);
});

test('beforeAfter: standalone alarms on the left, one explained outcome on the right', async () => {
  const rows = await forge(270, 130);
  const cases = await correlate(rows);
  const b = beforeAfter(rows, cases);
  assert.equal(b.count, 3);
  assert.equal(b.outcome.kind, 'case');
  assert.equal(b.outcome.caseId, cases[0].id);
  assert.deepEqual(b.outcome.eventIds, ['forge:denied', 'forge:later-door']);
  const nb = beforeAfter(await forge(301, 119), []);
  assert.equal(nb.outcome.kind, 'near-miss');
  assert.equal(nb.outcome.caseId, null);
  assert.equal(beforeAfter([], []).outcome.kind, 'none');
  assert.equal(beforeAfter(await ledger(scenario('night')), []).outcome.title, 'Standalone findings only');
});

test('board: answers all six questions from the ledger for a case', async () => {
  const rows = await forge(270, 130, true);
  const cases = await correlate(rows);
  const b = buildBoard(rows, cases);
  assert.equal(b.ready, true);
  assert.equal(b.kind, 'case');
  assert.equal(b.caseId, cases[0].id);
  assert.match(b.what, /rejected/);
  assert.deepEqual(b.where, ['Archive reader (reader-01)', 'North entrance (door-01)']);
  assert.equal(b.why.length, 2);
  assert.deepEqual(b.excluded.map(e => e.id), ['forge:earlier-door']);
  assert.match(b.excluded[0].reason, /30 s before the denial/);
  assert.equal(b.evidence.length, 2);
  assert.ok(b.next.some(s => /Camera coverage may be reduced/.test(s)));
});

test('board: near-miss and empty states are explicit', async () => {
  const b = buildBoard(await forge(301, 119), []);
  assert.deepEqual([b.ready, b.kind, b.caseId], [true, 'near-miss', null]);
  assert.match(b.what, /No case is created/);
  const e = buildBoard([], []);
  assert.equal(e.ready, false);
  assert.match(e.what, /quiet/);
});

test('recommendations are advisory text and never mention actuation', async () => {
  const all = [];
  for (const [g, h, cam] of [[270, 130, false], [270, 130, true], [301, 119, false], [301, 119, true]]) {
    const rows = await forge(g, h, cam);
    all.push(...recommend(rows, await correlate(rows)));
  }
  all.push(...recommend([], []), ...recommend(await ledger(scenario('night')), []));
  assert.ok(all.length > 10);
  assert.ok(!/unlock|lock the|open the door|dispatch|call (the )?police|send (an? )?(sms|text|alert)|actuat|disarm|arm the/i.test(all.join(' ')), all.join(' | '));
});

test('nodeInfo: latest recorded event, hash and rule, or awaiting signal', async () => {
  const rows = await forge(270, 130);
  const r = nodeInfo(rows, 'reader');
  assert.deepEqual([r.has, r.eventId, r.stateLabel, r.deviceId], [true, 'forge:denied', 'Access denied', 'reader-01']);
  assert.equal(r.hash, rows.find(x => x.payload.event.id === 'forge:denied').hash);
  assert.match(r.rule, /access-denied/);
  const c = nodeInfo(rows, 'camera');
  assert.deepEqual([c.has, c.hash, c.stateLabel], [false, null, 'No signal yet']);
  assert.equal(nodeInfo(rows, 'nope'), null);
  assert.equal(nodeInfo(rows, 'door', toSeconds('2026-11-08T21:00:00Z')).has, false, 'before any event the door has no record');
});

test('stateLabel and exclusionReason wording', () => {
  assert.equal(stateLabel('door', 'held'), 'Held open');
  assert.equal(stateLabel('reader', 'denied'), 'Access denied');
  const denied = {sec: 1000}, at = d => ({sec: 1000 + d});
  assert.match(exclusionReason(denied, at(-30)), /30 s before the denial/);
  assert.match(exclusionReason(denied, at(0)), /same second/);
  assert.match(exclusionReason(denied, at(360)), /360 s \(6 min\) after the denial: 60 s outside/);
  assert.match(exclusionReason(denied, at(100)), /earliest qualifying/);
});

test('nothing is mutated: frozen ledger, cases and cursor', async () => {
  const rows = deepFreeze(await forge(270, 130, true));
  const cases = deepFreeze(await correlate(rows));
  const before = JSON.stringify({rows, cases});
  deriveScene(rows, 0, cases); deriveScene(rows, null, cases); explainPair(rows); buildTimeline(rows, cases); beforeAfter(rows, cases); buildBoard(rows, cases); recommend(rows, cases); nodeInfo(rows, 'door');
  assert.equal(JSON.stringify({rows, cases}), before);
  assert.equal((await verify(rows)).valid, true);
});

test('model source: no DOM, storage, network, timers or HTML injection', async () => {
  const src = await read('docs/control_room.mjs');
  assert.ok(!/\bdocument\.[a-zA-Z]|\bwindow\.[a-zA-Z]|localStorage|fetch\(|setTimeout|setInterval|innerHTML|XMLHttpRequest/.test(src));
});

test('two denials: the pair that qualifies exactly at 300 s is the one explained (agrees with correlate)', async () => {
  const ev = (id, type, at, d) => ({id, type, at, device: type.startsWith('access') ? 'reader-01' : 'door-01', data: d === undefined ? {} : {duration_seconds: d}});
  // D1 is 400 s before the door (too far); D2 is exactly 300 s before it (qualifies).
  const rows = await ledger([ev('D1', 'access.denied', '2026-11-08T10:00:00Z'), ev('D2', 'access.denied', '2026-11-08T10:01:40Z'), ev('R', 'door.open', '2026-11-08T10:06:40Z', 120)]);
  const cases = await correlate(rows);
  assert.equal(cases.length, 1);
  assert.deepEqual(cases[0].event_ids, ['D2', 'R']);
  const p = explainPair(rows);
  assert.deepEqual([p.kind, p.denied.id, p.gap], ['case', 'D2', 300]);
  assert.equal(deriveScene(rows, null, cases).link.deniedId, 'D2');
});

test('two denials: hold of exactly 120 s qualifies, 119 s does not, and the nearest pair is explained when none qualify', async () => {
  const ev = (id, type, at, d) => ({id, type, at, device: type.startsWith('access') ? 'reader-01' : 'door-01', data: d === undefined ? {} : {duration_seconds: d}});
  const rows120 = await ledger([ev('D1', 'access.denied', '2026-11-08T10:00:00Z'), ev('D2', 'access.denied', '2026-11-08T10:05:00Z'), ev('R', 'door.open', '2026-11-08T10:06:00Z', 120)]);
  assert.equal(explainPair(rows120).kind, 'case');
  const rows119 = await ledger([ev('D1', 'access.denied', '2026-11-08T10:00:00Z'), ev('D2', 'access.denied', '2026-11-08T10:05:00Z'), ev('R', 'door.open', '2026-11-08T10:06:00Z', 119)]);
  assert.equal((await correlate(rows119)).length, 0);
  const p = explainPair(rows119);
  assert.deepEqual([p.kind, p.holdPass, p.windowPass, p.denied.id], ['near-miss', false, true, 'D2'], 'explains the closest pair (60 s, hold 1 s short), not the earliest denial');
});