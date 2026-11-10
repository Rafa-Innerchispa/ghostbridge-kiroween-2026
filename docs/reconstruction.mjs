/**
 * GhostBridge interactive evidence reconstruction — pure data projection (no DOM).
 *
 * Authored by Kiro (Kiroween 2026, feat/evidence-reconstruction).
 *
 * buildReconstruction(rows, caseObj) turns a verified ledger plus one correlated
 * case into an ordered, explainable playback model:
 *   - the hash chain is verified first (verify() from engine.mjs);
 *   - the case is RE-DERIVED with correlate() from correlator.mjs, so a forged or stale
 *     case object can never produce a scene;
 *   - every step, timestamp, device, duration and hash is read from ledger rows.
 *
 * Invariants:
 *   - Read-only. `rows` and `caseObj` are never mutated or persisted.
 *   - Nothing here is hardcoded to a fixture: IDs, times and hashes come from the ledger.
 *   - Thresholds are imported from correlator.mjs, never duplicated.
 *   - Failure is explicit: a ReconstructionError, never a plausible-looking scene.
 */
import {devices, verify} from './engine.mjs';
import {correlate, WINDOW_SECONDS, DOOR_HELD_THRESHOLD, RULE_NAME} from './correlator.mjs';

export class ReconstructionError extends Error {
  /** @param {string} code  machine-readable reason  @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = 'ReconstructionError';
    this.code = code;
  }
}

/** Error codes surfaced to the UI and tests. */
export const ERROR_CODES = Object.freeze({
  NO_CASE: 'NO_CASE',
  INTEGRITY: 'INTEGRITY',
  EVIDENCE_MISSING: 'EVIDENCE_MISSING',
  CASE_NOT_DERIVABLE: 'CASE_NOT_DERIVABLE',
  EVIDENCE_MISMATCH: 'EVIDENCE_MISMATCH',
});

const toSeconds = ts => Math.floor(Date.parse(ts) / 1000);
const sameList = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
const cmpEvent = (a, b) => (a.at !== b.at ? (a.at < b.at ? -1 : 1) : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Human readable duration, e.g. 75 seconds -> "1 min 15 s", 45 -> "45 s".
 * @param {number} seconds
 */
export function formatSeconds(seconds) {
  const s = Math.abs(Math.trunc(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}

/** Exact seconds first, friendly form in brackets once it is a minute or more: "75 s (1 min 15 s)". */
const span = seconds => {
  const s = Math.abs(Math.trunc(seconds));
  return s < 60 ? `${s} s` : `${s} s (${formatSeconds(s)})`;
};

/** Time-of-day part of a UTC ISO timestamp (characters 11 to 19). */
const clock = at => at.slice(11, 19);

function describeExclusion(row, denied, matchedAtSeconds) {
  const evt = row.payload.event;
  const delta = toSeconds(evt.at) - toSeconds(denied.at);
  const hold = evt.data.duration_seconds;
  if (delta < 0) {
    return {code: 'before-denial', deltaSeconds: delta,
      reason: `Opened ${span(delta)} before the denial (${clock(evt.at)}). A match must come after the denial, so this event is not linked.`};
  }
  if (delta === 0) {
    return {code: 'before-denial', deltaSeconds: delta,
      reason: `Opened in the same second as the denial (${clock(evt.at)}). A match must come strictly after the denial, so this event is not linked.`};
  }
  if (delta > WINDOW_SECONDS) {
    return {code: 'outside-window', deltaSeconds: delta,
      reason: `Opened ${span(delta)} after the denial, beyond the ${WINDOW_SECONDS} s window, so this event is not linked.`};
  }
  if (toSeconds(evt.at) < matchedAtSeconds) {
    return {code: 'paired-elsewhere', deltaSeconds: delta,
      reason: `Opened ${span(delta)} after the denial and held ${hold} s, but it is already linked to a different case.`};
  }
  return {code: 'later-candidate', deltaSeconds: delta,
    reason: `Opened ${span(delta)} after the denial and held ${hold} s. It qualifies, but the earliest qualifying event is used for this case.`};
}

function baseStep(row, kind) {
  const evt = row.payload.event, inc = row.payload.incident;
  const dev = devices[evt.device];
  return {
    kind,
    eventId: evt.id,
    at: evt.at,
    time: clock(evt.at),
    deviceId: evt.device,
    deviceName: dev ? dev.name : evt.device,
    deviceKind: dev ? dev.kind : 'unknown',
    eventType: evt.type,
    durationSeconds: Number.isInteger(evt.data.duration_seconds) ? evt.data.duration_seconds : null,
    rowSeq: row.seq,
    hash: row.hash,
    previous: row.previous,
    incident: inc ? {rule: inc.rule, severity: inc.severity, title: inc.title} : null,
  };
}

/**
 * Build the reconstruction model for one correlated case.
 *
 * @param {ReadonlyArray<object>} rows  Full ledger rows (not mutated).
 * @param {object} caseObj              A case from correlate() or GET /api/cases.
 * @returns {Promise<object>}           Playback model (see fields below).
 * @throws {ReconstructionError}
 */
export async function buildReconstruction(rows, caseObj) {
  if (!Array.isArray(rows)) throw new ReconstructionError(ERROR_CODES.INTEGRITY, 'The evidence ledger is not available.');
  if (!caseObj || typeof caseObj !== 'object') throw new ReconstructionError(ERROR_CODES.NO_CASE, 'Select a correlated case to reconstruct.');
  if (!Array.isArray(caseObj.event_ids) || caseObj.event_ids.length !== 2
      || !Array.isArray(caseObj.evidence_hashes) || caseObj.evidence_hashes.length !== 2) {
    throw new ReconstructionError(ERROR_CODES.EVIDENCE_MISSING, 'The case does not reference two source events with evidence hashes.');
  }

  // 1. Refuse to draw anything from a ledger that fails its SHA-256 chain.
  const integrity = await verify(rows);
  if (!integrity.valid) {
    throw new ReconstructionError(ERROR_CODES.INTEGRITY, 'Ledger integrity verification failed, so no reconstruction is shown.');
  }

  // 2. Re-derive the case from the verified ledger; never trust the caller's copy.
  const derived = (await correlate(rows)).find(c => c.id === caseObj.id);
  if (!derived) {
    throw new ReconstructionError(ERROR_CODES.CASE_NOT_DERIVABLE, 'This case cannot be derived from the current verified ledger.');
  }
  if (!sameList(derived.event_ids, caseObj.event_ids) || !sameList(derived.evidence_hashes, caseObj.evidence_hashes)) {
    throw new ReconstructionError(ERROR_CODES.EVIDENCE_MISMATCH, 'The case evidence does not match the verified ledger.');
  }

  // 3. Resolve source rows by event ID and compare each hash with the ledger row.
  const byId = new Map();
  for (const row of rows) {
    const id = row.payload.event.id;
    if (byId.has(id)) throw new ReconstructionError(ERROR_CODES.EVIDENCE_MISMATCH, `Event ${id} appears more than once in the ledger.`);
    byId.set(id, row);
  }
  const [deniedId, doorId] = derived.event_ids;
  const deniedRow = byId.get(deniedId), doorRow = byId.get(doorId);
  if (!deniedRow || !doorRow) throw new ReconstructionError(ERROR_CODES.EVIDENCE_MISSING, 'A source event of this case is missing from the ledger.');
  // Defense in depth: correlate() derives these hashes from the same rows, so today this cannot
  // fail. It keeps the invariant explicit if the correlator or the lookup ever changes.
  const hashesMatch = deniedRow.hash === caseObj.evidence_hashes[0] && doorRow.hash === caseObj.evidence_hashes[1];
  if (!hashesMatch) {
    throw new ReconstructionError(ERROR_CODES.EVIDENCE_MISMATCH, 'A source hash does not match its ledger row.');
  }

  const denied = deniedRow.payload.event, door = doorRow.payload.event;
  const gap = toSeconds(door.at) - toSeconds(denied.at);
  const hold = door.data.duration_seconds;

  // 4. Other long-held door events that were considered and not linked to this case.
  const matchedAt = toSeconds(door.at);
  const excludedRows = rows.filter(r => {
    const e = r.payload.event;
    return r !== doorRow && e.type === 'door.open' && Number.isInteger(e.data.duration_seconds) && e.data.duration_seconds >= DOOR_HELD_THRESHOLD;
  });
  const exclusions = excludedRows.map(r => ({eventId: r.payload.event.id, ...describeExclusion(r, denied, matchedAt)}));

  // 5. Ordered playback steps (by UTC time, then ID), then the derived case.
  const eventSteps = [
    ...excludedRows.map(r => ({row: r, kind: 'excluded'})),
    {row: deniedRow, kind: 'anchor'},
    {row: doorRow, kind: 'match'},
  ].sort((a, b) => cmpEvent(a.row.payload.event, b.row.payload.event));
  const startSeconds = toSeconds(eventSteps[0].row.payload.event.at);

  const steps = eventSteps.map(({row, kind}) => {
    const step = baseStep(row, kind);
    step.offsetSeconds = toSeconds(step.at) - startSeconds;
    if (kind === 'excluded') {
      const ex = exclusions.find(x => x.eventId === step.eventId);
      step.title = `${step.eventId} considered, not linked`;
      step.reason = ex.reason;
      step.narration = `${clock(step.at)} UTC. ${step.deviceName} opened and was held ${step.durationSeconds} s (${step.eventId}). ${ex.reason}`;
    } else if (kind === 'anchor') {
      step.title = `${step.eventId} access denied`;
      step.narration = `${clock(step.at)} UTC. ${step.deviceName} rejected an access attempt (${step.eventId}). This opens a ${WINDOW_SECONDS} s correlation window.`;
    } else {
      step.title = `${step.eventId} door held open`;
      step.narration = `${clock(step.at)} UTC. ${step.deviceName} opened ${span(gap)} after the denial and was held ${hold} s (${step.eventId}). That is inside the ${WINDOW_SECONDS} s window and at or above the ${DOOR_HELD_THRESHOLD} s threshold.`;
    }
    return step;
  });

  steps.push({
    kind: 'case',
    eventId: null,
    caseId: derived.id,
    at: door.at,
    time: clock(door.at),
    offsetSeconds: toSeconds(door.at) - startSeconds,
    title: `${derived.severity.toUpperCase()} priority case derived`,
    severity: derived.severity,
    rule: derived.rule,
    hashes: [...derived.evidence_hashes],
    eventIds: [...derived.event_ids],
    explanation: derived.explanation,
    narration: `${clock(door.at)} UTC. The ledger now holds both signals, so GhostBridge derives one ${derived.severity} priority case (${derived.rule}). ${derived.explanation}`,
  });
  steps.forEach((s, i) => { s.index = i; });

  const slack = WINDOW_SECONDS - gap, margin = hold - DOOR_HELD_THRESHOLD;
  const checks = [
    {id: 'order', passed: gap > 0,
      label: 'Door opened after the denial',
      detail: `${door.id} at ${clock(door.at)} follows ${denied.id} at ${clock(denied.at)}.`},
    {id: 'window', passed: gap <= WINDOW_SECONDS,
      label: `Within the ${WINDOW_SECONDS} s window`,
      detail: `${gap} s between the signals (${formatSeconds(gap)}); ${slack} s of margin.`},
    {id: 'hold', passed: hold >= DOOR_HELD_THRESHOLD,
      label: `Held at least ${DOOR_HELD_THRESHOLD} s`,
      detail: `Held ${hold} s (${formatSeconds(hold)}); ${margin} s above the threshold.`},
    {id: 'hashes', passed: hashesMatch,
      label: 'Source hashes match the ledger',
      detail: `Rows #${deniedRow.seq} and #${doorRow.seq} resolve to the hashes cited by the case.`},
    {id: 'chain', passed: integrity.valid,
      label: 'Hash chain verified',
      detail: `${integrity.checked} ledger record${integrity.checked === 1 ? '' : 's'} verified from the genesis hash.`},
  ];

  return {
    caseId: derived.id,
    rule: derived.rule || RULE_NAME,
    severity: derived.severity,
    title: derived.title,
    explanation: derived.explanation,
    totalSeconds: steps[steps.length - 1].offsetSeconds,
    startAt: eventSteps[0].row.payload.event.at,
    endAt: door.at,
    integrity: {valid: true, checked: integrity.checked, head: integrity.head},
    steps,
    why: {
      gapSeconds: gap,
      windowSeconds: WINDOW_SECONDS,
      windowSlackSeconds: slack,
      holdSeconds: hold,
      thresholdSeconds: DOOR_HELD_THRESHOLD,
      holdMarginSeconds: margin,
      deniedEventId: denied.id,
      doorEventId: door.id,
      checks,
      exclusions,
    },
  };
}

/**
 * Pure description of what the scene should show after `cursor` steps are revealed.
 * cursor 0 = nothing revealed yet; cursor === steps.length = everything revealed.
 *
 * @param {object} model   from buildReconstruction()
 * @param {number} cursor  integer 0..steps.length (clamped)
 */
export function sceneStateAt(model, cursor) {
  const n = model.steps.length;
  const c = Math.max(0, Math.min(n, Math.trunc(Number.isFinite(cursor) ? cursor : 0)));
  const revealed = model.steps.slice(0, c);
  const current = c > 0 ? model.steps[c - 1] : null;
  const has = kind => revealed.some(s => s.kind === kind);
  return {
    cursor: c,
    total: n,
    current,
    clock: current ? current.time : null,
    elapsedSeconds: current ? current.offsetSeconds : 0,
    reader: has('anchor') ? 'denied' : 'idle',
    door: has('match') ? 'held-open' : 'closed',
    link: has('match') && has('anchor'),
    caseVisible: has('case'),
    excludedIds: revealed.filter(s => s.kind === 'excluded').map(s => s.eventId),
    narration: current
      ? current.narration
      : `Ready. ${n} recorded steps spanning ${formatSeconds(model.totalSeconds)} of ledger time. Press Play or Next to begin.`,
    valueText: current ? `Step ${c} of ${n}: ${current.title}, ${current.time} UTC` : `Start, step 0 of ${n}`,
    done: c === n,
  };
}
