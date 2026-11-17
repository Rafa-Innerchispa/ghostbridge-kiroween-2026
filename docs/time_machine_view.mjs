/**
 * Incident Time Machine view: eight keyboard-operable beats that move the Control Room's existing time cursor.
 * Authored by the ui-director custom Kiro agent (Phase 6 run B); derived-time labelling added by Kiro's main session after qa-auditor finding M1.
 *
 * The model (time_machine.mjs) supplies every label, time, id, hash and caption. This view only lays them out, and it never
 * draws a second scene: choosing a beat calls `setCursor(step.cursor)`, so the one building in the Control Room shows that moment.
 * No innerHTML; all text is set with textContent. Playback timers are injectable so tests can drive them without waiting.
 */
import {buildTimeMachine} from './time_machine.mjs';
import {clockOf} from './control_room.mjs';

export const PLAY_INTERVAL_MS = 2200;

function h(doc, tag, attrs = {}, ...kids) {
  const n = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c) n.append(c);
  return n;
}

/**
 * @param {object} o
 * @param {Document} o.doc
 * @param {HTMLElement} o.host              empty section that receives the view
 * @param {() => object[]} o.getRows        live ledger rows (read only)
 * @param {() => object[]} o.getCases       correlator cases
 * @param {() => (number|null)} o.getCursor current Control Room cursor (null = live)
 * @param {(sec: number) => void} o.setCursor the Control Room's existing cursor setter
 */
