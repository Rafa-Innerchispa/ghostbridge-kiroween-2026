/**
 * GhostBridge interactive evidence reconstruction — DOM / SVG view.
 *
 * Authored by Kiro (Kiroween 2026, feat/evidence-reconstruction).
 *
 * Paints a model produced by buildReconstruction() (reconstruction.mjs). All labels come
 * from that model; this file contains no fixture values. All text is set with textContent.
 * The scene is a stylized generic entryway driven by synthetic events: it is not camera
 * footage and implies no hardware connection.
 */
import {sceneStateAt, formatSeconds} from './reconstruction.mjs';
import {createPlayback, SPEEDS} from './playback.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';

const ROLE_LABEL = {
  anchor: 'Anchor · access denied',
  match: 'Matched · door held open',
  excluded: 'Considered · not linked',
  case: 'Derived case',
};

function h(doc, tag, attrs = {}, ...children) {
  const n = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c) n.append(c);
  return n;
}

function s(doc, tag, attrs = {}, ...children) {
  const n = doc.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== false && v !== null && v !== undefined) n.setAttribute(k, String(v));
  for (const c of children) if (c) n.append(c);
  return n;
}

const pts = list => list.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
// Point on the right wall plane at horizontal position x and height h above the floor.
const rightWall = (x, height) => [x, 200 + (x - 320) * 90 / 280 - height];

