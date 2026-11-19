/**
 * Bring your own log: write or upload a small CSV of synthetic events and replace the lab's ledger with it.
 * Authored by the ui-director custom Kiro agent (Phase 8 run D) on top of byo_log.mjs.
 *
 * All parsing and validation is byo_log.mjs (`parseByoLog`); this view only shows what the parser returned and, on Import, hands the
 * parsed events to the same bridge calls the rest of the lab uses. The text never leaves the browser: files are read with File.text()
 * and nothing is sent anywhere. All text is set with textContent.
 */
import {parseByoLog, BYO_TEMPLATE, BYO_COLUMNS, BYO_LIMITS, SOURCES} from './byo_log.mjs';

const MAX_SHOWN = 20;
export const IMPORT_WARNING = 'Replaces this lab\u2019s evidence. Export it first if you want to keep it.';

function h(doc, tag, attrs = {}, ...kids) {
  const n = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c) n.append(c);
  return n;
}

/** Which signals need duration_seconds, asked of the parser itself so this view never copies the rule. */
export function durationNeeds() {
  const needs = {};
  for (const [source, def] of Object.entries(SOURCES)) {
    needs[source] = Object.keys(def.signals).filter(signal => {
      const r = parseByoLog(`${BYO_COLUMNS.join(',')}\nprobe,2026-11-20T21:00:00Z,${source},${signal},\n`);
      return r.errors.some(e => /needs duration_seconds/i.test(e.message));
    });
  }
  return needs;
}

async function readFileText(file) {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error || new Error('The file could not be read.'));
    fr.readAsText(file);
  });
}

/**
 * @param {object} o
 * @param {Document} o.doc
 * @param {HTMLElement} o.host   empty slot in the Control Room aside
 * @param {object} o.bridge      getRows(), ingest(events) -> Promise<added>, resetLab(), status(msg, isError)
 */
