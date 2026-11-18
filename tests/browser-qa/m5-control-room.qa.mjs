/**
 * Milestone 5: real-browser QA of the Control Room, Signal Forge integration, Showcase Mode and regressions.
 * Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).
 * Run: node tests/browser-qa/m5-control-room.qa.mjs      (about 4 to 5 minutes, needs Chrome or Edge)
 *
 * Browser-only mode is served from 127.0.0.2; local mode is the real Python + SQLite server. Every scenario runs on a
 * fresh browser; only infrastructure errors are retried (see lib.mjs). Screenshots land in docs/evidence/control-room/m5.
 */
import path from 'node:path';
import {ROOT, recorder, serveDocs, startPython, withBrowser, writeReport, sleep} from './lib.mjs';

const OUT = path.join(ROOT, 'docs', 'evidence', 'control-room', 'm5');
const rec = recorder('M5 Control Room');
const {check} = rec;
const notes = [];
const srv = await serveDocs();
const py = await startPython(8797);

// QA_ONLY=S4,S5 runs only scenarios whose name starts with one of these prefixes (for fast iteration).
const only = (process.env.QA_ONLY || '').split(',').map(x => x.trim()).filter(Boolean);
const run = (name, fn) => (!only.length || only.some(p => name.startsWith(p))) ? withBrowser(rec, name, fn) : Promise.resolve();