/** Build the static 2.5D entryway. Dynamic state is driven by data-* attributes + CSS. */
function buildScene(doc, model) {
  const door = [rightWall(430, 0), rightWall(510, 0), rightWall(510, 112), rightWall(430, 112)];
  const doorOpening = [rightWall(430, 0), rightWall(478, 0), rightWall(478, 112), rightWall(430, 112)];
  const reader = [rightWall(366, 46), rightWall(388, 46), rightWall(388, 92), rightWall(366, 92)];
  const led = rightWall(377, 82);
  const ledLow = rightWall(377, 56);
  const target = rightWall(470, 96);
  const inward = [-86, 28];
  const pool = [door[0], door[1], [door[1][0] + inward[0], door[1][1] + inward[1]], [door[0][0] + inward[0], door[0][1] + inward[1]]];
  const ghost = [rightWall(424, -4), rightWall(516, -4), rightWall(516, 118), rightWall(424, 118)];

  const gridLines = [];
  for (let i = 1; i <= 5; i++) {
    const t = i / 6;
    gridLines.push(s(doc, 'line', {x1: 320 + 280 * t, y1: 200 + 90 * t, x2: 40 + 280 * t, y2: 290 + 90 * t, class: 'recon-grid-line'}));
    gridLines.push(s(doc, 'line', {x1: 320 - 280 * t, y1: 200 + 90 * t, x2: 600 - 280 * t, y2: 290 + 90 * t, class: 'recon-grid-line'}));
  }

  // Lobby desk: simple isometric block for depth.
  const A = [214, 296], ex = [76, 24], ey = [-38, 12], up = 30;
  const B = [A[0] + ex[0], A[1] + ex[1]], D = [A[0] + ey[0], A[1] + ey[1]], C = [B[0] + ey[0], B[1] + ey[1]];
  const lift = p => [p[0], p[1] - up];

  const link = `M ${led[0]} ${led[1]} Q ${(led[0] + target[0]) / 2} ${Math.min(led[1], target[1]) - 62} ${target[0]} ${target[1]}`;
  const apex = [(led[0] + target[0]) / 2, Math.min(led[1], target[1]) - 38];

  const svg = s(doc, 'svg', {
    viewBox: '0 0 640 400', class: 'recon-scene', role: 'img', preserveAspectRatio: 'xMidYMid meet',
    'aria-labelledby': 'recon-svg-title recon-svg-desc', focusable: 'false',
    'data-reader': 'idle', 'data-door': 'closed', 'data-link': 'off', 'data-case': 'off', 'data-excluded': '0',
  });
  const title = s(doc, 'title', {id: 'recon-svg-title'});
  title.textContent = 'Stylized 2.5D entryway reconstruction (synthetic, not camera footage)';
  const desc = s(doc, 'desc', {id: 'recon-svg-desc'});
  desc.textContent = 'Reader idle, door closed.';

  const defs = s(doc, 'defs', {},
    s(doc, 'linearGradient', {id: 'reconWallL', x1: 0, y1: 0, x2: 1, y2: 0},
      s(doc, 'stop', {offset: '0', 'stop-color': '#10171b'}), s(doc, 'stop', {offset: '1', 'stop-color': '#1a2328'})),
    s(doc, 'linearGradient', {id: 'reconWallR', x1: 0, y1: 0, x2: 1, y2: 0},
      s(doc, 'stop', {offset: '0', 'stop-color': '#223038'}), s(doc, 'stop', {offset: '1', 'stop-color': '#16212a'})),
    s(doc, 'linearGradient', {id: 'reconFloor', x1: 0, y1: 0, x2: 0, y2: 1},
      s(doc, 'stop', {offset: '0', 'stop-color': '#1b2429'}), s(doc, 'stop', {offset: '1', 'stop-color': '#0d1316'})));

  const scene = [
    defs,
    s(doc, 'polygon', {points: pts([[40, 290], [320, 200], [320, 60], [40, 150]]), fill: 'url(#reconWallL)', class: 'recon-wall'}),
    s(doc, 'polygon', {points: pts([[320, 200], [600, 290], [600, 150], [320, 60]]), fill: 'url(#reconWallR)', class: 'recon-wall'}),
    s(doc, 'polygon', {points: pts([[320, 380], [600, 290], [320, 200], [40, 290]]), fill: 'url(#reconFloor)', class: 'recon-floor'}),
    s(doc, 'g', {}, ...gridLines),
    s(doc, 'polyline', {points: pts([[40, 150], [320, 60], [600, 150]]), class: 'recon-trim'}),
    s(doc, 'polyline', {points: pts([[40, 290], [320, 200], [600, 290]]), class: 'recon-trim recon-trim-base'}),
    // desk
    s(doc, 'g', {class: 'recon-desk'},
      s(doc, 'polygon', {points: pts([lift(A), lift(B), lift(C), lift(D)]), class: 'recon-desk-top'}),
      s(doc, 'polygon', {points: pts([B, C, lift(C), lift(B)]), class: 'recon-desk-r'}),
      s(doc, 'polygon', {points: pts([D, C, lift(C), lift(D)]), class: 'recon-desk-l'})),
    // door light pool + considered-candidate outline
    s(doc, 'polygon', {points: pts(pool), class: 'recon-pool'}),
    s(doc, 'polygon', {points: pts(ghost), class: 'recon-ghost'}),
    // door
    s(doc, 'polygon', {points: pts(door), class: 'recon-door-frame'}),
    s(doc, 'g', {class: 'recon-door-closed'},
      s(doc, 'polygon', {points: pts(door), class: 'recon-leaf'}),
      s(doc, 'line', {x1: rightWall(470, 0)[0], y1: rightWall(470, 0)[1], x2: rightWall(470, 112)[0], y2: rightWall(470, 112)[1], class: 'recon-seam'}),
      s(doc, 'line', {x1: rightWall(494, 54)[0], y1: rightWall(494, 54)[1], x2: rightWall(494, 70)[0], y2: rightWall(494, 70)[1], class: 'recon-handle'})),
    s(doc, 'g', {class: 'recon-door-open'},
      s(doc, 'polygon', {points: pts(door), class: 'recon-opening'}),
      s(doc, 'polygon', {points: pts(doorOpening), class: 'recon-leaf recon-leaf-swung'})),
    // reader
    s(doc, 'polygon', {points: pts(reader), class: 'recon-reader'}),
    s(doc, 'circle', {cx: ledLow[0], cy: ledLow[1], r: 2.2, class: 'recon-key'}),
    s(doc, 'circle', {cx: ledLow[0] + 5, cy: ledLow[1] + 1.6, r: 2.2, class: 'recon-key'}),
    s(doc, 'circle', {cx: led[0], cy: led[1], r: 15, class: 'recon-led-halo'}),
    s(doc, 'circle', {cx: led[0], cy: led[1], r: 5.5, class: 'recon-led'}),
    s(doc, 'circle', {cx: led[0], cy: led[1], r: 8, class: 'recon-led-ring'}),
    // causal link
    s(doc, 'path', {d: link, class: 'recon-link', pathLength: 1}),
    s(doc, 'g', {class: 'recon-link-label', transform: `translate(${apex[0].toFixed(1)} ${apex[1].toFixed(1)})`},
      s(doc, 'rect', {x: -34, y: -14, width: 68, height: 26, rx: 13, class: 'recon-link-pill'}),
      Object.assign(s(doc, 'text', {x: 0, y: 4, 'text-anchor': 'middle', class: 'recon-link-text'}), {textContent: `${model.why.gapSeconds} s`})),
  ];
  svg.append(title, desc, ...scene);
  return {svg, desc};
}

