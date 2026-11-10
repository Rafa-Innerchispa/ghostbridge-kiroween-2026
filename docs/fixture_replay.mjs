/**
 * GhostBridge offline fixture replay — browser-only adapter parsers.
 *
 * Authored by Kiro (Kiroween 2026, feat/cross-source-cases).
 *
 * These parsers mirror the Python adapters (ghostbridge/adapters/) so the
 * static GitHub Pages lab can demonstrate the same normalization logic
 * without requiring a live server.
 *
 * IMPORTANT: This module runs entirely in the browser.
 *   - It does NOT make network calls.
 *   - It does NOT connect to physical hardware or InnerOS systems.
 *   - The "Legacy Bridge Demo" label must always accompany its output.
 *
 * Supported sources:
 *   parseRelayCsv(csvText)        → array of event objects (relay: prefix)
 *   parseAccessWebhook(payload)   → single event object (access: prefix)
 */

// ------------------------------------------------------------------ //
// Shared validation helpers
// ------------------------------------------------------------------ //

/** @param {string} ts */
function validateTimestamp(ts) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(ts))
    throw new Error(`Timestamp must be UTC ISO 8601 ending in Z, got: ${JSON.stringify(ts)}`);
  const d = new Date(ts);
  if (!Number.isFinite(d.getTime()))
    throw new Error(`Invalid calendar date in timestamp: ${JSON.stringify(ts)}`);
  // Round-trip check: catches Feb-30, etc.
  if (d.toISOString().replace('.000Z', 'Z') !== ts)
    throw new Error(`Invalid calendar date in timestamp: ${JSON.stringify(ts)}`);
}

const ID_RE = /^[A-Za-z0-9_.:-]{1,64}$/;

/** @type {Record<string,string>} relay name → canonical device */
const RELAY_MAP = { 'north-door': 'door-01' };

/** @type {Record<string,string>} reader name → canonical device */
const READER_MAP = { 'archive-reader': 'reader-01' };

// ------------------------------------------------------------------ //
// Legacy relay CSV parser
// ------------------------------------------------------------------ //

const REQUIRED_COLS = ['event_id', 'at', 'relay', 'state', 'duration_seconds'];
const MAX_ROWS  = 1000;
const MAX_BYTES = 256 * 1024;

/**
 * Parse a legacy relay CSV text and return normalised event objects.
 * @param {string} csvText
 * @returns {Array<object>}
 */
