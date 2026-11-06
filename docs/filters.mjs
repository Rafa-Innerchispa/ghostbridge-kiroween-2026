/**
 * GhostBridge incident severity filter — pure, dependency-free module.
 *
 * Authored by Kiro (Kiroween 2026, feat/incident-severity-filter).
 * Original application and engine were prepared with Codex.
 *
 * INVARIANTS:
 *  - Input rows array is never mutated.
 *  - The returned array contains the same row references (not deep copies).
 *  - Severity values are read from r.payload.incident.severity; never inferred
 *    from UI text or any other field.
 *  - Only 'all', 'high', 'medium' are accepted filter values.
 */

/** @type {ReadonlyArray<string>} */
export const SEVERITY_VALUES = Object.freeze(['all', 'high', 'medium']);

/**
 * Filter an immutable ledger by incident severity.
 *
 * @param {ReadonlyArray<object>} rows  - Full ledger rows (not mutated).
 * @param {'all'|'high'|'medium'} severity - Active filter choice.
 * @returns {Array<object>} Subset of rows that are incidents matching severity.
 * @throws {TypeError} If severity is not a recognised value.
 */
export function filterBySeverity(rows, severity) {
  if (!SEVERITY_VALUES.includes(severity)) {
    throw new TypeError(
      `filterBySeverity: severity must be one of ${SEVERITY_VALUES.join(', ')}; got ${JSON.stringify(severity)}`
    );
  }
  const incidents = rows.filter(r => r.payload.incident);
  if (severity === 'all') return incidents;
  return incidents.filter(r => r.payload.incident.severity === severity);
}
