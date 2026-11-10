/**
 * GhostBridge cross-source case correlator — browser parity module.
 *
 * Authored by Kiro (Kiroween 2026, feat/cross-source-cases).
 * Mirrors ghostbridge/correlator.py exactly; same rule, same thresholds,
 * same tie-breaking, same case-ID derivation.
 *
 * Rule: denied-then-held-open
 *   An access.denied event followed within WINDOW_SECONDS (300) by a
 *   door.open with duration_seconds >= DOOR_HELD_THRESHOLD (120) generates
 *   one high-severity correlated case.
 *
 * Invariants:
 *   - Input rows array is never mutated.
 *   - Cases are derived projections; never persisted or added to the ledger.
 *   - Operates on UTC event timestamps, not ledger sequence order.
 *   - Each (denied, door) pair produces at most one case.
 *   - Earliest qualifying door.open wins (tie-break: at, then event_id).
 *   - Case IDs match the Python implementation: SHA-256 of "denied|door",
 *     first 16 hex chars prefixed "case:".
 */

export const WINDOW_SECONDS      = 300;
export const DOOR_HELD_THRESHOLD = 120;
export const RULE_NAME           = 'denied-then-held-open';

/**
 * Parse UTC ISO 8601 timestamp ending in Z to seconds since Unix epoch.
 * @param {string} ts  e.g. "2026-11-08T22:00:30Z"
 * @returns {number}
 */
function isoToSeconds(ts) {
  return Math.floor(Date.parse(ts) / 1000);
}

/**
 * Derive a stable 16-char hex case ID using SHA-256.
 * @param {string} deniedId
 * @param {string} doorId
 * @returns {Promise<string>}  "case:<16hex>"
 */
async function caseId(deniedId, doorId) {
  const raw   = `${deniedId}|${doorId}`;
  const bytes = new TextEncoder().encode(raw);
  const buf   = await crypto.subtle.digest('SHA-256', bytes);
  const hex   = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  return 'case:' + hex.slice(0, 16);
}

/**
 * Derive correlated cases from a verified ledger snapshot.
 *
 * @param {ReadonlyArray<object>} rows  Full ledger rows — not mutated.
 * @returns {Promise<Array<object>>}    Zero or more case objects.
 */
export async function correlate(rows) {
  const deniedRows = [];
  const doorRows   = [];

  for (const row of rows) {
    const evt = row.payload.event;
    if (evt.type === 'access.denied') {
      deniedRows.push(row);
    } else if (evt.type === 'door.open') {
      const dur = evt.data?.duration_seconds ?? 0;
      if (Number.isInteger(dur) && dur >= DOOR_HELD_THRESHOLD) {
        doorRows.push(row);
      }
    }
  }

  if (!deniedRows.length || !doorRows.length) return [];

  // Sort door candidates: (at, event_id) — deterministic
  const doorSorted = [...doorRows].sort((a, b) => {
    const ta = a.payload.event.at, tb = b.payload.event.at;
    if (ta !== tb) return ta < tb ? -1 : 1;
    const ia = a.payload.event.id, ib = b.payload.event.id;
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });

  const cases      = [];
  const usedDoorIds = new Set();

  // Sort denied rows too
  const deniedSorted = [...deniedRows].sort((a, b) => {
    const ta = a.payload.event.at, tb = b.payload.event.at;
    if (ta !== tb) return ta < tb ? -1 : 1;
    const ia = a.payload.event.id, ib = b.payload.event.id;
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });

  for (const deniedRow of deniedSorted) {
    const deniedEvt = deniedRow.payload.event;
    const deniedAtS = isoToSeconds(deniedEvt.at);

    for (const doorRow of doorSorted) {
      const doorEvt = doorRow.payload.event;
      const doorId  = doorEvt.id;
      if (usedDoorIds.has(doorId)) continue;

      const doorAtS = isoToSeconds(doorEvt.at);
      if (doorAtS <= deniedAtS) continue;
      const gap = doorAtS - deniedAtS;
      if (gap > WINDOW_SECONDS) continue;

      usedDoorIds.add(doorId);
      const dur    = doorEvt.data.duration_seconds;
      const gapStr = `${gap} second${gap !== 1 ? 's' : ''}`;

      cases.push({
        id:               await caseId(deniedEvt.id, doorId),
        rule:             RULE_NAME,
        severity:         'high',
        title:            'Denied access followed by held-open door',
        explanation:      `An access attempt was rejected (${deniedEvt.id}) and the entrance stayed open for ${dur} seconds (${doorId}) just ${gapStr} later, within the ${WINDOW_SECONDS}-second correlation window.`,
        event_ids:        [deniedEvt.id, doorId],
        evidence_hashes:  [deniedRow.hash, doorRow.hash],
        at:               deniedEvt.at,
        window_seconds:   WINDOW_SECONDS,
      });
      break;
    }
  }

  return cases;
}
