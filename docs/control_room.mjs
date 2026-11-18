/**
 * GhostBridge Control Room: pure model. No DOM, no timers, no network.
 *
 * Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).
 *
 * Everything the Control Room draws is derived here from the ledger rows (and the cases that
 * correlate() produced). Rule constants are imported from correlator.mjs and never copied.
 * Inputs are never mutated.
 */
import {devices} from './engine.mjs';
import {WINDOW_SECONDS, DOOR_HELD_THRESHOLD} from './correlator.mjs';
import {formatSeconds} from './reconstruction.mjs';

export {WINDOW_SECONDS, DOOR_HELD_THRESHOLD};

/** The four source nodes shown on the building. `id` is the scene slot, `deviceId` the ledger device. */
export const SOURCE_NODES = Object.freeze([
  Object.freeze({id: 'door', deviceId: 'door-01'}),
  Object.freeze({id: 'reader', deviceId: 'reader-01'}),
  Object.freeze({id: 'camera', deviceId: 'camera-01'}),
  Object.freeze({id: 'presence', deviceId: 'zone-01'}),
]);

export const toSeconds = ts => Math.floor(Date.parse(ts) / 1000);
export const clockOf = at => at.slice(11, 19);
export const nodeName = id => devices[SOURCE_NODES.find(n => n.id === id).deviceId].name;
const byTime = (a, b) => (a.sec !== b.sec ? a.sec - b.sec : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
/** "270 s" below a minute, otherwise "270 s (4 min 30 s)". */
export const span = s => (Math.abs(s) < 60 ? `${Math.abs(s)} s` : `${Math.abs(s)} s (${formatSeconds(s)})`);

/** Ledger rows to flat, time-sorted items. */
export function flatten(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => {
    const e = row.payload.event;
    return {
      row, id: e.id, at: e.at, sec: toSeconds(e.at), type: e.type, device: e.device,
      duration: Number.isInteger(e.data?.duration_seconds) ? e.data.duration_seconds : null,
      hash: row.hash, previous: row.previous, seq: row.seq, incident: row.payload.incident || null,
    };
  }).sort(byTime);
}

/** Keep only cases whose events and hashes really exist in `rows` (guards against stale async results). */
export function validCases(rows, cases) {
  if (!Array.isArray(cases) || !Array.isArray(rows)) return [];
  const byId = new Map(rows.map(r => [r.payload.event.id, r.hash]));
  return cases.filter(c => Array.isArray(c.event_ids) && c.event_ids.length === 2
    && Array.isArray(c.evidence_hashes) && c.event_ids.every((id, i) => byId.get(id) === c.evidence_hashes[i]));
}

/**
 * Describe the denial / door relationship the way the correlation rule sees it.
 * kind: 'case' (both conditions pass), 'near-miss' (a door followed but a condition failed), 'none'.
 */
