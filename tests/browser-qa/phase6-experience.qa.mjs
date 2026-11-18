/**
 * Phase 6 real-browser QA: Incident Time Machine and Evidence Trust Lab (asserting; exits 1 on any failure).
 * Authored by the ui-director custom Kiro agent (Phase 6 run B).
 *
 * Not part of CI (needs Chrome/Edge). Run:  node tests/browser-qa/phase6-experience.qa.mjs
 * Writes screenshots and REPORT.md to docs/evidence/phase6/. Every scenario runs on a fresh browser against docs/ served from 127.0.0.2.
 */
import path from 'node:path';
import {ROOT, recorder, serveDocs, withBrowser, writeReport, sleep} from './lib.mjs';

const OUT = path.join(ROOT, 'docs', 'evidence', 'phase6');
const rec = recorder('Phase 6 experience');
const {check} = rec;
const srv = await serveDocs();

const G = id => `document.getElementById(${JSON.stringify(id)})`;
const settled = b => b.waitFor(`!${G('reset')}.disabled && !${G('forge-run')}.disabled`, 'ui settled').then(() => b.eval(`new Promise(r=>setTimeout(r,450))`));
const open = (b, label = 'Browser lab') => b.goto(srv.origin, "!!document.querySelector('#cr-scene svg')").then(() => b.waitFor(`${G('mode')}.textContent.includes(${JSON.stringify(label)})`, 'mode ' + label));
const chal = async (b, which, cases) => {
  await b.click(which === 'A' ? '#cr-chal-a' : '#cr-chal-b');
  await b.waitFor(`${G('events-count')}.textContent==='3' && ${G('cases-count')}.textContent===${JSON.stringify(String(cases))}`, 'challenge ' + which);
  await settled(b); await sleep(700);
};
const KEY = 'ghostbridge-ledger-v1';
const rawLedger = b => b.eval(`localStorage.getItem(${JSON.stringify(KEY)})`);
const ledger = async b => JSON.parse((await rawLedger(b)) || '[]');
const scene = b => b.eval(`(()=>{const s=document.querySelector('#cr-scene svg');const a=n=>s.getAttribute('data-'+n);return {reader:a('reader'),door:a('door'),link:a('link'),kase:a('case'),idle:a('idle')}})()`);
const chip = b => b.eval(`(()=>{const c=${G('cr-case-chip')};return {hidden:c.hidden,text:c.textContent,kind:c.getAttribute('data-kind')}})()`);
const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const beatInfo = b => b.eval(`[...document.querySelectorAll('.cr-tm-beat')].map(e=>({step:e.dataset.step,cur:e.getAttribute('aria-current'),reached:e.dataset.reached,label:e.querySelector('.cr-tm-label').textContent,text:e.textContent.replace(/\\s+/g,' ').trim()}))`);
const caption = async b => norm(await b.text('#cr-tm-caption'));
const pick = async (b, i) => { await b.eval(`document.querySelectorAll('.cr-tm-beat')[${i}].click()`); await sleep(160); };
const timeline = async b => { await b.click('#cr-tab-timeline'); await b.waitFor(`document.querySelectorAll('.cr-tm-beat').length===8`, '8 beats'); };
const noErr = (b, label) => check(`${label}: no console errors or exceptions`, b.drainErrors().length === 0);
const small = (b, scope, min = 40) => b.eval(`[...document.querySelectorAll(${JSON.stringify(scope)})].filter(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&(r.height<${min}-0.5||r.width<${min}-0.5)}).map(e=>(e.id||e.className||e.tagName).toString().slice(0,40)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height))`);
const focusRing = b => b.eval(`(()=>{const e=document.activeElement,cs=getComputedStyle(e);return {id:e.id||e.className,style:cs.outlineStyle,w:cs.outlineWidth}})()`);
const shot = (b, name, sel) => b.shot(path.join(OUT, name), sel);
const pressTab = async b => { await b.key('Tab', 'Tab', 9); await sleep(80); };
const activeId = b => b.eval(`document.activeElement.id||document.activeElement.className`);
const labOpen = async b => {
  await b.click('#cr-tab-evidence');
  if (!(await b.eval(`${G('cr-tl-lab-details')}.open`))) await b.click('#cr-tl-lab-summary');
  await b.waitFor(`document.querySelectorAll('#cr-tl-lab-chain .cr-tl-lab-block').length>0`, 'trust lab chain');
};
const setSel = (b, id, v) => b.eval(`(()=>{const e=${G(id)};e.value=${JSON.stringify(String(v))};e.dispatchEvent(new Event('change',{bubbles:true}));return e.value})()`);
const doTamper = async (b, row, field) => {
  await setSel(b, 'cr-tl-lab-row', row); await setSel(b, 'cr-tl-lab-field', field);
  await b.click('#cr-tl-lab-tamper');
  await b.waitFor(`!!${G('cr-tl-lab-altered-h')}`, `tamper result row ${row} ${field}`);
};
const hex64 = s => /^[0-9a-f]{64}$/.test(s || '');

