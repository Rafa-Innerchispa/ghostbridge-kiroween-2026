/**
 * GhostBridge Control Room: the architectural scene (SVG).
 *
 * Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).
 *
 * buildScene() creates a stylized residential entrance in four depth layers. applyScene() only sets
 * data-* attributes and a few texts from a model produced by deriveScene(); CSS draws every state.
 * Nothing here decides an outcome, and nothing is camera footage. No innerHTML.
 */
import {stateLabel, nodeName, SOURCE_NODES, span} from './control_room.mjs';

const NS = 'http://www.w3.org/2000/svg';
export const VIEW = Object.freeze({w: 1340, h: 560});

function s(doc, tag, attrs = {}, ...kids) {
  const n = doc.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== false && v !== null && v !== undefined) n.setAttribute(k, String(v));
  for (const c of kids) if (c) n.append(c);
  return n;
}
const pts = list => list.map(p => p[0] + ',' + p[1]).join(' ');
const stop = (doc, o, color, op = 1) => s(doc, 'stop', {offset: o, 'stop-color': color, 'stop-opacity': op});

/** Marker positions in building-local coordinates (the building group is shifted right by BX). */
const BX = 492;
const MARKERS = {door: [480, 362], reader: [577, 358], camera: [410, 310], presence: [480, 468]};

function sky(doc) {
  const stars = [];
  for (let i = 0; i < 42; i++) {
    const x = (i * 197) % 1400 - 30, y = (i * 83) % 250 + 8, r = 0.7 + ((i * 7) % 5) * 0.18;
    stars.push(s(doc, 'circle', {cx: x, cy: y, r, fill: '#cfe7ea', opacity: (0.18 + ((i * 11) % 6) * 0.07).toFixed(2)}));
  }
  return s(doc, 'g', {class: 'cr-l cr-l-sky', 'data-depth': 0},
    s(doc, 'rect', {x: -80, y: -20, width: 1500, height: 480, fill: 'url(#crSky)'}),
    s(doc, 'circle', {cx: 560, cy: 112, r: 88, fill: '#9fe7ef', opacity: 0.05}),
    s(doc, 'circle', {cx: 560, cy: 112, r: 26, fill: '#e6f1f2', opacity: 0.12}),
    ...stars);
}

function skyline(doc, cls, depth, fill, rects, dots) {
  const g = s(doc, 'g', {class: `cr-l ${cls}`, 'data-depth': depth});
  for (const [x, y, w] of rects) g.append(s(doc, 'rect', {x, y, width: w, height: 440 - y, fill}));
  for (const [x, y] of dots) g.append(s(doc, 'rect', {x, y, width: 3, height: 4, fill: '#7fe3d0', opacity: 0.28}));
  return g;
}