export function explainPair(rows) {
  const items = flatten(rows);
  const denials = items.filter(i => i.type === 'access.denied');
  if (!items.length) return {kind: 'none', denied: null, door: null, reasons: [], summary: 'No signals recorded yet.'};
  if (!denials.length) return {kind: 'none', denied: null, door: null, reasons: [], summary: 'No access denial is recorded, so no cross-source case can form.'};
  const qualifies = (denied, d) => d.sec - denied.sec <= WINDOW_SECONDS && d.duration >= DOOR_HELD_THRESHOLD;
  const doorsAfter = denied => items.filter(i => i.type === 'door.open' && i.sec > denied.sec);
  let denied = denials.find(d => doorsAfter(d).some(x => qualifies(d, x))) || null;
  let door = denied ? doorsAfter(denied).find(x => qualifies(denied, x)) : null;
  if (!denied) {
    // No pair qualifies: explain the pair that is closest in time, because that is the one an operator wonders about.
    let best = null;
    for (const d of denials) for (const x of doorsAfter(d)) { const g = x.sec - d.sec; if (!best || g < best.g) best = {d, x, g}; }
    denied = best ? best.d : denials[0];
    door = best ? best.x : null;
  }
  if (!door) return {kind: 'none', denied, door: null, reasons: [], summary: 'A badge was rejected, but no door opening followed it in the ledger.'};
  const gap = door.sec - denied.sec, hold = door.duration;
  const windowPass = gap <= WINDOW_SECONDS, holdPass = hold >= DOOR_HELD_THRESHOLD;
  const reasons = [
    {id: 'window', pass: windowPass, text: windowPass
      ? `Door opened ${span(gap)} after the denial: ${WINDOW_SECONDS - gap} s inside the ${WINDOW_SECONDS} s window.`
      : `Door opened ${span(gap)} after the denial: ${gap - WINDOW_SECONDS} s outside the ${WINDOW_SECONDS} s window.`},
    {id: 'hold', pass: holdPass, text: holdPass
      ? `Door held ${span(hold)}: ${hold - DOOR_HELD_THRESHOLD} s above the ${DOOR_HELD_THRESHOLD} s threshold.`
      : `Door held ${span(hold)}: ${DOOR_HELD_THRESHOLD - hold} s below the ${DOOR_HELD_THRESHOLD} s threshold.`},
  ];
  const kind = windowPass && holdPass ? 'case' : 'near-miss';
  const summary = kind === 'case'
    ? `A badge was rejected, then the entrance opened ${span(gap)} later and stayed open ${span(hold)}. Both conditions pass: one linked case.`
    : `A badge was rejected, but the rule is not met. ${reasons.map(r => r.text).join(' ')} No case is created.`;
  return {kind, denied, door, gap, hold, windowPass, holdPass, reasons, summary};
}

/** Scene state at `cursor` seconds (null = end of ledger). Pure function of the ledger. */
export function deriveScene(rows, cursor = null, cases = []) {
  const items = flatten(rows);
  const at = cursor === null || cursor === undefined ? Infinity : cursor;
  const seen = items.filter(i => i.sec <= at);
  const lastOf = device => seen.filter(i => i.device === device).at(-1) || null;
  const ev = {door: lastOf('door-01'), reader: lastOf('reader-01'), camera: lastOf('camera-01'), presence: lastOf('zone-01')};

  const reader = !ev.reader ? 'idle' : ev.reader.type === 'access.denied' ? 'denied' : 'granted';
  // A door is only 'held open' once it has been open for the threshold; before that it is simply open. The ledger already knows the
  // final duration, so the scene replays the physics: opens at T, becomes held at T + threshold.
  const heldAt = i => (i.incident?.rule === 'door-held' ? i.sec + DOOR_HELD_THRESHOLD : Infinity);
  // Infinity >= Infinity is true, so a door that can never be "held" (short hold) must be excluded explicitly.
  const door = !ev.door || ev.door.type === 'door.closed' ? 'closed' : Number.isFinite(heldAt(ev.door)) && at >= heldAt(ev.door) ? 'held' : 'open';
  const camera = !ev.camera ? 'unknown' : ev.camera.type === 'camera.offline' ? 'offline' : 'online';
  const presence = !ev.presence ? 'idle' : ev.presence.incident?.rule === 'long-dwell' ? 'long' : 'dwell';

  const pair = explainPair(rows);
  const good = validCases(rows, cases)[0] || null;
  let link = null;
  if (good) {
    const d = items.find(i => i.id === good.event_ids[0]), o = items.find(i => i.id === good.event_ids[1]);
    // The case exists once the door has been held for the threshold, not the instant it opened.
    if (d && o && d.sec <= at && heldAt(o) <= at) link = {kind: 'case', gap: o.sec - d.sec, hold: o.duration, caseId: good.id, deniedId: d.id, doorId: o.id};
  } else if (pair.kind === 'near-miss' && pair.denied.sec <= at && pair.door.sec <= at) {
    link = {kind: 'near-miss', gap: pair.gap, hold: pair.hold, windowPass: pair.windowPass, holdPass: pair.holdPass, deniedId: pair.denied.id, doorId: pair.door.id};
  }

  const state = {door, reader, camera, presence};
  const nodes = SOURCE_NODES.map(n => ({
    id: n.id, deviceId: n.deviceId, name: devices[n.deviceId].name, protocol: devices[n.deviceId].protocol,
    state: state[n.id], event: ev[n.id],
  }));
  return {
    cursor: at === Infinity ? null : at, idle: items.length === 0, door, reader, camera, presence, link,
    caseId: link?.kind === 'case' ? link.caseId : null, nodes,
    // Finite cursor: the clock shows that moment. Live (no cursor): the time of the latest recorded event.
    clock: Number.isFinite(at) && items.length ? new Date(at * 1000).toISOString().replace('.000Z', 'Z') : seen.length ? seen.at(-1).at : null,
    bounds: items.length ? {start: items[0].sec, end: items.at(-1).sec} : null,
  };
}

