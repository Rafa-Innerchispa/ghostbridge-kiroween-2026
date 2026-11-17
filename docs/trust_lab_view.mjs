/**
 * Evidence Trust Lab view: the real ledger as a chain of blocks, plus an isolated tamper experiment on a copy.
 * Authored by the ui-director custom Kiro agent (Phase 6 run B); the refresh() re-assert of control states was added by Kiro's main
 * session after qa-auditor finding AU2.-1.
 *
 * Every verdict comes from trust_lab.mjs (`inspectChain`, `compareWithTamper`), which recomputes SHA-256 links. This view never
 * writes to the rows it reads: `compareWithTamper` deep-copies first. No innerHTML; all text is set with textContent.
 */
import {inspectChain, compareWithTamper, tamperCopy, TAMPERABLE} from './trust_lab.mjs';
import {devices} from './engine.mjs';

export const HONESTY = 'Experiment on an isolated copy. The ledger above is never changed.';
const FIELD_LABEL = {at: 'Timestamp (at)', device: 'Device', type: 'Event type', duration_seconds: 'Duration (seconds)'};
const STATUS = {
  verified: {icon: '\u2713', word: 'Verified'},
  altered: {icon: '\u2715', word: 'Altered'},
  unverifiable: {icon: '?', word: 'Unverifiable'},
  'broken-link': {icon: '\u2260', word: 'Broken link'},
};
const devName = id => devices[id]?.name ?? (id ?? 'unknown device');

function h(doc, tag, attrs = {}, ...kids) {
  const n = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c) n.append(c);
  return n;
}

/**
 * @param {object} o
 * @param {Document} o.doc
 * @param {HTMLElement} o.host        empty section that receives the lab
 * @param {() => object[]} o.getRows  live ledger rows (read only)
 */
