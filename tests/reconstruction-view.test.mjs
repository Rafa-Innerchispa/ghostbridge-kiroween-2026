/**
 * Interactive reconstruction view tests (docs/reconstruction-view.mjs) using a fake DOM.
 *
 * Authored by Kiro (Kiroween 2026, feat/evidence-reconstruction).
 * Run with: node --test tests/reconstruction-view.test.mjs
 *
 * Exercises the real view code: controls, aria state, scene attributes, inspector content,
 * timers, reduced motion, error state and safe text rendering.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {append} from '../docs/engine.mjs';
import {correlate} from '../docs/correlator.mjs';
import {parseRelayCsv, parseAccessWebhook} from '../docs/fixture_replay.mjs';
import {RELAY_NIGHT_CSV, ACCESS_DENIED_JSON} from '../docs/fixtures.js';
import {buildReconstruction, ReconstructionError, ERROR_CODES} from '../docs/reconstruction.mjs';
import {mountReconstruction, mountReconstructionError} from '../docs/reconstruction-view.mjs';
import {FakeDocument, manualScheduler} from './helpers/fake-dom.mjs';

async function ledger(events) {
  const rows = [];
  for (const e of events) await append(rows, e);
  return rows;
}
async function fixtureModel() {
  const rows = await ledger([parseAccessWebhook(ACCESS_DENIED_JSON), ...parseRelayCsv(RELAY_NIGHT_CSV)]);
  const [c] = await correlate(rows);
  return buildReconstruction(rows, c);
}
async function mount(options = {}, model = null) {
  const doc = new FakeDocument(), host = doc.createElement('section'), sched = manualScheduler();
  const state = {closed: 0};
  model ||= await fixtureModel();
  const view = mountReconstruction(host, model, {doc, onClose: () => { state.closed++; }, schedule: sched.schedule, cancel: sched.cancel, ...options});
  const q = {
    svg: host.find(n => n.tagName === 'svg'),
    prev: host.byId('recon-prev'), next: host.byId('recon-next'), play: host.byId('recon-play'), restart: host.byId('recon-restart'),
    speed: host.byId('recon-speed'), slider: host.byId('recon-slider'), status: host.byId('recon-status'),
    close: host.byId('recon-close'), inspector: host.byClass('recon-inspector'),
    chip: host.byClass('recon-case-chip'), clock: host.byClass('recon-clock'), progress: host.byClass('recon-progress'),
    steps: host.allByClass('recon-step'), markers: host.allByClass('recon-marker'),
  };
  return {doc, host, model, sched, view, state, q};
}
const attr = (el, name) => el.getAttribute(name);
const sceneOf = q => ({reader: attr(q.svg, 'data-reader'), door: attr(q.svg, 'data-door'), link: attr(q.svg, 'data-link'), kase: attr(q.svg, 'data-case'), excluded: attr(q.svg, 'data-excluded')});

test('initial render: accessible scene, idle state, controls in their start state', async () => {
  const {q, host, model} = await mount();
  assert.equal(attr(q.svg, 'role'), 'img');
  assert.equal(attr(q.svg, 'aria-labelledby'), 'recon-svg-title recon-svg-desc');
  assert.ok(host.byId('recon-svg-title').textContent.includes('not camera footage'));
  assert.deepEqual(sceneOf(q), {reader: 'idle', door: 'closed', link: 'off', kase: 'off', excluded: '0'});
  assert.match(q.status.textContent, /^Ready\. 4 recorded steps/);
  assert.equal(attr(q.status, 'role'), 'status');
  assert.equal(attr(q.status, 'aria-live'), 'polite');
  assert.equal(q.prev.disabled, true);
  assert.equal(q.restart.disabled, true);
  assert.equal(q.next.disabled, false);
  assert.equal(q.play.textContent, '▶ Play');
  assert.equal(attr(q.play, 'aria-label'), 'Play reconstruction');
  assert.equal(attr(q.slider, 'max'), String(model.steps.length));
  assert.equal(q.slider.value, '0');
  assert.equal(attr(q.slider, 'aria-valuetext'), 'Start, step 0 of 4');
  assert.equal(q.chip.hidden, true);
  assert.equal(q.clock.textContent, '--:--:-- UTC');
  assert.equal(q.steps.length, 4);
  assert.equal(q.speed.value, '1');
  assert.equal(q.speed.children.length, 4);
  assert.equal(attr(host, 'data-reduced-motion'), 'false');
  assert.equal(attr(host.byId('recon-title'), 'tabindex'), '-1');
  assert.match(q.inspector.textContent, /Step through the sequence/);
});

test('every control is a real button / input / select with an accessible name', async () => {
  const {q, host} = await mount();
  for (const b of [q.prev, q.next, q.play, q.restart, q.close]) { assert.equal(b.tagName, 'button'); assert.equal(attr(b, 'type'), 'button'); assert.ok(b.textContent.length > 2); }
  assert.equal(q.slider.tagName, 'input');
  assert.equal(attr(q.slider, 'type'), 'range');
  assert.equal(q.speed.tagName, 'select');
  const labels = host.findAll(n => n.tagName === 'label');
  assert.deepEqual(labels.map(l => attr(l, 'for')).sort(), ['recon-slider', 'recon-speed']);
  assert.equal(attr(host.find(n => attr(n, 'role') === 'group'), 'aria-label'), 'Reconstruction playback controls');
  for (const st of q.steps) assert.equal(st.tagName, 'button');
});

test('stepping with Next reveals the story in order and updates scene, clock and status', async () => {
  const {q, model} = await mount();
  q.next.click();
  assert.deepEqual(sceneOf(q), {reader: 'idle', door: 'closed', link: 'off', kase: 'off', excluded: '1'});
  assert.equal(q.clock.textContent, '22:00:00 UTC');
  assert.match(q.status.textContent, /relay:R001.*not linked/s);
  assert.equal(q.prev.disabled, false);

  q.next.click();
  assert.equal(sceneOf(q).reader, 'denied');
  assert.equal(q.clock.textContent, '22:00:30 UTC');
  assert.match(q.status.textContent, /access:A001/);

  q.next.click();
  assert.deepEqual(sceneOf(q), {reader: 'denied', door: 'held-open', link: 'on', kase: 'off', excluded: '1'});
  assert.equal(q.chip.hidden, true);

  q.next.click();
  assert.equal(sceneOf(q).kase, 'on');
  assert.equal(q.chip.hidden, false);
  assert.ok(q.chip.textContent.includes(model.caseId));
  assert.equal(q.next.disabled, true);
  assert.equal(q.play.textContent, '↻ Replay');
  assert.match(attr(q.slider, 'aria-valuetext'), /Step 4 of 4/);
});

test('Previous and Restart move back through the story', async () => {
  const {q} = await mount();
  for (let i = 0; i < 4; i++) q.next.click();
  q.prev.click();
  assert.equal(sceneOf(q).kase, 'off');
  assert.equal(sceneOf(q).link, 'on');
  q.restart.click();
  assert.deepEqual(sceneOf(q), {reader: 'idle', door: 'closed', link: 'off', kase: 'off', excluded: '0'});
  assert.equal(q.slider.value, '0');
  assert.equal(q.restart.disabled, true);
});

test('inspector shows exact id, UTC time, source, row, rule and full SHA-256 hashes from the model', async () => {
  const {q, model} = await mount();
  q.next.click(); q.next.click();
  const t = q.inspector.textContent, step = model.steps[1];
  for (const expected of [step.eventId, step.at, step.deviceName, step.deviceId, step.eventType, `#${step.rowSeq}`, 'access-denied', step.hash, step.previous]) {
    assert.ok(t.includes(expected), `inspector must show ${expected}`);
  }
  assert.equal(step.hash.length, 64);
});

test('inspector explains why an excluded event is not linked', async () => {
  const {q, model} = await mount();
  q.next.click();
  assert.match(q.inspector.textContent, /Why not linked/);
  assert.ok(q.inspector.textContent.includes(model.steps[0].reason));
  assert.ok(q.inspector.textContent.includes('Considered · not linked'));
});

test('inspector on the case step shows the case id, rule, both event ids and both hashes', async () => {
  const {q, model} = await mount();
  for (let i = 0; i < 4; i++) q.next.click();
  const t = q.inspector.textContent, c = model.steps[3];
  for (const expected of [c.caseId, c.rule, c.eventIds.join(' + '), c.hashes[0], c.hashes[1], c.explanation]) assert.ok(t.includes(expected), `case inspector must show ${expected}`);
});

test('timeline slider seeks, and invalid input is ignored safely', async () => {
  const {q} = await mount();
  q.slider.value = '3'; q.slider.dispatch('input');
  assert.equal(sceneOf(q).link, 'on');
  assert.equal(attr(q.slider, 'aria-valuetext').startsWith('Step 3 of 4'), true);
  q.slider.value = '999'; q.slider.dispatch('input');
  assert.equal(q.slider.value, '4');
  q.slider.value = '-4'; q.slider.dispatch('input');
  assert.equal(q.slider.value, '0');
});

test('evidence sequence buttons seek and mark the current step with aria-current', async () => {
  const {q} = await mount();
  q.steps[2].click();
  assert.equal(q.slider.value, '3');
  assert.equal(attr(q.steps[2], 'aria-current'), 'step');
  assert.equal(q.steps.filter(b => b.hasAttribute('aria-current')).length, 1);
  assert.ok(q.steps[2].hasClass('is-current'));
  assert.ok(q.steps[0].hasClass('is-seen') && q.steps[1].hasClass('is-seen'));
  assert.ok(!q.steps[3].hasClass('is-seen'));
});

test('ruler is to scale and decorative; markers seek on click', async () => {
  const {q, host} = await mount();
  assert.equal(q.markers.length, 3);
  assert.deepEqual(q.markers.map(m => m.style.props['--at']), ['0.00%', '10.00%', '100.00%']);
  assert.equal(attr(host.byClass('recon-ruler'), 'aria-hidden'), 'true');
  q.markers[2].click();
  assert.equal(q.slider.value, '3');
  assert.ok(q.markers.every(m => m.hasClass('is-on')));
});

test('progress bar tracks elapsed ledger time', async () => {
  const {q} = await mount();
  const at = i => { q.slider.value = String(i); q.slider.dispatch('input'); return q.progress.style.props['--progress']; };
  assert.equal(at(0), '0%');
  assert.equal(at(1), '0%');
  assert.equal(at(2), '10%');
  assert.equal(at(3), '100%');
});

test('Play advances on the scheduler, labels toggle, and playback ends cleanly', async () => {
  const {q, sched} = await mount();
  q.play.click();
  assert.equal(q.play.textContent, '⏸ Pause');
  assert.equal(attr(q.play, 'aria-label'), 'Pause reconstruction');
  assert.equal(sched.size, 1);
  sched.tick();
  assert.equal(q.slider.value, '1');
  sched.tick(); sched.tick(); sched.tick();
  assert.equal(q.slider.value, '4');
  assert.equal(q.play.textContent, '↻ Replay');
  assert.match(attr(q.play, 'aria-label'), /Replay/);
  assert.equal(sched.size, 0);
  q.play.click();
  assert.equal(q.slider.value, '0', 'Replay starts again from the beginning');
  assert.equal(q.play.textContent, '⏸ Pause');
});

test('Pause stops auto-advance; manual stepping while playing pauses it', async () => {
  const {q, sched} = await mount();
  q.play.click(); sched.tick();
  q.play.click();
  assert.equal(sched.size, 0);
  assert.equal(q.play.textContent, '▶ Play');
  q.play.click(); q.next.click();
  assert.equal(sched.size, 0);
  assert.equal(q.play.hasClass('is-playing'), false);
});

test('speed selector changes the playback delay', async () => {
  const {q, sched} = await mount();
  q.play.click();
  assert.equal(sched.delay, 1800);
  q.speed.value = '2'; q.speed.dispatch('change');
  assert.equal(sched.delay, 900);
  q.speed.value = '0.5'; q.speed.dispatch('change');
  assert.equal(sched.delay, 3600);
  assert.equal(sched.size, 1);
});

test('Close calls onClose; destroy clears the host and any pending timer', async () => {
  const {q, host, sched, view, state} = await mount();
  q.close.click();
  assert.equal(state.closed, 1);
  q.play.click();
  assert.equal(sched.size, 1);
  view.destroy();
  assert.equal(sched.size, 0, 'no timer survives destroy');
  assert.equal(host.children.length, 0);
  assert.equal(host.hasAttribute('data-reduced-motion'), false);
});

test('view.focus moves focus to the reconstruction heading', async () => {
  const {doc, host, view} = await mount();
  view.focus();
  assert.equal(doc.activeElement, host.byId('recon-title'));
});

test('reducedMotion option is reflected on the host for CSS', async () => {
  const {host} = await mount({reducedMotion: true});
  assert.equal(attr(host, 'data-reduced-motion'), 'true');
});

test('why panel lists every check and the exclusion reason, with non-visual pass/fail text', async () => {
  const {host, model} = await mount();
  const checks = host.allByClass('recon-check');
  assert.equal(checks.length, model.why.checks.length);
  assert.ok(checks.every(c => c.hasClass('is-pass')));
  assert.ok(checks.every(c => /^Passed: /.test(c.byClass('recon-sr').textContent)));
  const text = host.textContent;
  assert.ok(text.includes('Why this matches'));
  assert.ok(text.includes(model.why.exclusions[0].reason));
  assert.ok(text.includes(`${model.why.gapSeconds} s`) && text.includes(`${model.why.holdSeconds} s`));
});

test('copy never claims camera imagery, surveillance, recognition or hardware control', async () => {
  const {host} = await mount();
  const text = host.textContent;
  assert.match(text, /not camera footage/);
  assert.match(text, /not a live connection/);
  assert.ok(!/facial|recogni|live camera|live feed|unlock|actuat/i.test(text));
});

test('markup safety: hostile ids are shown as text and never create elements', async () => {
  const hostile = '<img src=x onerror=alert(1)>';
  const rows = await ledger([
    {id: hostile, device: 'reader-01', type: 'access.denied', at: '2026-11-08T10:00:00Z', data: {}},
    {id: '<b>door</b>', device: 'door-01', type: 'door.open', at: '2026-11-08T10:01:00Z', data: {duration_seconds: 130}},
  ]);
  const [c] = await correlate(rows);
  const model = await buildReconstruction(rows, c);
  const {host, q} = await mount({}, model);
  for (let i = 0; i < 4; i++) q.next.click();
  assert.ok(host.textContent.includes(hostile));
  assert.ok(host.textContent.includes('<b>door</b>'));
  assert.equal(host.find(n => ['img', 'b', 'script'].includes(n.tagName)), null);
});

test('remounting after destroy leaves no leaked timers', async () => {
  const sched = manualScheduler(), doc = new FakeDocument(), host = doc.createElement('section'), model = await fixtureModel();
  for (let i = 0; i < 3; i++) {
    const v = mountReconstruction(host, model, {doc, schedule: sched.schedule, cancel: sched.cancel});
    host.byId('recon-play').click();
    v.destroy();
  }
  assert.equal(sched.size, 0);
});

test('error state: explicit message, alert role, no scene and no playback controls', async () => {
  const doc = new FakeDocument(), host = doc.createElement('section');
  let closed = 0;
  const err = new ReconstructionError(ERROR_CODES.INTEGRITY, 'Ledger integrity verification failed, so no reconstruction is shown.');
  const view = mountReconstructionError(host, err, {doc, onClose: () => { closed++; }});
  assert.ok(host.textContent.includes('Reconstruction unavailable'));
  assert.ok(host.textContent.includes(err.message));
  assert.equal(attr(host.find(n => attr(n, 'role') === 'alert'), 'role'), 'alert');
  assert.equal(host.find(n => n.tagName === 'svg'), null);
  assert.equal(host.byId('recon-play'), null);
  host.byId('recon-close').click();
  assert.equal(closed, 1);
  view.focus();
  assert.equal(doc.activeElement, host.byId('recon-title'));
  view.destroy();
  assert.equal(host.children.length, 0);
});

test('error state falls back to a generic message for unknown errors', async () => {
  const doc = new FakeDocument(), host = doc.createElement('section');
  mountReconstructionError(host, null, {doc});
  assert.match(host.textContent, /could not be built from the current evidence/);
});