/** Human words for a node state (colour is never the only signal). */
export function stateLabel(nodeId, state) {
  const t = {
    door: {closed: 'Closed', open: 'Open', held: 'Held open'},
    reader: {idle: 'Idle', denied: 'Access denied', granted: 'Access granted'},
    camera: {unknown: 'No signal yet', online: 'Online', offline: 'Offline'},
    presence: {idle: 'Quiet', dwell: 'Presence', long: 'Long dwell'},
  };
  return t[nodeId][state];
}

/** Why a held-open door that is not part of the case is not linked to `denied`. */
export function exclusionReason(denied, item) {
  const delta = item.sec - denied.sec;
  if (delta < 0) return `Opened ${span(delta)} before the denial, so it cannot be linked to it.`;
  if (delta === 0) return 'Opened in the same second as the denial; a match must come strictly after it.';
  if (delta > WINDOW_SECONDS) return `Opened ${span(delta)} after the denial: ${delta - WINDOW_SECONDS} s outside the ${WINDOW_SECONDS} s window.`;
  return 'It qualifies, but the earliest qualifying door event is the one linked to the case.';
}

/** Events drawn to scale for the Timeline mode. */
export function buildTimeline(rows, cases = []) {
  const items = flatten(rows);
  const good = validCases(rows, cases)[0] || null;
  const pair = explainPair(rows);
  const kindOf = i => {
    if (good) {
      if (i.id === good.event_ids[0]) return 'anchor';
      if (i.id === good.event_ids[1]) return 'match';
      if (i.type === 'door.open' && i.incident?.rule === 'door-held') return 'excluded';
    } else if (pair.kind === 'near-miss') {
      if (i.id === pair.denied.id) return 'anchor';
      if (i.id === pair.door.id) return 'near';
    }
    return 'event';
  };
  if (!items.length) return {empty: true, items: [], start: null, end: null, span: 0};
  const start = items[0].sec, end = items.at(-1).sec, total = end - start;
  return {
    empty: false, start, end, span: total,
    items: items.map(i => ({
      id: i.id, at: i.at, sec: i.sec, time: clockOf(i.at), offset: i.sec - start, pct: total > 0 ? ((i.sec - start) / total) * 100 : 50,
      device: i.device, deviceName: devices[i.device]?.name ?? i.device, type: i.type, duration: i.duration, hash: i.hash, previous: i.previous,
      seq: i.seq, kind: kindOf(i), incident: i.incident ? {title: i.incident.title, severity: i.incident.severity, rule: i.incident.rule} : null,
    })),
  };
}

/** Disconnected alarms on one side, one explained outcome on the other. */
export function beforeAfter(rows, cases = []) {
  const items = flatten(rows);
  const good = validCases(rows, cases)[0] || null;
  const pair = explainPair(rows);
  const alarms = items.filter(i => i.incident).map(i => ({
    id: i.id, time: clockOf(i.at), device: devices[i.device]?.name ?? i.device, title: i.incident.title, severity: i.incident.severity, hash: i.hash,
  }));
  let outcome;
  if (good) {
    outcome = {kind: 'case', title: 'One explained incident', line: good.explanation, caseId: good.id, severity: good.severity, eventIds: [...good.event_ids]};
  } else if (pair.kind === 'near-miss') {
    outcome = {kind: 'near-miss', title: 'No correlated case', line: pair.summary, caseId: null, eventIds: [pair.denied.id, pair.door.id]};
  } else {
    outcome = {kind: 'none', title: alarms.length ? 'Standalone findings only' : 'Nothing to connect yet', line: pair.summary, caseId: null, eventIds: []};
  }
  return {alarms, outcome, count: alarms.length};
}

