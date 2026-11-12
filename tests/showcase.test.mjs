/**
 * Showcase Mode timer tests (docs/showcase.mjs) with a manual scheduler and fake clock.
 * Authored by Kiro (Kiroween 2026). Run: node --test tests/showcase.test.mjs
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BEATS, createShowcase, fillTemplate, totalMs} from '../docs/showcase.mjs';
import {manualScheduler} from './helpers/fake-dom.mjs';

function make(extra = {}) {
  const sched = manualScheduler(), seen = [], ran = [];
  let t = 0;
  const sc = createShowcase({
    beats: extra.beats, schedule: sched.schedule, cancel: sched.cancel, now: () => t,
    run: extra.run || ((beat, i, stale) => { ran.push([beat.id, i, stale]); }), onChange: s => seen.push(s),
  });
  return {sc, sched, seen, ran, advance: ms => { t += ms; }};
}
const ids = BEATS.map(b => b.id);

test('beat table: 8 beats covering the required story, 45-60 s total, ids unique', () => {
  assert.deepEqual(ids, ['building', 'denied', 'door', 'correlate', 'reconstruct', 'evidence', 'response', 'vision']);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(totalMs() >= 45000 && totalMs() <= 60000, `total ${totalMs()} ms`);
  for (const b of BEATS) { assert.ok(b.ms >= 3000 && b.ms <= 12000); assert.ok(b.title.length > 8 && b.subtitle.length > 20); assert.equal(typeof b.action, 'string'); }
});

test('captions contain no hardcoded outcome numbers (they use tokens from the live ledger)', () => {
  const text = BEATS.map(b => b.title + ' ' + b.subtitle).join(' ');
  assert.ok(!/\b(270|130|299|301|185)\b/.test(text), 'no fixture numbers in captions');
  assert.ok(!/A001|R003|forge:/.test(text));
  assert.match(text, /\{gap\}.*\{hold\}|\{hold\}.*\{gap\}/s);
});

test('fillTemplate fills known tokens and never leaks raw braces', () => {
  assert.equal(fillTemplate('{gap} later, held {hold}', {gap: '270 s', hold: '130 s'}), '270 s later, held 130 s');
  assert.equal(fillTemplate('case {caseId}', {}), 'case …');
  assert.equal(fillTemplate('case {caseId}', {caseId: ''}), 'case …');
  assert.equal(fillTemplate('no tokens', {a: 1}), 'no tokens');
  assert.ok(!/[{}]/.test(fillTemplate(BEATS.map(b => b.subtitle).join(' '), {})));
});

test('starts idle; play begins beat 0 and runs its action once', () => {
  const {sc, ran, sched} = make();
  assert.deepEqual([sc.state.status, sc.state.index, sc.state.beat], ['idle', -1, null]);
  sc.play();
  assert.deepEqual([sc.state.status, sc.state.index, sc.state.beat.id], ['playing', 0, 'building']);
  assert.equal(sched.size, 1);
  assert.equal(sched.delay, BEATS[0].ms);
  return Promise.resolve().then(() => assert.deepEqual(ran.map(r => r[0]), ['building']));
});

test('the timer walks every beat in order, then ends done with no timer left', async () => {
  const {sc, ran, sched, advance} = make();
  sc.play();
  for (let i = 0; i < BEATS.length; i++) { await Promise.resolve(); advance(BEATS[i].ms); sched.tick(); }
  await Promise.resolve();
  assert.deepEqual(ran.map(r => r[0]), ids);
  assert.equal(sc.state.status, 'done');
  assert.equal(sc.state.elapsedMs, totalMs());
  assert.equal(sched.size, 0);
});

test('pause freezes the beat; resume continues with the remaining time only', () => {
  const {sc, sched, advance} = make();
  sc.play();
  advance(2500); sc.pause();
  assert.equal(sc.state.status, 'paused');
  assert.equal(sched.size, 0);
  assert.equal(sc.state.remainingMs, BEATS[0].ms - 2500);
  advance(60000);
  assert.equal(sc.state.remainingMs, BEATS[0].ms - 2500, 'paused time does not count');
  sc.play();
  assert.equal(sc.state.status, 'playing');
  assert.equal(sched.delay, BEATS[0].ms - 2500);
});

test('resume does not re-run the beat action', async () => {
  const {sc, ran, advance} = make();
  sc.play(); await Promise.resolve();
  advance(1000); sc.pause(); sc.play(); await Promise.resolve();
  assert.equal(ran.length, 1);
});

test('elapsed time is monotonic across pause and resume', async () => {
  const {sc, sched, advance} = make();
  sc.play();
  const marks = [];
  advance(1000); marks.push(sc.state.elapsedMs);
  sc.pause(); advance(9999); marks.push(sc.state.elapsedMs);
  sc.play(); advance(500); marks.push(sc.state.elapsedMs);
  advance(BEATS[0].ms); sched.tick(); await Promise.resolve(); marks.push(sc.state.elapsedMs);
  assert.deepEqual(marks, [...marks].sort((a, b) => a - b));
  assert.equal(marks[0], 1000);
  assert.equal(marks[1], 1000);
});

test('pause while paused or idle, and play while playing, are no-ops', () => {
  const {sc, sched, seen} = make();
  sc.pause(); assert.equal(seen.length, 0);
  sc.play(); const n = seen.length; sc.play();
  assert.equal(seen.length, n); assert.equal(sched.size, 1);
  sc.pause(); const m = seen.length; sc.pause();
  assert.equal(seen.length, m);
});

test('toggle alternates play and pause', () => {
  const {sc} = make();
  sc.toggle(); assert.equal(sc.state.status, 'playing');
  sc.toggle(); assert.equal(sc.state.status, 'paused');
  sc.toggle(); assert.equal(sc.state.status, 'playing');
});

test('restart goes back to beat 0, invalidates in-flight actions, and keeps one timer', async () => {
  const {sc, ran, sched, advance} = make();
  sc.play(); await Promise.resolve();
  advance(BEATS[0].ms); sched.tick(); await Promise.resolve();
  assert.equal(sc.state.index, 1);
  const staleCheck = ran.at(-1)[2];
  assert.equal(staleCheck(), false);
  sc.restart(); await Promise.resolve();
  assert.equal(sc.state.index, 0);
  assert.equal(staleCheck(), true, 'the old action sees it is stale');
  assert.equal(ran.at(-1)[2](), false, 'the new action is fresh');
  assert.equal(sched.size, 1);
});

test('restart works from paused and from done', async () => {
  const a = make(); a.sc.play(); a.advance(500); a.sc.pause(); a.sc.restart();
  assert.deepEqual([a.sc.state.status, a.sc.state.index], ['playing', 0]);
  const b = make({beats: [BEATS[0]]}); b.sc.play(); await Promise.resolve(); b.advance(BEATS[0].ms); b.sched.tick();
  assert.equal(b.sc.state.status, 'done');
  b.sc.restart(); assert.deepEqual([b.sc.state.status, b.sc.state.index], ['playing', 0]);
});

test('play after done starts over', async () => {
  const {sc, sched, advance} = make({beats: [BEATS[0]]});
  sc.play(); advance(BEATS[0].ms); sched.tick();
  assert.equal(sc.state.status, 'done');
  sc.play(); assert.deepEqual([sc.state.status, sc.state.index], ['playing', 0]);
});

test('exit returns to idle, cancels the timer and invalidates actions', async () => {
  const {sc, ran, sched} = make();
  sc.play(); await Promise.resolve();
  const stale = ran[0][2];
  sc.exit();
  assert.deepEqual([sc.state.status, sc.state.index, sc.state.beat], ['idle', -1, null]);
  assert.equal(sched.size, 0);
  assert.equal(stale(), true);
});

test('an action that throws is reported without stopping the timeline', async () => {
  const {sc, sched, advance} = make({run: (beat, i) => { if (i === 1) throw new Error('boom'); }});
  sc.play(); await Promise.resolve(); advance(BEATS[0].ms); sched.tick(); await Promise.resolve(); await Promise.resolve();
  assert.equal(sc.state.error, 'boom');
  assert.equal(sc.state.status, 'playing');
  advance(BEATS[1].ms); sched.tick();
  assert.equal(sc.state.index, 2, 'the show goes on');
});

test('an async action that rejects after restart is ignored', async () => {
  let rejectFirst;
  const {sc} = make({run: (beat, i) => (i === 0 && !rejectFirst ? new Promise((_, rej) => { rejectFirst = rej; }) : undefined)});
  sc.play(); await Promise.resolve();
  sc.restart(); await Promise.resolve();
  rejectFirst(new Error('late'));
  await new Promise(r => setTimeout(r, 5));
  assert.equal(sc.state.error, null);
});

test('destroy cancels everything and later calls do nothing', () => {
  const {sc, sched, seen} = make();
  sc.play(); const n = seen.length; sc.destroy();
  assert.equal(sched.size, 0);
  sc.play(); sc.pause(); sc.restart(); sc.exit();
  assert.equal(seen.length, n);
  assert.equal(sched.size, 0);
});

test('snapshots are copies', () => {
  const {sc} = make();
  const s0 = sc.state; sc.play();
  assert.equal(s0.status, 'idle');
});

test('showcase source: pure sequencing, no DOM, storage, network or ledger access', async () => {
  const src = await readFile(new URL('../docs/showcase.mjs', import.meta.url), 'utf8');
  assert.ok(!/\bdocument\.[a-z]|\bwindow\.[a-zA-Z]|localStorage|fetch\(|innerHTML|import .*engine|import .*correlator/.test(src));
});