export function mountTimeMachine({doc, host, getRows, getCases, getCursor, setCursor, reducedMotion = false, schedule = (fn, ms) => setTimeout(fn, ms), cancel = handle => clearTimeout(handle), intervalMs = PLAY_INTERVAL_MS}) {
  let tm = {empty: true, kind: 'empty', steps: [], note: ''};
  let idx = null, playing = false, timer = null, sig = null;

  const title = h(doc, 'h3', {id: 'cr-tm-title', text: 'Incident Time Machine'});
  const intro = h(doc, 'p', {class: 'fine', id: 'cr-tm-intro', text: 'Step through one incident beat by beat. Each beat moves the building above to that moment, using only what the ledger recorded.'});
  const note = h(doc, 'p', {class: 'cr-tm-note', id: 'cr-tm-note', role: 'status'});
  const bPrev = h(doc, 'button', {type: 'button', id: 'cr-tm-prev', text: 'Previous'});
  const bNext = h(doc, 'button', {type: 'button', id: 'cr-tm-next', text: 'Next'});
  const bPlay = h(doc, 'button', {type: 'button', id: 'cr-tm-play', text: 'Play'});
  const bPause = h(doc, 'button', {type: 'button', id: 'cr-tm-pause', text: 'Pause'});
  const hint = h(doc, 'p', {class: 'cr-tm-hint', id: 'cr-tm-hint', text: ''});
  const controls = h(doc, 'div', {class: 'cr-tm-controls', id: 'cr-tm-controls', role: 'group', 'aria-label': 'Time machine playback'}, bPrev, bNext, bPlay, bPause);
  const list = h(doc, 'ol', {class: 'cr-tm-beats', id: 'cr-tm-beats', 'aria-label': 'Incident beats'});
  const caption = h(doc, 'div', {class: 'cr-tm-caption', id: 'cr-tm-caption', 'aria-live': 'polite', 'aria-atomic': 'true'});
  host.replaceChildren(title, intro, note, controls, hint, list, caption);

  const beatBtns = [];

  function setDisabled(btn, on, fallback) {
    if (on && doc.activeElement === btn && fallback) fallback.focus();
    btn.disabled = on;
    if (on) btn.setAttribute('disabled', ''); else btn.removeAttribute('disabled');
  }

  function stop() { playing = false; if (timer !== null) { cancel(timer); timer = null; } }

  function paintCaption() {
    if (idx === null) {
      caption.replaceChildren(h(doc, 'p', {class: 'cr-tm-placeholder', text: 'Choose a beat to see the building at that moment. The caption here explains it.'}));
      return;
    }
    const s = tm.steps[idx];
    const head = h(doc, 'h4', {class: 'cr-tm-cap-title'}, h(doc, 'span', {class: 'cr-tm-cap-n', text: `Beat ${idx + 1} of ${tm.steps.length}`}), h(doc, 'span', {class: 'cr-tm-cap-label', text: s.label}),
      s.reached ? null : h(doc, 'span', {class: 'cr-tm-badge', text: 'Did not happen'}));
    const kids = [head];
    if (s.at !== null) {
      // Recorded times are a ledger event's own timestamp; derived times are computed from the rule and are labelled as such.
      const derived = s.atKind === 'derived';
      kids.push(h(doc, 'p', {class: `cr-tm-time${derived ? ' is-derived' : ''}`, 'data-at-kind': s.atKind || 'recorded'},
        h(doc, 'span', {text: derived ? 'Derived UTC time ' : 'Recorded UTC time '}), h(doc, 'time', {datetime: s.at, title: s.at, text: `${clockOf(s.at)} UTC`}),
        derived ? h(doc, 'span', {class: 'cr-tm-derived-note', text: ` (${s.atNote})`}) : null));
    }
    kids.push(h(doc, 'p', {class: 'cr-tm-text', text: s.caption}));
    if (s.caseId) kids.push(h(doc, 'p', {class: 'cr-tm-case'}, h(doc, 'span', {text: 'Case id '}), h(doc, 'code', {text: s.caseId})));
    if (s.events.length) {
      kids.push(h(doc, 'ul', {class: 'cr-tm-events', 'aria-label': 'Ledger events behind this beat'}, ...s.events.map(e => h(doc, 'li', {},
        h(doc, 'code', {class: 'cr-tm-id', text: e.id}), h(doc, 'span', {class: 'cr-tm-row', text: ` ledger row #${e.seq} `}),
        h(doc, 'code', {class: 'cr-tm-hash', title: e.hash, text: e.hashShort})))));
      kids.push(h(doc, 'details', {class: 'cr-tm-full'}, h(doc, 'summary', {text: 'Full hashes'}),
        ...s.events.map(e => h(doc, 'p', {}, h(doc, 'span', {text: `${e.id} `}), h(doc, 'code', {text: e.hash})))));
    }
    caption.replaceChildren(...kids);
  }

  function paintBeats() {
    const last = tm.steps.length - 1;
    beatBtns.forEach((b, i) => {
      const on = i === idx;
      if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.classList.toggle('is-active', on);
    });
    const none = !tm.steps.length;
    // Enable first, then disable, so the fallback that receives focus is never itself still disabled.
    const states = [
      [bPrev, none || idx === null || idx === 0, idx === null ? null : beatBtns[idx]],
      [bNext, none || idx === last, idx === null ? null : beatBtns[idx]],
      [bPlay, none || reducedMotion || playing, bPause],
      [bPause, none || reducedMotion || !playing, bPlay],
    ];
    for (const [btn, off, fb] of states) if (!off) setDisabled(btn, false, fb);
    for (const [btn, off, fb] of states) if (off) setDisabled(btn, true, fb);
    bPlay.setAttribute('aria-pressed', String(playing));
    hint.textContent = reducedMotion ? 'Reduced motion is on, so Play is off. Use Next to advance one beat at a time.' : '';
    if (reducedMotion && !none) hint.removeAttribute('hidden'); else hint.setAttribute('hidden', '');
  }

  function build() {
    beatBtns.length = 0;
    const rows = getRows();
    tm = buildTimeMachine(rows, getCases());
    const has = tm.steps.length > 0;
    note.textContent = tm.note;
    note.setAttribute('data-kind', tm.kind);
    for (const el of [controls, list, caption]) { if (has) el.removeAttribute('hidden'); else el.setAttribute('hidden', ''); }
    if (!has) { list.replaceChildren(); caption.replaceChildren(); hint.setAttribute('hidden', ''); return; }
    list.replaceChildren(...tm.steps.map((s, i) => {
      const b = h(doc, 'button', {type: 'button', class: `cr-tm-beat${s.reached ? '' : ' is-missed'}`, 'data-step': s.id, 'data-reached': String(s.reached)},
        h(doc, 'span', {class: 'cr-tm-mark', 'aria-hidden': 'true'}),
        h(doc, 'span', {class: 'cr-tm-n', text: String(i + 1)}),
        h(doc, 'span', {class: 'cr-tm-label', text: s.label}),
        s.at !== null ? h(doc, 'small', {class: `cr-tm-at${s.atKind === 'derived' ? ' is-derived' : ''}`, 'data-at-kind': s.atKind || 'recorded', text: s.atKind === 'derived' ? `≈ ${clockOf(s.at)} UTC · derived` : `${clockOf(s.at)} UTC`}) : null,
        s.reached ? null : h(doc, 'small', {class: 'cr-tm-no', text: 'did not happen'}));
      b.addEventListener('click', () => { stop(); goto(i); });
      beatBtns.push(b);
      return h(doc, 'li', {class: 'cr-tm-item'}, b);
    }));
  }

  function goto(i) {
    if (!tm.steps.length) return;
    idx = Math.max(0, Math.min(tm.steps.length - 1, i));
    setCursor(tm.steps[idx].cursor);   // the Control Room re-renders the one scene and calls refresh() below
    paintBeats(); paintCaption();
  }

  function tick() {
    timer = null;
    if (!playing) return;
    if (idx === null || idx >= tm.steps.length - 1) { stop(); paintBeats(); return; }
    goto(idx + 1);
    if (idx >= tm.steps.length - 1) { stop(); paintBeats(); } else timer = schedule(tick, intervalMs);
  }

  bNext.addEventListener('click', () => { stop(); goto(idx === null ? 0 : idx + 1); });
  bPrev.addEventListener('click', () => { stop(); goto(idx === null ? 0 : idx - 1); });
  bPause.addEventListener('click', () => { stop(); paintBeats(); });
  bPlay.addEventListener('click', () => {
    if (reducedMotion || !tm.steps.length || playing) return;
    stop();
    playing = true;
    if (idx === null || idx >= tm.steps.length - 1) goto(0);   // start (or restart) from the first beat
    timer = schedule(tick, intervalMs);
    paintBeats();
  });

  /** Called by the Control Room on every refresh: rebuild when the ledger changed; drop the active beat when the cursor moved elsewhere. */
  function refresh() {
    const rows = getRows(), cases = getCases();
    const next = `${rows.length}:${rows.map(r => r.hash).join(',')}|${cases.map(c => c.id).join(',')}`;
    if (next !== sig) { sig = next; stop(); idx = null; build(); paintBeats(); paintCaption(); return; }
    if (idx !== null && getCursor() !== tm.steps[idx].cursor) { idx = null; stop(); paintBeats(); paintCaption(); return; }
    // app.js re-enables every button on the page after a run; re-assert Previous/Next/Play/Pause states (qa-auditor AU2.-1, same cause).
    paintBeats();
  }

  refresh();
  return {
    refresh, next: () => bNext.click(), prev: () => bPrev.click(), play: () => bPlay.click(), pause: () => bPause.click(),
    select: i => { stop(); goto(i); },
    get state() { return {index: idx, playing, steps: tm.steps.length, kind: tm.kind}; },
    get model() { return tm; },
    elements: {prev: bPrev, next: bNext, play: bPlay, pause: bPause, list, caption, note, hint, beats: beatBtns},
  };
}
