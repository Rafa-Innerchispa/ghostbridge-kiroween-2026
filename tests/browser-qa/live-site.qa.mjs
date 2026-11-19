/**
 * Live-site smoke QA against the PUBLISHED GhostBridge (default https://ghostbridge.innerchispa.us/), real Chrome, asserting.
 * Authored by Kiro's main session (Kiroween 2026). Run: node tests/browser-qa/live-site.qa.mjs [url]
 * Read-only for the site: it only uses the browser-only lab (localStorage in a throwaway profile).
 */
import path from 'node:path';
import {ROOT, recorder, withBrowser, writeReport, sleep} from './lib.mjs';

const URL_ = process.argv[2] || 'https://ghostbridge.innerchispa.us/';
const OUT = path.join(ROOT, 'docs', 'evidence', 'live');
const rec = recorder('Live site');
const {check} = rec;
const G = id => `document.getElementById(${JSON.stringify(id)})`;
const ready = "!!document.querySelector('#cr-scene svg') && !!document.getElementById('cr-tm')";
const settled = b => b.waitFor(`!${G('reset')}.disabled && !${G('forge-run')}.disabled`, 'ui settled').then(() => sleep(600));
const chal = async (b, which, cases) => {
  await b.click(which === 'A' ? '#cr-chal-a' : '#cr-chal-b');
  await b.waitFor(`${G('events-count')}.textContent==='3' && ${G('cases-count')}.textContent===${JSON.stringify(String(cases))}`, 'challenge ' + which, 20000);
  await settled(b);
};
const ledger = b => b.eval(`localStorage.getItem('ghostbridge-ledger-v1')`);

await withBrowser(rec, 'L1 desktop 1440: load, challenges, Time Machine, Trust Lab', async b => {
  await b.viewport(1440, 900);
  await b.goto(URL_, ready);
  check('L1.1 page served over HTTPS from the custom domain', (await b.eval('location.protocol + "//" + location.host')) === new URL(URL_).origin);
  check('L1.2 new modules present (Time Machine, Trust Lab, skip link)', await b.eval(`!!${G('cr-tm')} && !!${G('cr-tl-lab')} && !!document.querySelector('.skip-link')`));
  await chal(b, 'A', 1);
  const caseId = await b.eval(`(${G('cr-case-chip')}.textContent.match(/case:[0-9a-f]{16}/)||[''])[0]`);
  check('L1.3 challenge A (299/120) forms the expected case id', caseId === 'case:cfd83deb8d3af576', caseId);
  await b.click('#cr-tab-timeline');
  await b.waitFor(`document.querySelectorAll('.cr-tm-beat').length===8`, 'beats');
  await b.eval(`document.querySelectorAll('.cr-tm-beat')[5].click()`); await sleep(500);
  const cap = await b.text('#cr-tm-caption');
  check('L1.4 Time Machine beat 6 shows the case id and labels its time as derived', cap.includes(caseId) && /Derived UTC time/.test(cap), cap.slice(0, 120));
  await b.click('#cr-tab-evidence'); await sleep(300);
  await b.eval(`(()=>{const d=${G('cr-tl-lab-details')};if(!d.open)d.open=true;return 1})()`); await sleep(300);
  const before = await ledger(b);
  await b.eval(`(()=>{const r=${G('cr-tl-lab-row')};r.value='2';r.dispatchEvent(new Event('change',{bubbles:true}));const f=${G('cr-tl-lab-field')};f.value='at';f.dispatchEvent(new Event('change',{bubbles:true}));return 1})()`);
  await b.click('#cr-tl-lab-tamper');
  await b.waitFor(`!!${G('cr-tl-lab-altered-h')}`, 'tamper result');
  check('L1.5 Trust Lab: the altered copy fails at row 2', (await b.text('#cr-tl-lab-altered-h')).trim() === 'Altered copy: fails at row 2', await b.text('#cr-tl-lab-altered-h'));
  check('L1.6 Trust Lab: the real ledger is byte-identical', (await ledger(b)) === before);
  await chal(b, 'B', 0);
  check('L1.7 challenge B (301/119) forms no case', (await b.text('#cases-count')) === '0');
  check('L1.8 no console errors', b.drainErrors().length === 0);
  check('L1.9 no failed requests', b.badResponses.length === 0 && b.failedRequests.length === 0, JSON.stringify([...b.badResponses, ...b.failedRequests]).slice(0, 200));
  await b.shot(path.join(OUT, 'live-1440.png'), null, 600);
});

await withBrowser(rec, 'L2 mobile 390 and reduced motion', async b => {
  await b.viewport(390, 844, true);
  await b.reducedMotion(true);
  await b.goto(URL_, ready);
  const o = await b.overflow();
  check('L2.1 390 px: no horizontal overflow', o.scrollW <= o.clientW + 1, JSON.stringify(o).slice(0, 200));
  await chal(b, 'A', 1);
  await b.click('#cr-tab-timeline');
  await b.waitFor(`document.querySelectorAll('.cr-tm-beat').length===8`, 'beats');
  check('L2.2 reduced motion: Play is disabled', await b.eval(`${G('cr-tm-play')}.disabled`));
  check('L2.3 no console errors', b.drainErrors().length === 0);
  await b.shot(path.join(OUT, 'live-390.png'), null, 600);
});

await withBrowser(rec, 'L3 showcase entry', async b => {
  await b.viewport(1440, 900);
  await b.goto(URL_ + '?present=1', ready);
  await sleep(800);
  check('L3.1 ?present=1 opens the Showcase overlay', await b.eval(`(()=>{const e=document.querySelector('[data-armed="true"]');return !!e && !e.hidden})()`));
  check('L3.2 no console errors', b.drainErrors().length === 0);
});

const s = rec.summary();
writeReport(path.join(OUT, 'REPORT.md'), `Live site QA (${URL_})`, s, `Run ${new Date().toISOString()} against the published site, Chrome headless, fresh profile per scenario.`);
process.exit(s.fail ? 1 : 0);