export function parseRelayCsv(csvText) {
  if (typeof csvText !== 'string')
    throw new TypeError('csvText must be a string');
  if (new TextEncoder().encode(csvText).length > MAX_BYTES)
    throw new Error(`CSV exceeds ${MAX_BYTES} bytes`);

  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV contains no data rows');

  // Parse header
  const header = lines[0].split(',').map(h => h.trim());
  const sortedHeader = [...header].sort().join(',');
  const sortedReq    = [...REQUIRED_COLS].sort().join(',');
  if (sortedHeader !== sortedReq) {
    const missing = REQUIRED_COLS.filter(c => !header.includes(c));
    const extra   = header.filter(c => !REQUIRED_COLS.includes(c));
    const parts = [];
    if (missing.length) parts.push(`missing: ${missing}`);
    if (extra.length)   parts.push(`unexpected: ${extra}`);
    throw new Error('CSV header mismatch — ' + parts.join('; '));
  }

  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const events = [];
  const seenIds = new Set();

  for (let i = 1; i < lines.length; i++) {
    if (i > MAX_ROWS) throw new Error(`CSV exceeds maximum of ${MAX_ROWS} data rows`);
    const row = lines[i].split(',').map(v => v.trim());
    const rowNum = i + 1;
    if (row.length !== REQUIRED_COLS.length)
      throw new Error(`Row ${rowNum}: expected exactly five CSV fields`);

    const rawId = row[idx.event_id] ?? '';
    if (!ID_RE.test(rawId))
      throw new Error(`Row ${rowNum}: event_id ${JSON.stringify(rawId)} invalid or empty/too long`);
    const normId = `relay:${rawId}`;
    if (normId.length > 80)
      throw new Error(`Row ${rowNum}: normalised ID exceeds 80 chars`);
    if (seenIds.has(rawId))
      throw new Error(`Row ${rowNum}: duplicate event_id ${JSON.stringify(rawId)}`);
    seenIds.add(rawId);

    const at = row[idx.at] ?? '';
    validateTimestamp(at);

    const relay = row[idx.relay] ?? '';
    if (!RELAY_MAP[relay])
      throw new Error(`Row ${rowNum}: unknown relay ${JSON.stringify(relay)}`);
    const device = RELAY_MAP[relay];

    const state = row[idx.state] ?? '';
    if (state !== 'OPEN' && state !== 'CLOSED')
      throw new Error(`Row ${rowNum}: unknown state ${JSON.stringify(state)}`);
    const eventType = state === 'OPEN' ? 'door.open' : 'door.closed';
    const durRequired = state === 'OPEN';

    const durRaw = row[idx.duration_seconds] ?? '';
    let data = {};
    if (durRequired) {
      if (!durRaw) throw new Error(`Row ${rowNum}: duration_seconds required when state=OPEN`);
      if (!/^[0-9]+$/.test(durRaw))
        throw new Error(`Row ${rowNum}: duration_seconds must be decimal digits`);
      const dur = Number(durRaw);
      if (!Number.isInteger(dur) || dur < 0 || dur > 86400)
        throw new Error(`Row ${rowNum}: duration_seconds ${JSON.stringify(durRaw)} invalid`);
      data = { duration_seconds: dur };
    } else {
      if (durRaw) throw new Error(`Row ${rowNum}: duration_seconds must be empty when state=CLOSED`);
    }

    events.push({ id: normId, device, type: eventType, at, data });
  }

  if (!events.length) throw new Error('CSV contains no data rows');
  return events;
}

// ------------------------------------------------------------------ //
// JSON access-controller webhook parser
// ------------------------------------------------------------------ //

const REQUIRED_KEYS = new Set(['event_id', 'at', 'reader', 'decision']);

/**
 * Parse and validate a JSON access-controller webhook payload.
 * @param {object} payload  Already-decoded JSON object.
 * @returns {object}  Five-field event.
 */
export function parseAccessWebhook(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw new TypeError('Access webhook payload must be a JSON object');

  const actualKeys = new Set(Object.keys(payload));
  const missing = [...REQUIRED_KEYS].filter(k => !actualKeys.has(k));
  const extra   = [...actualKeys].filter(k => !REQUIRED_KEYS.has(k));
  if (missing.length || extra.length) {
    const parts = [];
    if (missing.length) parts.push(`missing keys: ${missing}`);
    if (extra.length)   parts.push(`unexpected keys: ${extra}`);
    throw new Error('Access webhook schema mismatch — ' + parts.join('; '));
  }

  const { event_id, at, reader, decision } = payload;

  if (typeof event_id !== 'string' || !ID_RE.test(event_id))
    throw new Error(`event_id ${JSON.stringify(event_id)} invalid`);
  const normId = `access:${event_id}`;
  if (normId.length > 80) throw new Error('Normalised event_id exceeds 80 chars');

  if (typeof at !== 'string') throw new Error('at must be a string');
  validateTimestamp(at);

  if (typeof reader !== 'string' || !READER_MAP[reader])
    throw new Error(`Unknown reader ${JSON.stringify(reader)}`);
  const device = READER_MAP[reader];

  const decisionMap = { DENIED: 'access.denied', GRANTED: 'access.granted' };
  if (typeof decision !== 'string' || !decisionMap[decision])
    throw new Error(`Unknown decision ${JSON.stringify(decision)}`);
  const eventType = decisionMap[decision];

  return { id: normId, device, type: eventType, at, data: {} };
}