export function mountByoLog({doc, host, bridge}) {
  let checked = null, busy = false, isOpen = false;

  const opener = h(doc, 'button', {type: 'button', id: 'cr-byo-open', class: 'cr-byo-open', 'aria-expanded': 'false', 'aria-controls': 'cr-byo-panel'},
    h(doc, 'strong', {text: 'Your own log'}),
    h(doc, 'small', {text: 'Write or upload events. Nothing leaves your browser.'}));

  const title = h(doc, 'h3', {id: 'cr-byo-title', tabindex: '-1', text: 'Bring your own log'});
  const intro = h(doc, 'p', {class: 'cr-byo-intro', id: 'cr-byo-intro',
    text: `One event per line, with the header ${BYO_COLUMNS.join(',')}. The text stays in this browser and is checked here before anything is imported.`});
  const bTemplate = h(doc, 'button', {type: 'button', id: 'cr-byo-template', text: 'Use the template'});
  const area = h(doc, 'textarea', {id: 'cr-byo-text', rows: '10', wrap: 'off', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-describedby': 'cr-byo-intro cr-byo-limit'});
  const limit = h(doc, 'p', {class: 'cr-byo-hint', id: 'cr-byo-limit', text: `Up to ${BYO_LIMITS.maxRows} rows and ${BYO_LIMITS.maxBytes / 1024} KB. Times are UTC.`});
  const file = h(doc, 'input', {type: 'file', id: 'cr-byo-file', accept: '.csv,.txt'});
  const fileHint = h(doc, 'p', {class: 'cr-byo-hint', id: 'cr-byo-file-hint', text: 'The file is read by this page only. It is not uploaded.'});
  file.setAttribute('aria-describedby', 'cr-byo-file-hint');

  const needs = durationNeeds();
  const refRows = Object.entries(SOURCES).map(([source, def]) => h(doc, 'tr', {'data-source': source},
    h(doc, 'th', {scope: 'row', text: source}),
    h(doc, 'td', {text: Object.keys(def.signals).join(', ')}),
    h(doc, 'td', {text: needs[source].length ? needs[source].join(', ') : 'none'})));
  const table = h(doc, 'table', {class: 'cr-byo-table', id: 'cr-byo-ref'},
    h(doc, 'caption', {text: 'Sources and signals'}),
    h(doc, 'thead', {}, h(doc, 'tr', {}, h(doc, 'th', {scope: 'col', text: 'source'}), h(doc, 'th', {scope: 'col', text: 'signal'}), h(doc, 'th', {scope: 'col', text: 'needs seconds'}))),
    h(doc, 'tbody', {}, ...refRows));

  const bCheck = h(doc, 'button', {type: 'button', id: 'cr-byo-check', class: 'primary', text: 'Check'});
  const bImport = h(doc, 'button', {type: 'button', id: 'cr-byo-import', 'aria-describedby': 'cr-byo-warn', text: 'Import into the lab'});
  const bClose = h(doc, 'button', {type: 'button', id: 'cr-byo-close', text: 'Close'});
  const warn = h(doc, 'p', {class: 'cr-byo-warn', id: 'cr-byo-warn', text: IMPORT_WARNING});
  const result = h(doc, 'div', {class: 'cr-byo-result', id: 'cr-byo-result', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', 'data-tone': 'none'});

  const panel = h(doc, 'div', {class: 'cr-byo-panel', id: 'cr-byo-panel', role: 'region', 'aria-label': 'Bring your own log', hidden: true},
    title, intro,
    h(doc, 'div', {class: 'cr-byo-row'}, bTemplate),
    h(doc, 'label', {class: 'cr-byo-label', for: 'cr-byo-text', text: 'Events (CSV text)'}), area, limit,
    h(doc, 'label', {class: 'cr-byo-label', for: 'cr-byo-file', text: 'Or choose a .csv or .txt file'}), file, fileHint,
    table,
    h(doc, 'div', {class: 'cr-byo-row cr-byo-actions'}, bCheck, bImport, bClose),
    warn, result);
  host.replaceChildren(opener, panel);

  function show(tone, summary, lines = []) {
    result.setAttribute('data-tone', tone);
    const kids = [h(doc, 'p', {class: 'cr-byo-sum', text: summary})];
    if (lines.length) {
      const items = lines.slice(0, MAX_SHOWN).map(e => h(doc, 'li', {text: e.row > 0 ? `Line ${e.row}: ${e.message}` : e.message}));
      if (lines.length > MAX_SHOWN) items.push(h(doc, 'li', {text: `\u2026and ${lines.length - MAX_SHOWN} more.`}));
      kids.push(h(doc, 'ol', {class: 'cr-byo-errs', id: 'cr-byo-errs'}, ...items));
    }
    result.replaceChildren(...kids);
  }

  const current = () => !!checked && checked.text === area.value;

  /** Import is enabled only for a successful Check of exactly the text now in the box. Re-asserted on every refresh. */
  function paint() {
    const on = current();
    if (on) { bImport.disabled = false; bImport.removeAttribute('disabled'); }
    else {
      if (doc.activeElement === bImport) bCheck.focus();
      bImport.disabled = true; bImport.setAttribute('disabled', '');
    }
    const n = bridge.getRows().length;
    warn.textContent = n ? `${IMPORT_WARNING} It holds ${n} ledger row${n === 1 ? '' : 's'} now.` : IMPORT_WARNING;
  }

  function invalidate(reason) {
    const had = !!checked;
    checked = null;
    if (had) show('info', reason || 'The text changed. Check it again before importing.');
    paint();
  }

  function check() {
    const text = area.value, r = parseByoLog(text);
    if (r.ok) { checked = {text, events: r.events}; show('ok', r.summary); }
    else { checked = null; show('info', r.summary, r.errors); }
    paint();
    return r;
  }

  async function doImport() {
    if (busy || !current()) return;
    const events = checked.events;
    busy = true;
    try {
      await bridge.resetLab();
      const added = await bridge.ingest(events);
      const rows = bridge.getRows();
      const short = events.length - added;
      const msg = `${rows.length} event${rows.length === 1 ? '' : 's'} sealed into the ledger\u2019s hash chain.${short > 0 ? ` ${short} of your ${events.length} were not added.` : ''} The Control Room shows what the rules found.`;
      show('ok', msg);
      bridge.status(`Your own log: ${msg}`, false);
    } catch (e) {
      const msg = `The import did not finish: ${e && e.message ? e.message : e}`;
      show('info', msg);
      bridge.status(msg, true);
    } finally { busy = false; paint(); }
  }

  function setOpen(on, {focus = true} = {}) {
    isOpen = on;
    opener.setAttribute('aria-expanded', String(on));
    if (on) { panel.removeAttribute('hidden'); if (focus) title.focus(); } else { panel.setAttribute('hidden', ''); if (focus) opener.focus(); }
    paint();
  }

  opener.addEventListener('click', () => setOpen(!isOpen));
  bClose.addEventListener('click', () => setOpen(false));
  bTemplate.addEventListener('click', () => {
    area.value = BYO_TEMPLATE;
    invalidate();
    show('info', 'Template loaded. Edit it if you like, then press Check.');
    area.focus();
  });
  area.addEventListener('input', () => invalidate());
  bCheck.addEventListener('click', check);
  bImport.addEventListener('click', doImport);
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    if (!f) return;
    if (typeof f.size === 'number' && f.size > BYO_LIMITS.maxBytes) {
      checked = null; show('info', `${f.name} is larger than ${BYO_LIMITS.maxBytes / 1024} KB, so it was not loaded.`); paint(); return;
    }
    try {
      area.value = await readFileText(f);
      checked = null; paint();
      show('info', `Loaded ${f.name}. Press Check to validate it.`);
    } catch (e) { checked = null; show('info', `${f.name} could not be read: ${e && e.message ? e.message : e}`); paint(); }
  });

  paint();
  return {
    refresh: paint, check, import: doImport, open: () => setOpen(true), close: () => setOpen(false),
    get state() { return {open: isOpen, checked: current(), busy}; },
    elements: {opener, panel, title, area, file, template: bTemplate, check: bCheck, import: bImport, close: bClose, result, table, warn},
  };
}
