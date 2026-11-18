/**
 * GhostBridge Showcase Mode: overlay and real-ledger actions.
 *
 * Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).
 *
 * Each beat calls the same bridge the manual UI uses: reset, append real Signal Forge events one at a
 * time, verify, correlate, reconstruct. The scene reacts because the ledger changed, not because a
 * script says so. Captions are filled from the live ledger via {tokens}.
 */
import {BEATS, createShowcase, fillTemplate, totalMs} from './showcase.mjs';
import {makeForgeEvents, FORGE_DEFAULTS} from './signal_forge.mjs';
import {explainPair, validCases, clockOf, span, toSeconds, DOOR_HELD_THRESHOLD} from './control_room.mjs';

const mmss = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function mountShowcase({doc = document, bridge, cr, reducedMotion = false}) {
  const $ = id => doc.getElementById(id);
  const root = $('showcase');
  if (!root) return null;
  const events = Object.fromEntries(makeForgeEvents(FORGE_DEFAULTS).map(e => [e.id, e]));
  const seg = BEATS.map(() => { const i = doc.createElement('i'); return i; });
  $('sc-progress').replaceChildren(...seg);

  const vars = () => {
    const rows = bridge.getRows(), p = explainPair(rows), cases = validCases(rows, bridge.getCases());
    return {
      deniedTime: p.denied ? clockOf(p.denied.at) : '', gap: p.door ? span(p.gap) : '', hold: p.door ? span(p.hold) : '',
      caseId: cases[0]?.id ?? '',
    };
  };

  const secOf = id => { const r = bridge.getRows().find(x => x.payload.event.id === id); return r ? toSeconds(r.payload.event.at) : null; };
  let reconBeat = false;
  const actions = {
    async building(stale) {
      await bridge.resetLab(); if (stale()) return;
      cr.setMode('building'); cr.select(null); cr.setCursor(null); cr.setJoined(false);
      cr.focusStage();
    },
    async denied(stale) { await bridge.ingest([events['forge:denied']]); if (stale()) return; cr.setMode('building'); },
    // The door beat shows the door just opening: the hold threshold has not been reached yet, so there is no case.
    async door(stale) {
      await bridge.ingest([events['forge:later-door']]); if (stale()) return;
      cr.setCursor(secOf('forge:later-door'));
    },
    // The correlation beat lets recorded time run until the threshold: the door turns amber and the link is drawn.
    async correlate(stale) {
      const t = secOf('forge:later-door');
      if (t !== null) {
        const steps = reducedMotion ? 1 : 14;
        for (let i = 1; i <= steps; i++) {
          await sleep(reducedMotion ? 0 : 3600 / steps); if (stale()) return;
          cr.setCursor(Math.round(t + DOOR_HELD_THRESHOLD * i / steps));
        }
      }
      await bridge.waitForCase(4000); if (stale()) return;
      cr.setCursor(null); cr.refresh();
    },
    async reconstruct(stale) {
      await bridge.ingest([events['forge:earlier-door']]); if (stale()) return;
      const c = await bridge.waitForCase(4000); if (stale() || !c) return;
      reconBeat = true;
      await bridge.openReconstruction(c, null); if (stale()) return;
      await sleep(600); if (stale()) return;
      const pb = bridge.reconPlayback(); if (pb) pb.play();
    },
    async evidence(stale) {
      reconBeat = false; bridge.closeReconstruction(false);
      cr.setMode('evidence'); cr.focusStage();
      const r = await bridge.verify(); if (stale()) return;
      const note = $('cr-ev-note'); if (note) note.textContent = r.valid ? `Chain verified: ${r.checked} ledger records from the genesis hash. Head ${r.head.slice(0, 16)}\u2026` : 'Chain verification FAILED.';
    },
    async response(stale) { cr.setMode('response'); await sleep(900); if (stale()) return; cr.setJoined(true); },
    async vision(stale) { const v = $('vision'); if (v) v.scrollIntoView({block: 'start', behavior: reducedMotion ? 'auto' : 'smooth'}); },
  };

  function paint(s) {
    const active = s.status !== 'idle';
    root.hidden = !active && root.getAttribute('data-armed') !== 'true';
    root.setAttribute('data-status', s.status);
    doc.body.setAttribute('data-showcase', active ? 'on' : 'off');
    const v = vars();
    const beat = s.beat;
    $('sc-kicker').textContent = beat ? `SHOWCASE \u00b7 ${s.index + 1} / ${s.count}` : 'SHOWCASE MODE \u00b7 ABOUT ONE MINUTE';
    $('sc-title').textContent = beat ? fillTemplate(beat.title, v) : 'Watch the building speak.';
    $('sc-sub').textContent = beat ? fillTemplate(beat.subtitle, v) : 'A guided run on the real ledger: a rejected badge, a door held open, one linked case, then the evidence. Press Play.';
    seg.forEach((el, i) => { el.className = s.status === 'done' || i < s.index ? 'is-done' : i === s.index ? 'is-now' : ''; });
    $('sc-play').textContent = s.status === 'playing' ? '\u23f8 Pause' : s.status === 'paused' ? '\u25b6 Resume' : s.status === 'done' ? '\u25b6 Play again' : '\u25b6 Play';
    $('sc-play').setAttribute('aria-label', s.status === 'playing' ? 'Pause showcase' : s.status === 'paused' ? 'Resume showcase' : 'Play showcase');
    $('sc-time').textContent = `${mmss(s.elapsedMs)} / ${mmss(s.totalMs)}`;
    $('sc-restart').disabled = s.status === 'idle';
    $('sc-err').textContent = s.error ? `Step problem: ${s.error}` : '';
    const pb = bridge.reconPlayback && bridge.reconPlayback();
    if (pb && reconBeat) { if (s.status === 'paused') pb.pause(); }
    syncTicker(s.status);
  }

  const sc = createShowcase({
    run: async (beat, i, stale) => { await actions[beat.action](stale); if (!stale()) paint(sc.state); },
    onChange: s => { paint(s); },
  });

  // The state machine only emits on beat changes, so a light visual ticker keeps the clock and the beat's
  // progress bar moving while (and only while) the show is playing.
  let ticker = null;
  function tickClock() {
    const s = sc.state;
    $('sc-time').textContent = `${mmss(s.elapsedMs)} / ${mmss(s.totalMs)}`;
    const cur = seg[s.index];
    if (cur && s.beat) cur.style.setProperty('--p', `${Math.min(100, Math.max(0, (1 - s.remainingMs / s.beat.ms) * 100)).toFixed(1)}%`);
  }
  function syncTicker(status) {
    if (status === 'playing' && !ticker) ticker = setInterval(tickClock, 250);
    else if (status !== 'playing' && ticker) { clearInterval(ticker); ticker = null; }
    if (status !== 'idle') tickClock();
  }

  $('sc-play').addEventListener('click', () => {
    const was = sc.state.status;
    sc.toggle();
    if (was === 'paused' && reconBeat) { const pb = bridge.reconPlayback(); if (pb) pb.play(); }
  });
  $('sc-restart').addEventListener('click', () => { reconBeat = false; bridge.closeReconstruction(false); sc.restart(); });
  $('sc-exit').addEventListener('click', () => { reconBeat = false; sc.exit(); root.setAttribute('data-armed', 'false'); root.hidden = true; doc.body.setAttribute('data-showcase', 'off'); });
  doc.addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden && root.getAttribute('data-status') !== 'idle') $('sc-exit').click(); });

  function open({autoplay = false} = {}) {
    root.setAttribute('data-armed', 'true'); root.hidden = false; paint(sc.state);
    if (autoplay) sc.play(); else $('sc-play').focus();
  }
  $('cr-showcase').addEventListener('click', () => open());
  paint(sc.state); root.hidden = true;
  return {open, sc, BEATS, totalMs: totalMs()};
}