/** Advisory next steps. Text only: nothing here controls a device or contacts anyone. */
export function recommend(rows, cases = []) {
  const items = flatten(rows), pair = explainPair(rows), good = validCases(rows, cases)[0] || null;
  const cameraOff = items.find(i => i.type === 'camera.offline');
  if (!items.length) return ['Run a scenario, Forge an incident, or press Showcase Mode to see the building speak.'];
  const steps = [];
  if (good) {
    const d = items.find(i => i.id === good.event_ids[0]), o = items.find(i => i.id === good.event_ids[1]);
    steps.push(`Review the entrance for the window ${clockOf(d.at)} to ${clockOf(new Date((o.sec + o.duration) * 1000).toISOString().replace('.000Z', 'Z'))} UTC.`);
    steps.push('Confirm with on-site staff whether the rejected badge holder was expected.');
    steps.push(`Check the ${nodeName('door').toLowerCase()} latch and relay for an obstruction before it is cleared.`);
    steps.push('If the door is still reported open, escalate to the property manager with this case ID.');
  } else if (pair.kind === 'near-miss') {
    steps.push('No case was created, so treat both events as separate findings and review each on its own.');
    steps.push('Both records stay in the ledger; change the timing or hold in the Forge to see where the rule flips.');
  } else {
    steps.push('Review the standalone findings in the Incident desk; none of them link across sources.');
  }
  if (cameraOff) steps.push(`Camera coverage may be reduced: the ${nodeName('camera').toLowerCase()} reported offline at ${clockOf(cameraOff.at)} UTC.`);
  return steps;
}

/** The six operator questions. */
export function buildBoard(rows, cases = []) {
  const items = flatten(rows), pair = explainPair(rows), good = validCases(rows, cases)[0] || null;
  if (!items.length) return {ready: false, kind: 'none', what: 'The building is quiet. Nothing has been recorded yet.', where: [], why: [], excluded: [], evidence: [], next: recommend(rows, cases), caseId: null};
  const where = [];
  const named = id => items.find(i => i.id === id);
  const used = good ? good.event_ids.map(named) : pair.denied && pair.door ? [pair.denied, pair.door] : [];
  for (const u of used) where.push(`${devices[u.device].name} (${u.device})`);
  const excluded = [];
  if (pair.denied) {
    for (const i of items) {
      if (i.type !== 'door.open' || i.incident?.rule !== 'door-held') continue;
      if (used.some(u => u.id === i.id)) continue;
      excluded.push({id: i.id, reason: exclusionReason(pair.denied, i)});
    }
  }
  const evidence = (used.length ? used : items.slice(0, 3)).map(u => ({id: u.id, at: u.at, hash: u.hash}));
  return {
    ready: true, kind: good ? 'case' : pair.kind, caseId: good ? good.id : null,
    what: good ? good.explanation : pair.summary,
    where, why: good ? pair.reasons.map(r => r.text) : pair.reasons.map(r => r.text), excluded, evidence, next: recommend(rows, cases),
  };
}

/** One node's latest recorded fact, for the source inspector. */
export function nodeInfo(rows, nodeId, cursor = null) {
  const scene = deriveScene(rows, cursor);
  const n = scene.nodes.find(x => x.id === nodeId);
  if (!n) return null;
  const e = n.event;
  return {
    id: n.id, deviceId: n.deviceId, name: n.name, protocol: n.protocol, state: n.state, stateLabel: stateLabel(n.id, n.state),
    has: !!e, eventId: e?.id ?? null, at: e?.at ?? null, type: e?.type ?? null, duration: e?.duration ?? null,
    hash: e?.hash ?? null, previous: e?.previous ?? null, rowSeq: e?.seq ?? null, rule: e?.incident ? `${e.incident.title} (${e.incident.rule}, ${e.incident.severity})` : null,
  };
}
