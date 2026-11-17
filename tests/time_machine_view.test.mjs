/**
 * Incident Time Machine VIEW tests (docs/time_machine_view.mjs).
 * Authored by the ui-director custom Kiro agent (Phase 6 run B).
 * Run: node --test tests/time_machine_view.test.mjs
 *
 * Hosted on tests/helpers/fake-dom.mjs (no browser): the view is mounted against real ledger rows built with the real engine and
 * correlator, a recording cursor setter and a manual scheduler, so Play can be driven without waiting. What this cannot prove
 * (layout, focus ring, 40 px targets, the real scene) is covered by tests/browser-qa/phase6-experience.qa.mjs.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {append} from '../docs/engine.mjs';
import {correlate} from '../docs/correlator.mjs';
import {makeForgeEvents} from '../docs/signal_forge.mjs';
import {buildTimeMachine, STEP_IDS} from '../docs/time_machine.mjs';
import {mountTimeMachine, PLAY_INTERVAL_MS} from '../docs/time_machine_view.mjs';
import {FakeDocument, manualScheduler} from './helpers/fake-dom.mjs';

const ledger = async events => { const rows = []; for (const e of events) await append(rows, e); return rows; };
const forge = async (delaySeconds, holdSeconds) => { const rows = await ledger(makeForgeEvents({delaySeconds, holdSeconds, cameraOffline: false})); return {rows, cases: await correlate(rows)}; };

function mount({rows, cases, reducedMotion = false}) {
  const doc = new FakeDocument(), host = doc.createElement('section'), sched = manualScheduler();
  const env = {rows, cases, cursor: null, calls: [], view: null};
  env.view = mountTimeMachine({
    doc, host, getRows: () => env.rows, getCases: () => env.cases, getCursor: () => env.cursor, reducedMotion,
    setCursor: s => { env.cursor = s; env.calls.push(s); env.view.refresh(); },   // the Control Room re-renders and calls refresh()
    schedule: sched.schedule, cancel: sched.cancel,
  });
  return Object.assign(env, {doc, host, sched, env});
}
const beatButtons = host => host.allByClass('cr-tm-beat');
const captionText = host => host.byId('cr-tm-caption').textContent;

test('renders eight beat buttons with accessible names, plus Previous, Next, Play and Pause', async () => {
  const {rows, cases} = await forge(299, 120);
  const t = mount({rows, cases});
  const beats = beatButtons(t.host);
  assert.equal(beats.length, STEP_IDS.length);
  assert.deepEqual(beats.map(b => b.getAttribute('data-step')), [...STEP_IDS]);
  const model = buildTimeMachine(rows, cases);
  beats.forEach((b, i) => {
    assert.equal(b.tagName, 'button');
    assert.equal(b.getAttribute('type'), 'button');
    assert.ok(b.textContent.includes(model.steps[i].label), `beat ${i + 1} name includes its model label`);
    assert.ok(b.textContent.trim().length > 3);
  });
  for (const id of ['cr-tm-prev', 'cr-tm-next', 'cr-tm-play', 'cr-tm-pause']) {
    const b = t.host.byId(id); assert.ok(b, id); assert.equal(b.tagName, 'button'); assert.ok(b.textContent.trim().length >= 4, id + ' has a visible name');
  }
  assert.equal(t.host.byId('cr-tm-caption').getAttribute('aria-live'), 'polite');
  assert.equal(t.host.byId('cr-tm-title').textContent, 'Incident Time Machine');
  assert.equal(beats.filter(b => b.hasAttribute('aria-current')).length, 0, 'no beat is current until one is chosen (no autoplay, no preselection)');
  assert.equal(t.calls.length, 0, 'mounting never moves the cursor');
  assert.equal(t.sched.size, 0, 'mounting never starts a timer');
});

test('choosing a beat calls the cursor setter with the model cursor and marks it aria-current', async () => {
  const {rows, cases} = await forge(299, 120);
  const t = mount({rows, cases}), model = buildTimeMachine(rows, cases);
  const beats = beatButtons(t.host);
  for (const i of [1, 2, 3, 5, 0, 7]) {
    beats[i].click();
    assert.equal(t.calls.at(-1), model.steps[i].cursor, `beat ${i + 1}`);
    assert.equal(t.cursor, model.steps[i].cursor);
    assert.deepEqual(beats.map(b => b.getAttribute('aria-current')), beats.map((_, k) => (k === i ? 'step' : null)));
    assert.equal(t.view.state.index, i);
  }
});

test('caption shows the label, UTC time, caption text, event ids, short hashes with the full hash in title, and the case id', async () => {
  const {rows, cases} = await forge(299, 120);
  const t = mount({rows, cases}), model = buildTimeMachine(rows, cases);
  beatButtons(t.host)[5].click();   // Case appears
  const s = model.steps[5], text = captionText(t.host);
  assert.ok(text.includes(s.label));
  assert.ok(text.includes(s.caption));
  assert.ok(text.includes(s.caseId));
  assert.ok(text.includes(s.at.slice(11, 19) + ' UTC'));
  for (const e of s.events) { assert.ok(text.includes(e.id)); assert.ok(text.includes(e.hashShort)); }
  const hashEls = t.host.byId('cr-tm-caption').findAll(n => n.hasClass('cr-tm-hash'));
  assert.deepEqual(hashEls.map(n => n.getAttribute('title')), s.events.map(e => e.hash), 'full hash is available as a tooltip');
  assert.ok(text.includes(s.events[0].hash), 'full hashes are also in the expandable detail');
  assert.ok(!text.includes('did not happen'));
});

test('a beat that did not happen is marked in words, not only colour (301/119)', async () => {
  const {rows, cases} = await forge(301, 119);
  const t = mount({rows, cases}), model = buildTimeMachine(rows, cases);
  assert.equal(model.kind, 'near-miss');
  const beats = beatButtons(t.host);
  model.steps.forEach((s, i) => {
    assert.equal(beats[i].getAttribute('data-reached'), String(s.reached));
    assert.equal(beats[i].textContent.includes('did not happen'), !s.reached, `beat ${i + 1}`);
    assert.equal(beats[i].hasClass('is-missed'), !s.reached);
  });
  assert.deepEqual(model.steps.map((s, i) => (s.reached ? null : i + 1)).filter(Boolean), [4, 5, 6, 7]);
  beats[5].click();
  assert.match(captionText(t.host), /Did not happen/);
  assert.equal(t.cursor, model.steps[5].cursor);
});

test('Next and Previous step through the beats and are disabled at the ends', async () => {
  const {rows, cases} = await forge(299, 120);
  const t = mount({rows, cases}), model = buildTimeMachine(rows, cases);
  const prev = t.host.byId('cr-tm-prev'), next = t.host.byId('cr-tm-next');
  assert.equal(prev.disabled, true);
  next.click();
  assert.equal(t.view.state.index, 0);
  assert.equal(prev.disabled, true);
  for (let i = 1; i < 8; i++) next.click();
  assert.equal(t.view.state.index, 7);
  assert.equal(next.disabled, true);
  assert.equal(t.calls.at(-1), model.steps[7].cursor);
  prev.click();
  assert.equal(t.view.state.index, 6);
});

test('Play advances one beat per interval, stops at the last beat, and can be paused', async () => {
  const {rows, cases} = await forge(299, 120);
  const t = mount({rows, cases}), model = buildTimeMachine(rows, cases);
  const play = t.host.byId('cr-tm-play'), pause = t.host.byId('cr-tm-pause');
  assert.equal(pause.disabled, true);
  play.click();
  assert.equal(t.view.state.index, 0, 'Play starts at the first beat');
  assert.equal(t.view.state.playing, true);
  assert.equal(t.sched.delay, PLAY_INTERVAL_MS);
  assert.ok(PLAY_INTERVAL_MS >= 2000 && PLAY_INTERVAL_MS <= 2400);
  assert.equal(play.disabled, true); assert.equal(pause.disabled, false);
  t.sched.tick(); assert.equal(t.view.state.index, 1);
  t.sched.tick(); assert.equal(t.view.state.index, 2);
  pause.click();
  assert.equal(t.view.state.playing, false);
  assert.equal(t.sched.size, 0, 'pausing cancels the pending timer');
  assert.equal(t.view.state.index, 2);
  play.click();                       // resumes from the current beat
  assert.equal(t.view.state.index, 2);
  while (t.sched.size) t.sched.tick();
  assert.equal(t.view.state.index, 7, 'stops on the last beat');
  assert.equal(t.view.state.playing, false);
  assert.equal(t.calls.at(-1), model.steps[7].cursor);
  assert.equal(play.disabled, false, 'Play is available again');
  assert.throws(() => t.sched.tick(), /no pending timer/);
  play.click();                       // restarts from beat 1
  assert.equal(t.view.state.index, 0);
});

test('choosing a beat by hand stops playback', async () => {
  const {rows, cases} = await forge(299, 120);
  const t = mount({rows, cases});
  t.host.byId('cr-tm-play').click();
  assert.equal(t.sched.size, 1);
  beatButtons(t.host)[4].click();
  assert.equal(t.view.state.playing, false);
  assert.equal(t.sched.size, 0);
  assert.equal(t.view.state.index, 4);
});

test('prefers-reduced-motion: Play never schedules anything; only Next advances', async () => {
  const {rows, cases} = await forge(299, 120);
  const t = mount({rows, cases, reducedMotion: true});
  const play = t.host.byId('cr-tm-play'), pause = t.host.byId('cr-tm-pause');
  assert.equal(play.disabled, true); assert.equal(pause.disabled, true);
  play.click(); t.view.play();
  assert.equal(t.sched.size, 0);
  assert.equal(t.view.state.index, null);
  assert.equal(t.calls.length, 0);
  assert.match(t.host.byId('cr-tm-hint').textContent, /Reduced motion/);
  assert.equal(t.host.byId('cr-tm-hint').hidden, false);
  t.host.byId('cr-tm-next').click();
  assert.equal(t.view.state.index, 0);
  assert.equal(t.sched.size, 0);
  t.host.byId('cr-tm-next').click();
  assert.equal(t.view.state.index, 1);
});

test('when the cursor is moved elsewhere (scrubber, Back to live) the active beat is released', async () => {
  const {rows, cases} = await forge(299, 120);
  const t = mount({rows, cases});
  beatButtons(t.host)[2].click();
  assert.equal(t.view.state.index, 2);
  t.cursor = null; t.view.refresh();          // Back to live
  assert.equal(t.view.state.index, null);
  assert.equal(beatButtons(t.host).filter(b => b.hasAttribute('aria-current')).length, 0);
  t.host.byId('cr-tm-play').click();
  t.cursor = 123; t.view.refresh();           // scrubbed while playing
  assert.equal(t.view.state.playing, false);
  assert.equal(t.sched.size, 0);
});

test('refreshes when the ledger changes: rebuilds, clears the active beat and stops playback', async () => {
  const a = await forge(299, 120), b = await forge(301, 119);
  const t = mount({rows: a.rows, cases: a.cases});
  assert.equal(beatButtons(t.host).filter(x => x.hasClass('is-missed')).length, 0);
  t.host.byId('cr-tm-play').click();
  t.env.rows = b.rows; t.env.cases = b.cases;
  t.view.refresh();
  assert.equal(t.view.state.index, null);
  assert.equal(t.view.state.playing, false);
  assert.equal(t.sched.size, 0);
  assert.equal(beatButtons(t.host).filter(x => x.hasClass('is-missed')).length, 4);
  assert.equal(t.host.byId('cr-tm-note').textContent, buildTimeMachine(b.rows, b.cases).note);
});

test('empty ledger and no denial/door pair show the model note instead of beats', async () => {
  const t = mount({rows: [], cases: []});
  assert.equal(beatButtons(t.host).length, 0);
  assert.equal(t.host.byId('cr-tm-note').textContent, buildTimeMachine([], []).note);
  assert.equal(t.host.byId('cr-tm-beats').hidden, true);
  assert.equal(t.host.byId('cr-tm-controls').hidden, true);
  const rows = await ledger([{id: 'x1', device: 'camera-01', type: 'camera.offline', at: '2026-11-08T22:00:00Z', data: {}}]);
  const n = mount({rows, cases: []});
  assert.equal(beatButtons(n.host).length, 0);
  assert.equal(n.host.byId('cr-tm-note').textContent, buildTimeMachine(rows, []).note);
  assert.equal(n.host.byId('cr-tm-note').getAttribute('data-kind'), 'none');
});

test('the view never mutates the rows or cases it reads', async () => {
  const {rows, cases} = await forge(299, 120);
  const snap = JSON.stringify([rows, cases]);
  const t = mount({rows, cases});
  for (const b of beatButtons(t.host)) b.click();
  t.host.byId('cr-tm-play').click(); while (t.sched.size) t.sched.tick();
  assert.equal(JSON.stringify([rows, cases]), snap);
});

test('source: no innerHTML, no network, no storage, no hardcoded rule numbers or timestamps', () => {
  const src = readFileSync(new URL('../docs/time_machine_view.mjs', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/.test(src));
  assert.ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|WebSocket|https?:\/\//.test(src));
  assert.ok(!/\b(299|300|301|119|120)\b/.test(src), 'rule numbers come from the model');
  assert.ok(!/\b20\d\d-\d\d-\d\d/.test(src), 'no literal timestamps');
});