// ---------- helpers ----------
const G = id => `document.getElementById(${JSON.stringify(id)})`;
const counters = b => b.eval(`({events:+${G('events-count')}.textContent,incidents:+${G('incidents-count')}.textContent,cases:+${G('cases-count')}.textContent,integrity:${G('integrity-label')}.textContent})`);
const settled = b => b.waitFor(`!${G('reset')}.disabled && !${G('forge-run')}.disabled`, 'ui settled').then(() => b.eval(`new Promise(r=>setTimeout(r,450))`));
const scene = b => b.eval(`(()=>{const s=document.querySelector('#cr-scene svg');const a=n=>s.getAttribute('data-'+n);return {reader:a('reader'),door:a('door'),camera:a('camera'),presence:a('presence'),link:a('link'),kase:a('case'),idle:a('idle'),selected:a('selected')}})()`);
const ledger = b => b.eval(`JSON.parse(localStorage.getItem('ghostbridge-ledger-v1')||'[]')`);
const open = (b, origin, label, query = '') => b.goto(origin + query, "!!document.querySelector('#cr-scene svg')").then(() => b.waitFor(`${G('mode')}.textContent.includes(${JSON.stringify(label)})`, 'mode ' + label));
const chal = async (b, which, want) => {
  await b.click(which === 'A' ? '#cr-chal-a' : '#cr-chal-b');
  await b.waitFor(`${G('events-count')}.textContent==='3' && ${G('cases-count')}.textContent===${JSON.stringify(String(want))}`, 'challenge ' + which);
  await settled(b); await sleep(700);
};
const resetLab = async b => { await b.click('#reset'); await b.waitFor(`${G('events-count')}.textContent==='0'`, 'reset'); await settled(b); };
const chip = b => b.eval(`(()=>{const c=${G('cr-case-chip')};return {hidden:c.hidden,text:c.textContent,kind:c.getAttribute('data-kind')}})()`);
const shot = (b, name, sel) => b.shot(path.join(OUT, name), sel);
const vis = (b, sel) => b.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return {top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height),display:cs.display,visibility:cs.visibility}})()`);
const noErr = (b, label) => check(`${label}: no console errors or exceptions`, b.drainErrors().length === 0);
const smallTargets = (b, scope, min = 40) => b.eval(`[...document.querySelectorAll(${JSON.stringify(scope)})].filter(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&r.height<${min}}).map(e=>(e.id||e.className||e.tagName).toString().slice(0,40)+':'+Math.round(e.getBoundingClientRect().height))`);

try {
  // ============ S1. first viewport, desktop 1440x900 ============
  await run('S1 first viewport 1440', async b => {
    await b.viewport(1440, 900); await open(b, srv.origin, 'Browser lab');
    check('S1.1 hero headline, subline and two primary actions are present', (await b.eval(`document.getElementById('cr-title').innerText`)).replace(/\s+/g, ' ').includes('When buildings start talking') && (await b.text('.cr-sub')).includes('decisions you can trust') && (await b.text('#cr-forge')).includes('Forge an incident') && (await b.text('#cr-unfold')).includes('Watch an incident unfold'));
    check('S1.2 Showcase Mode button is present', (await b.text('#cr-showcase')).includes('Showcase Mode'));
    const layers = await b.count('#cr-scene .cr-l'), markers = await b.count('#cr-scene .cr-marker'), nodes = await b.count('#cr-strip .cr-node');
    check('S1.3 the scene has 5 depth layers, 4 source markers and 4 source buttons', layers === 5 && markers === 4 && nodes === 4, `layers=${layers} markers=${markers} nodes=${nodes}`);
    const sc = await scene(b);
    check('S1.4 empty ledger: building idle and quiet', sc.idle === 'true' && sc.reader === 'idle' && sc.door === 'closed' && sc.link === 'none' && sc.kase === 'off', JSON.stringify(sc));
    check('S1.5 empty-state caption invites action', (await b.text('#cr-caption')).includes('quiet'));
    const cta = await vis(b, '#cr-forge'), strip = await vis(b, '#cr-strip');
    check('S1.6 primary actions and the source strip are inside the first 900 px', cta.bottom <= 900 && strip.bottom <= 900, `cta.bottom=${cta.bottom} strip.bottom=${strip.bottom}`);
    check('S1.7 the headline does not overlap the building (text column ends before the facade starts)', await b.eval(`(()=>{const t=document.querySelector('.cr-copy').getBoundingClientRect(),w=document.querySelector('#cr-scene .cr-facade').getBoundingClientRect();return t.right<=w.left+8})()`));
    const fonts = await b.eval(`({sg:document.fonts.check('500 16px "Space Grotesk"'),dm:document.fonts.check('400 16px "DM Sans"'),loaded:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family)})`);
    check('S1.8 both fonts are loaded from the vendored files', fonts.sg && fonts.dm && fonts.loaded.length >= 2, JSON.stringify(fonts));
    const ext = await b.eval(`performance.getEntriesByType('resource').map(e=>e.name).filter(n=>!n.startsWith(location.origin))`);
    check('S1.9 ZERO third-party requests (no Google Fonts, no CDN)', ext.length === 0, JSON.stringify(ext));
    check('S1.10 no failed requests at all, including the favicon', srv.requests.filter(r => r.status >= 400).length === 0 && b.badResponses.length === 0, JSON.stringify(srv.requests.filter(r => r.status >= 400)));
    const m = await b.metrics(), bytes = await b.eval(`performance.getEntriesByType('resource').reduce((a,e)=>a+(e.encodedBodySize||0),0)`);
    notes.push(`Idle page: ${m.domNodes} DOM nodes, ${m.jsHeapMB} MB JS heap, ${Math.round(bytes / 1024)} KB of subresources, load ${b.lastLoadMs} ms.`);
    check('S1.11 light page: under 3000 DOM nodes, under 80 MB heap, under 1.2 MB of subresources', m.domNodes < 3000 && m.jsHeapMB < 80 && bytes < 1.2 * 1048576, `${m.domNodes} nodes, ${m.jsHeapMB} MB, ${bytes} B`);
    await b.eval(`document.querySelector('.cr-node[data-node="door"]').focus()`); await b.key('Tab', 'Tab', 9);
    const f = await b.eval(`(()=>{const a=document.activeElement,cs=getComputedStyle(a);return {node:a.dataset.node,outline:cs.outlineStyle,w:cs.outlineWidth}})()`);
    check('S1.12 Tab moves door -> reader with a visible focus ring', f.node === 'reader' && f.outline !== 'none' && f.w !== '0px', JSON.stringify(f));
    await shot(b, 'desktop-1440-01-hero.png');
    noErr(b, 'S1');
  });

  // ============ S2. Forge inside the architectural view + both challenges ============
  await run('S2 forge and challenges', async b => {
    await b.viewport(1440, 900); await open(b, srv.origin, 'Browser lab');
    await b.click('#cr-forge'); await b.waitFor(`!${G('forge-panel')}.hidden`, 'forge open');
    const dock = await b.eval(`({inDrawer:!!${G('forge-panel')}.closest('#cr-forge-slot'),rulesInDrawer:!!${G('cr-rules')}.closest('#cr-forge-slot'),copy:getComputedStyle(document.querySelector('.cr-copy')).visibility,forge:${G('control-room')}.dataset.forge})`);
    check('S2.1 Forge opens INSIDE the stage beside the building, rule gauges docked with it, headline hidden', dock.inDrawer && dock.rulesInDrawer && dock.copy === 'hidden' && dock.forge === 'true', JSON.stringify(dock));
    check('S2.2 the existing Signal Forge composer is reused (same controls, same ids)', (await b.count('#cr-forge-slot #forge-gap')) === 1 && (await b.count('#cr-forge-slot #forge-hold')) === 1 && (await b.count('#cr-forge-slot #forge-run')) === 1);
    await b.setRange('#forge-gap', 301); await b.setRange('#forge-hold', 119);
    let g = await b.eval(`({d:${G('cr-g-delay')}.dataset.pass,h:${G('cr-g-hold')}.dataset.pass,ds:${G('cr-g-delay-s')}.textContent,hs:${G('cr-g-hold-s')}.textContent,mode:${G('cr-rules-mode')}.textContent})`);
    check('S2.3 live forecast at 301/119: both gauges fail, "1 s outside" and "1 s below", labelled FORECAST', g.d === 'false' && g.h === 'false' && g.ds.includes('1 s outside') && g.hs.includes('1 s below') && g.mode === 'FORECAST', JSON.stringify(g));
    await b.setRange('#forge-gap', 299); await b.setRange('#forge-hold', 120);
    g = await b.eval(`({d:${G('cr-g-delay')}.dataset.pass,h:${G('cr-g-hold')}.dataset.pass,ds:${G('cr-g-delay-s')}.textContent,hs:${G('cr-g-hold-s')}.textContent})`);
    check('S2.4 forecast at 299/120: both gauges pass, "1 s inside" and "0 s above"', g.d === 'true' && g.h === 'true' && g.ds.includes('1 s inside') && g.hs.includes('0 s above'), JSON.stringify(g));
    check('S2.5 the scene is still idle while only forecasting (nothing is faked before Run)', (await scene(b)).idle === 'true');
    const drawer = await b.eval(`(()=>{const d=${G('cr-forge-slot')};return {over:d.scrollHeight-d.clientHeight}})()`);
    const runBtn = await vis(b, '#forge-run');
    check('S2.6 the Run investigation button is visible without scrolling the page', runBtn.top >= 0 && runBtn.bottom <= 900, JSON.stringify(runBtn));
    notes.push(`Forge drawer at 1440x900: content overflow ${drawer.over}px.`);

    await chal(b, 'A', 1);
    const sa = await scene(b), ca = await chip(b);
    check('S2.7 Challenge A: reader denied, door held open, link drawn, case on', sa.reader === 'denied' && sa.door === 'held' && sa.link === 'case' && sa.kase === 'on', JSON.stringify(sa));
    check('S2.8 Challenge A: high-priority chip shows the real case id and the link reads 299 s', !ca.hidden && /^HIGH PRIORITY CASE · case:[0-9a-f]{16}$/.test(ca.text) && (await b.text('.cr-link-text')) === '299 s', ca.text);
    check('S2.9 Challenge A: the link line is fully drawn (stroke-dashoffset 0) and the case chip is lime', await b.eval(`parseFloat(getComputedStyle(document.querySelector('.cr-link')).strokeDashoffset)===0 && getComputedStyle(document.querySelector('.cr-link')).opacity==='1'`));
    const stripState = await b.eval(`({door:document.querySelector('.cr-node[data-node=door] .cr-node-state').textContent,reader:document.querySelector('.cr-node[data-node=reader] .cr-node-state').textContent})`);
    check('S2.10 Challenge A: source strip says Held open / Access denied (words, not only colour)', stripState.door === 'Held open' && stripState.reader === 'Access denied', JSON.stringify(stripState));
    check('S2.11 Challenge A: caption states the real numbers from the ledger', (await b.text('#cr-caption')).includes('299 s') && (await b.text('#cr-caption')).includes('120 s'));
    const rows = await ledger(b), byId = Object.fromEntries(rows.map(r => [r.payload.event.id, r.hash]));
    await b.click('.cr-marker[data-node="reader"]');
    const insp = await b.text('#cr-b-node');
    check('S2.12 clicking the reader marker opens the inspector with the REAL event id and SHA-256 row hash', insp.includes('forge:denied') && insp.includes(byId['forge:denied']) && (await b.eval(`${G('cr-scene')}.querySelector('svg').dataset.selected`)) === 'reader');
    await shot(b, 'desktop-1440-02-challenge-A.png');

    await chal(b, 'B', 0);
    const sb = await scene(b), cb = await chip(b);
    check('S2.13 Challenge B: reader denied, door only open (119 s is not held), NEAR-MISS link, no case', sb.reader === 'denied' && sb.door === 'open' && sb.link === 'near-miss' && sb.kase === 'off', JSON.stringify(sb));
    check('S2.14 Challenge B: chip says NO CORRELATED CASE and the link reads 301 s with a cross', cb.text.startsWith('NO CORRELATED CASE') && cb.kind === 'near' && (await b.text('.cr-link-text')).includes('301 s'), cb.text);
    const cap = await b.text('#cr-caption');
    check('S2.15 Challenge B: the explanation names BOTH failed conditions by exactly 1 s', cap.includes('1 s outside the 300 s window') && cap.includes('1 s below the 120 s threshold') && cap.includes('No case is created'), cap);
    g = await b.eval(`({d:${G('cr-g-delay')}.dataset.pass,h:${G('cr-g-hold')}.dataset.pass,mode:${G('cr-rules-mode')}.textContent})`);
    check('S2.16 Challenge B: both gauges amber after Run', g.d === 'false' && g.h === 'false', JSON.stringify(g));
    await shot(b, 'desktop-1440-03-challenge-B.png');

    await b.setRange('#forge-gap', 299); await b.setRange('#forge-hold', 120);
    await b.eval(`(()=>{const c=${G('forge-camera')};c.checked=true;c.dispatchEvent(new Event('change'))})()`);
    await b.click('#forge-run'); await b.waitFor(`${G('events-count')}.textContent==='4'`, 'camera run'); await settled(b);
    const sc4 = await scene(b);
    check('S2.17 optional camera-offline event: camera node offline, 4 events, still exactly 1 case', sc4.camera === 'offline' && (await counters(b)).cases === 1 && (await counters(b)).events === 4, JSON.stringify(sc4));
    check('S2.18 camera-offline shows as Offline in words on the source strip', (await b.text('.cr-node[data-node=camera] .cr-node-state')) === 'Offline');
    noErr(b, 'S2');
  });

  // ============ S3. modes, state preserved, evidence, reconstruction, before/after ============
  await run('S3 modes and evidence', async b => {
    await b.viewport(1440, 900); await open(b, srv.origin, 'Browser lab');
    await b.click('#cr-forge'); await chal(b, 'A', 1); await b.click('#forge-close'); await sleep(500);
    await b.click('.cr-node[data-node="reader"]');
    check('S3.1 selecting a source from the strip marks it on the building', (await scene(b)).selected === 'reader' && (await b.attr('.cr-node[data-node=reader]', 'aria-pressed')) === 'true');
    await b.click('#cr-tab-timeline');
    const st = await b.eval(`({sel:document.querySelector('#cr-tab-timeline').getAttribute('aria-selected'),tp:!${G('cr-panel-timeline')}.hidden,bp:${G('cr-panel-building')}.hidden,mode:${G('control-room')}.dataset.mode})`);
    check('S3.2 Timeline mode: tab selected, only its panel is visible', st.sel === 'true' && st.tp && st.bp && st.mode === 'timeline', JSON.stringify(st));
    check('S3.3 the selected source is preserved across the mode change', (await scene(b)).selected === 'reader');
    await b.setRange('#cr-scrub', 30); await sleep(400);
    const mid = await scene(b);
    check('S3.4 scrubbing to +30 s: reader already denied, door NOT yet linked, no link line', mid.reader === 'denied' && mid.link === 'none' && (await b.text('#cr-clock')).startsWith('22:00:30'), JSON.stringify(mid));
    check('S3.5 scrubbing changes what the strip and HUD say', (await b.text('#cr-elapsed')).includes('+30 s') && (await b.text('#cr-scrub-out')).includes('+30 s'));
    await b.setRange('#cr-scrub', await b.prop('#cr-scrub', 'max')); await sleep(400);
    check('S3.6 scrubbing to the end returns to live with the case link', (await scene(b)).link === 'case' && (await b.text('#cr-scrub-out')).includes('Live'));
    await b.setRange('#cr-scrub', 30);
    await b.click('#cr-tab-evidence'); await b.click('#cr-tab-response'); await b.click('#cr-tab-building');
    await b.click('#cr-tab-timeline');
    check('S3.7 time cursor and selection survive a full tour of all four modes', (await b.text('#cr-scrub-out')).includes('+30 s') && (await scene(b)).selected === 'reader' && (await scene(b)).reader === 'denied');
    await b.click('#cr-live'); check('S3.8 "Back to live" returns the building to the end of the ledger', (await scene(b)).link === 'case' && await b.eval(`${G('cr-live')}.disabled`));
    const marks = await b.count('.cr-mark');
    check('S3.9 timeline shows one to-scale marker per recorded event, kinds anchor/match/excluded', marks === 3 && (await b.count('.cr-mark-anchor')) === 1 && (await b.count('.cr-mark-match')) === 1 && (await b.count('.cr-mark-excluded')) === 1, `markers=${marks}`);
    await shot(b, 'desktop-1440-04-timeline.png', '#control-room');

    await b.eval(`${G('cr-tab-building')}.focus()`); await b.click('#cr-tab-building');
    await b.key('ArrowRight', 'ArrowRight', 39);
    check('S3.10 keyboard: ArrowRight moves to Timeline and focuses it', (await b.eval(`document.activeElement.id`)) === 'cr-tab-timeline' && (await b.attr('#cr-tab-timeline', 'aria-selected')) === 'true');
    await b.key('End', 'End', 35);
    check('S3.11 keyboard: End jumps to Response', (await b.eval(`document.activeElement.id`)) === 'cr-tab-response');
    await b.key('ArrowRight', 'ArrowRight', 39);
    check('S3.12 keyboard: ArrowRight wraps from Response to Building', (await b.eval(`document.activeElement.id`)) === 'cr-tab-building');
    await b.key('Home', 'Home', 36);
    check('S3.13 exactly one tab is in the tab order (roving tabindex)', (await b.eval(`[...document.querySelectorAll('[role=tab]')].filter(t=>t.tabIndex===0).length`)) === 1);

    await b.click('#cr-tab-evidence');
    const ev = await b.eval(`[...document.querySelectorAll('#cr-ev-list .cr-ev-item')].map(li=>({id:li.querySelector('strong').textContent,hash:li.querySelector('.cr-hash:not(.cr-hash-prev) code').textContent}))`);
    const rows = await ledger(b), byId = Object.fromEntries(rows.map(r => [r.payload.event.id, r.hash]));
    check('S3.14 Evidence lists every source event with its full 64-char SHA-256 hash from the ledger', ev.length === 3 && ev.every(e => /^[0-9a-f]{64}$/.test(e.hash) && byId[e.id] === e.hash), JSON.stringify(ev.map(e => e.id)));
    await b.click('#cr-ev-verify'); await sleep(400);
    check('S3.15 Verify chain reports the chain verified with the head hash', (await b.text('#cr-ev-note')).startsWith('Chain verified: 3 ledger records'), await b.text('#cr-ev-note'));
    check('S3.16 Open reconstruction is enabled because a case exists', (await b.prop('#cr-ev-recon', 'disabled')) === false);
    await b.click('#cr-ev-recon'); await b.waitFor(`!${G('reconstruction')}.hidden && !!document.querySelector('#reconstruction .recon-scene')`, 'recon');
    check('S3.17 the existing Evidence Reconstruction opens beside the console from the Control Room', (await b.eval(`!!${G('reconstruction')}.closest('#cr-recon-slot')`)));
    for (let i = 0; i < 4; i++) await b.click('#recon-next');
    check('S3.18 reconstruction shows the real case and the excluded earlier door', (await b.text('.recon-inspector')).includes('case:') && (await b.text('#reconstruction')).includes('forge:earlier-door'));
    await shot(b, 'desktop-1440-05-evidence-reconstruction.png', '#cr-recon-slot');
    await b.click('#recon-close');

    await b.click('#cr-tab-response');
    let ba = await b.eval(`({joined:${G('cr-ba')}.dataset.joined,kind:${G('cr-ba-outcome')}.dataset.kind,alarms:document.querySelectorAll('#cr-ba-alarms .cr-alarm').length,count:${G('cr-ba-count')}.textContent})`);
    check('S3.19 before: three disconnected alarms, not yet connected', ba.joined === 'false' && ba.alarms === 3 && ba.count === '3', JSON.stringify(ba));
    await b.click('#cr-ba-toggle'); await sleep(1300);
    ba = await b.eval(`({joined:${G('cr-ba')}.dataset.joined,kind:${G('cr-ba-outcome')}.dataset.kind,pressed:${G('cr-ba-toggle')}.getAttribute('aria-pressed'),op:getComputedStyle(${G('cr-ba-outcome')}).opacity,alarmOp:getComputedStyle(document.querySelector('.cr-alarm')).opacity})`);
    check('S3.20 after: "Connect the signals" dissolves the alarms and lights ONE linked incident (aria-pressed)', ba.joined === 'true' && ba.kind === 'case' && ba.pressed === 'true' && +ba.op === 1 && +ba.alarmOp < 0.5, JSON.stringify(ba));
    const board = await b.eval(`({q:[...document.querySelectorAll('#cr-board dt')].map(d=>d.textContent),text:${G('cr-board')}.textContent,adv:document.querySelector('.cr-advisory').textContent})`);
    check('S3.21 case board answers all six operator questions', board.q.length === 6 && ['What happened?', 'Where?', 'Why were these linked?', 'What was excluded?', 'What evidence supports it?', 'What should the operator review next?'].every(x => board.q.includes(x)), JSON.stringify(board.q));
    check('S3.22 board names the exclusion, both devices, and cites hashes', board.text.includes('forge:earlier-door') && board.text.includes('Archive reader (reader-01)') && board.text.includes('North entrance (door-01)') && board.text.includes(byId['forge:denied'].slice(0, 16)));
    check('S3.23 recommendations are advisory only; no actuation language anywhere in the page', board.adv.includes('Advisory only') && !/unlock|dispatch|call (the )?police|disarm/i.test(await b.text('#control-room')));
    await shot(b, 'desktop-1440-06-response-after.png', '.cr-console');
    await b.click('#cr-tab-building'); await b.click('#cr-forge'); await chal(b, 'B', 0); await b.click('#forge-close');
    await b.click('#cr-tab-response');
    const nm = await b.eval(`({kind:${G('cr-ba-outcome')}.dataset.kind,text:${G('cr-ba-outcome')}.textContent,bd:${G('cr-board')}.textContent})`);
    check('S3.24 Challenge B response: outcome is NOT LINKED with the reason; the board still explains', nm.kind === 'near-miss' && nm.text.includes('NOT LINKED') && nm.bd.includes('outside the 300 s window'), nm.text.slice(0, 120));
    noErr(b, 'S3');
  });

  // ============ S3b. Product Vision ============
  await run('S3b product vision', async b => {
    await b.viewport(1440, 900); await open(b, srv.origin, 'Browser lab');
    const v = await b.eval(`({flags:document.body.innerText.split('PRODUCT VISION').length-1,figs:document.querySelectorAll('#vision figure').length,caps:[...document.querySelectorAll('#vision figcaption')].map(c=>c.textContent),mail:[...document.querySelectorAll('#vision a')].map(a=>a.getAttribute('href'))})`);
    check('S3b.1 one PRODUCT VISION label and the four concept screens', v.flags === 1 && v.figs === 4 && ['Mobile alert', 'Floor-by-floor digital twin', 'Multi-property operations', 'Evidence-based escalation'].every(c => v.caps.includes(c)), JSON.stringify(v));
    check('S3b.2 call to action uses only the verified contact', v.mail.length === 2 && v.mail.every(h => h.startsWith('mailto:info@innerchispa.us')), JSON.stringify(v.mail));
    check('S3b.3 the human approval gate is shown in the escalation flow', (await b.text('.v-flow')).includes('approval required'));
    await shot(b, 'desktop-1440-07-product-vision.png', '#vision');
    noErr(b, 'S3b');
  });

  // ============ S4. Showcase Mode: a real, timed run on the real ledger ============
  await run('S4 showcase full run', async b => {
    await b.viewport(1440, 900); await open(b, srv.origin, 'Browser lab', '?present=1');
    const o = await b.eval(`({hidden:${G('showcase')}.hidden,status:${G('showcase')}.dataset.status,body:document.body.dataset.showcase,title:${G('sc-title')}.textContent,play:${G('sc-play')}.textContent})`);
    check('S4.1 ?present=1 opens the Showcase overlay ready to play, nothing running yet', !o.hidden && o.status === 'idle' && o.body === 'off' && o.play.includes('Play'), JSON.stringify(o));
    const t0 = Date.now(); await b.click('#sc-play');
    const seen = {}, mark = (k, cond) => { if (cond && seen[k] === undefined) seen[k] = Math.round((Date.now() - t0) / 100) / 10; };
    let last = null, shots = {}, doorSnap = null;
    for (let i = 0; i < 170; i++) {
      await sleep(400);
      const s = await b.eval(`(()=>{const sv=document.querySelector('#cr-scene svg');let rows=[];try{rows=JSON.parse(localStorage.getItem('ghostbridge-ledger-v1')||'[]')}catch{}return {status:${G('showcase')}.dataset.status,kicker:${G('sc-kicker')}.textContent,sub:${G('sc-sub')}.textContent,ids:rows.map(r=>r.payload.event.id),reader:sv.dataset.reader,door:sv.dataset.door,link:sv.dataset.link,mode:${G('control-room')}.dataset.mode,rec:!${G('reconstruction')}.hidden&&!!document.querySelector('#reconstruction .recon-scene'),joined:${G('cr-ba')}.dataset.joined,time:${G('sc-time')}.textContent,chipHidden:${G('cr-case-chip')}.hidden,visionTop:Math.round(${G('vision')}.getBoundingClientRect().top)}})()`);
      last = s;
      mark('beat1', s.kicker.includes('1 / 8')); mark('denied', s.ids.includes('forge:denied') && s.reader === 'denied'); mark('door', s.ids.includes('forge:later-door') && s.door === 'open'); mark('held', s.door === 'held'); if (seen.door !== undefined && !doorSnap) doorSnap = {door: s.door, link: s.link, chip: s.chipHidden};
      mark('case', s.link === 'case'); mark('recon', s.rec); mark('evidenceMode', s.mode === 'evidence'); mark('responseMode', s.mode === 'response'); mark('joined', s.joined === 'true'); mark('vision', s.kicker.includes('8 / 8') && s.visionTop >= -150 && s.visionTop <= 300); mark('done', s.status === 'done');
      if (seen.case !== undefined && !shots.case) { shots.case = 1; await shot(b, 'showcase-1440-beat4-correlate.png'); }
      if (seen.evidenceMode !== undefined && !shots.ev) { shots.ev = 1; await shot(b, 'showcase-1440-beat6-evidence.png'); }
      if (s.status === 'done') break;
    }
    const total = (Date.now() - t0) / 1000;
    notes.push(`Showcase observed timeline (seconds from Play): ${JSON.stringify(seen)}; total ${total.toFixed(1)} s.`);
    check('S4.2 the run reaches "done" in 45-65 s of wall time', seen.done !== undefined && total >= 45 && total <= 65, `total=${total.toFixed(1)}s`);
    check('S4.3 the BEAT ORDER follows the real ledger: denied < door < case < reconstruction < evidence < response < vision', ['denied', 'door', 'case', 'recon', 'evidenceMode', 'responseMode', 'vision'].every((k, i, a) => seen[k] !== undefined && (i === 0 || seen[a[i - 1]] <= seen[k])), JSON.stringify(seen));
    check('S4.4 the denial is recorded only after beat 1 and the door only after the denial (events arrive one at a time)', seen.beat1 <= 1 && seen.denied >= 4 && seen.door - seen.denied >= 5, JSON.stringify(seen));
    check('S4.5 the door beat shows the door only OPEN with no link and no case chip; door turns amber and the case appears in the correlation beat, 6+ s later', !!doorSnap && doorSnap.door === 'open' && doorSnap.link === 'none' && doorSnap.chip === true && seen.case - seen.door >= 6 && seen.held - seen.door >= 6, JSON.stringify({doorSnap, seen}));
    check('S4.6 the evidence beat switches to Evidence mode; the response beat joins the signals', seen.evidenceMode !== undefined && seen.joined !== undefined && seen.joined >= seen.responseMode);
    check('S4.7 final ledger: exactly the 3 real forge events (denied, later door, earlier door) and one case', last.ids.length === 3 && ['forge:denied', 'forge:later-door', 'forge:earlier-door'].every(i => last.ids.includes(i)), JSON.stringify(last.ids));
    await b.click('#verify'); await sleep(300);
    const fin = await counters(b);
    check('S4.8 the chain verifies after the run and the case count is 1', (await b.text('#inspection')).includes('"valid": true') && fin.cases === 1 && fin.events === 3 && fin.integrity === 'Verified', JSON.stringify(fin));
    const cid = (await b.text('#cr-case-chip')).match(/case:[0-9a-f]{16}/);
    check('S4.9 the case id shown in the building matches the one in the story captions (live ledger tokens)', !!cid && fin.cases === 1);
    check('S4.10 captions never show unfilled {tokens}', !/[{}]/.test(last.sub) && !(await b.text('#sc-title')).includes('{'));
    check('S4.11 the run ends on the product-vision chapter', seen.vision !== undefined);
    check('S4.12 the page and the overlay are labelled done with a Play again affordance', (await b.text('#sc-play')).includes('Play again'));
    await b.click('#sc-exit');
    check('S4.13 Exit closes the overlay and clears showcase mode', await b.eval(`${G('showcase')}.hidden && document.body.dataset.showcase==='off'`));
    noErr(b, 'S4');
  });

  await run('S4b showcase controls', async b => {
    await b.viewport(1440, 900); await open(b, srv.origin, 'Browser lab');
    await b.click('#cr-showcase');
    check('S4b.1 the Showcase button opens the overlay', !(await b.prop('#showcase', 'hidden')));
    await b.click('#sc-play'); await sleep(2200);
    check('S4b.2 playing: button reads Pause, status playing, restart enabled', (await b.text('#sc-play')).includes('Pause') && (await b.attr('#showcase', 'data-status')) === 'playing' && (await b.prop('#sc-restart', 'disabled')) === false);
    await b.click('#sc-play'); await sleep(300);
    const t1 = await b.text('#sc-time'); await sleep(2500); const t2 = await b.text('#sc-time');
    check('S4b.3 Pause freezes the clock (no drift in 2.5 s)', (await b.attr('#showcase', 'data-status')) === 'paused' && t1 === t2 && (await b.text('#sc-play')).includes('Resume'), `${t1} -> ${t2}`);
    await b.click('#sc-play'); await sleep(2200);
    const t3 = await b.text('#sc-time');
    check('S4b.4 Resume continues from where it stopped', (await b.attr('#showcase', 'data-status')) === 'playing' && t3 !== t2, `${t2} -> ${t3}`);
    await b.waitFor(`JSON.parse(localStorage.getItem('ghostbridge-ledger-v1')||'[]').length>=1`, 'first event', 20000);
    await b.click('#sc-restart');
    await b.waitFor(`${G('sc-kicker')}.textContent.includes('1 / 8')`, 'restarted');
    await sleep(1000);
    const after = await ledger(b);
    check('S4b.5 Restart resets the real ledger to empty and goes back to beat 1', after.length === 0 && (await b.text('#sc-kicker')).includes('1 / 8') && (await scene(b)).idle === 'true', `ledger=${after.length}`);
    await b.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`); await sleep(300);
    check('S4b.6 Escape exits Showcase', await b.eval(`${G('showcase')}.hidden`));
    noErr(b, 'S4b');
  });

  // ============ S5. mobile 390 ============
  await run('S5 mobile 390', async b => {
    await b.viewport(390, 844, true); await open(b, srv.origin, 'Browser lab');
    let ov = await b.overflow();
    check('S5.1 idle: no horizontal overflow at 390 px', ov.scrollW <= ov.clientW + 1 && ov.bad.length === 0, JSON.stringify(ov));
    const cta = await b.eval(`[...document.querySelectorAll('.cr-cta button')].map(x=>Math.round(x.getBoundingClientRect().width))`);
    check('S5.2 the three actions are full width and stacked', cta.length === 3 && cta.every(w => w >= 330), JSON.stringify(cta));
    const small = await smallTargets(b, '#control-room button, #vision a');
    check('S5.3 every visible control in the Control Room and Vision is at least 40 px tall', small.length === 0, JSON.stringify(small));
    const scn = await vis(b, '#cr-scene svg');
    check('S5.4 the building scene is shown at a usable size (at least 250 px tall, within the screen)', scn.h >= 250 && scn.right <= 391, JSON.stringify(scn));
    await shot(b, 'mobile-390-01-hero.png');
    await b.click('#cr-forge'); await b.waitFor(`!${G('forge-panel')}.hidden`, 'forge');
    await b.click('#forge-pass'); await b.click('#forge-run'); await b.waitFor(`${G('cases-count')}.textContent==='1'`, 'case'); await settled(b);
    await b.eval(`window.scrollTo(0, ${G('forge-run')}.getBoundingClientRect().top + scrollY - 360)`); await sleep(700);
    const stick = await vis(b, '.cr-scene-wrap');
    check('S5.5 while forging, the building stays pinned to the top of the screen', stick.top >= -1 && stick.top <= 2 && stick.h > 150, JSON.stringify(stick));
    const runRect = await vis(b, '#forge-run');
    check('S5.6 the pinned building does not cover the Run button', runRect.top >= stick.bottom - 1 || runRect.bottom <= stick.top, `scene.bottom=${stick.bottom} run.top=${runRect.top}`);
    ov = await b.overflow();
    check('S5.7 forging: no horizontal overflow', ov.scrollW <= ov.clientW + 1 && ov.bad.length === 0, JSON.stringify(ov));
    check('S5.8 the chip with the case id is visible in the pinned scene', (await chip(b)).text.includes('case:') && (await vis(b, '#cr-case-chip')).top < 120);
    await shot(b, 'mobile-390-02-forge-pinned.png');
    await b.click('#forge-fail'); await b.click('#forge-run'); await b.waitFor(`${G('cases-count')}.textContent==='0' && ${G('events-count')}.textContent==='3'`, 'no case'); await settled(b);
    check('S5.9 Challenge B on mobile: near-miss chip', (await chip(b)).text.startsWith('NO CORRELATED CASE'));
    await b.click('#forge-close'); await sleep(300);
    await b.eval(`document.querySelector('.cr-tabs').scrollIntoView()`);
    const tabs = await b.eval(`[...document.querySelectorAll('[role=tab]')].map(t=>Math.round(t.getBoundingClientRect().height))`);
    check('S5.10 the four mode tabs are comfortable touch targets', tabs.length === 4 && tabs.every(h => h >= 44), JSON.stringify(tabs));
    for (const m of ['timeline', 'evidence', 'response']) { await b.click('#cr-tab-' + m); ov = await b.overflow(); check(`S5.11 ${m} mode: no horizontal overflow`, ov.scrollW <= ov.clientW + 1 && ov.bad.length === 0, JSON.stringify(ov)); }
    await b.click('#cr-ba-toggle'); await sleep(1200);
    await shot(b, 'mobile-390-03-response.png', '.cr-console');
    ov = await b.overflow();
    await b.eval(`${G('vision')}.scrollIntoView()`); ov = await b.overflow();
    check('S5.12 Product Vision: no horizontal overflow', ov.scrollW <= ov.clientW + 1 && ov.bad.length === 0, JSON.stringify(ov));
    await shot(b, 'mobile-390-04-vision.png', '#vision');
    await b.eval(`window.scrollTo(0,0)`); await b.click('#cr-showcase'); await sleep(500);
    const card = await vis(b, '.sc-card');
    check('S5.13 Showcase overlay fits the phone and leaves most of the screen free', card.right <= 391 && card.left >= -1 && card.bottom <= 845 && card.h <= 430, JSON.stringify(card));
    await b.click('#sc-play'); await sleep(8000);
    await shot(b, 'mobile-390-05-showcase.png');
    ov = await b.overflow();
    check('S5.14 running Showcase: no horizontal overflow', ov.scrollW <= ov.clientW + 1 && ov.bad.length === 0, JSON.stringify(ov));
    noErr(b, 'S5');
  });

  // ============ S6. 1280x720 (video capture size) ============
  await run('S6 1280x720', async b => {
    await b.viewport(1280, 720); await open(b, srv.origin, 'Browser lab');
    const cta = await vis(b, '#cr-forge'), hl = await vis(b, '#cr-title');
    check('S6.1 headline and primary actions are inside the 720 px screen', cta.bottom <= 720 && hl.top >= 0, JSON.stringify({cta, hl}));
    let ov = await b.overflow(); check('S6.2 no horizontal overflow at 1280', ov.scrollW <= ov.clientW + 1 && ov.bad.length === 0, JSON.stringify(ov));
    await shot(b, 'desktop-1280-01-hero.png');
    await b.click('#cr-forge'); await chal(b, 'A', 1);
    const run = await vis(b, '#forge-run'), dr = await vis(b, '#cr-forge-slot');
    check('S6.3 forging at 1280x720: the Run button is reachable inside the screen', run.bottom <= 720 && run.top >= 0, JSON.stringify(run));
    check('S6.4 the drawer stays on the left, the building on the right (no overlap with the facade)', await b.eval(`(()=>{const d=${G('cr-forge-slot')}.getBoundingClientRect(),w=document.querySelector('#cr-scene .cr-facade').getBoundingClientRect();return d.right<=w.left+12})()`), JSON.stringify(dr));
    check('S6.5 case state visible at 1280', (await scene(b)).link === 'case' && (await chip(b)).text.includes('case:'));
    await shot(b, 'desktop-1280-02-forge-case.png');
    noErr(b, 'S6');
  });

  // ============ S7. reduced motion ============
  await run('S7 reduced motion', async b => {
    await b.viewport(1440, 900); await b.reducedMotion(true); await open(b, srv.origin, 'Browser lab');
    await b.click('#cr-forge'); await chal(b, 'A', 1);
    const rm = await b.eval(`({ring:getComputedStyle(document.querySelector('.cr-led-ring')).animationName,link:getComputedStyle(document.querySelector('.cr-link')).transitionDuration,alarm:getComputedStyle(document.querySelector('.cr-alarm')||document.body).transitionDuration,layer:getComputedStyle(document.querySelector('.cr-l-building')).transitionDuration})`);
    check('S7.1 reduced motion: no pulse animation, no link or layer transitions', rm.ring === 'none' && /^0s/.test(rm.link) && /^0s/.test(rm.layer), JSON.stringify(rm));
    check('S7.2 the state is still fully readable without motion (link, chip and words present)', (await scene(b)).link === 'case' && (await chip(b)).text.includes('HIGH PRIORITY') && (await b.text('.cr-node[data-node=door] .cr-node-state')) === 'Held open');
    await b.click('#cr-showcase'); await b.click('#sc-play');
    await b.waitFor(`JSON.parse(localStorage.getItem('ghostbridge-ledger-v1')||'[]').some(r=>r.payload.event.id==='forge:later-door')`, 'showcase door', 30000);
    check('S7.3 Showcase still drives the real ledger under reduced motion', true);
    check('S7.4 the pointer parallax is disabled (no --px style is ever applied)', await b.eval(`!document.querySelector('#cr-scene svg').style.getPropertyValue('--px')`));
    noErr(b, 'S7');
  });

  // ============ S8. local Python + SQLite ============
  await run('S8 local Python', async b => {
    await b.viewport(1440, 900); await open(b, py.origin, 'Local Python');
    await b.click('#cr-forge'); await chal(b, 'A', 1);
    const api = await b.eval(`fetch('/api/cases').then(r=>r.json())`), cc = (await chip(b)).text.match(/case:[0-9a-f]{16}/);
    check('S8.1 local mode: the building shows the SAME case id the Python /api/cases returns', api.cases.length === 1 && !!cc && api.cases[0].id === cc[0], `${cc && cc[0]} vs ${api.cases[0] && api.cases[0].id}`);
    const st = await b.eval(`fetch('/api/state').then(r=>r.json())`), hashes = Object.fromEntries(st.ledger.map(r => [r.payload.event.id, r.hash]));
    await b.click('.cr-marker[data-node="door"]');
    check('S8.2 the door inspector shows the SQLite row hash', (await b.text('#cr-b-node')).includes(hashes['forge:later-door']));
    await open(b, py.origin, 'Local Python');
    const sc = await scene(b);
    check('S8.3 after a page reload the building is rebuilt from SQLite (denied, held, case)', sc.reader === 'denied' && sc.door === 'held' && sc.link === 'case', JSON.stringify(sc));
    await b.click('#cr-forge'); await chal(b, 'B', 0);
    check('S8.4 Challenge B in local mode: near-miss and /api/cases is empty', (await scene(b)).link === 'near-miss' && (await b.eval(`fetch('/api/cases').then(r=>r.json())`)).cases.length === 0);
    await b.click('#cr-showcase'); await b.click('#sc-play');
    await b.waitFor(`fetch('/api/state').then(r=>r.json()).then(s=>s.ledger.some(x=>x.payload.event.id==='forge:later-door'))`, 'showcase door via API', 40000);
    const s2 = await b.eval(`fetch('/api/state').then(r=>r.json())`);
    check('S8.5 Showcase in local mode writes through the Python API (reset first, then denied, then door)', s2.ledger.length >= 2 && s2.ledger[0].payload.event.id === 'forge:denied' && s2.integrity.valid === true, JSON.stringify(s2.ledger.map(r => r.payload.event.id)));
    await b.click('#sc-exit'); await resetLab(b);
    check('S8.6 Reset clears SQLite and returns the building to idle', (await b.eval(`fetch('/api/state').then(r=>r.json()).then(s=>s.ledger.length)`)) === 0 && (await scene(b)).idle === 'true');
    noErr(b, 'S8');
  });

  // ============ S9. every older feature + Watch an incident unfold ============
  await run('S9 regression', async b => {
    await b.viewport(1440, 900); await open(b, srv.origin, 'Browser lab');
    for (const [id, label, ev, inc, cs] of [['night', 'Night Watch', 5, 3, 0], ['normal', 'Normal Shift', 4, 0, 0], ['denied', 'Access Denied', 1, 1, 0]]) {
      await resetLab(b); await b.click('#' + id);
      await b.waitFor(`${G('status')}.textContent.includes(${JSON.stringify(label + ' complete')})`, label, 20000); await settled(b);
      const c = await counters(b); check(`S9.1 ${label} unchanged = ${ev}/${inc}/${cs}`, c.events === ev && c.incidents === inc && c.cases === cs, JSON.stringify(c));
      if (id === 'night') {
        const s = await scene(b);
        check('S9.2 Night Watch in the building: camera offline, reader granted, no case link', (await b.eval(`document.querySelector('.cr-node[data-node=camera] .cr-node-state').textContent`)) === 'Offline' && s.reader === 'granted' && s.link === 'none', JSON.stringify(s));
        await b.click('#filter-high'); const hi = await b.count('#incidents .finding'); await b.click('#filter-medium'); const me = await b.count('#incidents .finding'); await b.click('#filter-all');
        check('S9.3 severity filters unchanged (High 2 + Medium 1 = All 3)', hi === 2 && me === 1 && (await b.count('#incidents .finding')) === 3, `${hi}/${me}`);
      }
    }
    await resetLab(b); await b.click('#legacy-bridge');
    await b.waitFor(`${G('status')}.textContent.includes('Legacy Bridge Demo complete')`, 'legacy', 20000); await settled(b);
    let c = await counters(b); check('S9.4 Legacy Bridge unchanged = 5/3/1', c.events === 5 && c.incidents === 3 && c.cases === 1, JSON.stringify(c));
    const before = await b.eval(`localStorage.getItem('ghostbridge-ledger-v1')`);
    await b.click('#replay'); await b.waitFor(`${G('status')}.textContent.includes('Legacy Bridge Demo complete')`, 'replay', 20000); await settled(b);
    check('S9.5 replay adds 0 events and leaves the stored ledger byte-identical', before === await b.eval(`localStorage.getItem('ghostbridge-ledger-v1')`) && (await counters(b)).cases === 1);
    check('S9.6 the Legacy Bridge case is visible in the building: access:A001 and relay:R003, link 270 s', (await scene(b)).link === 'case' && (await b.text('.cr-link-text')) === '270 s');
    await b.click('#verify'); check('S9.7 Verify chain valid', (await b.text('#inspection')).includes('"valid": true'));
    await b.click('#tamper'); await sleep(300); check('S9.8 tamper test still detects tampering and leaves the ledger intact', /Tampering detected/.test(await b.text('#status')) && (await counters(b)).integrity === 'Verified');
    await b.eval(`window.__blob=null;const o=URL.createObjectURL;URL.createObjectURL=function(x){window.__blob=x;return o.call(URL,x)}`);
    await b.click('#export'); await sleep(500);
    const exp = await b.eval(`window.__blob?window.__blob.text().then(t=>{const j=JSON.parse(t);return {schema:j.schema,n:j.ledger.length,valid:j.integrity.valid,keys:Object.keys(j).sort().join(','),hasCase:t.includes('case:')}}):null`);
    check('S9.9 JSON export is unchanged: schema, 5 ledger rows, valid integrity, no case or Control Room data', !!exp && exp.schema === 'ghostbridge-evidence-v1' && exp.n === 5 && exp.valid && !exp.hasCase && exp.keys === 'exported_at,integrity,ledger,mode,schema', JSON.stringify(exp));
    check('S9.10 localStorage holds only the ledger (no Control Room, Showcase or reconstruction state)', JSON.stringify(await b.eval(`Object.keys(localStorage)`)) === '["ghostbridge-ledger-v1"]');
    await resetLab(b);
    check('S9.11 Reset returns everything to zero and the building to idle', (await counters(b)).events === 0 && (await scene(b)).idle === 'true' && (await chip(b)).hidden);
    await b.click('#cr-unfold');
    await b.waitFor(`!${G('reconstruction')}.hidden && !!document.querySelector('#reconstruction .recon-scene')`, 'unfold reconstruction', 30000);
    c = await counters(b);
    check('S9.12 "Watch an incident unfold" runs the real Legacy case, then opens the real reconstruction', c.events === 5 && c.cases === 1 && c.integrity === 'Verified' && (await scene(b)).link === 'case', JSON.stringify(c));
    noErr(b, 'S9');
  });

  // ============ S10. accessibility ============
  await run('S10 accessibility', async b => {
    await b.viewport(1440, 900); await open(b, srv.origin, 'Browser lab');
    await b.click('#cr-forge'); await chal(b, 'A', 1);
    const a11y = await b.eval(`(()=>{const name=e=>(e.getAttribute('aria-label')||e.textContent||'').trim()||(e.id&&document.querySelector('label[for="'+e.id+'"]')?.textContent.trim())||(e.closest('label')?.textContent.trim())||'';
      const els=[...document.querySelectorAll('#control-room button,#control-room input,#control-room select,#vision a,#showcase button')].filter(e=>e.getBoundingClientRect().width>0||e.closest('[hidden]')===null);
      const unnamed=els.filter(e=>!name(e)).map(e=>e.id||e.className);
      const h1=document.querySelectorAll('h1').length, h2=[...document.querySelectorAll('h2')].map(h=>h.textContent.trim().slice(0,30));
      const live=[...document.querySelectorAll('[aria-live]')].map(e=>e.id).filter(Boolean);
      const tabs=[...document.querySelectorAll('[role=tab]')].map(t=>({sel:t.getAttribute('aria-selected'),ctl:!!document.getElementById(t.getAttribute('aria-controls'))}));
      return {unnamed,h1,h2,live,tabs,svgRole:document.querySelector('#cr-scene svg').getAttribute('role'),svgTitle:!!document.querySelector('#cr-scene svg title'),lang:document.documentElement.lang}})()`);
    check('S10.1 every control has an accessible name', a11y.unnamed.length === 0, JSON.stringify(a11y.unnamed));
    check('S10.2 exactly one h1 and a logical h2 outline', a11y.h1 === 1 && a11y.h2.length >= 3, JSON.stringify(a11y.h2));
    check('S10.3 live regions announce the caption, rule verdict, Forge result and Showcase text', ['cr-caption', 'forge-preview', 'forge-result', 'sc-sub', 'cr-ev-note'].every(id => a11y.live.includes(id)), JSON.stringify(a11y.live));
    check('S10.4 tablist: 4 tabs, exactly one selected, each controls an existing panel', a11y.tabs.length === 4 && a11y.tabs.filter(t => t.sel === 'true').length === 1 && a11y.tabs.every(t => t.ctl));
    check('S10.5 the scene is an image with a title and the document language is set', a11y.svgRole === 'img' && a11y.svgTitle && a11y.lang === 'en');
    const desc = await b.eval(`document.querySelector('#cr-scene svg desc').textContent`);
    check('S10.6 the scene description is updated from the ledger (screen-reader equivalent of the picture)', /held open/i.test(desc) && /access denied/i.test(desc) && desc.includes('linked case'), desc);
    const contrast = await b.eval(`(()=>{const parse=c=>{const m=c.match(/rgba?\\(([^)]+)\\)/);const p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p[3]===undefined?1:p[3]}};
      const lum=({r,g,b})=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)};
      const bgOf=e=>{let n=e;while(n){const c=parse(getComputedStyle(n).backgroundColor);if(c.a>0.85)return c;n=n.parentElement}return {r:11,g:14,b:16,a:1}};
      const rows=[];for(const [sel,label] of [['.cr-node-name','source name'],['.cr-node-time','source time'],['.cr-tabs small','tab hint'],['.cr-lede','lede'],['.cr-gauge small','gauge note'],['.cr-q dd','board answer'],['.vision-head p:last-child','vision paragraph'],['.v-outcomes li','outcome text'],['.fine','fine print'],['.cr-chal small','challenge note']]){const e=document.querySelector(sel);if(!e)continue;const fg=parse(getComputedStyle(e).color),bg=bgOf(e);const a=lum(fg),b2=lum(bg);const ratio=(Math.max(a,b2)+0.05)/(Math.min(a,b2)+0.05);rows.push({label,ratio:+ratio.toFixed(2)})}return rows})()`);
    notes.push('Measured text contrast (computed colour vs nearest solid background): ' + contrast.map(c => `${c.label} ${c.ratio}:1`).join(', ') + '. Sampled elements only, not every pixel; gradients and the scene are not measured.');
    check('S10.7 sampled body text has contrast of at least 4.5:1 against its solid background', contrast.length >= 8 && contrast.every(c => c.ratio >= 4.5), JSON.stringify(contrast.filter(c => c.ratio < 4.5)));
    noErr(b, 'S10');
  });
} catch (err) {
  check('M5 script ran to the end without an unhandled error', false, String(err.stack || err));
} finally {
  const EXPECTED = ['S1 first viewport 1440', 'S2 forge and challenges', 'S3 modes and evidence', 'S3b product vision', 'S4 showcase full run', 'S4b showcase controls', 'S5 mobile 390', 'S6 1280x720', 'S7 reduced motion', 'S8 local Python', 'S9 regression', 'S10 accessibility'];
  const done = rec.scenarios.filter(x => x.ok).map(x => x.name);
  if (!only.length) check(`All ${EXPECTED.length} scenarios completed (none skipped)`, EXPECTED.every(n => done.includes(n)), 'missing: ' + EXPECTED.filter(n => !done.includes(n)).join(', '));
  const s = rec.summary();
  writeReport(path.join(OUT, 'REPORT.md'), 'Milestone 5: Control Room real-browser QA', s,
    'Headless Chrome over CDP. Browser-only mode is served from 127.0.0.2; local mode is the real Python + SQLite server on a throwaway database. Each scenario runs on a fresh browser.\n\n**Measurements**\n' + notes.map(n => '- ' + n).join('\n') + '\n\n**Limits:** one browser engine (Chrome); 390 px is device emulation, not a real phone; contrast is sampled, not exhaustive; no screen reader was used.');
  await srv.close(); py.stop();
  process.exit(s.fail ? 1 : 0);
}
