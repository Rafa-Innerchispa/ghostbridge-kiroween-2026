/**
 * Seal and verify it yourself: seal the current ledger head into a receipt, check a ledger against a receipt, and point to the
 * independent verifier. Authored by the ui-director custom Kiro agent (Phase 8 run D) on top of evidence_receipt.mjs.
 *
 * Every verdict comes from evidence_receipt.mjs (`makeReceipt`, `checkReceipt`), which recompute SHA-256 links. A receipt belongs to a
 * moment: when the ledger changes, the shown seal and the last check result are cleared. All text is set with textContent.
 */
import {makeReceipt, checkReceipt} from './evidence_receipt.mjs';

export const VERIFY_COMMAND = 'python verify_evidence.py ghostbridge-evidence.json --receipt ghostbridge-receipt.json';
export const RECEIPT_FILE = 'ghostbridge-receipt.json';
export const EMPTY_REASON = 'The ledger is empty, so there is nothing to seal. Run a scenario or import a log first.';

/** Verdict presentation. Green only for verified evidence, red only for failed integrity, neutral for "not a usable receipt". */
export const VERDICTS = {
  matches: {tone: 'ok', icon: '\u2713', word: 'Verified against receipt'},
  extended: {tone: 'ok', icon: '\u2713', word: 'Verified against receipt'},
  truncated: {tone: 'crit', icon: '\u2715', word: 'Failed: ledger truncated'},
  rewritten: {tone: 'crit', icon: '\u2715', word: 'Failed: history rewritten'},
  broken: {tone: 'crit', icon: '\u2715', word: 'Failed: chain broken'},
  'invalid-receipt': {tone: 'info', icon: 'i', word: 'Not a usable receipt'},
};

function h(doc, tag, attrs = {}, ...kids) {
  const n = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'text') n.textContent = v; else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c) n.append(c);
  return n;
}

function browserDownload(doc, revokeMs) {
  return (name, text, type) => {
    const url = URL.createObjectURL(new Blob([text], {type}));
    const a = doc.createElement('a');
    a.setAttribute('href', url); a.setAttribute('download', name);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), revokeMs);
  };
}

/**
 * @param {object} o
 * @param {Document} o.doc
 * @param {HTMLElement} o.host        empty section that receives the view
 * @param {() => object[]} o.getRows  live ledger rows (read only)
 * @param {Function} [o.download]     (filename, text, mimeType) => void; defaults to a Blob download
 * @param {Function} [o.copy]         (text) => Promise; defaults to navigator.clipboard.writeText
 * @param {() => Date} [o.now]        clock for sealed_at
 */
