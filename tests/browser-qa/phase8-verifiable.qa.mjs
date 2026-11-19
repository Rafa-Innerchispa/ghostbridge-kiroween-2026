/**
 * Phase 8 real-browser QA: Bring your own log and Seal and verify (asserting; exits 1 on any failure).
 * Authored by the ui-director custom Kiro agent (Phase 8 run D).
 *
 * Not part of CI (needs Chrome/Edge). Run:  node tests/browser-qa/phase8-verifiable.qa.mjs
 * Writes screenshots and REPORT.md to docs/evidence/phase8/. Every scenario runs on a fresh browser against docs/ served from 127.0.0.2.
 */
import path from 'node:path';
import {ROOT, recorder, serveDocs, withBrowser, writeReport, sleep} from './lib.mjs';
const OUT = path.join(ROOT, 'docs', 'evidence', 'phase8');
const rec = recorder('Phase 8 verifiable evidence');
const {check} = rec;
const srv = await serveDocs();
const G = id => `document.getElementById(${JSON.stringify(id)})`;
const KEY = 'ghostbridge-ledger-v1';
const settled = b => b.waitFor(`!${G('reset')}.disabled && !${G('forge-run')}.disabled`, 'ui settled').then(() => b.eval(`new Promise(r=>setTimeout(r,450))`));
const open = b => b.goto(srv.origin, "!!document.querySelector('#cr-scene svg')").then(() => b.waitFor(`${G('mode')}.textContent.includes('Browser lab')`, 'browser lab mode'));
const rawLedger = b => b.eval(`localStorage.getItem(${JSON.stringify(KEY)})`);
const ledger = async b => JSON.parse((await rawLedger(b)) || '[]');
const chal = async (b, which) => {
  await b.click(which === 'A' ? '#cr-chal-a' : '#cr-chal-b');
  await b.waitFor(`${G('events-count')}.textContent==='3' && ${G('cases-count')}.textContent===${JSON.stringify(which === 'A' ? '1' : '0')}`, 'challenge ' + which);
  await settled(b); await sleep(500);
};
const chip = b => b.eval(`(()=>{const c=${G('cr-case-chip')};return {hidden:c.hidden,text:c.textContent,kind:c.getAttribute('data-kind')}})()`);
const noErr = (b, label) => check(`${label}: no console errors or exceptions`, b.drainErrors().length === 0);
const small = (b, scope, min = 40) => b.eval(`[...document.querySelectorAll(${JSON.stringify(scope)})].filter(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&(r.height<${min}-0.5||r.width<${min}-0.5)}).map(e=>(e.id||e.className||e.tagName).toString().slice(0,40)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height))`);
const tinyText = (b, scope) => b.eval(`(()=>{const bad=[];document.querySelectorAll(${JSON.stringify(scope)}).forEach(e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect();if(r.width===0||r.height===0||cs.visibility==='hidden')return;const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(own&&parseFloat(cs.fontSize)<12)bad.push((e.id||e.className||e.tagName)+':'+cs.fontSize)});return bad.slice(0,8)})()`);
const focusRing = b => b.eval(`(()=>{const e=document.activeElement,cs=getComputedStyle(e);return {id:e.id||e.className||e.tagName,style:cs.outlineStyle,w:parseFloat(cs.outlineWidth)}})()`);
const activeId = b => b.eval(`document.activeElement.id||document.activeElement.className||document.activeElement.tagName`);
const pressTab = async (b, shift = false) => { await b.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: shift ? 8 : 0}); await b.send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: shift ? 8 : 0}); await sleep(80); };
const tabTo = async (b, id, max = 60) => { for (let i = 1; i <= max; i++) { await pressTab(b); if ((await activeId(b)) === id) return i; } return -1; };
const enter = async b => { await b.key('Enter', 'Enter', 13, '\r'); await sleep(120); };
const setText = (b, id, v) => b.eval(`(()=>{const e=${G(id)};e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}));return e.value.length})()`);
const shot = (b, name, sel) => b.shot(path.join(OUT, name), sel);
const patchDownload = b => b.eval(`(()=>{window.__dl=[];window.__revoked=[];const oc=URL.createObjectURL.bind(URL),or=URL.revokeObjectURL.bind(URL);URL.createObjectURL=blob=>{window.__blob=blob;const u=oc(blob);window.__url=u;return u};URL.revokeObjectURL=u=>{window.__revoked.push(u);or(u)};const ac=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.hasAttribute('download')){window.__dl.push({name:this.getAttribute('download'),href:this.href});return}return ac.call(this)};return true})()`);
const TEMPLATE_IDS = ['byo:B-1', 'byo:B-2', 'byo:B-3', 'byo:B-4'];
const BAD_CSV = ['event_id,at,source,signal,duration_seconds', 'B-1,2026-11-20T21:58:00Z,archive-reader,DENIED,', 'B-2,not-a-time,north-door,CLOSED,', 'B-3,2026-11-20T22:00:00Z,north-door,OPEN,', ''].join('\n');
const byoImport = async b => {
  await b.click('#cr-byo-open');
  await b.click('#cr-byo-template'); await b.click('#cr-byo-check');
  await b.waitFor(`${G('cr-byo-import')}.disabled===false`, 'import enabled');
  await b.click('#cr-byo-import');
  await b.waitFor(`${G('events-count')}.textContent==='4' && ${G('cases-count')}.textContent==='1'`, 'byo imported');
  await settled(b); await sleep(500);
};
const sealOnce = async b => {
  await b.click('#cr-tab-evidence');
  await b.click('#cr-rc-seal');
  await b.waitFor(`${G('cr-rc-fp')}.textContent.length>0`, 'fingerprint shown');
};
const verdict = b => b.eval(`(()=>{const r=${G('cr-rc-result')};const v=r.querySelector('.cr-rc-verdict');return {tone:r.getAttribute('data-tone'),status:r.getAttribute('data-status'),word:v?v.textContent:'',icon:v?v.querySelector('.cr-rc-icon').textContent:'',cls:v?v.className:'',msg:(${G('cr-rc-msg')}||{}).textContent||''}})()`);
const checkReceiptText = async (b, text) => { await setText(b, 'cr-rc-paste', text); await b.click('#cr-rc-check'); await b.waitFor(`${G('cr-rc-result')}.getAttribute('data-tone')!=='none'`, 'verdict shown'); return verdict(b); };
const receiptFromDownload = async b => { await patchDownload(b); await b.click('#cr-rc-download'); return b.eval(`window.__blob.text()`); };
const fp = s => s.replace(/\s+/g, '');

