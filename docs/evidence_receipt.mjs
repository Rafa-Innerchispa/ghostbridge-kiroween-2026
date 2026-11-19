/**
 * Evidence receipts: seal the current ledger head so the evidence can be checked later, even against a full rewrite.
 * Authored by Kiro's main session (Kiroween 2026, feat/kiro-verifiable-evidence).
 *
 * Why: a hash chain detects an edited, deleted or reordered row, but someone who recomputes EVERY hash can rewrite the whole chain.
 * A receipt is a small record of the head hash and row count taken at a moment in time and kept somewhere else (downloaded, printed,
 * e-mailed, committed). Checking a ledger against a receipt then tells apart:
 *   matches   - same rows, same head
 *   extended  - the receipted rows are still there, unchanged, and more rows were appended after the seal
 *   truncated - fewer rows than when it was sealed
 *   rewritten - the chain still verifies, but row N no longer has the receipted hash: history was replaced
 *   broken    - the chain itself fails verification
 * Pure functions over the same SHA-256 `verify` the engine uses. No network, no storage.
 */
import {verify} from './engine.mjs';

export const RECEIPT_SCHEMA = 'ghostbridge-receipt-v1';
export const ALGORITHM = 'SHA-256 hash chain: hash = sha256(previous_hash + "\\n" + canonical_json(payload)); first previous = 64 zeros';
const HEX64 = /^[0-9a-f]{64}$/;

/** Human-friendly fingerprint of a head hash: first 16 hex digits in groups of 4. */
export const fingerprint = head => (HEX64.test(head || '') ? head.slice(0, 16).match(/.{4}/g).join(' ') : null);

/** Seal a verified ledger. Throws if the ledger is empty or fails verification (a broken ledger must not be sealed). */
export async function makeReceipt(rows, {now = new Date()} = {}) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('There is nothing to seal: the ledger is empty.');
  const v = await verify(rows);
  if (!v.valid) throw new Error(`The ledger fails verification at row ${v.failed_at}; a broken ledger cannot be sealed.`);
  const first = rows[0].payload.event, last = rows.at(-1).payload.event;
  return {
    schema: RECEIPT_SCHEMA,
    sealed_at: new Date(now).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    rows: rows.length,
    head: v.head,
    fingerprint: fingerprint(v.head),
    first_event: {id: first.id, at: first.at},
    last_event: {id: last.id, at: last.at},
    algorithm: ALGORITHM,
    note: 'Keep this receipt outside the lab. Anyone can check a ledger against it, with GhostBridge or with the independent verifier.',
  };
}

/** Validate the shape of a receipt (for receipts pasted or uploaded by a user). Returns an error message or null. */
export function receiptProblem(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return 'A receipt must be a JSON object.';
  if (r.schema !== RECEIPT_SCHEMA) return `Unknown receipt schema; expected "${RECEIPT_SCHEMA}".`;
  if (!Number.isInteger(r.rows) || r.rows < 1) return 'The receipt has no valid row count.';
  if (!HEX64.test(r.head || '')) return 'The receipt has no valid head hash.';
  return null;
}

/** Check a ledger against a receipt. Never throws for bad input; reports it. */
export async function checkReceipt(rows, receipt) {
  const problem = receiptProblem(receipt);
  if (problem) return {status: 'invalid-receipt', ok: false, message: problem};
  if (!Array.isArray(rows)) return {status: 'broken', ok: false, message: 'The ledger is not a list of rows.'};
  const v = await verify(rows);
  if (!v.valid) return {status: 'broken', ok: false, failedAt: v.failed_at ?? null, message: `The ledger fails its own chain verification at row ${v.failed_at ?? '?'}.`};
  const n = receipt.rows;
  if (rows.length < n) return {status: 'truncated', ok: false, rows: rows.length, receiptRows: n, message: `The ledger has ${rows.length} rows; ${n} were sealed. ${n - rows.length} sealed row(s) are missing.`};
  const atSeal = rows[n - 1].hash;
  if (atSeal !== receipt.head) {
    return {status: 'rewritten', ok: false, rows: rows.length, receiptRows: n, expected: receipt.head, found: atSeal,
      message: `The chain verifies on its own, but row ${n} no longer carries the sealed hash. The history up to the seal was replaced.`};
  }
  if (rows.length === n) return {status: 'matches', ok: true, rows: n, message: `All ${n} sealed rows are present and unchanged.`};
  return {status: 'extended', ok: true, rows: rows.length, receiptRows: n, added: rows.length - n,
    message: `All ${n} sealed rows are present and unchanged; ${rows.length - n} row(s) were appended after the seal.`};
}
