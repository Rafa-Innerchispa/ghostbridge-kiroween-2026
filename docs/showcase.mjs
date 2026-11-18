/**
 * GhostBridge Showcase Mode: beat table and a pausable timer. No DOM.
 *
 * Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).
 *
 * The timer only sequences beats. What each beat DOES is the `run(beat, index, isStale)` callback,
 * which the UI wires to the real ledger (reset, append, verify, correlate, reconstruct). Nothing
 * here knows or fakes an outcome. Captions use {tokens} that the UI fills from the live ledger.
 */

export const BEATS = Object.freeze([
  {id: 'building', ms: 6000, action: 'building',
    title: 'When buildings start talking.',
    subtitle: 'A residential tower at night. Four older systems, each speaking its own language.'},
  {id: 'denied', ms: 8000, action: 'denied',
    title: 'A badge is rejected.',
    subtitle: 'The access reader records a denial at {deniedTime} UTC. On its own, a medium finding.'},
  {id: 'door', ms: 9000, action: 'door',
    title: 'Then the door stays open.',
    subtitle: 'A legacy relay reports the entrance open {gap} later, held {hold}. A second system, a second story.'},
  {id: 'correlate', ms: 9000, action: 'correlate',
    title: 'GhostBridge connects the dots.',
    subtitle: 'Two sources, one rule: a denial, then a held-open door inside five minutes. One linked case, {caseId}.'},
  {id: 'reconstruct', ms: 10000, action: 'reconstruct',
    title: 'Replay the evidence.',
    subtitle: 'Every step is rebuilt from the verified ledger, including the earlier door event that was correctly left out.'},
  {id: 'evidence', ms: 6000, action: 'evidence',
    title: 'Original records, one click away.',
    subtitle: 'Each source event keeps its own SHA-256 hash, chained to the one before it. The chain verifies.'},
  {id: 'response', ms: 5000, action: 'response',
    title: 'The operator sees the answer.',
    subtitle: 'What happened, where, why it was linked, what was excluded, and what to review next.'},
  {id: 'vision', ms: 5000, action: 'vision',
    title: 'Now imagine every property.',
    subtitle: 'Product vision: one operational language across every building you manage.'},
]);

export const totalMs = (beats = BEATS) => beats.reduce((a, b) => a + b.ms, 0);

/** Replace {token} with vars[token]; unknown tokens become an ellipsis so a caption never shows raw braces. */
export function fillTemplate(text, vars = {}) {
  return String(text).replace(/\{([a-zA-Z]+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null || vars[k] === '' ? '…' : String(vars[k])));
}

/**
 * @param {object} o
 * @param {ReadonlyArray<object>} [o.beats]
 * @param {(beat:object, index:number, isStale:()=>boolean)=>Promise<void>|void} [o.run]
 * @param {(state:object)=>void} [o.onChange]
 * @param {Function} [o.schedule] @param {Function} [o.cancel] @param {()=>number} [o.now]
 */
export function createShowcase({beats = BEATS, run = () => {}, onChange = () => {}, schedule = setTimeout, cancel = clearTimeout, now = () => Date.now()} = {}) {
  let status = 'idle', index = -1, remaining = 0, startedAt = 0, handle = null, runId = 0, error = null, destroyed = false;
  const total = totalMs(beats);

  const remainingNow = () => (status === 'playing' ? Math.max(0, remaining - (now() - startedAt)) : remaining);
  const elapsed = () => {
    if (index < 0) return 0;
    const before = beats.slice(0, index).reduce((a, b) => a + b.ms, 0);
    return status === 'done' ? total : before + (beats[index].ms - remainingNow());
  };
  const snapshot = () => ({status, index, beat: index >= 0 ? beats[index] : null, count: beats.length, remainingMs: remainingNow(), totalMs: total, elapsedMs: elapsed(), error});
  const emit = () => { if (!destroyed) onChange(snapshot()); };
  const clearTimer = () => { if (handle !== null) { cancel(handle); handle = null; } };
  const arm = ms => { clearTimer(); handle = schedule(tick, ms); };

  function tick() {
    handle = null;
    if (status !== 'playing' || destroyed) return;
    if (index + 1 < beats.length) startBeat(index + 1);
    else { status = 'done'; remaining = 0; emit(); }
  }

  function startBeat(i) {
    index = i; status = 'playing'; remaining = beats[i].ms; startedAt = now();
    const id = runId;
    Promise.resolve().then(() => run(beats[i], i, () => id !== runId || destroyed)).catch(e => {
      if (id === runId && !destroyed) { error = String(e && e.message || e); emit(); }
    });
    arm(remaining);
    emit();
  }

  return {
    get state() { return snapshot(); },
    play() {
      if (destroyed || status === 'playing') return;
      if (status === 'paused') { status = 'playing'; startedAt = now(); arm(remaining); emit(); return; }
      error = null; startBeat(0);
    },
    pause() {
      if (destroyed || status !== 'playing') return;
      remaining = remainingNow(); clearTimer(); status = 'paused'; emit();
    },
    toggle() { return status === 'playing' ? this.pause() : this.play(); },
    restart() { if (destroyed) return; runId++; clearTimer(); error = null; startBeat(0); },
    exit() { if (destroyed) return; runId++; clearTimer(); status = 'idle'; index = -1; remaining = 0; error = null; emit(); },
    destroy() { destroyed = true; runId++; clearTimer(); status = 'idle'; },
  };
}