function building(doc) {
  const g = s(doc, 'g', {class: 'cr-l cr-l-building', 'data-depth': 3});
  const b = s(doc, 'g', {transform: `translate(${BX} 0)`});
  g.append(b);

  // ground plane with perspective lines
  const lines = [];
  for (let i = -6; i <= 14; i++) lines.push(s(doc, 'line', {x1: 480, y1: 420, x2: 480 + (i - 4) * 150, y2: 560, class: 'cr-ground-line'}));
  b.append(s(doc, 'rect', {x: -520, y: 420, width: 1480, height: 150, fill: 'url(#crGround)'}), ...lines,
    s(doc, 'line', {x1: -520, y1: 420, x2: 960, y2: 420, class: 'cr-horizon'}));

  // tower facade
  b.append(s(doc, 'rect', {x: 250, y: 48, width: 460, height: 254, fill: 'url(#crFacade)', class: 'cr-facade'}),
    s(doc, 'rect', {x: 240, y: 38, width: 480, height: 10, class: 'cr-crown'}),
    s(doc, 'rect', {x: 240, y: 47, width: 480, height: 2, class: 'cr-crown-line'}));
  for (let k = 1; k < 9; k++) b.append(s(doc, 'line', {x1: 250 + k * 51.1, y1: 48, x2: 250 + k * 51.1, y2: 300, class: 'cr-fin'}));
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 9; c++) {
      const lit = ((r * 7 + c * 13 + r * c) % 5) < 2, teal = (r + c) % 3 === 0;
      b.append(s(doc, 'rect', {x: 263 + c * 50.1, y: 62 + r * 48, width: 34, height: 26, rx: 1.5, class: lit ? (teal ? 'cr-win cr-win-teal' : 'cr-win cr-win-warm') : 'cr-win'}));
    }
  }

  // glass podium, lobby glow and mullions
  b.append(s(doc, 'rect', {x: 250, y: 302, width: 460, height: 118, fill: 'url(#crGlass)', class: 'cr-podium'}),
    s(doc, 'rect', {x: 424, y: 304, width: 112, height: 116, fill: 'url(#crLobby)', class: 'cr-lobby'}));
  for (let k = 0; k < 10; k++) {
    const x = 262 + k * 46;
    if (x > 410 && x < 540) continue;
    b.append(s(doc, 'line', {x1: x, y1: 304, x2: x, y2: 420, class: 'cr-mullion'}));
  }

  // canopy slab with thickness (depth cue)
  b.append(s(doc, 'polygon', {points: pts([[228, 288], [732, 288], [724, 302], [236, 302]]), class: 'cr-canopy'}),
    s(doc, 'polygon', {points: pts([[236, 302], [724, 302], [724, 308], [236, 308]]), class: 'cr-canopy-edge'}),
    s(doc, 'line', {x1: 240, y1: 306, x2: 720, y2: 306, class: 'cr-canopy-light'}));

  // light spill on the ground when the door is open
  b.append(s(doc, 'polygon', {points: pts([[424, 420], [536, 420], [606, 538], [354, 538]]), class: 'cr-spill'}));

  // presence zone
  b.append(s(doc, 'ellipse', {cx: 480, cy: 468, rx: 96, ry: 17, class: 'cr-zone'}));

  // camera field of view + camera
  b.append(s(doc, 'polygon', {points: pts([[410, 310], [340, 424], [476, 424]]), fill: 'url(#crCone)', class: 'cr-cone'}),
    s(doc, 'line', {x1: 398, y1: 302, x2: 398, y2: 310, class: 'cr-cam-arm'}),
    s(doc, 'rect', {x: 386, y: 306, width: 26, height: 12, rx: 3, class: 'cr-cam'}),
    s(doc, 'circle', {cx: 412, cy: 312, r: 7, class: 'cr-lens-ring'}),
    s(doc, 'circle', {cx: 412, cy: 312, r: 3.6, class: 'cr-lens'}),
    s(doc, 'line', {x1: 380, y1: 322, x2: 426, y2: 302, class: 'cr-cam-slash'}));

  // door (closed leaves, and the swung leaf for open / held)
  const frame = [[424, 304], [536, 304], [536, 420], [424, 420]];
  b.append(s(doc, 'polygon', {points: pts(frame), class: 'cr-door-frame'}),
    s(doc, 'g', {class: 'cr-door-closed'},
      s(doc, 'rect', {x: 428, y: 308, width: 49, height: 112, class: 'cr-leaf'}),
      s(doc, 'rect', {x: 483, y: 308, width: 49, height: 112, class: 'cr-leaf'}),
      s(doc, 'line', {x1: 473, y1: 360, x2: 473, y2: 378, class: 'cr-handle'}),
      s(doc, 'line', {x1: 487, y1: 360, x2: 487, y2: 378, class: 'cr-handle'})),
    s(doc, 'g', {class: 'cr-door-open'},
      s(doc, 'rect', {x: 428, y: 308, width: 104, height: 112, class: 'cr-opening'}),
      s(doc, 'rect', {x: 428, y: 308, width: 49, height: 112, class: 'cr-leaf'}),
      s(doc, 'polygon', {points: pts([[483, 308], [521, 318], [521, 414], [483, 420]]), class: 'cr-leaf cr-leaf-swung'}),
      s(doc, 'line', {x1: 473, y1: 360, x2: 473, y2: 378, class: 'cr-handle'})));

  // reader pedestal
  b.append(s(doc, 'rect', {x: 566, y: 346, width: 22, height: 70, rx: 2, class: 'cr-reader'}),
    s(doc, 'rect', {x: 564, y: 342, width: 26, height: 6, rx: 2, class: 'cr-reader-cap'}),
    s(doc, 'circle', {cx: 577, cy: 358, r: 15, class: 'cr-led-halo'}),
    s(doc, 'circle', {cx: 577, cy: 358, r: 8, class: 'cr-led-ring'}),
    s(doc, 'circle', {cx: 577, cy: 358, r: 4.8, class: 'cr-led'}));
  for (let i = 0; i < 6; i++) b.append(s(doc, 'circle', {cx: 571 + (i % 3) * 6, cy: 376 + Math.floor(i / 3) * 7, r: 1.5, class: 'cr-key'}));

  // causal link between reader and door
  b.append(s(doc, 'path', {d: 'M 577 346 C 577 238, 480 238, 480 298', class: 'cr-link', pathLength: 1}),
    s(doc, 'g', {class: 'cr-link-label', transform: 'translate(530 258)'},
      s(doc, 'rect', {x: -44, y: -15, width: 88, height: 28, rx: 14, class: 'cr-link-pill'}),
      s(doc, 'text', {x: 0, y: 5, 'text-anchor': 'middle', class: 'cr-link-text'})));
  return g;
}