function dlRow(doc, label, value, mono = false) {
  const row = h(doc, 'div', {class: 'recon-kv'});
  row.append(h(doc, 'dt', {text: label}), h(doc, 'dd', {text: value, class: mono ? 'recon-mono' : false}));
  return row;
}

function inspectorRows(step) {
  if (step.kind === 'case') {
    return [
      ['Case ID', step.caseId, true], ['Rule', step.rule], ['Severity', step.severity],
      ['Source events', step.eventIds.join(' + '), true],
      ['Evidence hash 1', step.hashes[0], true], ['Evidence hash 2', step.hashes[1], true],
      ['Explanation', step.explanation],
    ];
  }
  const rows = [
    ['Event ID', step.eventId, true], ['Role', ROLE_LABEL[step.kind]], ['UTC time', step.at],
    ['Source', `${step.deviceName} (${step.deviceId})`], ['Signal', step.eventType],
    ['Hold duration', step.durationSeconds === null ? 'Not applicable' : `${step.durationSeconds} s (${formatSeconds(step.durationSeconds)})`],
    ['Ledger row', `#${step.rowSeq}`],
    ['Detection rule', step.incident ? `${step.incident.title} · ${step.incident.rule} · ${step.incident.severity}` : 'No standalone incident'],
  ];
  if (step.reason) rows.push(['Why not linked', step.reason]);
  rows.push(['Row hash (SHA-256)', step.hash, true], ['Previous hash', step.previous, true]);
  return rows;
}

/**
 * Mount the interactive reconstruction into `host`.
 *
 * @param {Element} host
 * @param {object} model  from buildReconstruction()
 * @param {object} [options]
 * @param {Document} [options.doc]
 * @param {boolean} [options.reducedMotion]
 * @param {()=>void} [options.onClose]
 * @param {Function} [options.schedule]  injectable timer (tests)
 * @param {Function} [options.cancel]
 */
