/**
 * GhostBridge Control Room: view and controller.
 *
 * Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).
 *
 * Paints the model from control_room.mjs into the static scaffold in index.html. All text is set with
 * textContent; no innerHTML. The ledger is read through `bridge` (supplied by app.js) and never written
 * here except through the same bridge calls the rest of the app uses.
 */
import {
  deriveScene, explainPair, validCases, buildTimeline, beforeAfter, buildBoard, nodeInfo, SOURCE_NODES, stateLabel, nodeName,
  span, clockOf, WINDOW_SECONDS, DOOR_HELD_THRESHOLD,
} from './control_room.mjs';
import {buildScene, applyScene, sceneSummary} from './control_room_scene.mjs';
import {evaluateForge, FORGE_BOUNDS} from './signal_forge.mjs';

export const MODES = Object.freeze(['building', 'timeline', 'evidence', 'response']);
const KIND_WORD = {anchor: 'Anchor: access denied', match: 'Matched: door held open', near: 'Near miss: rule not met', excluded: 'Not linked', event: 'Recorded event'};
const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

function h(doc, tag, attrs = {}, ...kids) {
  const n = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c) n.append(c);
  return n;
}

/** Mount the Control Room. Returns the controller, or null when the scaffold is absent. */
export function mountControlRoom({doc = document, bridge, reducedMotion = false}) {
  const $ = id => doc.getElementById(id);
  const root = $('control-room');
  if (!root) return null;

  const state = {mode: 'building', selected: null, cursor: null, joined: false};
  const sig = {rows: null, caption: ''};
  let sweepToken = 0;

  // ---------- scene ----------
  const refs = buildScene(doc);
  $('cr-scene').replaceChildren(refs.svg);
  for (const m of refs.markers) m.addEventListener('click', () => select(m.getAttribute('data-node')));
  if (!reducedMotion) {
    const stage = $('cr-stage');
    let raf = 0, nx = 0, ny = 0;
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      nx = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1); ny = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; refs.svg.style.setProperty('--px', nx.toFixed(3)); refs.svg.style.setProperty('--py', ny.toFixed(3)); });
    });
    stage.addEventListener('pointerleave', () => { refs.svg.style.setProperty('--px', '0'); refs.svg.style.setProperty('--py', '0'); });
  }

  // ---------- source strip (the real, keyboard-operable node controls) ----------
  const strip = $('cr-strip'), nodeBtns = {};
  for (const n of SOURCE_NODES) {
    const b = h(doc, 'button', {type: 'button', class: 'cr-node', 'data-node': n.id, 'aria-pressed': 'false'},
      h(doc, 'span', {class: 'cr-node-name', text: nodeName(n.id)}), h(doc, 'span', {class: 'cr-node-state'}), h(doc, 'span', {class: 'cr-node-time'}));
    b.addEventListener('click', () => select(n.id));
    nodeBtns[n.id] = b; strip.append(b);
  }

  // ---------- tabs ----------
  const tabs = MODES.map(m => $('cr-tab-' + m)), panels = MODES.map(m => $('cr-panel-' + m));
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setMode(MODES[i]));
    t.addEventListener('keydown', e => {
      const k = {ArrowRight: 1, ArrowLeft: -1}[e.key];
      let j = k === undefined ? null : (i + k + MODES.length) % MODES.length;
      if (e.key === 'Home') j = 0; if (e.key === 'End') j = MODES.length - 1;
      if (j === null) return;
      e.preventDefault(); setMode(MODES[j]); tabs[j].focus();
    });
  });

  function setMode(mode) {
    if (!MODES.includes(mode)) return;
    state.mode = mode;
    MODES.forEach((m, i) => {
      const on = m === mode;
      tabs[i].setAttribute('aria-selected', String(on)); tabs[i].setAttribute('tabindex', on ? '0' : '-1'); tabs[i].classList.toggle('is-active', on);
      panels[i].hidden = !on;
    });
    root.setAttribute('data-mode', mode);
  }

  function select(id) {
    state.selected = state.selected === id ? null : id;
    if (state.mode !== 'building') setMode('building');
    refresh();
  }

  function setCursor(sec) { sweepToken++; state.cursor = sec; refresh(); }

  // ---------- snapshot ----------
  const snap = () => { const rows = bridge.getRows(); return {rows, cases: validCases(rows, bridge.getCases())}; };

  // ---------- painters ----------
  function paintHud(scene, rows, cases) {
    $('cr-clock').textContent = scene.clock ? `${clockOf(scene.clock)} UTC` : '--:--:-- UTC';
    $('cr-elapsed').textContent = scene.bounds && scene.cursor !== null ? `+${scene.cursor - scene.bounds.start} s` : scene.bounds ? 'live' : '';
    const chip = $('cr-case-chip');
    if (scene.link?.kind === 'case') {
      chip.hidden = false; chip.setAttribute('data-kind', 'case'); chip.textContent = `HIGH PRIORITY CASE \u00b7 ${scene.link.caseId}`;
    } else if (scene.link?.kind === 'near-miss') {
      chip.hidden = false; chip.setAttribute('data-kind', 'near'); chip.textContent = 'NO CORRELATED CASE \u00b7 RULE NOT MET';
    } else chip.hidden = true;
  }

  function paintStrip(scene) {
    for (const n of scene.nodes) {
      const b = nodeBtns[n.id], word = stateLabel(n.id, n.state);
      b.setAttribute('data-state', n.state);
      b.querySelector('.cr-node-state').textContent = word;
      b.querySelector('.cr-node-time').textContent = n.event ? `${clockOf(n.event.at)} UTC` : 'Awaiting signal';
      b.setAttribute('aria-pressed', String(state.selected === n.id));
      b.setAttribute('aria-label', `${n.name}: ${word}${n.event ? ' at ' + clockOf(n.event.at) + ' UTC' : ', awaiting signal'}. Open source inspector.`);
      b.classList.toggle('is-selected', state.selected === n.id);
    }
  }

  function paintCaption(scene, rows, cases) {
    const pair = explainPair(rows);
    const text = scene.idle ? sceneSummary(scene) : (scene.cursor === null ? pair.summary : sceneSummary(scene));
    if (text !== sig.caption) { sig.caption = text; $('cr-caption').textContent = text; }
  }

  function gauge(prefix, value, lo, hi, limit, passFn, valueText, detail) {
    const bar = $(prefix), pct = value === null ? 0 : clamp(((value - lo) / (hi - lo)) * 100);
    bar.style.setProperty('--v', pct.toFixed(1) + '%');
    bar.style.setProperty('--m', clamp(((limit - lo) / (hi - lo)) * 100).toFixed(1) + '%');
    bar.setAttribute('data-pass', value === null ? 'none' : String(passFn(value)));
    $(prefix + '-v').textContent = valueText;
    $(prefix + '-s').textContent = detail;
  }

  // The forecast is read from the live controls at paint time, so it can never be stale (presets set values without firing input events).
  function liveForecast() {
    const p = $('forge-panel');
    if (!p || p.hidden) return null;
    try { const c = {delaySeconds: Number($('forge-gap').value), holdSeconds: Number($('forge-hold').value), cameraOffline: $('forge-camera').checked}; evaluateForge(c); return c; } catch { return null; }
  }

  function paintRules(rows, cases) {
    const f = liveForecast();
    let gap = null, hold = null, label = 'RECORDED', verdict = 'Forge an incident or run a scenario to see the rule at work.';
    if (f) {
      gap = f.delaySeconds; hold = f.holdSeconds; label = 'FORECAST'; verdict = evaluateForge(f).explanation + ' Press Run investigation to verify with real hashes.';
    } else {
      const p = explainPair(rows);
      if (p.door) { gap = p.gap; hold = p.hold; verdict = p.summary; }
      else if (rows.length) verdict = p.summary;
    }
    $('cr-rules').setAttribute('data-mode', label.toLowerCase());
    $('cr-rules-mode').textContent = label;
    const dm = gap === null ? null : gap - WINDOW_SECONDS, hm = hold === null ? null : hold - DOOR_HELD_THRESHOLD;
    gauge('cr-g-delay', gap, 0, FORGE_BOUNDS.delayMax, WINDOW_SECONDS, v => v <= WINDOW_SECONDS, gap === null ? '\u2013' : `${gap} s`,
      gap === null ? `Limit ${WINDOW_SECONDS} s` : dm <= 0 ? `Limit ${WINDOW_SECONDS} s \u00b7 ${-dm} s inside` : `Limit ${WINDOW_SECONDS} s \u00b7 ${dm} s outside`);
    gauge('cr-g-hold', hold, FORGE_BOUNDS.holdMin, FORGE_BOUNDS.holdMax, DOOR_HELD_THRESHOLD, v => v >= DOOR_HELD_THRESHOLD, hold === null ? '\u2013' : `${hold} s`,
      hold === null ? `Threshold ${DOOR_HELD_THRESHOLD} s` : hm >= 0 ? `Threshold ${DOOR_HELD_THRESHOLD} s \u00b7 ${hm} s above` : `Threshold ${DOOR_HELD_THRESHOLD} s \u00b7 ${-hm} s below`);
    $('cr-rules-verdict').textContent = verdict;
  }

  function paintBuilding(rows, cases, scene) {
    const board = buildBoard(rows, cases);
    $('cr-b-summary').textContent = board.what;
    const box = $('cr-b-node');
    if (!state.selected) { box.replaceChildren(h(doc, 'p', {class: 'empty cr-empty', text: 'Select a source on the building, or from the row above, to see its latest recorded event and hash.'})); return; }
    const info = nodeInfo(rows, state.selected, state.cursor);
    const dl = h(doc, 'dl', {class: 'cr-dl'});
    const add = (k, v, mono) => dl.append(h(doc, 'div', {class: 'cr-kv'}, h(doc, 'dt', {text: k}), h(doc, 'dd', {text: v, class: mono ? 'recon-mono' : false})));
    add('Source', `${info.name} (${info.deviceId})`); add('Interface', `${info.protocol} \u00b7 simulated`); add('State', info.stateLabel);
    if (info.has) {
      add('Event', info.eventId, true); add('UTC time', info.at); add('Signal', info.type + (info.duration !== null ? ` \u00b7 ${info.duration} s` : ''));
      add('Ledger row', `#${info.rowSeq}`); add('Detection', info.rule || 'No standalone finding'); add('Row hash (SHA-256)', info.hash, true); add('Previous hash', info.previous, true);
    } else add('Event', 'Awaiting signal: nothing recorded for this source yet.');
    box.replaceChildren(h(doc, 'h4', {text: info.name}), dl);
  }

  // ----- timeline -----
  function paintTimeline(rows, cases) {
    const t = buildTimeline(rows, cases);
    sig.timeline = t;
    const track = $('cr-tl-track'), list = $('cr-tl-list'), scrub = $('cr-scrub');
    if (t.empty) {
      track.replaceChildren(); list.replaceChildren(h(doc, 'li', {class: 'empty cr-empty', text: 'No events yet. Forge an incident or run a scenario, then scrub through the building here.'}));
      scrub.disabled = true; scrub.max = '0'; scrub.value = '0'; $('cr-live').disabled = true; $('cr-tl-edge-a').textContent = ''; $('cr-tl-edge-b').textContent = ''; return;
    }
    scrub.disabled = t.span === 0; scrub.min = '0'; scrub.max = String(t.span);
    $('cr-tl-edge-a').textContent = `${clockOf(t.items[0].at)} UTC`; $('cr-tl-edge-b').textContent = `${clockOf(t.items.at(-1).at)} UTC`;
    const marks = [];
    t.items.forEach(i => {
      const b = h(doc, 'button', {type: 'button', class: `cr-mark cr-mark-${i.kind}`, 'aria-label': `${i.time} UTC, ${i.deviceName}, ${i.type}. ${KIND_WORD[i.kind]}. Show the building at this moment.`, title: `${i.time} UTC \u00b7 ${i.id}`});
      b.style.setProperty('--at', i.pct.toFixed(2) + '%'); b.setAttribute('data-sec', i.sec);
      b.addEventListener('click', () => setCursor(i.sec)); marks.push(b);
    });
    track.replaceChildren(...marks);
    list.replaceChildren(...t.items.map(i => h(doc, 'li', {class: `cr-tl-item cr-kind-${i.kind}`, 'data-sec': i.sec},
      h(doc, 'span', {class: 'cr-tl-time', text: i.time}), h(doc, 'span', {class: 'cr-tl-what', text: `${i.deviceName} \u00b7 ${i.type}${i.duration !== null ? ` \u00b7 ${i.duration} s` : ''}`}),
      h(doc, 'small', {text: `${KIND_WORD[i.kind]} \u00b7 ${i.id}`}))));
    sig.timeline = t;
  }

  function updateScrubber(scene) {
    const t = sig.timeline;
    if (!t || t.empty) return;
    const scrub = $('cr-scrub'), live = state.cursor === null;
    scrub.value = String(live ? t.span : clamp(state.cursor - t.start, 0, t.span));
    scrub.setAttribute('aria-valuetext', live ? 'Live, end of the recorded ledger' : `${scene.clock ? clockOf(scene.clock) : ''} UTC, ${state.cursor - t.start} seconds from the first event`);
    $('cr-scrub-out').textContent = live ? 'Live \u00b7 end of ledger' : `${scene.clock ? clockOf(scene.clock) + ' UTC \u00b7 ' : ''}+${state.cursor - t.start} s`;
    $('cr-live').disabled = live;
    for (const b of $('cr-tl-track').childNodes) b.classList.toggle('is-on', Number(b.getAttribute('data-sec')) <= (live ? Infinity : state.cursor));
    for (const li of $('cr-tl-list').childNodes) if (li.getAttribute) li.classList.toggle('is-future', !live && Number(li.getAttribute('data-sec')) > state.cursor);
  }

  // ----- evidence -----
  function paintEvidence(rows, cases) {
    const t = buildTimeline(rows, cases), list = $('cr-ev-list');
    if (t.empty) list.replaceChildren(h(doc, 'li', {class: 'empty cr-empty', text: 'No evidence recorded yet.'}));
    else list.replaceChildren(...t.items.map(i => h(doc, 'li', {class: `cr-ev-item cr-kind-${i.kind}`},
      h(doc, 'div', {class: 'cr-ev-head'}, h(doc, 'strong', {class: 'recon-mono', text: i.id}), h(doc, 'span', {class: 'cr-ev-kind', text: KIND_WORD[i.kind]})),
      h(doc, 'p', {class: 'cr-ev-meta', text: `${i.at} \u00b7 ${i.deviceName} \u00b7 ${i.type}${i.duration !== null ? ` \u00b7 ${i.duration} s` : ''} \u00b7 ledger row #${i.seq}`}),
      h(doc, 'p', {class: 'cr-hash'}, h(doc, 'span', {text: 'SHA-256'}), h(doc, 'code', {text: i.hash})),
      h(doc, 'p', {class: 'cr-hash cr-hash-prev'}, h(doc, 'span', {text: 'Previous'}), h(doc, 'code', {text: i.previous})))));
    const has = cases.length > 0;
    $('cr-ev-recon').disabled = !has;
    $('cr-ev-recon').setAttribute('title', has ? 'Replay this case from the verified ledger' : 'Available when a correlated case exists');
  }

  // ----- response -----
  function paintResponse(rows, cases) {
    const ba = beforeAfter(rows, cases), board = buildBoard(rows, cases);
    const alarms = $('cr-ba-alarms');
    alarms.replaceChildren(...(ba.alarms.length ? ba.alarms.map((a, i) => h(doc, 'li', {class: `cr-alarm cr-sev-${a.severity}`, style: `--i:${i}`},
      h(doc, 'span', {class: 'cr-alarm-time', text: a.time}), h(doc, 'strong', {text: a.title}), h(doc, 'small', {text: `${a.device} \u00b7 ${a.severity}`})))
      : [h(doc, 'li', {class: 'empty cr-empty', text: 'No alarms yet.'})]));
    const o = ba.outcome, card = $('cr-ba-outcome');
    card.setAttribute('data-kind', o.kind);
    card.replaceChildren(h(doc, 'p', {class: 'cr-ba-flag', text: o.kind === 'case' ? 'LINKED' : o.kind === 'near-miss' ? 'NOT LINKED' : 'WAITING'}),
      h(doc, 'h4', {text: o.title}), h(doc, 'p', {text: o.line}), o.caseId ? h(doc, 'code', {class: 'cr-hash', text: o.caseId}) : null);
    $('cr-ba-count').textContent = String(ba.count);

    const dl = $('cr-board');
    const row = (q, a) => h(doc, 'div', {class: 'cr-q'}, h(doc, 'dt', {text: q}), h(doc, 'dd', {}, ...(Array.isArray(a) ? a : [a])));
    const txt = s => h(doc, 'p', {text: s});
    dl.replaceChildren(
      row('What happened?', txt(board.what)),
      row('Where?', board.where.length ? txt(board.where.join(' and ')) : txt('No located events yet.')),
      row('Why were these linked?', board.why.length ? board.why.map(txt) : txt('Nothing to link yet.')),
      row('What was excluded?', board.excluded.length ? board.excluded.map(e => h(doc, 'p', {}, h(doc, 'code', {class: 'recon-mono', text: e.id}), doc.createTextNode(' ' + e.reason))) : txt('Nothing was excluded.')),
      row('What evidence supports it?', board.evidence.length ? board.evidence.map(e => h(doc, 'p', {}, h(doc, 'code', {class: 'recon-mono', text: e.id}), doc.createTextNode(` ${clockOf(e.at)} UTC \u00b7 `), h(doc, 'code', {class: 'cr-hash-s', title: e.hash, text: e.hash.slice(0, 16) + '\u2026'}))) : txt('No evidence yet.')),
      row('What should the operator review next?', h(doc, 'ul', {class: 'cr-next'}, ...board.next.map(n => h(doc, 'li', {text: n})))));
  }

  function setJoined(on) {
    state.joined = !!on;
    const ba = $('cr-ba'), b = $('cr-ba-toggle');
    ba.setAttribute('data-joined', String(state.joined));
    b.setAttribute('aria-pressed', String(state.joined));
    b.textContent = state.joined ? 'Show the separate alarms' : 'Connect the signals';
  }

  // ---------- refresh ----------
  function refresh() {
    const {rows, cases} = snap();
    const rowsSig = `${rows.length}:${rows.at(-1)?.hash ?? ''}|${cases.map(c => c.id).join(',')}`;
    const changed = rowsSig !== sig.rows;
    if (changed) {
      sig.rows = rowsSig;
      if (state.cursor !== null && !rows.length) state.cursor = null;
      if (!rows.length) { state.selected = null; setJoined(false); }
    }
    const scene = deriveScene(rows, state.cursor, cases);
    applyScene(refs, scene, {selected: state.selected});
    paintHud(scene, rows, cases); paintStrip(scene); paintCaption(scene, rows, cases);
    if (changed) { paintTimeline(rows, cases); paintEvidence(rows, cases); paintResponse(rows, cases); }
    paintRules(rows, cases); paintBuilding(rows, cases, scene); updateScrubber(scene);
    // Other code re-enables every button after long actions, so derive these on every refresh.
    $('cr-ev-recon').disabled = cases.length === 0;
    root.setAttribute('data-has-case', String(cases.length > 0));
    $('cr-stage').setAttribute('data-idle', String(scene.idle));
  }

  // ---------- controls ----------
  $('cr-scrub').addEventListener('input', e => {
    const t = sig.timeline; if (!t || t.empty) return;
    const v = Number(e.target.value); setCursor(v >= t.span ? null : t.start + v);
  });
  $('cr-live').addEventListener('click', () => setCursor(null));
  $('cr-ba-toggle').addEventListener('click', () => setJoined(!state.joined));
  $('cr-ev-recon').addEventListener('click', e => { const c = snap().cases[0]; if (c) bridge.openReconstruction(c, e.currentTarget); });
  $('cr-ev-verify').addEventListener('click', async () => {
    const r = await bridge.verify(); const note = $('cr-ev-note');
    note.textContent = r.valid ? `Chain verified: ${r.checked} ledger record${r.checked === 1 ? '' : 's'} from the genesis hash. Head ${r.head.slice(0, 16)}\u2026` : 'Chain verification FAILED. Export this ledger for investigation.';
    note.classList.toggle('is-bad', !r.valid);
  });
  $('cr-ev-export').addEventListener('click', () => $('export').click());

  // ---------- Signal Forge integration (moves the existing composer, never reimplements it) ----------
  const forge = $('forge-panel'), slot = $('cr-forge-slot');
  if (forge && slot) slot.append(forge);
  // While forging, the rule gauges sit beside the building with the composer; otherwise they live in the console.
  const rulesEl = $('cr-rules'), sideEl = root.querySelector('.cr-side');
  const dock = on => { if (rulesEl && slot && sideEl) { if (on) slot.prepend(rulesEl); else sideEl.prepend(rulesEl); } };
  const setForecast = () => refresh();
  if (forge) {
    for (const id of ['forge-gap', 'forge-hold']) $(id).addEventListener('input', setForecast);
    $('forge-camera').addEventListener('change', setForecast);
    for (const id of ['forge-pass', 'forge-fail']) $(id).addEventListener('click', setForecast);
    new MutationObserver(() => {
      root.setAttribute('data-forge', String(!forge.hidden));
      dock(!forge.hidden);
      refresh();
    }).observe(forge, {attributes: true, attributeFilter: ['hidden']});
    root.setAttribute('data-forge', String(!forge.hidden));
  }
  const openForge = () => { if (forge && forge.hidden) $('signal-forge').click(); else if (forge) $('forge-gap').focus(); };
  async function challenge(preset) {
    openForge();
    $(preset === 'A' ? 'forge-pass' : 'forge-fail').click();
    $('forge-run').click();
    root.scrollIntoView({block: 'start', behavior: reducedMotion ? 'auto' : 'smooth'});
  }
  $('cr-forge').addEventListener('click', openForge);
  $('cr-chal-a').addEventListener('click', () => challenge('A'));
  $('cr-chal-b').addEventListener('click', () => challenge('B'));

  // ---------- watch an incident unfold (real scenario, then the cursor replays recorded time) ----------
  async function unfold() {
    const btn = $('cr-unfold'); btn.disabled = true;
    const token = ++sweepToken;
    try {
      await bridge.resetLab();
      await bridge.runLegacy();
      const c = await bridge.waitForCase(5000);
      if (token !== sweepToken) return;
      setMode('building'); state.selected = null;
      root.scrollIntoView({block: 'start', behavior: reducedMotion ? 'auto' : 'smooth'});
      const t = buildTimeline(bridge.getRows(), c ? [c] : []);
      if (!reducedMotion && !t.empty) {
        const secs = [...new Set(t.items.map(i => i.sec))];
        state.cursor = secs[0] - 1; refresh();
        for (const sec of secs) {
          await new Promise(r => setTimeout(r, 1300));
          if (token !== sweepToken) return;
          state.cursor = sec; refresh();
        }
        await new Promise(r => setTimeout(r, 900));
        if (token !== sweepToken) return;
      }
      state.cursor = null; refresh();
      if (c) bridge.openReconstruction(c, btn);
    } finally { btn.disabled = false; }
  }
  $('cr-unfold').addEventListener('click', unfold);

  setMode('building'); setJoined(false); refresh();
  return {
    refresh, setMode, select, setCursor, setJoined, openForge, unfold, MODES,
    get state() { return {...state}; },
    focusStage() { root.scrollIntoView({block: 'start', behavior: reducedMotion ? 'auto' : 'smooth'}); },
    cancelSweep() { sweepToken++; },
  };
}