try {
  // ============ (i) challenge A: all eight beats ============
  await withBrowser(rec, 'S1 challenge A 299/120 time machine', async b => {
    await b.viewport(1440, 900); await open(b); await chal(b, 'A', 1);
    const rows = await ledger(b);
    const denied = rows.find(r => r.payload.event.type === 'access.denied'), door = rows.find(r => r.payload.event.type === 'door.open' && r.payload.event.at > denied.payload.event.at); // the forge ledger also has an earlier, unrelated door.open
    check('S1.0 ledger read from localStorage has the denial and the door', !!denied && !!door, rows.map(r => r.payload.event.type).join(','));
    await timeline(b);
    const region = await b.eval(`(()=>{const r=${G('cr-tm')};return {role:r.getAttribute('role'),label:r.getAttribute('aria-label'),inPanel:!!r.closest('#cr-panel-timeline')}})()`);
    check('S1.1 labelled region "Incident Time Machine" lives inside the Timeline panel', region.role === 'region' && region.label === 'Incident Time Machine' && region.inPanel, JSON.stringify(region));
    const idle = await beatInfo(b);
    check('S1.2 eight beats, none current and the scene untouched before a choice (no autoplay)', idle.length === 8 && idle.every(x => x.cur === null) && (await b.eval(`${G('cr-live')}.disabled`)) === true, JSON.stringify(idle.map(x => x.cur)));
    check('S1.3 live region for the caption is aria-live polite', (await b.attr('#cr-tm-caption', 'aria-live')) === 'polite');
    const seen = [];
    for (let i = 0; i < 8; i++) {
      await pick(b, i);
      const info = await beatInfo(b), sc = await scene(b), cap = await caption(b), ch = await chip(b);
      seen.push({i, sc, cap, ch, info});
      check(`S1.4.${i + 1} beat ${i + 1} is the only aria-current beat`, info.filter(x => x.cur === 'step').length === 1 && info[i].cur === 'step', JSON.stringify(info.map(x => x.cur)));
      check(`S1.5.${i + 1} beat ${i + 1} reads as reached (no "did not happen")`, info[i].reached === 'true' && !/did not happen/i.test(info[i].text + cap), cap.slice(0, 120));
      check(`S1.6.${i + 1} beat ${i + 1} caption names its beat number and label`, cap.includes(`Beat ${i + 1} of 8`) && cap.includes(info[i].label), cap.slice(0, 80));
      check(`S1.7.${i + 1} beat ${i + 1} UTC time is shown exactly when the beat has one`, (i === 0 || i === 7) ? !cap.includes('UTC time') : /UTC time \d\d:\d\d:\d\d UTC/.test(cap), cap.slice(0, 90));
    }
    const at = n => seen[n - 1];
    check('S1.8 beat 2: reader denied and no link (the earlier forge door.open is still open at that moment, per the ledger)', at(2).sc.reader === 'denied' && at(2).sc.link === 'none', JSON.stringify(at(2).sc));
    check('S1.9 beat 3: door open and NO link yet', at(3).sc.door === 'open' && at(3).sc.link === 'none' && at(3).sc.kase === 'off', JSON.stringify(at(3).sc));
    check('S1.10 beat 4: door held', at(4).sc.door === 'held', JSON.stringify(at(4).sc));
    check('S1.11 beat 6: the case link appears and the chip shows the case', at(6).sc.link === 'case' && at(6).sc.kase === 'on' && at(6).ch.kind === 'case', JSON.stringify([at(6).sc, at(6).ch]));
    check('S1.12 beat 1: quiet building (reader idle, door closed, no link)', at(1).sc.reader === 'idle' && at(1).sc.door === 'closed' && at(1).sc.link === 'none', JSON.stringify(at(1).sc));
    const caseId = (at(6).ch.text.split('\u00b7')[1] || '').trim();
    check('S1.13 case id read from the case chip is non-empty and appears in the beat 6 caption', caseId.length > 3 && at(6).cap.includes(caseId), caseId);
    check('S1.14 beat 2 caption carries the denial event id, ledger row and the full hash from localStorage', at(2).cap.includes(denied.payload.event.id) && at(2).cap.includes(`#${denied.seq}`) && at(2).cap.includes(denied.hash), at(2).cap.slice(0, 160));
    check('S1.15 beat 3 caption carries the door event id and its hash', at(3).cap.includes(door.payload.event.id) && at(3).cap.includes(door.hash));
    check('S1.16 beat 7 caption cites both ledger hashes (denial and door)', at(7).cap.includes(denied.hash) && at(7).cap.includes(door.hash), at(7).cap.slice(0, 200));
    await pick(b, 6);   // the DOM now shows the last beat looped over; go back to the evidence beat
    const short = h => `${h.slice(0, 10)}\u2026${h.slice(-4)}`;
    check('S1.17 hashes are shortened in view and expandable to the full value', at(7).cap.includes(short(denied.hash)) && (await b.eval(`!!document.querySelector('#cr-tm-caption details summary')`)));
    const titles = await b.eval(`[...document.querySelectorAll('#cr-tm-caption .cr-tm-hash')].map(e=>e.title)`);
    check('S1.18 each shortened hash carries the full hash in its title', titles.length === 2 && titles.every(hex64) && titles.includes(denied.hash) && titles.includes(door.hash), JSON.stringify(titles));
    check('S1.19 beat 8 gives advisory text from the model (no device control claim)', /review|verify|check|inspect|operator|advis|confirm/i.test(at(8).cap) && !/unlock|dispatch/i.test(at(8).cap), at(8).cap.slice(0, 160));
    // the existing cursor mechanism is what moved: scrubber output and Back to live
    await pick(b, 3);
    check('S1.20 choosing a beat uses the existing cursor: scrubber shows a time and Back to live is enabled', !/^Live/.test(norm(await b.text('#cr-scrub-out'))) && (await b.eval(`${G('cr-live')}.disabled`)) === false, norm(await b.text('#cr-scrub-out')));
    await b.click('#cr-live'); await sleep(160);
    const live = await scene(b), info = await beatInfo(b);
    check('S1.21 Back to live returns to the live building and releases the active beat', live.link === 'case' && info.every(x => x.cur === null) && (await b.eval(`${G('cr-live')}.disabled`)) === true, JSON.stringify(live));
    // scrubbing elsewhere releases the beat
    await pick(b, 2); await b.setRange('#cr-scrub', 0); await sleep(160);
    check('S1.22 moving the scrubber releases the active beat', (await beatInfo(b)).every(x => x.cur === null));
    // Previous / Next
    await b.click('#cr-live');
    const prevNext = [];
    await b.click('#cr-tm-next'); prevNext.push((await beatInfo(b)).findIndex(x => x.cur === 'step'));
    await b.click('#cr-tm-next'); prevNext.push((await beatInfo(b)).findIndex(x => x.cur === 'step'));
    await b.click('#cr-tm-prev'); prevNext.push((await beatInfo(b)).findIndex(x => x.cur === 'step'));
    check('S1.23 Next, Next, Previous lands on beats 1, 2, 1', JSON.stringify(prevNext) === '[0,1,0]', JSON.stringify(prevNext));
    // Play with the real clock: advances ~2.2 s per beat, pausing holds, it stops at the last beat
    await pick(b, 1); await b.click('#cr-tm-play');
    check('S1.24 Play moves focus-safe: Play disabled, Pause enabled while playing', (await b.eval(`${G('cr-tm-play')}.disabled`)) === true && (await b.eval(`${G('cr-tm-pause')}.disabled`)) === false);
    await sleep(1200);
    const mid = (await beatInfo(b)).findIndex(x => x.cur === 'step');
    check('S1.25 after 1.2 s Play has NOT advanced yet (interval is about 2.2 s)', mid === 1, 'index ' + mid);
    await sleep(1700);
    const adv = (await beatInfo(b)).findIndex(x => x.cur === 'step');
    check('S1.26 after about 2.9 s Play advanced exactly one beat', adv === 2, 'index ' + adv);
    await b.click('#cr-tm-pause'); await sleep(2800);
    check('S1.27 Pause holds the beat (no further advance after 2.8 s)', (await beatInfo(b)).findIndex(x => x.cur === 'step') === 2);
    await pick(b, 5); await b.click('#cr-tm-play');
    await b.waitFor(`document.querySelectorAll('.cr-tm-beat')[7].getAttribute('aria-current')==='step'`, 'play reaches last beat', 9000);
    await sleep(2800);
    check('S1.28 Play stops on the last beat and Play is available again', (await beatInfo(b)).findIndex(x => x.cur === 'step') === 7 && (await b.eval(`${G('cr-tm-play')}.disabled`)) === false && (await b.eval(`${G('cr-tm-pause')}.disabled`)) === true);
    // timeline items still work (existing behaviour kept)
    check('S1.29 existing timeline list, scrubber and markers are still present', (await b.count('#cr-tl-list .cr-tl-item')) === 3 && (await b.count('#cr-tl-track .cr-mark')) === 3 && !!(await b.attr('#cr-scrub', 'max')));
    // screenshot: beat 6 at 1440
    await pick(b, 5);
    await shot(b, 'time-machine-1440-beat6.png', '#control-room');
    noErr(b, 'S1');
  });

  // ============ (ii) challenge B: near miss ============
  await withBrowser(rec, 'S2 challenge B 301/119 near miss', async b => {
    await b.viewport(1440, 900); await open(b); await chal(b, 'B', 0);
    await timeline(b);
    const note = norm(await b.text('#cr-tm-note'));
    check('S2.1 the model note for the near miss is shown', /No case/.test(note) && /outside the window/.test(note), note);
    const links = [], missed = [];
    for (let i = 0; i < 8; i++) {
      await pick(b, i);
      const sc = await scene(b), info = await beatInfo(b), cap = await caption(b), ch = await chip(b);
      links.push(sc.link); missed.push(/did not happen/.test(info[i].text) && /Did not happen/.test(cap));
      check(`S2.2.${i + 1} beat ${i + 1} never shows a case link or case chip`, sc.link !== 'case' && sc.kase === 'off' && ch.kind !== 'case', JSON.stringify([sc, ch]));
      if (i >= 3 && i <= 6) check(`S2.3.${i + 1} beat ${i + 1} says "did not happen" in the beat and the caption (words, not colour)`, missed[i] && info[i].reached === 'false', info[i].text + ' | ' + cap.slice(0, 60));
      else check(`S2.4.${i + 1} beat ${i + 1} is not marked as missed`, !missed[i] && info[i].reached === 'true');
    }
    const shapes = await b.eval(`[...document.querySelectorAll('.cr-tm-beat')].map(e=>{const m=e.querySelector('.cr-tm-mark'),cs=getComputedStyle(m);return {bg:cs.backgroundColor,bw:cs.borderTopWidth,dash:getComputedStyle(e).borderTopStyle}})`);
    check('S2.5 missed beats have a hollow marker (transparent fill, visible border) and dashed outline; reached beats do not', shapes.every((s, i) => (i >= 3 && i <= 6) ? (s.bg === 'rgba(0, 0, 0, 0)' && s.bw !== '0px' && s.dash === 'dashed') : (s.bg !== 'rgba(0, 0, 0, 0)' && s.dash === 'solid')), JSON.stringify(shapes[3]) + JSON.stringify(shapes[0]));
    const cap6 = (await pick(b, 5), await caption(b));
    check('S2.6 the "no case" beat explains why from the model', /No correlated case/.test(cap6), cap6.slice(0, 160));
    const cap5 = (await pick(b, 4), await caption(b));
    check('S2.7 rule-conditions beat names both failed conditions with their margins', /1 s outside the 300 s window/.test(cap5) && /1 s below the 120 s threshold/.test(cap5), cap5.slice(0, 220));
    await pick(b, 5);
    await shot(b, 'time-machine-1440-near-miss-beat6.png', '#control-room');
    noErr(b, 'S2');
  });

  // ============ (iii) trust lab ============
  await withBrowser(rec, 'S3 trust lab tamper and restore', async b => {
    await b.viewport(1440, 900); await open(b); await chal(b, 'A', 1);
    const before = await rawLedger(b), rows = JSON.parse(before), n = rows.length;
    check('S3.0 integrity label says Verified before any experiment', norm(await b.text('#integrity-label')) === 'Verified', norm(await b.text('#integrity-label')));
    await b.click('#cr-tab-evidence');
    check('S3.1 labelled region "Evidence Trust Lab" is inside the Evidence panel and starts collapsed', (await b.eval(`(()=>{const r=${G('cr-tl-lab')};return r.getAttribute('role')==='region'&&r.getAttribute('aria-label')==='Evidence Trust Lab'&&!!r.closest('#cr-panel-evidence')&&r.querySelector('details').open===false})()`)) === true);
    check('S3.2 the honesty line is visible even while collapsed', norm(await b.text('#cr-tl-lab-honesty')) === 'Experiment on an isolated copy. The ledger above is never changed.' && (await b.eval(`${G('cr-tl-lab-honesty')}.getBoundingClientRect().height>0`)));
    await labOpen(b);
    const blocks = await b.eval(`[...document.querySelectorAll('#cr-tl-lab-chain .cr-tl-lab-block')].map(e=>({s:e.dataset.status,t:e.textContent.replace(/\\s+/g,' ').trim(),h:e.querySelector('code').title}))`);
    check('S3.3 one block per ledger row, each Verified with icon and text', blocks.length === n && blocks.every((x, i) => x.s === 'verified' && /Verified/.test(x.t) && x.h === rows[i].hash && x.t.includes(rows[i].payload.event.type)), JSON.stringify(blocks.map(x => x.s)));
    await shot(b, 'trust-lab-valid-1440.png', '#cr-tl-lab');
    // tamper row 2, field at
    await doTamper(b, 2, 'at');
    const origH = norm(await b.text('#cr-tl-lab-original-h')), altH = norm(await b.text('#cr-tl-lab-altered-h'));
    check('S3.4 side by side: "Original ledger: verified N of N rows" and "Altered copy: fails at row 2"', origH === `Original ledger: verified ${n} of ${n} rows` && altH === 'Altered copy: fails at row 2', origH + ' | ' + altH);
    const side = await b.eval(`(()=>{const a=${G('cr-tl-lab-original')}.getBoundingClientRect(),c=${G('cr-tl-lab-altered')}.getBoundingClientRect();return {sameRow:Math.abs(a.top-c.top)<4,leftOf:a.right<=c.left+1}})()`);
    check('S3.5 the two results sit side by side at 1440', side.sameRow && side.leftOf, JSON.stringify(side));
    const detail = await b.eval(`({reason:${G('cr-tl-lab-reason')}.textContent,change:${G('cr-tl-lab-change')}.textContent.replace(/\\s+/g,' '),hashes:[...document.querySelectorAll('#cr-tl-lab-hashes dd')].map(e=>({t:e.textContent,title:e.title})),alt:[...document.querySelectorAll('#cr-tl-lab-altered .cr-tl-lab-block')].map(e=>e.dataset.status)})`);
    check('S3.6 plain-language reason, the change (field, before, after) are shown', /does not match/.test(detail.reason) && /Timestamp/.test(detail.change) && detail.change.includes(rows[1].payload.event.at), detail.reason.slice(0, 80) + ' | ' + detail.change.slice(0, 120));
    check('S3.7 failing row shows stored vs recomputed hash, shortened, different, full value in title', detail.hashes.length === 2 && detail.hashes[0].t !== detail.hashes[1].t && detail.hashes[0].title === rows[1].hash && hex64(detail.hashes[1].title) && detail.hashes.every(x => x.t.includes('\u2026')), JSON.stringify(detail.hashes));
    check('S3.8 altered copy statuses: row 1 verified, row 2 altered, later rows unverifiable', detail.alt[0] === 'verified' && detail.alt[1] === 'altered' && detail.alt.slice(2).every(s => s === 'unverifiable'), JSON.stringify(detail.alt));
    check('S3.9 the result is announced in an aria-live region', /fails at row 2/.test(await b.text('#cr-tl-lab-live')) && (await b.attr('#cr-tl-lab-live', 'aria-live')) === 'polite' && (await b.attr('#cr-tl-lab-live', 'role')) === 'status');
    check('S3.10 localStorage ledger is byte-identical after the tamper', (await rawLedger(b)) === before);
    check('S3.11 the existing integrity indicator still says Verified', norm(await b.text('#integrity-label')) === 'Verified');
    check('S3.12 the real chain above still shows every block Verified', (await b.eval(`[...document.querySelectorAll('#cr-tl-lab-chain .cr-tl-lab-block')].every(e=>e.dataset.status==='verified')`)) === true);
    await shot(b, 'trust-lab-tampered-1440.png', '#cr-tl-lab');
    await b.click('#cr-tl-lab-restore');
    const clean = await b.eval(`({out:${G('cr-tl-lab-out')}.children.length,restoreDisabled:${G('cr-tl-lab-restore')}.disabled,ok:[...document.querySelectorAll('#cr-tl-lab-chain .cr-tl-lab-block')].every(e=>e.dataset.status==='verified')})`);
    check('S3.13 Restore clears the experiment and returns to the clean chain', clean.out === 0 && clean.restoreDisabled === true && clean.ok, JSON.stringify(clean));
    check('S3.14 Restore keeps the ledger byte-identical', (await rawLedger(b)) === before);
    // every applicable field on every row
    let ran = 0, disabledSeen = 0, wrong = [];
    for (let row = 1; row <= n; row++) {
      await setSel(b, 'cr-tl-lab-row', row);
      const opts = await b.eval(`[...${G('cr-tl-lab-field')}.options].map(o=>({v:o.value,d:o.disabled,t:o.textContent}))`);
      for (const o of opts) {
        if (o.d) { disabledSeen++; if (!/not applicable/.test(o.t)) wrong.push(`${row}:${o.v} unexplained`); continue; }
        await doTamper(b, row, o.v);
        const h = norm(await b.text('#cr-tl-lab-altered-h'));
        if (h !== `Altered copy: fails at row ${row}`) wrong.push(`${row}:${o.v} -> ${h}`);
        if ((await rawLedger(b)) !== before) wrong.push(`${row}:${o.v} ledger changed`);
        if (norm(await b.text('#integrity-label')) !== 'Verified') wrong.push(`${row}:${o.v} integrity label changed`);
        ran++;
        await b.click('#cr-tl-lab-restore');
      }
    }
    check(`S3.15 every applicable field on every row fails at that row; ledger and integrity label unchanged (${ran} experiments)`, ran >= n * 2 && wrong.length === 0, wrong.join('; '));
    check('S3.16 fields that do not apply are disabled AND explained in words', disabledSeen >= 1 && !wrong.some(w => /unexplained/.test(w)), `disabled options seen: ${disabledSeen}`);
    check('S3.17 localStorage still holds only the ledger key (the lab stores nothing)', JSON.stringify(await b.eval(`Object.keys(localStorage)`)) === JSON.stringify([KEY]));
    noErr(b, 'S3');
  });

  // ============ (iv) keyboard only ============
  await withBrowser(rec, 'S4 keyboard only', async b => {
    await b.viewport(1440, 900); await open(b); await chal(b, 'A', 1);
    await b.click('#cr-tab-timeline'); await b.waitFor(`document.querySelectorAll('.cr-tm-beat').length===8`, 'beats');
    const before = await rawLedger(b);
    await b.eval(`${G('cr-tm-next')}.focus()`);
    await b.key('Enter', 'Enter', 13, '\r'); await sleep(150);
    let cur = (await beatInfo(b)).findIndex(x => x.cur === 'step');
    check('S4.1 Enter on Next selects beat 1', cur === 0, 'index ' + cur);
    await b.key(' ', 'Space', 32, ' '); await sleep(150);
    cur = (await beatInfo(b)).findIndex(x => x.cur === 'step');
    check('S4.2 Space on Next selects beat 2', cur === 1, 'index ' + cur);
    const ring = await focusRing(b);
    check('S4.3 the focused control has a visible focus ring', ring.style !== 'none' && ring.w !== '0px', JSON.stringify(ring));
    // Tab to a beat and activate it
    await b.eval(`document.querySelectorAll('.cr-tm-beat')[2].focus()`);
    await pressTab(b);
    check('S4.4 Tab moves to the next beat button', (await b.eval(`document.activeElement.classList.contains('cr-tm-beat')&&document.activeElement.dataset.step`)) === 'door-held', await activeId(b));
    const ring2 = await focusRing(b);
    check('S4.5 a focused beat shows a focus ring', ring2.style !== 'none' && ring2.w !== '0px', JSON.stringify(ring2));
    await b.key('Enter', 'Enter', 13, '\r'); await sleep(150);
    check('S4.6 Enter on a beat selects it and the building shows a held door', (await beatInfo(b)).findIndex(x => x.cur === 'step') === 3 && (await scene(b)).door === 'held');
    // Play / Pause by keyboard, focus is never lost to a disabled button
    await b.eval(`${G('cr-tm-play')}.focus()`); await b.key('Enter', 'Enter', 13, '\r'); await sleep(200);
    check('S4.7 Play by keyboard keeps focus on a live control (Pause)', (await activeId(b)) === 'cr-tm-pause', await activeId(b));
    await b.key('Enter', 'Enter', 13, '\r'); await sleep(2600);
    const held = (await beatInfo(b)).findIndex(x => x.cur === 'step');
    check('S4.8 Pause by keyboard stops playback and focus returns to Play', (await activeId(b)) === 'cr-tm-play' && held <= 4, `focus=${await activeId(b)} index=${held}`);
    await b.eval(`${G('cr-tm-prev')}.focus()`); await b.key('Enter', 'Enter', 13, '\r'); await sleep(120);
    check('S4.9 Previous by keyboard steps back one beat', (await beatInfo(b)).findIndex(x => x.cur === 'step') === held - 1);
    // Next to the last beat: focus must not be stranded on a disabled button
    await pick(b, 6); await b.eval(`${G('cr-tm-next')}.focus()`); await b.key('Enter', 'Enter', 13, '\r'); await sleep(150);
    const f = await b.eval(`({id:document.activeElement.id||document.activeElement.className,disabled:!!document.activeElement.disabled})`);
    check('S4.10 reaching the last beat by keyboard does not strand focus on a disabled button', !f.disabled && f.id !== 'BODY', JSON.stringify(f));
    // Trust Lab by keyboard
    await b.eval(`${G('cr-tab-evidence')}.focus()`); await b.click('#cr-tab-evidence');
    await b.eval(`${G('cr-tl-lab-summary')}.focus()`);
    await b.key('Enter', 'Enter', 13, '\r'); await sleep(200);
    check('S4.11 Enter on the lab summary opens it', (await b.eval(`${G('cr-tl-lab-details')}.open`)) === true);
    await b.waitFor(`document.querySelectorAll('#cr-tl-lab-chain .cr-tl-lab-block').length>0`, 'lab chain');
    await pressTab(b);
    check('S4.12 Tab reaches the row select', (await activeId(b)) === 'cr-tl-lab-row', await activeId(b));
    await b.key('ArrowDown', 'ArrowDown', 40); await sleep(150);
    check('S4.13 ArrowDown changes the row to 2', (await b.eval(`${G('cr-tl-lab-row')}.value`)) === '2');
    await pressTab(b);
    check('S4.14 Tab reaches the field select', (await activeId(b)) === 'cr-tl-lab-field', await activeId(b));
    await pressTab(b);
    check('S4.15 Tab reaches Tamper a copy', (await activeId(b)) === 'cr-tl-lab-tamper', await activeId(b));
    const ring3 = await focusRing(b);
    check('S4.16 Tamper a copy shows a focus ring', ring3.style !== 'none' && ring3.w !== '0px', JSON.stringify(ring3));
    await b.key('Enter', 'Enter', 13, '\r');
    await b.waitFor(`!!${G('cr-tl-lab-altered-h')}`, 'keyboard tamper result');
    check('S4.17 Enter on Tamper reports the failure at the chosen row', norm(await b.text('#cr-tl-lab-altered-h')) === 'Altered copy: fails at row 2', norm(await b.text('#cr-tl-lab-altered-h')));
    check('S4.18 ledger byte-identical after the keyboard experiment', (await rawLedger(b)) === before);
    await pressTab(b);
    check('S4.19 Tab reaches Restore', (await activeId(b)) === 'cr-tl-lab-restore', await activeId(b));
    await b.key('Enter', 'Enter', 13, '\r'); await sleep(200);
    check('S4.20 Enter on Restore clears the experiment and focus stays on a live control', (await b.eval(`${G('cr-tl-lab-out')}.children.length`)) === 0 && !(await b.eval(`document.activeElement.disabled`)), await activeId(b));
    noErr(b, 'S4');
  });

  // ============ (v) reduced motion ============
  await withBrowser(rec, 'S5 reduced motion', async b => {
    await b.viewport(1440, 900); await b.reducedMotion(true); await open(b); await chal(b, 'A', 1);
    await timeline(b);
    const rm = await b.eval(`matchMedia('(prefers-reduced-motion: reduce)').matches`);
    check('S5.0 reduced motion is emulated', rm === true);
    const st = await b.eval(`({play:${G('cr-tm-play')}.disabled,pause:${G('cr-tm-pause')}.disabled,hint:${G('cr-tm-hint')}.textContent,hintShown:${G('cr-tm-hint')}.getBoundingClientRect().height>0})`);
    check('S5.1 Play and Pause are off and the page says why in words', st.play && st.pause && /Reduced motion/.test(st.hint) && st.hintShown, JSON.stringify(st));
    await b.eval(`${G('cr-tm-play')}.click()`); await sleep(3000);
    check('S5.2 pressing Play does not advance anything (3 s later no beat is current)', (await beatInfo(b)).every(x => x.cur === null));
    await b.click('#cr-tm-next'); await sleep(3200);
    check('S5.3 Next advances exactly one beat and nothing advances by itself', (await beatInfo(b)).findIndex(x => x.cur === 'step') === 0);
    await b.click('#cr-tm-next');
    check('S5.4 the next explicit Next advances to beat 2', (await beatInfo(b)).findIndex(x => x.cur === 'step') === 1);
    await pick(b, 5);
    const cap = await caption(b);
    check('S5.5 the static equivalent still shows the full caption, case and hashes', /Beat 6 of 8/.test(cap) && /case/i.test(cap) && cap.length > 100, cap.slice(0, 100));
    const tr = await b.eval(`[...document.querySelectorAll('.cr-tm-beat,.cr-tl-lab-block,.cr-tm-caption')].map(e=>getComputedStyle(e).transitionDuration)`);
    check('S5.6 no transitions on the new components under reduced motion', tr.every(d => d === '0s'), JSON.stringify([...new Set(tr)]));
    noErr(b, 'S5');
  });

  // ============ (vi) layout at three viewports, targets, errors, third parties; screenshots ============
  await withBrowser(rec, 'S6 viewports', async b => {
    await b.viewport(1440, 900); await open(b); await chal(b, 'A', 1);
    const vps = [[1440, 900, false], [1280, 720, false], [390, 844, true]];
    for (const [w, h, mobile] of vps) {
      await b.viewport(w, h, mobile); await sleep(500);
      await timeline(b); await pick(b, 5);
      let ov = await b.overflow();
      check(`S6.${w}.1 timeline panel with Time Machine: no horizontal overflow`, ov.scrollW <= ov.clientW && ov.bad.length === 0, JSON.stringify(ov));
      let sm = await small(b, '#cr-tm button, #cr-tm summary');
      check(`S6.${w}.2 every Time Machine control is at least 40x40 px`, sm.length === 0, JSON.stringify(sm));
      const beatsFit = await b.eval(`[...document.querySelectorAll('.cr-tm-beat,#cr-tm-caption,#cr-tm-controls')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=document.documentElement.clientWidth})`);
      check(`S6.${w}.3 beats, controls and caption stay inside the viewport`, beatsFit);
      const clip = await b.eval(`[...document.querySelectorAll('.cr-tm-beat')].filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(e=>e.dataset.step)`);
      check(`S6.${w}.4 no beat button clips its own text`, clip.length === 0, JSON.stringify(clip));
      if (w === 390) await shot(b, 'time-machine-390.png', '#cr-tm');
      await labOpen(b);
      ov = await b.overflow();
      check(`S6.${w}.5 evidence panel with the Trust Lab (valid): no horizontal overflow`, ov.scrollW <= ov.clientW && ov.bad.length === 0, JSON.stringify(ov));
      await doTamper(b, 2, 'at');
      ov = await b.overflow();
      check(`S6.${w}.6 Trust Lab with a tampered copy: no horizontal overflow`, ov.scrollW <= ov.clientW && ov.bad.length === 0, JSON.stringify(ov));
      sm = await small(b, '#cr-tl-lab button, #cr-tl-lab select, #cr-tl-lab summary');
      check(`S6.${w}.7 every Trust Lab control is at least 40x40 px`, sm.length === 0, JSON.stringify(sm));
      const sideBySide = await b.eval(`(()=>{const a=${G('cr-tl-lab-original')}.getBoundingClientRect(),c=${G('cr-tl-lab-altered')}.getBoundingClientRect();return Math.abs(a.top-c.top)<4})()`);
      check(`S6.${w}.8 the two results are ${w >= 1000 ? 'side by side' : 'stacked'} at ${w}`, w >= 1000 ? sideBySide : !sideBySide, String(sideBySide));
      if (w === 390) await shot(b, 'trust-lab-390.png', '#cr-tl-lab');
      await b.click('#cr-tl-lab-restore');
    }
    const ext = await b.eval(`performance.getEntriesByType('resource').map(e=>e.name).filter(n=>!n.startsWith(location.origin))`);
    check('S6.9 ZERO third-party requests', ext.length === 0, JSON.stringify(ext));
    check('S6.10 no failed or 4xx requests, including the new modules', srv.requests.filter(r => r.status >= 400).length === 0 && b.badResponses.length === 0 && b.failedRequests.length === 0, JSON.stringify(srv.requests.filter(r => r.status >= 400)));
    check('S6.11 the two new modules were actually served', ['/time_machine_view.mjs', '/trust_lab_view.mjs', '/time_machine.mjs', '/trust_lab.mjs'].every(p => srv.requests.some(r => r.path === p && r.status === 200)));
    noErr(b, 'S6');
  });

  // ============ empty ledger ============
  await withBrowser(rec, 'S7 empty ledger', async b => {
    await b.viewport(1440, 900); await open(b);
    await timeline(b).catch(() => {});
    const tm = await b.eval(`({beats:document.querySelectorAll('.cr-tm-beat').length,note:${G('cr-tm-note')}.textContent,list:${G('cr-tm-beats')}.hidden})`);
    check('S7.1 empty ledger: no beats, the model note is shown instead', tm.beats === 0 && /ledger is empty/i.test(tm.note) && tm.list === true, JSON.stringify(tm));
    await labOpen2(b);
    const lab = await b.eval(`({empty:${G('cr-tl-lab-empty')}.hidden,tamper:${G('cr-tl-lab-tamper')}.disabled,restore:${G('cr-tl-lab-restore')}.disabled,row:${G('cr-tl-lab-row')}.disabled,field:${G('cr-tl-lab-field')}.disabled,text:${G('cr-tl-lab-empty')}.textContent})`);
    check('S7.2 empty ledger: the lab says so and disables every control', lab.empty === false && /empty/i.test(lab.text) && lab.tamper && lab.restore && lab.row && lab.field, JSON.stringify(lab));
    noErr(b, 'S7');
    async function labOpen2(bb) { await bb.click('#cr-tab-evidence'); if (!(await bb.eval(`${G('cr-tl-lab-details')}.open`))) await bb.click('#cr-tl-lab-summary'); }
  });
} finally {
  await srv.close();
}

const s = rec.summary();
writeReport(path.join(OUT, 'REPORT.md'), 'Phase 6: Incident Time Machine and Evidence Trust Lab, real-browser QA', s,
  'Synthetic data only. Browser-only mode served from 127.0.0.2. Screenshots in this folder are written by this script; a human must still look at them.');
process.exit(s.fail ? 1 : 0);
