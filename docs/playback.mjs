/**
 * GhostBridge reconstruction playback controller — DOM-free state machine.
 *
 * Authored by Kiro (Kiroween 2026, feat/evidence-reconstruction).
 *
 * `cursor` is the number of revealed steps (0..stepCount). Auto-advance is driven by an
 * injectable scheduler so tests are deterministic and no timer outlives destroy().
 * Manual navigation (next/prev/seek/restart) always pauses auto-play.
 */

export const SPEEDS = Object.freeze([0.5, 1, 2, 4]);
export const BASE_DELAY_MS = 1800;

/**
 * @param {object} options
 * @param {number} options.stepCount                     total steps (>= 0)
 * @param {(state:object)=>void} [options.onChange]      called after every state change
 * @param {(fn:Function, ms:number)=>any} [options.schedule]  defaults to setTimeout
 * @param {(handle:any)=>void} [options.cancel]          defaults to clearTimeout
 * @param {number} [options.baseDelayMs]                 delay per step at 1x
 */
export function createPlayback({stepCount, onChange = () => {}, schedule = setTimeout, cancel = clearTimeout, baseDelayMs = BASE_DELAY_MS}) {
  if (!Number.isInteger(stepCount) || stepCount < 0) throw new TypeError('stepCount must be a non-negative integer');
  let cursor = 0, playing = false, speed = 1, handle = null, destroyed = false;

  const snapshot = () => ({cursor, playing, speed, stepCount, atStart: cursor === 0, atEnd: cursor === stepCount});
  const emit = () => { if (!destroyed) onChange(snapshot()); };
  const clearTimer = () => { if (handle !== null) { cancel(handle); handle = null; } };
  const arm = () => {
    clearTimer();
    if (!playing || destroyed) return;
    handle = schedule(tick, baseDelayMs / speed);
  };
  function tick() {
    handle = null;
    if (!playing || destroyed) return;
    if (cursor < stepCount) cursor += 1;
    if (cursor >= stepCount) playing = false;
    emit();
    arm();
  }
  const pauseInternal = () => { playing = false; clearTimer(); };

  return {
    get state() { return snapshot(); },
    play() {
      if (destroyed || stepCount === 0) return;
      if (cursor >= stepCount) cursor = 0; // replay from the beginning
      playing = true;
      emit();
      arm();
    },
    pause() { if (destroyed) return; pauseInternal(); emit(); },
    toggle() { return playing ? this.pause() : this.play(); },
    next() { if (destroyed) return; pauseInternal(); cursor = Math.min(stepCount, cursor + 1); emit(); },
    prev() { if (destroyed) return; pauseInternal(); cursor = Math.max(0, cursor - 1); emit(); },
    restart() { if (destroyed) return; pauseInternal(); cursor = 0; emit(); },
    seek(value) {
      if (destroyed) return;
      const n = Math.trunc(Number(value));
      pauseInternal();
      cursor = Number.isFinite(n) ? Math.max(0, Math.min(stepCount, n)) : cursor;
      emit();
    },
    setSpeed(value) {
      if (destroyed) return;
      const s = Number(value);
      if (!SPEEDS.includes(s)) throw new RangeError(`speed must be one of ${SPEEDS.join(', ')}`);
      speed = s;
      emit();
      arm();
    },
    destroy() { destroyed = true; playing = false; clearTimer(); },
  };
}
