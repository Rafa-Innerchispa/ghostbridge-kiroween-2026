/**
 * Playback controller tests (docs/playback.mjs) with a deterministic manual scheduler.
 *
 * Authored by Kiro (Kiroween 2026, feat/evidence-reconstruction).
 * Run with: node --test tests/playback.test.mjs
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlayback, SPEEDS, BASE_DELAY_MS} from '../docs/playback.mjs';
import {manualScheduler} from './helpers/fake-dom.mjs';

function make(stepCount = 4) {
  const sched = manualScheduler(), seen = [];
  const pb = createPlayback({stepCount, onChange: s => seen.push(s), schedule: sched.schedule, cancel: sched.cancel});
  return {pb, sched, seen};
}

test('constants: speeds and base delay', () => {
  assert.deepEqual([...SPEEDS], [0.5, 1, 2, 4]);
  assert.equal(BASE_DELAY_MS, 1800);
});

test('initial state is at the start, paused, 1x', () => {
  const {pb} = make();
  assert.deepEqual(pb.state, {cursor: 0, playing: false, speed: 1, stepCount: 4, atStart: true, atEnd: false});
});

test('invalid stepCount is rejected', () => {
  for (const bad of [-1, 1.5, NaN, '4', null, undefined]) assert.throws(() => createPlayback({stepCount: bad}), TypeError);
});

test('next and prev clamp to 0..stepCount', () => {
  const {pb} = make(2);
  pb.prev(); assert.equal(pb.state.cursor, 0);
  pb.next(); pb.next(); pb.next(); assert.equal(pb.state.cursor, 2);
  assert.equal(pb.state.atEnd, true);
  pb.prev(); assert.equal(pb.state.cursor, 1);
});

test('seek clamps, truncates and ignores non-numeric values', () => {
  const {pb} = make(4);
  pb.seek(3); assert.equal(pb.state.cursor, 3);
  pb.seek(99); assert.equal(pb.state.cursor, 4);
  pb.seek(-5); assert.equal(pb.state.cursor, 0);
  pb.seek('2'); assert.equal(pb.state.cursor, 2);
  pb.seek(1.9); assert.equal(pb.state.cursor, 1);
  pb.seek('abc'); assert.equal(pb.state.cursor, 1, 'NaN keeps the current position');
});

test('play schedules one tick at the base delay and advances one step per tick', () => {
  const {pb, sched} = make(3);
  pb.play();
  assert.equal(pb.state.playing, true);
  assert.equal(sched.size, 1);
  assert.equal(sched.delay, 1800);
  sched.tick(); assert.equal(pb.state.cursor, 1);
  sched.tick(); assert.equal(pb.state.cursor, 2);
  assert.equal(pb.state.playing, true);
});

test('playback stops by itself at the end and leaves no timer behind', () => {
  const {pb, sched} = make(2);
  pb.play(); sched.tick(); sched.tick();
  assert.equal(pb.state.cursor, 2);
  assert.equal(pb.state.playing, false);
  assert.equal(pb.state.atEnd, true);
  assert.equal(sched.size, 0);
});

test('play at the end replays from the beginning', () => {
  const {pb, sched} = make(2);
  pb.seek(2);
  pb.play();
  assert.equal(pb.state.cursor, 0);
  assert.equal(pb.state.playing, true);
  assert.equal(sched.size, 1);
});

test('pause cancels the pending timer', () => {
  const {pb, sched} = make();
  pb.play(); pb.pause();
  assert.equal(pb.state.playing, false);
  assert.equal(sched.size, 0);
});

test('toggle alternates play and pause', () => {
  const {pb} = make();
  pb.toggle(); assert.equal(pb.state.playing, true);
  pb.toggle(); assert.equal(pb.state.playing, false);
});

test('manual navigation always pauses auto-play', () => {
  for (const act of [p => p.next(), p => p.prev(), p => p.restart(), p => p.seek(2)]) {
    const {pb, sched} = make();
    pb.play(); act(pb);
    assert.equal(pb.state.playing, false);
    assert.equal(sched.size, 0);
  }
});

test('restart returns to step 0 and stays paused', () => {
  const {pb} = make();
  pb.seek(3); pb.restart();
  assert.equal(pb.state.cursor, 0);
  assert.equal(pb.state.playing, false);
});

test('speed changes the delay of the pending tick', () => {
  const {pb, sched} = make();
  pb.play();
  pb.setSpeed(2);
  assert.equal(sched.size, 1, 'the old timer is replaced, never duplicated');
  assert.equal(sched.delay, 900);
  pb.setSpeed(0.5);
  assert.equal(sched.delay, 3600);
  assert.equal(pb.state.speed, 0.5);
});

test('invalid speed throws RangeError and keeps the previous speed', () => {
  const {pb} = make();
  assert.throws(() => pb.setSpeed(3), RangeError);
  assert.throws(() => pb.setSpeed('fast'), RangeError);
  assert.equal(pb.state.speed, 1);
});

test('setSpeed while paused does not start playback', () => {
  const {pb, sched} = make();
  pb.setSpeed(4);
  assert.equal(pb.state.playing, false);
  assert.equal(sched.size, 0);
});

test('onChange receives a snapshot for each change', () => {
  const {pb, seen} = make(2);
  pb.next(); pb.next();
  assert.deepEqual(seen.map(s => s.cursor), [1, 2]);
  assert.equal(seen.at(-1).atEnd, true);
});

test('snapshots are copies, not live references', () => {
  const {pb} = make();
  const before = pb.state;
  pb.next();
  assert.equal(before.cursor, 0);
});

test('destroy cancels timers and ignores later calls', () => {
  const {pb, sched, seen} = make();
  pb.play();
  const calls = seen.length;
  pb.destroy();
  assert.equal(sched.size, 0);
  pb.next(); pb.play(); pb.seek(2); pb.setSpeed(2); pb.restart();
  assert.equal(seen.length, calls, 'no callbacks after destroy');
  assert.equal(sched.size, 0, 'no timers after destroy');
});

test('a stale timer firing after pause does not advance', () => {
  const sched = manualScheduler();
  let fire;
  const pb = createPlayback({stepCount: 3, schedule: fn => { fire = fn; return 1; }, cancel: () => {}});
  pb.play(); pb.pause();
  fire();
  assert.equal(pb.state.cursor, 0);
  assert.equal(sched.size, 0);
});

test('zero steps: play is a no-op', () => {
  const {pb, sched} = make(0);
  pb.play();
  assert.equal(pb.state.playing, false);
  assert.equal(sched.size, 0);
  assert.equal(pb.state.atStart && pb.state.atEnd, true);
});