export function mountReceipt({doc, host, getRows, download, copy, now = () => new Date(), revokeMs = 1000}) {
  const save = download || browserDownload(doc, revokeMs);
  let sig = null, token = 0, sealed = null, busy = false, checkToken = 0, verdict = null;

  const title = h(doc, 'h3', {id: 'cr-rc-title', text: 'Seal and verify it yourself'});
  const lead = h(doc, 'p', {class: 'cr-rc-lead', id: 'cr-rc-lead', text: 'A hash chain shows edits, but someone could recompute the whole chain. A receipt records the ledger head at one moment. Keep it outside the lab, and check against it later.'});

  // (a) seal
  const bSeal = h(doc, 'button', {type: 'button', id: 'cr-rc-seal', class: 'primary', 'aria-describedby': 'cr-rc-seal-reason', text: 'Seal this ledger'});
  const reason = h(doc, 'p', {class: 'cr-rc-hint', id: 'cr-rc-seal-reason', text: ''});
  const sealLive = h(doc, 'p', {class: 'cr-rc-live', id: 'cr-rc-seal-live', role: 'status', 'aria-live': 'polite', text: ''});
  const fp = h(doc, 'p', {class: 'cr-rc-fp', id: 'cr-rc-fp', 'aria-label': 'Fingerprint', text: ''});
  const meta = h(doc, 'dl', {class: 'cr-rc-meta', id: 'cr-rc-meta'});
  const head = h(doc, 'code', {class: 'cr-rc-head', id: 'cr-rc-head', text: ''});
  const bDownload = h(doc, 'button', {type: 'button', id: 'cr-rc-download', text: 'Download receipt'});
  const sealOut = h(doc, 'div', {class: 'cr-rc-seal', id: 'cr-rc-seal-out', hidden: true},
    h(doc, 'p', {class: 'cr-rc-fp-label', text: 'Fingerprint (first 16 hex digits of the head hash)'}), fp, meta,
    h(doc, 'p', {class: 'cr-rc-fp-label', text: 'Full head hash (SHA-256)'}), head,
    h(doc, 'div', {class: 'cr-rc-row'}, bDownload));

  // (b) check
  const paste = h(doc, 'textarea', {id: 'cr-rc-paste', rows: '5', wrap: 'off', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-describedby': 'cr-rc-paste-hint'});
  const pasteHint = h(doc, 'p', {class: 'cr-rc-hint', id: 'cr-rc-paste-hint', text: 'Paste the receipt JSON, or choose the file. It is read by this page only.'});
  const file = h(doc, 'input', {type: 'file', id: 'cr-rc-file', accept: '.json,application/json'});
  const bCheck = h(doc, 'button', {type: 'button', id: 'cr-rc-check', text: 'Check against this ledger'});
  const out = h(doc, 'div', {class: 'cr-rc-result', id: 'cr-rc-result', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', 'data-tone': 'none'});

  // (c) independent verifier
  const bCopy = h(doc, 'button', {type: 'button', id: 'cr-rc-copy', text: 'Copy command'});
  const copyLive = h(doc, 'span', {class: 'cr-rc-hint', id: 'cr-rc-copy-live', role: 'status', 'aria-live': 'polite', text: ''});
  const verifierLink = h(doc, 'a', {class: 'cr-rc-link', id: 'cr-rc-verifier', href: 'verify/verify_evidence.py', download: 'verify_evidence.py', text: 'Download the independent verifier'});
  const howLink = h(doc, 'a', {class: 'cr-rc-link', id: 'cr-rc-how', href: 'verify/README.md', text: 'How it works'});
  const cmd = h(doc, 'code', {class: 'cr-rc-cmd', id: 'cr-rc-cmd', text: VERIFY_COMMAND});

  host.replaceChildren(title, lead,
    h(doc, 'section', {class: 'cr-rc-step', 'aria-labelledby': 'cr-rc-h-seal'},
      h(doc, 'h4', {id: 'cr-rc-h-seal', text: '1. Seal this ledger'}),
      h(doc, 'div', {class: 'cr-rc-row'}, bSeal), reason, sealLive, sealOut),
    h(doc, 'section', {class: 'cr-rc-step', 'aria-labelledby': 'cr-rc-h-check'},
      h(doc, 'h4', {id: 'cr-rc-h-check', text: '2. Check against a receipt'}),
      h(doc, 'label', {class: 'cr-rc-label', for: 'cr-rc-paste', text: 'Receipt JSON'}), paste, pasteHint,
      h(doc, 'label', {class: 'cr-rc-label', for: 'cr-rc-file', text: 'Or choose a receipt file (.json)'}), file,
      h(doc, 'div', {class: 'cr-rc-row'}, bCheck), out),
    h(doc, 'section', {class: 'cr-rc-step', 'aria-labelledby': 'cr-rc-h-ver'},
      h(doc, 'h4', {id: 'cr-rc-h-ver', text: '3. Verify without GhostBridge'}),
      h(doc, 'p', {class: 'cr-rc-text', text: 'First press \u201cExport evidence JSON\u201d at the top of this tab to get ghostbridge-evidence.json. Then run the standard-library Python verifier on your own machine:'}),
      h(doc, 'pre', {class: 'cr-rc-pre', id: 'cr-rc-pre'}, cmd),
      h(doc, 'div', {class: 'cr-rc-row'}, bCopy, copyLive),
      h(doc, 'p', {class: 'cr-rc-links'}, verifierLink, howLink)));

  const live = t => { sealLive.textContent = t; };

  function paintSeal() {
    const none = !getRows().length;
    reason.textContent = none ? EMPTY_REASON : '';
    if (none) { bSeal.disabled = true; bSeal.setAttribute('disabled', ''); }
    else { bSeal.disabled = false; bSeal.removeAttribute('disabled'); }
    bDownload.disabled = false; bDownload.removeAttribute('disabled');
    bCheck.disabled = false; bCheck.removeAttribute('disabled');
    bCopy.disabled = false; bCopy.removeAttribute('disabled');
    if (!sealed) { sealOut.setAttribute('hidden', ''); fp.textContent = ''; meta.replaceChildren(); head.textContent = ''; return; }
    const r = sealed;
    sealOut.removeAttribute('hidden');
    fp.textContent = r.fingerprint;
    head.textContent = r.head;
    const kv = (k, v) => h(doc, 'div', {class: 'cr-rc-kv'}, h(doc, 'dt', {text: k}), h(doc, 'dd', {text: v}));
    meta.replaceChildren(kv('Rows sealed', String(r.rows)), kv('Sealed at (UTC)', r.sealed_at), kv('First event', `${r.first_event.id}`), kv('Last event', `${r.last_event.id}`));
  }

  function paintVerdict() {
    if (!verdict) { out.replaceChildren(); out.setAttribute('data-tone', 'none'); return; }
    const v = VERDICTS[verdict.status] ?? VERDICTS['invalid-receipt'];
    out.setAttribute('data-tone', v.tone); out.setAttribute('data-status', verdict.status);
    out.replaceChildren(
      h(doc, 'p', {class: `cr-rc-verdict is-${v.tone}`, id: 'cr-rc-verdict'}, h(doc, 'span', {class: 'cr-rc-icon', 'aria-hidden': 'true', text: v.icon}), h(doc, 'strong', {text: v.word})),
      h(doc, 'p', {class: 'cr-rc-code', text: `Result: ${verdict.status}`}),
      h(doc, 'p', {class: 'cr-rc-msg', id: 'cr-rc-msg', text: verdict.message}));
  }

  async function seal() {
    const rows = getRows();
    if (!rows.length || busy) return null;
    busy = true;
    const mine = token;
    try {
      const receipt = await makeReceipt(rows, {now: now()});
      if (mine !== token) return null;   // the ledger changed while hashing; a stale seal must not appear
      sealed = receipt; paintSeal();
      live(`Sealed ${receipt.rows} row${receipt.rows === 1 ? '' : 's'}. Fingerprint ${receipt.fingerprint}.`);
      return receipt;
    } catch (e) {
      sealed = null; paintSeal(); live(`Could not seal: ${e.message}`);
      return null;
    } finally { busy = false; }
  }

  async function check() {
    const text = paste.value.trim(), mine = ++checkToken, sigAtStart = sig;
    let res;
    if (!text) res = {status: 'invalid-receipt', ok: false, message: 'Paste a receipt or choose a receipt file first.'};
    else {
      let receipt;
      try { receipt = JSON.parse(text); } catch { receipt = undefined; }
      res = receipt === undefined ? {status: 'invalid-receipt', ok: false, message: 'This text is not valid JSON.'} : await checkReceipt(getRows(), receipt);
    }
    if (mine !== checkToken || sigAtStart !== sig) return null;   // superseded, or the ledger moved on
    verdict = res; paintVerdict();
    return res;
  }

  function doDownload() {
    if (!sealed) return;
    save(RECEIPT_FILE, JSON.stringify(sealed, null, 2) + '\n', 'application/json');
    live(`Receipt downloaded as ${RECEIPT_FILE}. Keep it somewhere the ledger\u2019s owner cannot change.`);
  }

  async function doCopy() {
    try {
      if (copy) await copy(VERIFY_COMMAND);
      else await doc.defaultView.navigator.clipboard.writeText(VERIFY_COMMAND);
      copyLive.textContent = 'Command copied.';
    } catch { copyLive.textContent = 'Copying is not available here. Select the command and copy it.'; }
  }

  bSeal.addEventListener('click', seal);
  bDownload.addEventListener('click', doDownload);
  bCheck.addEventListener('click', check);
  bCopy.addEventListener('click', doCopy);
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    if (!f) return;
    try {
      paste.value = typeof f.text === 'function' ? await f.text() : await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = () => rej(fr.error); fr.readAsText(f); });
      await check();
    } catch (e) { verdict = {status: 'invalid-receipt', ok: false, message: `${f.name} could not be read: ${e && e.message ? e.message : e}`}; paintVerdict(); }
  });

  /** Clear the seal and the last verdict when the ledger changes, and re-assert control states (app.js re-enables every button after runs). */
  function refresh() {
    const rows = getRows();
    const next = `${rows.length}:${rows.map(r => r.hash).join(',')}`;
    if (next !== sig) {
      const had = !!sealed || !!verdict;
      sig = next; token++; checkToken++; busy = false;
      sealed = null; verdict = null;
      paintVerdict();
      live(had ? 'The ledger changed, so the previous seal and check result were cleared.' : '');
    }
    paintSeal();
  }

  refresh();
  return {
    refresh, seal, check, download: doDownload,
    get state() { return {sealed: !!sealed, verdict: verdict ? verdict.status : null, busy}; },
    get receipt() { return sealed; },
    elements: {seal: bSeal, reason, live: sealLive, fp, meta, head, download: bDownload, paste, file, check: bCheck, result: out, copy: bCopy, verifierLink, howLink, cmd, sealOut},
  };
}
