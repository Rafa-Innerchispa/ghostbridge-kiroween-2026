/**
 * Incident Time Machine: the eight beats of one incident, derived from the ledger.
 * Authored by Kiro's main session agent (Kiroween 2026, feat/kiro-winning-experience), not by the ui-director or qa-auditor custom agents.
 *
 * Pure and synchronous. Every timestamp, event id, hash, gap, hold and case id in a step is read from the ledger rows (and the
 * correlator's cases); nothing is typed in. Each step also carries a `cursor` (seconds since epoch) that the Control Room's
 * existing scene model (`deriveScene`) renders, so the picture and the caption cannot disagree. A near miss (for example 301/119)
 * still produces all eight beats: the beats that did not happen are marked `reached: false` and say which condition failed and by how much.
 */
import {WINDOW_SECONDS, DOOR_HELD_THRESHOLD} from './correlator.mjs';
import {devices} from './engine.mjs';
import {explainPair, validCases, flatten, recommend, clockOf, span} from './control_room.mjs';

export const STEP_IDS = Object.freeze(['normal', 'denied', 'door-open', 'door-held', 'threshold', 'case', 'evidence', 'response']);
const short = h => (h ? `${h.slice(0, 10)}…${h.slice(-4)}` : null);
const name = id => devices[id]?.name ?? id;

/** @returns {{empty:boolean, kind:'empty'|'none'|'case'|'near-miss', steps:object[], note:string}} */
export function buildTimeMachine(rows, cases = []) {
  const items = flatten(rows);
  if (!items.length) return {empty: true, kind: 'empty', steps: [], note: 'The ledger is empty. Run a scenario, Forge an incident, or press Showcase Mode.'};
  const pair = explainPair(rows);
  if (!pair.denied || !pair.door) {
    return {empty: false, kind: 'none', steps: [], note: pair.summary};
  }
  const good = validCases(rows, cases)[0] || null;
  const {denied, door} = pair;
  const gap = door.sec - denied.sec, hold = door.duration;
  const start = items[0].sec;
  const heldAt = door.sec + DOOR_HELD_THRESHOLD;
  const isCase = Boolean(good);
  // Where the story rests once the door has been watched: at the threshold if it was held, otherwise as long as it was observed open.
  const settle = hold >= DOOR_HELD_THRESHOLD ? heldAt : door.sec + hold;
  const windowPass = gap <= WINDOW_SECONDS, holdPass = hold >= DOOR_HELD_THRESHOLD;
  const reasonText = id => pair.reasons.find(r => r.id === id)?.text ?? '';
  const ref = i => ({id: i.id, at: i.at, hash: i.hash, hashShort: short(i.hash), seq: i.seq});
  // A time is either RECORDED (a ledger event's own timestamp) or DERIVED (the recorded open time plus the rule's hold threshold).
  // A derived time is never presented as if it were recorded (qa-auditor Phase 6 finding M1).
  const derivedAt = new Date(heldAt * 1000).toISOString().replace('.000Z', 'Z');
  const derivedNote = `Derived, not recorded: the door's recorded open time plus the ${DOOR_HELD_THRESHOLD} s hold threshold.`;
  const derived = on => (on ? {at: derivedAt, atKind: 'derived', atNote: derivedNote} : {at: null, atKind: null, atNote: null});

  const steps = [
    {
      id: 'normal', label: 'Quiet building', reached: true, cursor: start - 1, at: null, atKind: null, atNote: null, events: [],
      caption: `Before the first recorded event (${clockOf(items[0].at)} UTC) every source is quiet.`,
    },
    {
      id: 'denied', label: 'Access denied', reached: true, cursor: denied.sec, at: denied.at, atKind: 'recorded', atNote: null, events: [ref(denied)],
      caption: `${name(denied.device)} rejected a badge at ${clockOf(denied.at)} UTC (${denied.id}).`,
    },
    {
      id: 'door-open', label: 'Door opens', reached: true, cursor: door.sec, at: door.at, atKind: 'recorded', atNote: null, events: [ref(door)],
      caption: `${name(door.device)} opened at ${clockOf(door.at)} UTC, ${span(gap)} after the denial. ${reasonText('window')}`,
    },
    {
      id: 'door-held', label: 'Door stays open', reached: holdPass, cursor: settle, ...derived(holdPass),
      events: [ref(door)],
      caption: holdPass
        ? `Still open ${DOOR_HELD_THRESHOLD} s after it opened. ${reasonText('hold')}`
        : `The door was open only ${span(hold)}, so it never became a held-open door. ${reasonText('hold')}`,
    },
    {
      id: 'threshold', label: 'Rule conditions', reached: windowPass && holdPass, cursor: settle, ...derived(windowPass && holdPass),
      events: [ref(denied), ref(door)],
      caption: windowPass && holdPass
        ? `Both conditions pass: ${WINDOW_SECONDS - gap} s inside the ${WINDOW_SECONDS} s window and ${hold - DOOR_HELD_THRESHOLD} s above the ${DOOR_HELD_THRESHOLD} s threshold.`
        : `The rule is not met. ${[windowPass ? '' : reasonText('window'), holdPass ? '' : reasonText('hold')].filter(Boolean).join(' ')}`,
    },
    {
      id: 'case', label: isCase ? 'Case appears' : 'No case', reached: isCase, cursor: settle, ...derived(isCase),
      caseId: good?.id ?? null, events: isCase ? [ref(denied), ref(door)] : [],
      caption: isCase ? good.explanation : 'No correlated case is created. Both records stay in the ledger as separate findings.',
    },
    {
      id: 'evidence', label: 'Evidence chain', reached: isCase, cursor: settle, ...derived(isCase),
      events: isCase ? good.evidence_hashes.map((h, k) => ({...ref(k === 0 ? denied : door), hash: h, hashShort: short(h)})) : [],
      caption: isCase
        ? `The case cites two ledger rows: ${short(good.evidence_hashes[0])} (denial) and ${short(good.evidence_hashes[1])} (door). Each hash covers the whole chain before it.`
        : 'There is no case to cite. The individual rows can still be inspected and verified.',
    },
    {
      id: 'response', label: 'Recommended response', reached: true, cursor: settle, at: null, atKind: null, atNote: null, events: [],
      caption: recommend(rows, cases)[0],
      advice: recommend(rows, cases),
    },
  ];
  return {
    empty: false, kind: isCase ? 'case' : 'near-miss', steps,
    note: isCase ? `One explained incident from ${rows.length} ledger rows.` : `No case: ${[windowPass ? '' : 'outside the window', holdPass ? '' : 'hold below threshold'].filter(Boolean).join(' and ')}.`,
  };
}