export function mountReconstruction(host, model, {doc = host.ownerDocument, reducedMotion = false, onClose = () => {}, schedule, cancel} = {}) {
  const n = model.steps.length;
  const {svg, desc} = buildScene(doc, model);
  host.setAttribute('data-reduced-motion', String(!!reducedMotion));

  // --- header ---
  const heading = h(doc, 'h3', {id: 'recon-title', tabindex: '-1', text: 'Case reconstruction'});
  const closeBtn = h(doc, 'button', {type: 'button', class: 'recon-close', id: 'recon-close', text: '✕ Close reconstruction'});
  closeBtn.addEventListener('click', () => onClose());
  const head = h(doc, 'div', {class: 'recon-head'},
    h(doc, 'div', {class: 'recon-head-main'},
      h(doc, 'p', {class: 'eyebrow', text: '03 / READ-ONLY RECONSTRUCTION'}), heading,
      h(doc, 'p', {class: 'fine recon-sub', text: `Case ${model.caseId} · rebuilt from the verified ledger. Stylized entryway driven by synthetic events; not camera footage and not a live connection.`})),
    h(doc, 'div', {class: 'recon-badges'},
      h(doc, 'span', {class: 'recon-badge recon-badge-ok', text: `✓ Ledger verified · ${model.integrity.checked} records`}),
      h(doc, 'span', {class: 'recon-badge recon-badge-sev', text: `${model.severity.toUpperCase()} priority`}),
      closeBtn));

  // --- stage: hud + scene + status + controls + ruler ---
  const clockEl = h(doc, 'span', {class: 'recon-clock', text: '--:--:-- UTC'});
  const elapsedEl = h(doc, 'span', {class: 'recon-elapsed', text: '+0 s'});
  const caseChip = h(doc, 'span', {class: 'recon-case-chip', hidden: true, text: `⚡ ${model.severity.toUpperCase()} PRIORITY CASE · ${model.caseId}`});
  const hud = h(doc, 'div', {class: 'recon-hud'}, h(doc, 'span', {class: 'recon-clockbox'}, clockEl, elapsedEl), caseChip);
  const figure = h(doc, 'figure', {class: 'recon-figure'}, hud, svg);

  const statusEl = h(doc, 'p', {class: 'recon-status', id: 'recon-status', role: 'status', 'aria-live': 'polite'});

  const btn = (id, text, label) => h(doc, 'button', {type: 'button', id, class: 'recon-btn', text, 'aria-label': label});
  const restartBtn = btn('recon-restart', '⏮ Restart', 'Restart reconstruction');
  const prevBtn = btn('recon-prev', '◀ Previous', 'Previous step');
  const playBtn = btn('recon-play', '▶ Play', 'Play reconstruction');
  playBtn.classList.add('recon-play');
  const nextBtn = btn('recon-next', 'Next ▶', 'Next step');
  const speedSel = h(doc, 'select', {id: 'recon-speed', class: 'recon-speed'});
  for (const sp of SPEEDS) speedSel.append(h(doc, 'option', {value: sp, text: `${sp}×`, selected: sp === 1}));
  speedSel.value = '1';
  const speedLabel = h(doc, 'label', {class: 'recon-speed-label', for: 'recon-speed'}, h(doc, 'span', {text: 'Speed'}), speedSel);
  const controls = h(doc, 'div', {class: 'recon-controls', role: 'group', 'aria-label': 'Reconstruction playback controls'}, restartBtn, prevBtn, playBtn, nextBtn, speedLabel);

  const slider = h(doc, 'input', {type: 'range', id: 'recon-slider', class: 'recon-slider', min: 0, max: n, step: 1, value: 0});
  slider.value = '0';
  const sliderLabel = h(doc, 'label', {for: 'recon-slider', class: 'recon-slider-label', text: 'Timeline position'});

  // Ruler is to scale in ledger time; steps sharing a timestamp share a position.
  const total = model.totalSeconds;
  const progress = h(doc, 'span', {class: 'recon-progress'});
  const markers = model.steps.filter(st => st.kind !== 'case').map(st => {
    const pct = total > 0 ? (st.offsetSeconds / total) * 100 : (st.index / Math.max(1, n - 2)) * 100;
    const m = h(doc, 'span', {class: `recon-marker recon-marker-${st.kind}`, title: `${st.time} UTC · ${st.eventId}`});
    m.style.setProperty('--at', `${pct.toFixed(2)}%`);
    m.addEventListener('click', () => playback.seek(st.index + 1));
    return m;
  });
  const ruler = h(doc, 'div', {class: 'recon-ruler', 'aria-hidden': 'true'}, h(doc, 'span', {class: 'recon-track'}), progress, ...markers);
  const rulerLabels = h(doc, 'div', {class: 'recon-ruler-labels', 'aria-hidden': 'true'},
    h(doc, 'span', {text: `${model.steps[0].time} UTC`}),
    h(doc, 'span', {text: `to scale · ${formatSeconds(total)} of ledger time`}),
    h(doc, 'span', {text: `${model.steps[n - 1].time} UTC`}));

  const stage = h(doc, 'div', {class: 'recon-stage'}, figure, statusEl, controls, sliderLabel, slider, ruler, rulerLabels);

  // --- side: why + steps + inspector ---
  const why = model.why;
  const checkList = h(doc, 'ul', {class: 'recon-checks'}, ...why.checks.map(c => h(doc, 'li', {class: `recon-check ${c.passed ? 'is-pass' : 'is-fail'}`},
    h(doc, 'span', {class: 'recon-check-icon', 'aria-hidden': 'true', text: c.passed ? '✓' : '✕'}),
    h(doc, 'span', {class: 'recon-sr', text: c.passed ? 'Passed: ' : 'Failed: '}),
    h(doc, 'div', {}, h(doc, 'strong', {text: c.label}), h(doc, 'small', {text: c.detail})))));
  const exclList = why.exclusions.length
    ? h(doc, 'ul', {class: 'recon-excl'}, ...why.exclusions.map(x => h(doc, 'li', {}, h(doc, 'strong', {class: 'recon-mono', text: x.eventId}), h(doc, 'small', {text: x.reason}))))
    : h(doc, 'p', {class: 'fine', text: 'No other long-held door events were found in this ledger.'});
  const stats = h(doc, 'div', {class: 'recon-stats'},
    h(doc, 'div', {class: 'recon-stat'}, h(doc, 'strong', {text: `${why.gapSeconds} s`}), h(doc, 'small', {text: `between signals · window ${why.windowSeconds} s`})),
    h(doc, 'div', {class: 'recon-stat'}, h(doc, 'strong', {text: `${why.holdSeconds} s`}), h(doc, 'small', {text: `door held · threshold ${why.thresholdSeconds} s`})));
  const whyPanel = h(doc, 'section', {class: 'recon-card', 'aria-labelledby': 'recon-why-h'},
    h(doc, 'h4', {id: 'recon-why-h', text: 'Why this matches'}), stats, checkList,
    h(doc, 'h5', {text: 'Considered and excluded'}), exclList);

  const stepButtons = model.steps.map(st => {
    const b = h(doc, 'button', {type: 'button', class: `recon-step recon-step-${st.kind}`});
    b.append(h(doc, 'span', {class: 'recon-step-time', text: st.time}), h(doc, 'span', {class: 'recon-step-title', text: st.title}), h(doc, 'small', {text: ROLE_LABEL[st.kind]}));
    b.addEventListener('click', () => playback.seek(st.index + 1));
    return b;
  });
  const stepItems = stepButtons.map(b => h(doc, 'li', {}, b));
  const stepsPanel = h(doc, 'section', {class: 'recon-card', 'aria-labelledby': 'recon-steps-h'},
    h(doc, 'h4', {id: 'recon-steps-h', text: 'Evidence sequence'}), h(doc, 'ol', {class: 'recon-steps'}, ...stepItems));

  const inspector = h(doc, 'dl', {class: 'recon-inspector'});
  const inspectorPanel = h(doc, 'section', {class: 'recon-card', 'aria-labelledby': 'recon-insp-h'},
    h(doc, 'h4', {id: 'recon-insp-h', text: 'Evidence inspector'}), inspector);

  const side = h(doc, 'div', {class: 'recon-side'}, whyPanel, stepsPanel, inspectorPanel);
  host.replaceChildren(head, h(doc, 'div', {class: 'recon-grid'}, stage, side));

  // --- painting ---
  function paint(state) {
    const scene = sceneStateAt(model, state.cursor);
    svg.setAttribute('data-reader', scene.reader);
    svg.setAttribute('data-door', scene.door);
    svg.setAttribute('data-link', scene.link ? 'on' : 'off');
    svg.setAttribute('data-case', scene.caseVisible ? 'on' : 'off');
    svg.setAttribute('data-excluded', String(scene.excludedIds.length));
    desc.textContent = `${scene.reader === 'denied' ? 'Reader shows access denied.' : 'Reader idle.'} ${scene.door === 'held-open' ? 'Door held open.' : 'Door closed.'}${scene.link ? ' A causal link connects the reader to the door.' : ''}${scene.caseVisible ? ' A high priority case is derived.' : ''}`;
    clockEl.textContent = scene.clock ? `${scene.clock} UTC` : '--:--:-- UTC';
    elapsedEl.textContent = `+${scene.elapsedSeconds} s`;
    caseChip.hidden = !scene.caseVisible;
    statusEl.textContent = scene.narration;
    slider.value = String(scene.cursor);
    slider.setAttribute('aria-valuetext', scene.valueText);
    progress.style.setProperty('--progress', `${total > 0 ? (scene.elapsedSeconds / total) * 100 : (scene.cursor / Math.max(1, n)) * 100}%`);
    markers.forEach((m, i) => m.classList.toggle('is-on', i < scene.cursor));
    stepButtons.forEach((b, i) => {
      b.classList.toggle('is-current', i === scene.cursor - 1);
      b.classList.toggle('is-seen', i < scene.cursor);
      if (i === scene.cursor - 1) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    restartBtn.disabled = state.atStart && !state.playing;
    prevBtn.disabled = state.atStart;
    nextBtn.disabled = state.atEnd;
    const playLabel = state.playing ? '⏸ Pause' : state.atEnd ? '↻ Replay' : '▶ Play';
    playBtn.textContent = playLabel;
    playBtn.setAttribute('aria-label', state.playing ? 'Pause reconstruction' : state.atEnd ? 'Replay reconstruction from the start' : 'Play reconstruction');
    playBtn.classList.toggle('is-playing', state.playing);
    const rows = scene.current ? inspectorRows(scene.current).map(([l, v, mono]) => dlRow(doc, l, v, mono))
      : [h(doc, 'p', {class: 'empty recon-insp-empty', text: 'Step through the sequence to inspect each recorded event, its rule and its SHA-256 row hash.'})];
    inspector.replaceChildren(...rows);
  }

  const playback = createPlayback({stepCount: n, onChange: paint, schedule, cancel});
  restartBtn.addEventListener('click', () => playback.restart());
  prevBtn.addEventListener('click', () => playback.prev());
  nextBtn.addEventListener('click', () => playback.next());
  playBtn.addEventListener('click', () => playback.toggle());
  speedSel.addEventListener('change', () => playback.setSpeed(speedSel.value));
  slider.addEventListener('input', () => playback.seek(slider.value));
  paint(playback.state);

  return {
    playback,
    focus() { heading.focus(); },
    destroy() { playback.destroy(); host.replaceChildren(); host.removeAttribute('data-reduced-motion'); },
  };
}

/** Explicit failure state: no scene is drawn from unverified evidence. */
export function mountReconstructionError(host, error, {doc = host.ownerDocument, onClose = () => {}} = {}) {
  const heading = h(doc, 'h3', {id: 'recon-title', tabindex: '-1', text: 'Reconstruction unavailable'});
  const closeBtn = h(doc, 'button', {type: 'button', class: 'recon-close', id: 'recon-close', text: '✕ Close'});
  closeBtn.addEventListener('click', () => onClose());
  host.removeAttribute('data-reduced-motion');
  host.replaceChildren(
    h(doc, 'div', {class: 'recon-head'}, h(doc, 'div', {class: 'recon-head-main'}, h(doc, 'p', {class: 'eyebrow', text: '03 / READ-ONLY RECONSTRUCTION'}), heading)),
    h(doc, 'p', {class: 'empty empty-filter recon-error', role: 'alert', text: (error && error.message) || 'The reconstruction could not be built from the current evidence.'}),
    h(doc, 'p', {class: 'fine', text: 'GhostBridge only draws a reconstruction from a ledger whose SHA-256 chain verifies and from a case it can re-derive.'}),
    closeBtn);
  return {focus() { heading.focus(); }, destroy() { host.replaceChildren(); }};
}
