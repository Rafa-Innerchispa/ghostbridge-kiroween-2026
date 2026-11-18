/**
 * Independent Signal Forge focus audit (qa-auditor, agentic-validation round 2).
 * Run: node tests/browser-qa/forge-focus-audit.qa.mjs   (needs Chrome/Edge; serves docs/ on 127.0.0.2)
 * Verifies the MutationObserver focus hand-off in docs/control_room_view.mjs: open, no focus theft, close, skip link, challenges.
 * Writes screenshots and forge-focus-audit.json to docs/evidence/agentic-validation/.
 */
import path from 'node:path';
import {writeFileSync} from 'node:fs';
import {ROOT, serveDocs, withBrowser, recorder, sleep} from './lib.mjs';
const OUT = path.join(ROOT, 'docs', 'evidence', 'agentic-validation');
const G = id => `document.getElementById(${JSON.stringify(id)})`;
const active = b => b.eval(`(()=>{const e=document.activeElement;return e?e.tagName+'#'+e.id:null})()`);
const activeId = b => b.eval(`document.activeElement?.id||document.activeElement?.tagName`);
const ring = b => b.eval(`(()=>{const e=document.activeElement,cs=getComputedStyle(e);return {id:e.id,focusVisible:e.matches(':focus-visible'),outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor,shadow:cs.boxShadow.slice(0,80)}})()`);
const settled = b => b.waitFor(`!${G('reset')}.disabled && !${G('forge-run')}.disabled`, 'ui settled').then(() => sleep(450));
const counts = b => b.eval(`({events:${G('events-count')}.textContent,cases:${G('cases-count')}.textContent})`);
/** Real mouse click at the element centre (gives the button focus like a user's click, unlike el.click()). */
async function mouseClick(b, sel) {
  await b.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.scrollIntoView({block:'center',behavior:'instant'});return 1})()`);
  await sleep(700); // the page has CSS smooth scrolling; wait until it has really stopped before measuring
  const r = await b.eval(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,h:innerHeight}})()`);
  if (r.y < 0 || r.y > r.h) throw new Error('mouseClick target off-screen: ' + JSON.stringify(r));
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', {type, x: r.x, y: r.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1});
}
const srv = await serveDocs();
const rec = recorder('forge focus audit');
const detail = {};
const load = async (b, w, h, mobile) => {
  await b.viewport(w, h, mobile);
  await b.goto(srv.origin, "!!document.querySelector('#cr-scene svg')");
  await sleep(600);
};
for (const [name, w, h, mobile] of [['d1440', 1440, 900, false], ['m390', 390, 844, true]]) {
  const d = detail[name] = {};
  // F1 programmatic click (focus stays on BODY: this is the round-1 failure path), then Close
  await withBrowser(rec, name + '-open-programmatic', async b => {
    await load(b, w, h, mobile);
    d.start = await active(b);
    await b.click('#signal-forge');
    await sleep(500);
    d.afterOpenProgrammatic = await active(b);
    rec.check(`${name} F1 programmatic click on #signal-forge -> focus on #forge-gap`, d.afterOpenProgrammatic === 'INPUT#forge-gap', d.afterOpenProgrammatic);
    d.scrollYAfterOpen = await b.eval('Math.round(scrollY)');
    // F2 move to hold, refresh without Forge visibility change: must not be stolen back
    await b.eval(`${G('forge-hold')}.focus()`);
    await b.setRange('#forge-hold', 150);
    await sleep(300);
    d.afterHoldInput = await active(b);
    rec.check(`${name} F2 input event on #forge-hold keeps focus on #forge-hold (no theft)`, d.afterHoldInput === 'INPUT#forge-hold', d.afterHoldInput);
    await b.eval(`${G('forge-camera')}.focus()`);
    await b.eval(`${G('forge-camera')}.click()`);
    await sleep(300);
    d.afterCamera = await active(b);
    rec.check(`${name} F2b camera toggle keeps focus on #forge-camera (no theft)`, d.afterCamera === 'INPUT#forge-camera', d.afterCamera);
    await b.eval(`${G('forge-hold')}.focus()`);
    await b.click('#forge-pass');
    await sleep(400);
    d.afterPass = await active(b);
    rec.check(`${name} F2c #forge-pass moves focus to #forge-gap only via the app.js preset behaviour`, d.afterPass === 'INPUT#forge-gap', d.afterPass);
    await b.eval(`${G('forge-hold')}.focus()`);
    await b.click('#forge-fail');
    await sleep(400);
    d.afterFail = await active(b);
    rec.check(`${name} F2d #forge-fail same preset behaviour`, d.afterFail === 'INPUT#forge-gap', d.afterFail);
    // F3 Close
    await b.click('#forge-close');
    await sleep(500);
    d.afterClose = await active(b);
    d.hiddenAfterClose = await b.eval(`${G('forge-panel')}.hidden`);
    rec.check(`${name} F3 Close hides panel and returns focus to #signal-forge`, d.hiddenAfterClose === true && d.afterClose === 'BUTTON#signal-forge', `${d.hiddenAfterClose} ${d.afterClose}`);
    // reopen after close (loop / stuck-state check)
    await b.click('#signal-forge'); await sleep(400);
    d.reopen = await active(b);
    rec.check(`${name} F3b reopen after Close focuses #forge-gap again`, d.reopen === 'INPUT#forge-gap', d.reopen);
    // Close while focus is on the Close button itself must not be pulled to #forge-gap
    await b.eval(`${G('forge-close')}.focus()`); await b.click('#forge-close'); await sleep(400);
    d.closeFocus2 = await active(b);
    rec.check(`${name} F3c second Close still lands on #signal-forge, not #forge-gap`, d.closeFocus2 === 'BUTTON#signal-forge', d.closeFocus2);
    d.errors = b.drainErrors();
    rec.check(`${name} no console errors during forge focus flow`, d.errors.length === 0, d.errors.join(' | '));
  });
  // F1b real mouse click (button gets focus first => observer branch "active === #signal-forge")
  await withBrowser(rec, name + '-open-mouse', async b => {
    await load(b, w, h, mobile);
    await mouseClick(b, '#signal-forge');
    await sleep(600);
    d.afterOpenMouse = await active(b);
    rec.check(`${name} F1b real mouse click on #signal-forge -> focus on #forge-gap`, d.afterOpenMouse === 'INPUT#forge-gap', d.afterOpenMouse);
  });
  // F1c keyboard open + screenshot with focus ring
  await withBrowser(rec, name + '-open-keyboard', async b => {
    await load(b, w, h, mobile);
    await b.eval(`${G('signal-forge')}.scrollIntoView({block:'center',behavior:'instant'})`);
    await sleep(500);
    await b.eval(`${G('signal-forge')}.focus()`);
    await b.key('Enter', 'Enter', 13, '\r');
    await sleep(2000); // app.js scrolls the panel into view with behavior:'smooth'; wait for it to finish (probe: settled by ~1 s)
    d.afterOpenKeyboard = await active(b);
    d.ring = await ring(b);
    rec.check(`${name} F1c keyboard Enter on #signal-forge -> focus on #forge-gap`, d.afterOpenKeyboard === 'INPUT#forge-gap', d.afterOpenKeyboard);
    rec.check(`${name} F1c #forge-gap focus ring visible (:focus-visible and outline/box-shadow present)`, d.ring.focusVisible && (!/^none/.test(d.ring.outline) || d.ring.shadow !== 'none'), JSON.stringify(d.ring));
    d.inView = await b.eval(`(()=>{const r=${G('forge-gap')}.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),h:innerHeight}})()`);
    rec.check(`${name} F1c #forge-gap is inside the viewport after opening`, d.inView.top >= 0 && d.inView.bottom <= d.inView.h, JSON.stringify(d.inView));
    d.shot = await b.shot(path.join(OUT, `forge-focus-open-${w}.png`), null, 600);
    // F5 Tab from the open Forge still moves sequentially (no trap)
    await b.key('Tab', 'Tab', 9); await sleep(200);
    d.tabNext = await active(b);
    rec.check(`${name} F5 Tab from #forge-gap moves on (no trap)`, d.tabNext !== 'INPUT#forge-gap', d.tabNext);
  });
  // F4 skip link still first Tab on a fresh load
  await withBrowser(rec, name + '-skiplink', async b => {
    await load(b, w, h, mobile);
    await b.key('Tab', 'Tab', 9); await sleep(300);
    d.firstTab = await b.eval(`(()=>{const e=document.activeElement;return {cls:String(e.className),href:e.getAttribute('href')}})()`);
    rec.check(`${name} F4 first Tab lands on the skip link`, /skip-link/.test(d.firstTab.cls) && d.firstTab.href === '#control-room', JSON.stringify(d.firstTab));
  });
  // F6 challenges A and B (fresh page each; B after A as well)
  await withBrowser(rec, name + '-challenges', async b => {
    await load(b, w, h, mobile);
    d.chal = {};
    await b.click('#cr-chal-a');
    await b.waitFor(`${G('events-count')}.textContent==='3' && ${G('cases-count')}.textContent==='1'`, 'challenge A 3 events 1 case');
    await settled(b);
    d.chal.a = await counts(b); d.chal.aFocus = await active(b); d.chal.aForgeHidden = await b.eval(`${G('forge-panel')}.hidden`);
    rec.check(`${name} F6 Challenge A -> 3 events, 1 case`, d.chal.a.events === '3' && d.chal.a.cases === '1', JSON.stringify(d.chal.a));
    await b.click('#cr-chal-b');
    await b.waitFor(`${G('events-count')}.textContent==='3' && ${G('cases-count')}.textContent==='0'`, 'challenge B 3 events 0 cases');
    await settled(b);
    d.chal.b = await counts(b); d.chal.bFocus = await active(b);
    rec.check(`${name} F6 Challenge B -> 3 events, 0 cases`, d.chal.b.events === '3' && d.chal.b.cases === '0', JSON.stringify(d.chal.b));
    rec.check(`${name} F6 Close still works after challenges`, await (async () => { await b.click('#forge-close'); await sleep(300); return (await b.eval(`${G('forge-panel')}.hidden`)) === true; })());
    d.errors2 = b.drainErrors();
    rec.check(`${name} no console errors during challenges`, d.errors2.length === 0, d.errors2.join(' | '));
  });
  await withBrowser(rec, name + '-challenge-b-first', async b => {
    await load(b, w, h, mobile);
    await b.click('#cr-chal-b');
    await b.waitFor(`${G('events-count')}.textContent==='3' && ${G('cases-count')}.textContent==='0'`, 'challenge B first');
    d.chalBFirst = await counts(b);
    rec.check(`${name} F6 Challenge B from a fresh page -> 3 events, 0 cases`, d.chalBFirst.events === '3' && d.chalBFirst.cases === '0', JSON.stringify(d.chalBFirst));
  });
}
await srv.close();
const s = rec.summary();
writeFileSync(path.join(OUT, 'forge-focus-audit.json'), JSON.stringify({summary: {pass: s.pass, fail: s.fail, total: s.total}, results: s.results, detail}, null, 2));
process.exit(s.fail ? 1 : 0);