export function mountTrustLab({doc, host, getRows}) {
  let sig = null, token = 0, result = null, busy = false, inspected = null;

  const title = h(doc, 'h3', {id: 'cr-tl-lab-title', text: 'Evidence Trust Lab'});
  const honesty = h(doc, 'p', {class: 'cr-tl-lab-honesty', id: 'cr-tl-lab-honesty', text: HONESTY});
  const details = h(doc, 'details', {class: 'cr-tl-lab-details', id: 'cr-tl-lab-details'});
  const summary = h(doc, 'summary', {id: 'cr-tl-lab-summary', text: 'Open the lab: inspect every link, then tamper with a copy'});
  const empty = h(doc, 'p', {class: 'empty cr-empty', id: 'cr-tl-lab-empty', text: 'The ledger is empty, so there is no chain to inspect. Run a scenario or forge an incident first.'});
  const intro = h(doc, 'p', {class: 'fine', id: 'cr-tl-lab-intro', text: 'Each block holds a SHA-256 hash of its record and of the block before it. Change one field of a copy and the first altered block, and every block after it, stops verifying.'});
  const chain = h(doc, 'ol', {class: 'cr-tl-lab-chain', id: 'cr-tl-lab-chain', 'aria-label': 'Ledger chain, one block per row'});
  const rowSel = h(doc, 'select', {id: 'cr-tl-lab-row', 'aria-describedby': 'cr-tl-lab-field-hint'});
  const fieldSel = h(doc, 'select', {id: 'cr-tl-lab-field', 'aria-describedby': 'cr-tl-lab-field-hint'});
  const fieldHint = h(doc, 'p', {class: 'cr-tl-lab-hint', id: 'cr-tl-lab-field-hint', text: ''});
  const bTamper = h(doc, 'button', {type: 'button', id: 'cr-tl-lab-tamper', text: 'Tamper a copy'});
  const bRestore = h(doc, 'button', {type: 'button', id: 'cr-tl-lab-restore', text: 'Restore'});
  const controls = h(doc, 'div', {class: 'cr-tl-lab-controls', id: 'cr-tl-lab-controls', role: 'group', 'aria-label': 'Tamper experiment'},
    h(doc, 'label', {class: 'cr-tl-lab-field'}, h(doc, 'span', {text: 'Row'}), rowSel),
    h(doc, 'label', {class: 'cr-tl-lab-field'}, h(doc, 'span', {text: 'Field to change'}), fieldSel),
    h(doc, 'div', {class: 'cr-tl-lab-buttons'}, bTamper, bRestore));
  const live = h(doc, 'p', {class: 'cr-tl-lab-live', id: 'cr-tl-lab-live', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', text: ''});
  const out = h(doc, 'div', {class: 'cr-tl-lab-out', id: 'cr-tl-lab-out'});
  details.append(summary, empty, intro, chain, controls, fieldHint, live, out);
  host.replaceChildren(title, honesty, details);

  function block(r, compact) {
    const s = STATUS[r.status] ?? STATUS.unverifiable;
    return h(doc, 'li', {class: `cr-tl-lab-block${compact ? ' is-compact' : ''}`, 'data-status': r.status, 'data-seq': r.seq},
      h(doc, 'span', {class: 'cr-tl-lab-seq', text: `#${r.seq}`}),
      h(doc, 'span', {class: 'cr-tl-lab-dev', text: devName(r.device)}),
      h(doc, 'span', {class: 'cr-tl-lab-type', text: r.type ?? 'unknown event'}),
      h(doc, 'code', {class: 'cr-tl-lab-hash', title: r.storedHash ?? '', text: r.hashShort || 'no hash'}),
      h(doc, 'span', {class: 'cr-tl-lab-status'}, h(doc, 'span', {class: 'cr-tl-lab-icon', 'aria-hidden': 'true', text: s.icon}), h(doc, 'span', {text: s.word})));
  }

  const fieldApplies = (rows, seq, f) => { try { tamperCopy(rows, seq, f); return true; } catch { return false; } };

  function fillSelects(rows) {
    const keepRow = Number(rowSel.value), none = rows.length === 0;
    rowSel.replaceChildren(...rows.map((r, i) => {
      const e = r.payload?.event;
      return h(doc, 'option', {value: i + 1, text: `${i + 1}. ${devName(e?.device)} \u00b7 ${e?.type ?? 'unknown event'}`});
    }));
    const row = keepRow >= 1 && keepRow <= rows.length ? keepRow : 1;
    rowSel.value = String(row);
    fillFields(rows);
    rowSel.disabled = none;
    if (none) rowSel.setAttribute('disabled', ''); else rowSel.removeAttribute('disabled');
  }

  function fillFields(rows) {
    const seq = Number(rowSel.value) || 1, keep = fieldSel.value;
    const ok = TAMPERABLE.map(f => rows.length > 0 && fieldApplies(rows, seq, f));
    fieldSel.replaceChildren(...TAMPERABLE.map((f, i) => h(doc, 'option', {value: f, disabled: rows.length > 0 && !ok[i], text: ok[i] || !rows.length ? FIELD_LABEL[f] : `${FIELD_LABEL[f]} (not applicable to this event)`})));
    const want = TAMPERABLE.includes(keep) && ok[TAMPERABLE.indexOf(keep)] ? keep : TAMPERABLE[Math.max(0, ok.indexOf(true))];
    fieldSel.value = want;
    const bad = TAMPERABLE.filter((f, i) => rows.length > 0 && !ok[i]);
    fieldHint.textContent = bad.length ? `Not every field applies to every event. For this row, ${bad.map(f => FIELD_LABEL[f]).join(' and ')} cannot be changed, so it is switched off.` : '';
  }

  function paintControls(rows) {
    const none = rows.length === 0;
    // Tamper stays enabled while a run is in flight (runTamper ignores re-entry), so keyboard focus never jumps away from it.
    for (const [btn, off] of [[bTamper, none], [bRestore, none || !result]]) {
      if (off) continue;
      btn.disabled = false; btn.removeAttribute('disabled');
    }
    for (const [btn, off] of [[bTamper, none], [bRestore, none || !result]]) {
      if (!off) continue;
      if (doc.activeElement === btn) (btn === bRestore && !none ? bTamper : rowSel).focus();
      btn.disabled = true; btn.setAttribute('disabled', '');
    }
    controls.setAttribute('aria-busy', String(busy));
    fieldSel.disabled = none; if (none) fieldSel.setAttribute('disabled', ''); else fieldSel.removeAttribute('disabled');
    if (none) empty.removeAttribute('hidden'); else empty.setAttribute('hidden', '');
    for (const el of [intro, chain, controls]) { if (none) el.setAttribute('hidden', ''); else el.removeAttribute('hidden'); }
  }

  function paintChain() {
    if (!inspected) { chain.replaceChildren(); return; }
    chain.replaceChildren(...inspected.rows.map(r => block(r, false)));
  }

  function paintResult() {
    if (!result) { out.replaceChildren(); out.setAttribute('hidden', ''); return; }
    out.removeAttribute('hidden');
    const {original, tampered, change} = result, rows = getRows();
    const total = rows.length;
    const fail = tampered.rows[tampered.failedAt - 1];
    const orig = h(doc, 'section', {class: 'cr-tl-lab-card is-original', id: 'cr-tl-lab-original', 'aria-labelledby': 'cr-tl-lab-original-h', 'data-valid': String(original.valid)},
      h(doc, 'h4', {id: 'cr-tl-lab-original-h', text: `Original ledger: verified ${original.checked} of ${total} rows`}),
      h(doc, 'ol', {class: 'cr-tl-lab-chain is-compact', 'aria-label': 'Original ledger, per-row result'}, ...original.rows.map(r => block(r, true))));
    const alt = h(doc, 'section', {class: 'cr-tl-lab-card is-altered', id: 'cr-tl-lab-altered', 'aria-labelledby': 'cr-tl-lab-altered-h', 'data-valid': String(tampered.valid)},
      h(doc, 'h4', {id: 'cr-tl-lab-altered-h', text: tampered.valid ? `Altered copy: still verifies (${tampered.checked} of ${total} rows)` : `Altered copy: fails at row ${tampered.failedAt}`}),
      h(doc, 'ol', {class: 'cr-tl-lab-chain is-compact', 'aria-label': 'Altered copy, per-row result'}, ...tampered.rows.map(r => block(r, true))));
    const kv = (k, v, mono) => h(doc, 'div', {class: 'cr-tl-lab-kv'}, h(doc, 'dt', {text: k}), h(doc, 'dd', {text: v, class: mono ? 'cr-tl-lab-mono' : false}));
    const why = fail ? [
      h(doc, 'p', {class: 'cr-tl-lab-reason', id: 'cr-tl-lab-reason', text: fail.reason}),
      h(doc, 'dl', {class: 'cr-tl-lab-dl', id: 'cr-tl-lab-change', 'aria-label': 'What was changed in the copy'},
        kv('Row', `#${change.seq} (${change.id})`), kv('Field', FIELD_LABEL[change.field] ?? change.field), kv('Before', String(change.before), true), kv('After', String(change.after), true)),
      h(doc, 'dl', {class: 'cr-tl-lab-dl', id: 'cr-tl-lab-hashes', 'aria-label': `Hashes at failing row ${tampered.failedAt}`},
        h(doc, 'div', {class: 'cr-tl-lab-kv'}, h(doc, 'dt', {text: `Stored hash, row ${tampered.failedAt}`}), h(doc, 'dd', {class: 'cr-tl-lab-mono', title: fail.storedHash ?? '', text: fail.hashShort || 'none'})),
        h(doc, 'div', {class: 'cr-tl-lab-kv'}, h(doc, 'dt', {text: 'Recomputed hash'}), h(doc, 'dd', {class: 'cr-tl-lab-mono', title: fail.recomputed ?? '', text: fail.recomputedShort || 'not computed'}))),
      h(doc, 'p', {class: 'cr-tl-lab-engine', text: result.engineAgrees ? 'The ledger engine\u2019s own verify() also reports a different result for the copy.' : 'The ledger engine\u2019s verify() did not report a different result for the copy.'}),
    ] : [];
    out.replaceChildren(h(doc, 'div', {class: 'cr-tl-lab-compare'}, orig, alt), ...why);
  }

  function announce(text) { live.textContent = text; }

  async function runTamper() {
    const rows = getRows();
    if (!rows.length || busy) return;
    const seq = Number(rowSel.value), field = fieldSel.value, mine = sig;
    busy = true; paintControls(rows);
    try {
      const res = await compareWithTamper(rows, seq, field);
      if (mine !== sig) return;   // the ledger changed while we were computing
      result = res;
      paintResult();
      const f = res.tampered.failedAt;
      announce(`Tampered a copy: changed ${FIELD_LABEL[field]} on row ${seq}. Altered copy fails at row ${f}. Original ledger: verified ${res.original.checked} of ${rows.length} rows, unchanged.`);
    } catch (e) {
      result = null; paintResult();
      announce(`Could not tamper with that field: ${e.message}`);
    } finally { busy = false; paintControls(getRows()); }
  }

  function restore() {
    result = null; paintResult(); paintControls(getRows());
    announce(`Copy discarded. Original ledger: verified ${inspected ? inspected.checked : 0} of ${getRows().length} rows.`);
  }

  rowSel.addEventListener('change', () => { fillFields(getRows()); if (result) { result = null; paintResult(); announce('Selection changed, so the previous experiment was cleared.'); } paintControls(getRows()); });
  fieldSel.addEventListener('change', () => { if (result) { result = null; paintResult(); announce('Selection changed, so the previous experiment was cleared.'); paintControls(getRows()); } });
  bTamper.addEventListener('click', runTamper);
  bRestore.addEventListener('click', restore);

  /** Re-inspect the real ledger when it changes. Returns a promise that resolves once the chain is painted. */
  async function refresh() {
    const rows = getRows();
    const next = `${rows.length}:${rows.map(r => r.hash).join(',')}`;
    // app.js disables and then re-enables EVERY button on the page around a scenario, unfold or Forge run, then calls render().
    // Re-assert this view's own enabled/disabled states on every refresh so that blanket re-enable never leaves Restore active
    // without an experiment (found by qa-auditor's Phase 6 audit, AU2.-1).
    if (next === sig) { paintControls(rows); return; }
    sig = next; result = null; busy = false;
    const mine = ++token;
    fillSelects(rows); paintControls(rows); paintResult(); announce('');
    const r = await inspectChain(rows);
    if (mine !== token) return;
    inspected = r; paintChain();
  }

  const ready = refresh();
  return {
    refresh, ready, tamper: runTamper, restore,
    get state() { return {hasResult: !!result, busy, rows: getRows().length}; },
    get result() { return result; },
    elements: {rowSel, fieldSel, tamper: bTamper, restore: bRestore, live, chain, out, details, empty, honesty, fieldHint},
  };
}