function foreground(doc) {
  return s(doc, 'g', {class: 'cr-l cr-l-fg', 'data-depth': 6},
    s(doc, 'ellipse', {cx: -10, cy: 590, rx: 230, ry: 100, fill: '#04070a', opacity: 0.92}),
    s(doc, 'ellipse', {cx: 1380, cy: 590, rx: 200, ry: 90, fill: '#04070a', opacity: 0.92}),
    s(doc, 'rect', {x: 552, y: 486, width: 16, height: 52, rx: 3, class: 'cr-bollard'}),
    s(doc, 'circle', {cx: 560, cy: 486, r: 6, class: 'cr-bollard-light'}),
    s(doc, 'circle', {cx: 560, cy: 486, r: 22, class: 'cr-bollard-glow'}),
    s(doc, 'rect', {x: 1276, y: 478, width: 16, height: 60, rx: 3, class: 'cr-bollard'}),
    s(doc, 'circle', {cx: 1284, cy: 478, r: 6, class: 'cr-bollard-light'}),
    s(doc, 'circle', {cx: 1284, cy: 478, r: 22, class: 'cr-bollard-glow'}));
}

function markers(doc) {
  const g = s(doc, 'g', {class: 'cr-markers', transform: `translate(${BX} 0)`, 'aria-hidden': 'true'});
  for (const n of SOURCE_NODES) {
    const [x, y] = MARKERS[n.id];
    g.append(s(doc, 'g', {class: 'cr-marker', 'data-node': n.id, transform: `translate(${x} ${y})`},
      s(doc, 'circle', {r: 24, class: 'cr-marker-hit'}), s(doc, 'circle', {r: 15, class: 'cr-marker-pulse'}), s(doc, 'circle', {r: 7, class: 'cr-marker-dot'})));
  }
  return g;
}

