/**
 * Evidence Trust Lab: verify a ledger link by link, and tamper with a COPY to see why verification fails.
 * Authored by Kiro's main session agent (Kiroween 2026, feat/kiro-winning-experience), not by the ui-director or qa-auditor custom agents.
 *
 * `inspectChain` recomputes every SHA-256 link from the stored rows with the same `digest` as the engine, so the per-row verdict is a
 * measurement, not a label. `tamperCopy` never touches the rows it is given: it deep-copies and changes exactly one event field.
 * The first row whose recomputed hash differs is the failing point; every later row is "unverifiable" because it chains from a broken link.
 */
import {digest, verify, devices} from './engine.mjs';

export const TAMPERABLE = Object.freeze(['at', 'device', 'type', 'duration_seconds']);
const short = h => (h ? `${h.slice(0, 10)}…${h.slice(-4)}` : '');
const ZERO = '0'.repeat(64);

/** Per-row verdicts: 'verified' | 'altered' (stored hash does not match its content) | 'broken-link' (previous hash mismatch) | 'unverifiable' (after the first failure). */
export async function inspectChain(rows) {
  const out = [];
  let previous = ZERO, failedAt = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const base = {seq: r.seq ?? i + 1, id: r.payload?.event?.id ?? null, device: r.payload?.event?.device ?? null, type: r.payload?.event?.type ?? null, at: r.payload?.event?.at ?? null, storedHash: r.hash, previousStored: r.previous};
    if (failedAt !== null) { out.push({...base, status: 'unverifiable', recomputed: null, reason: `Row ${failedAt} failed, so this row's chain of trust is broken.`, hashShort: short(r.hash)}); continue; }
    let recomputed = null;
    try { recomputed = await digest(previous, r.payload); } catch { /* malformed payload */ }
    let status = 'verified', reason = 'Stored hash equals the SHA-256 recomputed from the previous hash and this record.';
    if (r.seq !== i + 1) { status = 'broken-link'; reason = `Sequence number is ${r.seq}, expected ${i + 1}.`; }
    else if (r.previous !== previous) { status = 'broken-link'; reason = 'This row points at a different previous hash than the row before it.'; }
    else if (recomputed === null || r.hash !== recomputed) { status = 'altered'; reason = 'The stored hash does not match the SHA-256 recomputed from this record: its content changed after it was sealed.'; }
    if (status !== 'verified') failedAt = i + 1;
    out.push({...base, status, recomputed, reason, hashShort: short(r.hash), recomputedShort: short(recomputed)});
    if (status === 'verified') previous = r.hash;
  }
  return {valid: failedAt === null, checked: failedAt === null ? rows.length : failedAt - 1, failedAt, rows: out, head: failedAt === null && rows.length ? rows.at(-1).hash : null};
}

/**
 * A tampered deep copy: one field of one event changed. Returns {rows, change}. The input is never modified.
 * `field`: 'at' shifts the timestamp by +1 hour; 'device' swaps to a different synthetic device; 'type' swaps to the other type of the same
 * device kind where one exists; 'duration_seconds' changes a timed event's duration by +1.
 */
export function tamperCopy(rows, seq, field = 'at') {
  if (!Number.isInteger(seq) || seq < 1 || seq > rows.length) throw new RangeError(`seq must be an integer from 1 to ${rows.length}`);
  if (!TAMPERABLE.includes(field)) throw new RangeError(`field must be one of ${TAMPERABLE.join(', ')}`);
  const copy = structuredClone(rows);
  const e = copy[seq - 1].payload.event;
  const before = field === 'duration_seconds' ? e.data.duration_seconds : e[field];
  if (field === 'at') e.at = new Date(Date.parse(e.at) + 3600e3).toISOString().replace('.000Z', 'Z');
  else if (field === 'device') e.device = Object.keys(devices).find(d => d !== e.device);
  else if (field === 'type') e.type = ({'door.open': 'door.closed', 'door.closed': 'door.open', 'access.denied': 'access.granted', 'access.granted': 'access.denied', 'camera.offline': 'camera.online', 'camera.online': 'camera.offline', 'presence.dwell': 'presence.dwell'})[e.type];
  else { if (!Number.isInteger(e.data?.duration_seconds)) throw new RangeError('That event has no duration to change'); e.data.duration_seconds += 1; }
  const after = field === 'duration_seconds' ? e.data.duration_seconds : e[field];
  if (before === after) throw new RangeError('That change would not alter the event');
  return {rows: copy, change: {seq, id: e.id, field, before, after}};
}

/** Convenience for the view: inspect the real ledger and one tampered copy side by side. */
export async function compareWithTamper(rows, seq, field = 'at') {
  const {rows: copy, change} = tamperCopy(rows, seq, field);
  return {original: await inspectChain(rows), tampered: await inspectChain(copy), change, engineAgrees: JSON.stringify(await verify(copy)) !== JSON.stringify(await verify(rows))};
}