try {
  // ============ (i) template, check, import ============
  await withBrowser(rec, 'S1 bring your own log: template, check, import', async b => {
    await b.viewport(1440, 900); await open(b);
    const card = await b.eval(`(()=>{const o=${G('cr-byo-open')},p=${G('cr-byo-panel')},side=document.querySelector('.cr-side'),a=document.getElementById('cr-chal-b');return {inSide:!!o.closest('.cr-side'),below:o.getBoundingClientRect().top>=a.getBoundingClientRect().bottom,text:o.textContent,exp:o.getAttribute('aria-expanded'),hidden:p.hidden,role:p.getAttribute('role'),label:p.getAttribute('aria-label')}})()`);
    check('S1.1 third card "Your own log" sits in the aside below the two challenges and the panel is closed', card.inSide && card.below && /Your own log/.test(card.text) && /Write or upload events\. Nothing leaves your browser\./.test(card.text) && card.exp === 'false' && card.hidden === true, JSON.stringify(card));
    await b.click('#cr-byo-open');
    const opened = await b.eval(`({hidden:${G('cr-byo-panel')}.hidden,exp:${G('cr-byo-open')}.getAttribute('aria-expanded'),role:${G('cr-byo-panel')}.getAttribute('role'),label:${G('cr-byo-panel')}.getAttribute('aria-label'),focus:document.activeElement.id,rows:${G('cr-byo-text')}.rows,minH:${G('cr-byo-text')}.getBoundingClientRect().height,font:getComputedStyle(${G('cr-byo-text')}).fontFamily,accept:${G('cr-byo-file')}.accept,sources:document.querySelectorAll('#cr-byo-ref tbody tr').length})`);
    check('S1.2 panel opens as a labelled region, focus moves into it, textarea is monospace with >= 8 rows, file input accepts .csv,.txt, 4 sources listed', opened.hidden === false && opened.exp === 'true' && opened.role === 'region' && opened.label === 'Bring your own log' && opened.focus === 'cr-byo-title' && opened.rows >= 8 && opened.minH >= 150 && /mono|Consolas|Courier/i.test(opened.font) && opened.accept === '.csv,.txt' && opened.sources === 4, JSON.stringify(opened));
    check('S1.3 Import is disabled before any check', (await b.eval(`${G('cr-byo-import')}.disabled`)) === true);
    await b.click('#cr-byo-template');
    check('S1.4 template fills the textarea (5 lines) and Import is still disabled', (await b.eval(`${G('cr-byo-text')}.value.trim().split('\\n').length`)) === 5 && (await b.eval(`${G('cr-byo-import')}.disabled`)) === true);
    await b.click('#cr-byo-check');
    const sum = (await b.text('#cr-byo-result .cr-byo-sum')) || '';
    check('S1.5 Check reports "4 events ready to import" and enables Import', /^4 events ready to import/.test(sum) && (await b.eval(`${G('cr-byo-import')}.disabled`)) === false, sum);
    await setText(b, 'cr-byo-text', (await b.eval(`${G('cr-byo-text')}.value`)) + '\n');
    check('S1.6 editing the text disables Import again', (await b.eval(`${G('cr-byo-import')}.disabled`)) === true);
    await b.click('#cr-byo-check');
    check('S1.7 checking again re-enables it', (await b.eval(`${G('cr-byo-import')}.disabled`)) === false);
    await shot(b, 'byo-1440.png', '.cr-side');
    const before = await ledger(b);
    check('S1.8 nothing is in the ledger before Import', before.length === 0, String(before.length));
    await b.click('#cr-byo-import');
    await b.waitFor(`${G('events-count')}.textContent==='4' && ${G('cases-count')}.textContent==='1'`, 'events-count 4 and cases-count 1');
    await settled(b); await sleep(600);
    const rows = await ledger(b), c = await chip(b);
    check('S1.9 Import: events-count 4 and cases-count 1', (await b.text('#events-count')) === '4' && (await b.text('#cases-count')) === '1');
    check('S1.10 ledger in localStorage holds exactly the four byo: events, in order', JSON.stringify(rows.map(r => r.payload.event.id)) === JSON.stringify(TEMPLATE_IDS), JSON.stringify(rows.map(r => r.payload.event.id)));
    const caseId = (c.text.split('\u00b7')[1] || '').trim();
    check('S1.11 the Control Room case chip shows a case id', c.hidden === false && c.kind === 'case' && caseId.length > 3, JSON.stringify(c));
    const msg = (await b.text('#cr-byo-result .cr-byo-sum')) || '';
    check('S1.12 the result line reports the ledger\u2019s own count (4)', /^4 events sealed/.test(msg), msg);
    check('S1.13 the honest label is visible next to Import', /Replaces this lab\u2019s evidence/.test((await b.text('#cr-byo-warn')) || ''));
    check('S1.14 the integrity label reads Verified after import', (await b.text('#integrity-label')) === 'Verified', await b.text('#integrity-label'));
    await b.click('#cr-byo-close');
    check('S1.15 Close hides the panel and returns focus to the opener', (await b.eval(`${G('cr-byo-panel')}.hidden`)) === true && (await activeId(b)) === 'cr-byo-open', await activeId(b));
    noErr(b, 'S1');
  });

  // ============ (ii) two bad lines ============
  await withBrowser(rec, 'S2 bring your own log: errors', async b => {
    await b.viewport(1440, 900); await open(b); await chal(b, 'A');
    const before = await rawLedger(b);
    await b.click('#cr-byo-open');
    await setText(b, 'cr-byo-text', BAD_CSV);
    await b.click('#cr-byo-check');
    const items = await b.eval(`[...document.querySelectorAll('#cr-byo-errs li')].map(e=>e.textContent)`);
    check('S2.1 two problems are listed with their line numbers (3 and 4)', items.length === 2 && items[0].startsWith('Line 3:') && items[1].startsWith('Line 4:'), JSON.stringify(items));
    check('S2.2 the summary says nothing was imported', /2 problems found; nothing was imported/.test((await b.text('#cr-byo-result .cr-byo-sum')) || ''));
    check('S2.3 Import stays disabled', (await b.eval(`${G('cr-byo-import')}.disabled`)) === true);
    await b.eval(`${G('cr-byo-import')}.click()`).catch(() => {});
    await sleep(400);
    check('S2.4 the ledger in localStorage is byte-identical and the counts are unchanged', (await rawLedger(b)) === before && (await b.text('#events-count')) === '3' && (await b.text('#cases-count')) === '1');
    check('S2.5 the problems are not colour-only: neutral tone, text with line numbers, aria-live region', (await b.attr('#cr-byo-result', 'data-tone')) === 'info' && (await b.attr('#cr-byo-result', 'aria-live')) === 'polite');
    await shot(b, 'byo-errors-1440.png', '.cr-side');
    noErr(b, 'S2');
  });

  // ============ (iii) seal, check, replace ============
  await withBrowser(rec, 'S3 seal, check, ledger replaced (truncated)', async b => {
    await b.viewport(1440, 900); await open(b);
    await b.click('#cr-tab-evidence');
    check('S3.0 empty ledger: Seal is disabled and says why', (await b.eval(`${G('cr-rc-seal')}.disabled`)) === true && /ledger is empty/i.test((await b.text('#cr-rc-seal-reason')) || ''));
    await byoImport(b);
    const rows = await ledger(b), last = rows.at(-1).hash;
    const region = await b.eval(`(()=>{const r=${G('cr-rc')};return {role:r.getAttribute('role'),label:r.getAttribute('aria-label'),inPanel:!!r.closest('#cr-panel-evidence'),afterList:!!(${G('cr-ev-list')}.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING)}})()`);
    check('S3.1 labelled region "Seal and verify" sits in the Evidence panel after the evidence list', region.role === 'region' && region.label === 'Seal and verify' && region.inPanel && region.afterList, JSON.stringify(region));
    await sealOnce(b);
    const shown = (await b.text('#cr-rc-fp')) || '';
    check('S3.2 the fingerprint is the first 16 hex of the last ledger row hash', fp(shown) === last.slice(0, 16) && /^[0-9a-f]{4}( [0-9a-f]{4}){3}$/.test(shown), `${shown} vs ${last.slice(0, 16)}`);
    check('S3.3 row count and head hash come from the ledger', (await b.text('#cr-rc-meta')).includes('4') && (await b.text('#cr-rc-head')) === last);
    const fontPx = await b.eval(`parseFloat(getComputedStyle(${G('cr-rc-fp')}).fontSize)`);
    check('S3.4 the fingerprint is large (>= 20 px) and monospace', fontPx >= 20 && /mono|Consolas|Courier/i.test(await b.eval(`getComputedStyle(${G('cr-rc-fp')}).fontFamily`)), String(fontPx));
    await shot(b, 'seal-1440.png', '#cr-rc');
    const text = await receiptFromDownload(b);
    const dl = await b.eval(`window.__dl`), receipt = JSON.parse(text);
    check('S3.5 Download receipt: Blob application/json, filename ghostbridge-receipt.json, head equals the last row hash', dl.length === 1 && dl[0].name === 'ghostbridge-receipt.json' && (await b.eval(`window.__blob.type`)) === 'application/json' && receipt.head === last && receipt.rows === 4 && receipt.schema === 'ghostbridge-receipt-v1', JSON.stringify(dl));
    await sleep(1500);
    check('S3.6 the object URL is revoked after the download', (await b.eval(`window.__revoked.includes(window.__url)`)) === true);
    const v1 = await checkReceiptText(b, text);
    check('S3.7 checking the same receipt: matches, ok tone, "Verified against receipt" with a check icon', v1.status === 'matches' && v1.tone === 'ok' && /Verified against receipt/.test(v1.word) && v1.icon === '\u2713' && v1.cls.includes('is-ok'), JSON.stringify(v1));
    // challenge A replaces the ledger
    await chal(b, 'A'); await b.click('#cr-tab-evidence');
    const after = await ledger(b);
    check('S3.8 challenge A replaced the ledger (different head, 3 rows) and cleared the shown seal and verdict', after.length === 3 && after.at(-1).hash !== last && (await b.text('#cr-rc-fp')) === '' && (await b.attr('#cr-rc-result', 'data-tone')) === 'none', `${after.length} rows`);
    check('S3.9 the pasted receipt text is kept so it can be checked again', (await b.eval(`${G('cr-rc-paste')}.value`)) === text);
    await b.click('#cr-rc-check');
    await b.waitFor(`${G('cr-rc-result')}.getAttribute('data-tone')!=='none'`, 'verdict after replace');
    const v2 = await verdict(b);
    const expected = after.length < receipt.rows ? 'truncated' : 'rewritten';
    check(`S3.10 the old receipt against the replaced ledger is a failure (${expected}, per the model), shown in red with an icon and a word`, v2.status === expected && v2.tone === 'crit' && v2.cls.includes('is-crit') && v2.icon === '\u2715' && /Failed/.test(v2.word), JSON.stringify(v2));
    check('S3.11 the model\u2019s message is shown', v2.msg.length > 20 && /sealed/.test(v2.msg), v2.msg);
    const red = await b.eval(`(()=>{const e=document.querySelector('#cr-rc-result .cr-rc-verdict');return getComputedStyle(e).color})()`);
    check('S3.12 the failed verdict is red-ish text (r > g, r > b)', (() => { const m = red.match(/\d+/g).map(Number); return m[0] > 180 && m[0] > m[1] + 50 && m[0] > m[2] + 50; })(), red);
    await shot(b, 'receipt-failed-1440.png', '#cr-rc');
    noErr(b, 'S3');
  });

  await withBrowser(rec, 'S3b seal a challenge ledger, then import another log (rewritten)', async b => {
    await b.viewport(1440, 900); await open(b); await chal(b, 'A');
    await sealOnce(b);
    const text = await receiptFromDownload(b), receipt = JSON.parse(text);
    check('S3b.1 sealed the 3-row challenge ledger', receipt.rows === 3);
    await byoImport(b); await b.click('#cr-tab-evidence');
    const after = await ledger(b);
    const v = await checkReceiptText(b, text);
    const expected = after.length < receipt.rows ? 'truncated' : 'rewritten';
    check(`S3b.2 4 rows now, the 3-row seal no longer ends in the sealed hash: ${expected}, crit`, after.length === 4 && v.status === expected && v.status === 'rewritten' && v.tone === 'crit', JSON.stringify(v));
    const bad = await checkReceiptText(b, '{"schema":"nope"}');
    check('S3b.3 a non-receipt is informative (info tone, "i" icon), not a failure of the evidence', bad.status === 'invalid-receipt' && bad.tone === 'info' && bad.icon === 'i' && bad.cls.includes('is-info'), JSON.stringify(bad));
    const notJson = await checkReceiptText(b, 'hello');
    check('S3b.4 text that is not JSON is also info', notJson.status === 'invalid-receipt' && notJson.tone === 'info');
    noErr(b, 'S3b');
  });

  // ============ (iv) verifier link ============
  await withBrowser(rec, 'S4 independent verifier links', async b => {
    await b.viewport(1440, 900); await open(b); await b.click('#cr-tab-evidence');
    const link = await b.eval(`(()=>{const a=${G('cr-rc-verifier')},h=${G('cr-rc-how')};return {href:a.getAttribute('href'),abs:a.href,dl:a.getAttribute('download'),text:a.textContent,howHref:h.getAttribute('href'),howAbs:h.href,howText:h.textContent,cmd:${G('cr-rc-cmd')}.textContent}})()`);
    check('S4.1 links and command text are as specified', link.href === 'verify/verify_evidence.py' && link.dl === 'verify_evidence.py' && link.text === 'Download the independent verifier' && link.howHref === 'verify/README.md' && link.howText === 'How it works' && link.cmd === 'python verify_evidence.py ghostbridge-evidence.json --receipt ghostbridge-receipt.json', JSON.stringify(link));
    const r1 = await b.eval(`fetch(${G('cr-rc-verifier')}.href).then(r=>({status:r.status,len:0})).catch(e=>({status:0,err:String(e)}))`);
    const r2 = await b.eval(`fetch(${G('cr-rc-how')}.href).then(r=>r.status)`);
    const n1 = await fetch(link.abs), n2 = await fetch(link.howAbs);
    const body = await n1.text();
    check('S4.2 the verifier link returns HTTP 200 from the local server (in the page and from Node), body is the Python verifier', r1.status === 200 && r2 === 200 && n1.status === 200 && n2.status === 200 && /hashlib/.test(body), JSON.stringify([r1, r2, n1.status, n2.status]));
    const exp = await b.eval(`!!${G('cr-ev-export')} && ${G('cr-rc')}.textContent.includes('Export evidence JSON')`);
    check('S4.3 the section points to the existing Export evidence JSON button, which still exists', exp === true);
    check('S4.4 the Copy command button copies or admits it cannot', await (async () => { await b.click('#cr-rc-copy'); await sleep(300); return /copied|not available/i.test((await b.text('#cr-rc-copy-live')) || ''); })());
    noErr(b, 'S4');
  });

  // ============ (v) keyboard-only ============
  await withBrowser(rec, 'S5 keyboard only through both panels', async b => {
    await b.viewport(1440, 900); await open(b); await patchDownload(b);
    await b.eval(`${G('cr-chal-b')}.focus()`);
    await pressTab(b);
    check('S5.1 Tab from Challenge B reaches "Your own log"', (await activeId(b)) === 'cr-byo-open', await activeId(b));
    const ring = await focusRing(b);
    check('S5.2 the opener shows a visible focus ring (outline style not none, >= 2 px)', ring.style !== 'none' && ring.w >= 2, JSON.stringify(ring));
    await enter(b);
    check('S5.3 Enter opens the panel and moves focus to its heading', (await b.eval(`${G('cr-byo-panel')}.hidden`)) === false && (await activeId(b)) === 'cr-byo-title', await activeId(b));
    await pressTab(b);
    check('S5.4 Tab reaches "Use the template"', (await activeId(b)) === 'cr-byo-template', await activeId(b));
    await enter(b);
    check('S5.5 Enter fills the template and moves focus to the textarea', (await b.eval(`${G('cr-byo-text')}.value.length>50`)) && (await activeId(b)) === 'cr-byo-text', await activeId(b));
    const n = await tabTo(b, 'cr-byo-check', 6);
    check('S5.6 Tab reaches Check within a few presses; Import is not a tab stop while disabled', n > 0 && n <= 3, String(n));
    await enter(b);
    check('S5.7 Enter on Check says 4 events are ready', /^4 events ready to import/.test((await b.text('#cr-byo-result .cr-byo-sum')) || ''));
    await pressTab(b);
    check('S5.8 Tab then reaches the now-enabled Import', (await activeId(b)) === 'cr-byo-import', await activeId(b));
    await enter(b);
    await b.waitFor(`${G('events-count')}.textContent==='4' && ${G('cases-count')}.textContent==='1'`, 'keyboard import');
    await settled(b);
    check('S5.9 Enter on Import replaced the ledger with the 4 events and a case', (await ledger(b)).length === 4 && (await chip(b)).kind === 'case');
    check('S5.10 focus stayed on Import (enabled) and was not lost to the page body', (await activeId(b)) === 'cr-byo-import', await activeId(b));
    await pressTab(b);
    check('S5.11 Tab reaches Close', (await activeId(b)) === 'cr-byo-close', await activeId(b));
    await enter(b);
    check('S5.12 Enter on Close returns focus to "Your own log"', (await activeId(b)) === 'cr-byo-open' && (await b.eval(`${G('cr-byo-panel')}.hidden`)) === true, await activeId(b));
    // receipt panel
    await b.click('#cr-tab-evidence');
    await b.eval(`${G('cr-ev-export')}.focus()`);
    const toSeal = await tabTo(b, 'cr-rc-seal', 40);
    check('S5.13 Tab from Export evidence JSON reaches "Seal this ledger" (no keyboard trap, no skipped control)', toSeal > 0, String(toSeal));
    const ring2 = await focusRing(b);
    check('S5.14 Seal shows a visible focus ring', ring2.style !== 'none' && ring2.w >= 2, JSON.stringify(ring2));
    await enter(b);
    await b.waitFor(`${G('cr-rc-fp')}.textContent.length>0`, 'keyboard seal');
    const last = (await ledger(b)).at(-1).hash;
    check('S5.15 Enter seals: fingerprint matches the ledger head and focus stays on Seal', fp(await b.text('#cr-rc-fp')) === last.slice(0, 16) && (await activeId(b)) === 'cr-rc-seal');
    await pressTab(b);
    check('S5.16 Tab reaches Download receipt', (await activeId(b)) === 'cr-rc-download', await activeId(b));
    await enter(b);
    const text = await b.eval(`window.__blob.text()`);
    check('S5.17 Enter downloads the receipt', (await b.eval(`window.__dl.length`)) === 1 && JSON.parse(text).head === last);
    await pressTab(b);
    check('S5.18 Tab reaches the receipt textarea', (await activeId(b)) === 'cr-rc-paste', await activeId(b));
    await b.send('Input.insertText', {text});
    const n2 = await tabTo(b, 'cr-rc-check', 4);
    check('S5.19 Tab reaches "Check against this ledger" (after the file input)', n2 > 0, String(n2));
    await enter(b);
    await b.waitFor(`${G('cr-rc-result')}.getAttribute('data-tone')==='ok'`, 'keyboard check');
    const v = await verdict(b);
    check('S5.20 the typed/pasted receipt verifies: matches, ok', v.status === 'matches' && v.tone === 'ok', JSON.stringify(v));
    const n3 = await tabTo(b, 'cr-rc-verifier', 8), ring3 = await focusRing(b);
    check('S5.21 Tab reaches the verifier link past the copy button; link has a visible focus ring', n3 > 0 && ring3.style !== 'none' && ring3.w >= 2, `${n3} ${JSON.stringify(ring3)}`);
    noErr(b, 'S5');
  });

  // ============ (vi) responsive, targets, third parties ============
  await withBrowser(rec, 'S6 layouts 1440, 1024, 390', async b => {
    await open(b);
    for (const [w, hgt, mobile] of [[1440, 900, false], [1024, 768, false], [390, 844, true]]) {
      await b.viewport(w, hgt, mobile); await sleep(300);
      if (w === 1440) { await byoImport(b); } else if (await b.eval(`${G('cr-byo-panel')}.hidden`)) await b.click('#cr-byo-open');
      await b.click('#cr-tab-evidence');
      if ((await b.eval(`${G('cr-rc-fp')}.textContent.length`)) === 0) await b.click('#cr-rc-seal');
      await b.waitFor(`${G('cr-rc-fp')}.textContent.length>0`, 'seal at ' + w);
      await setText(b, 'cr-rc-paste', '{"schema":"nope"}');   // a non-receipt: shows the info state at this width
      await b.click('#cr-rc-check'); await sleep(150);
      const o = await b.overflow();
      check(`S6.${w}.1 no horizontal overflow (scrollWidth ${o.scrollW} <= clientWidth ${o.clientW}) and no clipped elements`, o.scrollW <= o.clientW + 1 && o.bad.length === 0, JSON.stringify(o));
      const sm = await small(b, '#cr-byo-open, #cr-byo-panel button, #cr-byo-panel input, #cr-byo-panel textarea, #cr-rc button, #cr-rc input, #cr-rc textarea, #cr-rc a.cr-rc-link');
      check(`S6.${w}.2 every new control is >= 40 px in both directions`, sm.length === 0, JSON.stringify(sm));
      const tiny = await tinyText(b, '#cr-byo *, #cr-rc *');
      check(`S6.${w}.3 no text under 12 px in the new views`, tiny.length === 0, JSON.stringify(tiny));
      const bodyPx = await b.eval(`parseFloat(getComputedStyle(${G('cr-byo-intro')}).fontSize)`);
      check(`S6.${w}.4 body copy is 14 px or larger`, bodyPx >= 14, String(bodyPx));
      if (w === 390) { await shot(b, 'byo-390.png', '.cr-side'); await shot(b, 'seal-390.png', '#cr-rc'); }
      check(`S6.${w}.5 no console errors`, b.drainErrors().length === 0);
    }
    const ext = await b.eval(`performance.getEntriesByType('resource').map(e=>e.name).filter(n=>!n.startsWith(location.origin))`);
    check('S6.9 ZERO third-party requests', ext.length === 0, JSON.stringify(ext));
    check('S6.10 no failed or 4xx requests, and the two new modules were served', srv.requests.filter(r => r.status >= 400).length === 0 && ['/byo_view.mjs', '/receipt_view.mjs', '/byo_log.mjs', '/evidence_receipt.mjs'].every(p => srv.requests.some(r => r.path === p && r.status === 200)), JSON.stringify(srv.requests.filter(r => r.status >= 400)));
  });

  // ============ reduced motion + blanket re-enable ============
  await withBrowser(rec, 'S7 reduced motion and blanket re-enable', async b => {
    await b.viewport(1440, 900); await b.reducedMotion(true); await open(b);
    await b.click('#cr-byo-open'); await setText(b, 'cr-byo-text', BAD_CSV); await b.click('#cr-byo-check');
    await chal(b, 'A');   // app.js disables then re-enables every button around the run
    check('S7.1 after a run the blanket re-enable is undone: Import is disabled again, Seal is enabled for the 3-row ledger', (await b.eval(`${G('cr-byo-import')}.disabled`)) === true && (await b.eval(`${G('cr-rc-seal')}.disabled`)) === false);
    await b.click('#reset'); await sleep(600);
    check('S7.2 after Reset the ledger is empty and Seal is disabled again', (await b.eval(`${G('cr-rc-seal')}.disabled`)) === true && (await ledger(b)).length === 0);
    const tr = await b.eval(`(()=>{const bad=[];document.querySelectorAll('#cr-byo *, #cr-rc *').forEach(e=>{const cs=getComputedStyle(e);if(parseFloat(cs.transitionDuration)>0||parseFloat(cs.animationDuration)>0&&cs.animationName!=='none')bad.push(e.id||e.className)});return bad.slice(0,5)})()`);
    check('S7.3 with prefers-reduced-motion no transition or animation runs inside the new views', tr.length === 0, JSON.stringify(tr));
    noErr(b, 'S7');
  });
} finally {
  await srv.close();
}
const s = rec.summary();
writeReport(path.join(OUT, 'REPORT.md'), 'Phase 8: Bring your own log and Seal and verify, real-browser QA', s,
  'Synthetic data only. Browser-only mode served from 127.0.0.2. Screenshots in this folder are written by this script; a human must still look at them.');
process.exit(s.fail ? 1 : 0);