/** Create the scene. Returns the svg and the elements applyScene() updates. */
export function buildScene(doc) {
  const svg = s(doc, 'svg', {
    viewBox: `0 0 ${VIEW.w} ${VIEW.h}`, class: 'cr-svg', role: 'img', preserveAspectRatio: 'xMaxYMid slice', focusable: 'false',
    'aria-labelledby': 'cr-svg-title cr-svg-desc', 'data-reader': 'idle', 'data-door': 'closed', 'data-camera': 'unknown', 'data-presence': 'idle',
    'data-link': 'none', 'data-case': 'off', 'data-idle': 'true', 'data-selected': '',
  });
  const title = s(doc, 'title', {id: 'cr-svg-title'}); title.textContent = 'Stylized residential entrance, driven by recorded synthetic events (not camera footage)';
  const desc = s(doc, 'desc', {id: 'cr-svg-desc'}); desc.textContent = 'No signals recorded yet.';
  const defs = s(doc, 'defs', {},
    s(doc, 'linearGradient', {id: 'crSky', x1: 0, y1: 0, x2: 0, y2: 1}, stop(doc, 0, '#04070a'), stop(doc, 0.55, '#0c161c'), stop(doc, 1, '#17282f')),
    s(doc, 'linearGradient', {id: 'crGround', x1: 0, y1: 0, x2: 0, y2: 1}, stop(doc, 0, '#101a1f'), stop(doc, 1, '#06090b')),
    s(doc, 'linearGradient', {id: 'crFacade', x1: 0, y1: 0, x2: 1, y2: 0}, stop(doc, 0, '#141e24'), stop(doc, 0.5, '#1d2b32'), stop(doc, 1, '#111a20')),
    s(doc, 'linearGradient', {id: 'crGlass', x1: 0, y1: 0, x2: 0, y2: 1}, stop(doc, 0, '#1a3b44'), stop(doc, 1, '#0b1a20')),
    s(doc, 'radialGradient', {id: 'crLobby', cx: '50%', cy: '55%', r: '75%'}, stop(doc, 0, '#ffe2ae', 0.95), stop(doc, 1, '#6b4a1c', 0.35)),
    s(doc, 'linearGradient', {id: 'crCone', x1: 0, y1: 0, x2: 0, y2: 1}, stop(doc, 0, '#7fe3d0', 0.26), stop(doc, 1, '#7fe3d0', 0)),
    s(doc, 'radialGradient', {id: 'crVignette', cx: '50%', cy: '50%', r: '75%'}, stop(doc, 0.55, '#000', 0), stop(doc, 1, '#000', 0.62)));

  const far = skyline(doc, 'cr-l-far', 1, '#0a1115',
    [[-60, 300, 90], [30, 340, 60], [90, 262, 70], [160, 330, 52], [212, 292, 44], [300, 322, 60], [360, 280, 50], [420, 332, 70], [500, 300, 60], [570, 342, 50], [640, 292, 60], [1215, 300, 60], [1275, 250, 90]],
    [[8, 320], [44, 352], [110, 290], [128, 310], [176, 346], [226, 310], [318, 340], [378, 300], [440, 350], [518, 320], [586, 358], [660, 310], [1232, 320], [1296, 270]]);
  const mid = skyline(doc, 'cr-l-mid', 2, '#0f191e',
    [[-40, 372, 120], [76, 346, 78], [150, 380, 90], [250, 356, 70], [330, 384, 80], [420, 352, 70], [500, 388, 90], [600, 362, 70], [1215, 340, 60], [1270, 366, 100]],
    [[-10, 392], [30, 402], [96, 364], [122, 380], [268, 372], [350, 400], [436, 368], [520, 404], [620, 378], [1232, 356], [1296, 384]]);
  const markerLayer = markers(doc);
  svg.append(title, desc, defs, sky(doc), far, mid, building(doc), foreground(doc), markerLayer,
    s(doc, 'rect', {x: 0, y: 0, width: VIEW.w, height: VIEW.h, fill: 'url(#crVignette)', 'pointer-events': 'none'}));
  return {
    svg, desc, markers: [...markerLayer.childNodes], layers: [...svg.childNodes].filter(n => n.getAttribute && n.getAttribute('data-depth') !== null),
    linkText: svg.querySelector ? svg.querySelector('.cr-link-text') : null,
  };
}

/** Paint a derived scene model. Only attributes and short texts change; CSS does the drawing. */
export function applyScene(refs, scene, {selected = null} = {}) {
  const {svg} = refs;
  svg.setAttribute('data-idle', String(scene.idle));
  svg.setAttribute('data-reader', scene.reader);
  svg.setAttribute('data-door', scene.door);
  svg.setAttribute('data-camera', scene.camera);
  svg.setAttribute('data-presence', scene.presence);
  svg.setAttribute('data-link', scene.link ? scene.link.kind : 'none');
  svg.setAttribute('data-case', scene.caseId ? 'on' : 'off');
  svg.setAttribute('data-selected', selected || '');
  const text = svg.querySelector('.cr-link-text');
  if (text) text.textContent = scene.link ? (scene.link.kind === 'case' ? `${scene.link.gap} s` : `${scene.link.gap} s \u2715`) : '';
  for (const m of refs.markers) {
    const id = m.getAttribute('data-node'), n = scene.nodes.find(x => x.id === id);
    m.setAttribute('data-state', n.state);
    m.setAttribute('data-attention', String(['denied', 'held', 'offline', 'long'].includes(n.state)));
    m.setAttribute('data-selected', String(selected === id));
  }
  refs.desc.textContent = sceneSummary(scene);
}

/** One sentence per scene, used for the SVG description and the live caption. */
export function sceneSummary(scene) {
  if (scene.idle) return 'The building is quiet. No signals have been recorded yet.';
  const parts = scene.nodes.map(n => `${nodeName(n.id)}: ${stateLabel(n.id, n.state).toLowerCase()}`);
  let tail = '';
  if (scene.link?.kind === 'case') tail = ` A linked case joins the reader and the door ${span(scene.link.gap)} apart.`;
  else if (scene.link?.kind === 'near-miss') tail = ` The denial and the door are ${span(scene.link.gap)} apart, but a rule condition fails, so no case is created.`;
  return parts.join('. ') + '.' + tail;
}
