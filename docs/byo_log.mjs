/**
 * Bring your own log: turn a CSV that a visitor writes or uploads into GhostBridge events, in the browser.
 * Authored by Kiro's main session (Kiroween 2026, feat/kiro-verifiable-evidence).
 *
 * The visitor's data never leaves the page: this module only parses text. Every row goes through the same strict event contract
 * (`validate` from engine.mjs) that the built-in scenarios use, and the result is all or nothing: if any row is wrong, nothing is
 * imported and every problem is listed with its row number. Event ids are prefixed `byo:` so they can never collide with built-in ones.
 *
 * Format (header required, columns in any order):
 *   event_id,at,source,signal,duration_seconds
 *   B-1,2026-11-20T21:58:00Z,archive-reader,DENIED,
 *   B-2,2026-11-20T22:01:10Z,north-door,OPEN,150
 *
 * source -> device:  north-door -> door-01, archive-reader -> reader-01, loading-camera -> camera-01, archive-corridor -> zone-01
 * signal per source: north-door OPEN|CLOSED; archive-reader DENIED|GRANTED; loading-camera OFFLINE|ONLINE; archive-corridor DWELL
 * duration_seconds:  required (whole seconds, 0..86400) for OPEN and DWELL, empty otherwise.
 */
import {validate} from './engine.mjs';

export const BYO_COLUMNS = Object.freeze(['event_id', 'at', 'source', 'signal', 'duration_seconds']);
export const BYO_LIMITS = Object.freeze({maxRows: 500, maxBytes: 128 * 1024});
export const SOURCES = Object.freeze({
  'north-door': {device: 'door-01', signals: {OPEN: 'door.open', CLOSED: 'door.closed'}},
  'archive-reader': {device: 'reader-01', signals: {DENIED: 'access.denied', GRANTED: 'access.granted'}},
  'loading-camera': {device: 'camera-01', signals: {OFFLINE: 'camera.offline', ONLINE: 'camera.online'}},
  'archive-corridor': {device: 'zone-01', signals: {DWELL: 'presence.dwell'}},
});
const TIMED = new Set(['door.open', 'presence.dwell']);
const ID_RE = /^[A-Za-z0-9_.:-]{1,64}$/;

/** A small, ready-to-edit example: the 299 s / 120 s case plus a camera outage, on a different night than the built-in demos. */
export const BYO_TEMPLATE = [
  BYO_COLUMNS.join(','),
  'B-1,2026-11-20T21:55:00Z,loading-camera,OFFLINE,',
  'B-2,2026-11-20T21:58:00Z,archive-reader,DENIED,',
  'B-3,2026-11-20T22:02:59Z,north-door,OPEN,120',
  'B-4,2026-11-20T22:05:30Z,north-door,CLOSED,',
].join('\n') + '\n';

/**
 * @param {string} text CSV text
 * @returns {{ok: boolean, events: object[], errors: {row: number, message: string}[], summary: string}}
 *   `row` is the 1-based line number in the text (the header is line 1).
 */
export function parseByoLog(text) {
  const errors = [], events = [];
  const fail = (row, message) => { errors.push({row, message}); };
  const done = () => ({ok: errors.length === 0 && events.length > 0, events: errors.length ? [] : events, errors,
    summary: errors.length ? `${errors.length} problem${errors.length === 1 ? '' : 's'} found; nothing was imported.` : `${events.length} event${events.length === 1 ? '' : 's'} ready to import.`});
  if (typeof text !== 'string') { fail(0, 'The log must be text.'); return done(); }
  if (new TextEncoder().encode(text).length > BYO_LIMITS.maxBytes) { fail(0, `The log is larger than ${BYO_LIMITS.maxBytes / 1024} KB.`); return done(); }
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const firstLine = lines.findIndex(l => l.trim());
  if (firstLine < 0) { fail(0, 'The log is empty. Start from the template.'); return done(); }
  const header = lines[firstLine].split(',').map(h => h.trim().toLowerCase());
  const missing = BYO_COLUMNS.filter(c => !header.includes(c)), extra = header.filter(c => !BYO_COLUMNS.includes(c));
  if (missing.length || extra.length || header.length !== BYO_COLUMNS.length) {
    fail(firstLine + 1, `The header must be exactly: ${BYO_COLUMNS.join(',')}${missing.length ? ` (missing: ${missing.join(', ')})` : ''}${extra.length ? ` (unexpected: ${extra.join(', ')})` : ''}.`);
    return done();
  }
  const col = Object.fromEntries(BYO_COLUMNS.map(c => [c, header.indexOf(c)]));
  const seen = new Map();
  let dataRows = 0;
  for (let i = firstLine + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const row = i + 1;
    if (++dataRows > BYO_LIMITS.maxRows) { fail(row, `At most ${BYO_LIMITS.maxRows} rows can be imported.`); break; }
    const cells = raw.split(',').map(v => v.trim());
    if (cells.length !== BYO_COLUMNS.length) { fail(row, `Expected ${BYO_COLUMNS.length} values separated by commas, found ${cells.length}.`); continue; }
    const get = c => cells[col[c]];
    const id = get('event_id');
    if (!ID_RE.test(id)) { fail(row, `event_id ${JSON.stringify(id)} must be 1 to 64 letters, digits, or . _ : -`); continue; }
    if (seen.has(id)) { fail(row, `event_id "${id}" is already used on line ${seen.get(id)}.`); continue; }
    seen.set(id, row);
    const sourceName = get('source').toLowerCase(), source = SOURCES[sourceName];
    if (!source) { fail(row, `Unknown source "${get('source')}". Use one of: ${Object.keys(SOURCES).join(', ')}.`); continue; }
    const signal = get('signal').toUpperCase(), type = source.signals[signal];
    if (!type) { fail(row, `"${get('signal')}" is not a signal of ${sourceName}. Use: ${Object.keys(source.signals).join(', ')}.`); continue; }
    const durRaw = get('duration_seconds');
    let data = {};
    if (TIMED.has(type)) {
      if (!/^\d+$/.test(durRaw)) { fail(row, `${signal} needs duration_seconds as whole seconds, for example 120.`); continue; }
      data = {duration_seconds: Number(durRaw)};
    } else if (durRaw !== '') { fail(row, `duration_seconds must be empty for ${signal}.`); continue; }
    const event = {id: `byo:${id}`, device: source.device, type, at: get('at'), data};
    try { validate(event); } catch (e) { fail(row, friendly(e.message, get('at'))); continue; }
    events.push(event);
  }
  if (!errors.length && !events.length) fail(firstLine + 1, 'There are no data rows under the header.');
  return done();
}

function friendly(message, at) {
  if (/timestamp/i.test(message)) return `"${at}" is not a valid UTC time. Use the form 2026-11-20T21:58:00Z.`;
  if (/duration/i.test(message)) return 'duration_seconds must be between 0 and 86400.';
  return message;
}

/** Pull the existing evidence export format back in, so a judge can re-check a downloaded ledger. */
export function rowsFromExport(text) {
  let doc;
  try { doc = JSON.parse(text); } catch { return {ok: false, rows: [], message: 'This is not valid JSON.'}; }
  const rows = Array.isArray(doc) ? doc : doc && Array.isArray(doc.ledger) ? doc.ledger : null;
  if (!rows) return {ok: false, rows: [], message: 'Expected a GhostBridge evidence export (an object with a "ledger" list).'};
  return {ok: true, rows, message: `${rows.length} ledger row${rows.length === 1 ? '' : 's'} read.`};
}
