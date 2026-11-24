/**
 * Asserting target-size / overflow / reduced-motion audit (Phase 6).
 * Run: node tests/browser-qa/a11y-targets-after.qa.mjs   (needs Chrome/Edge; serves docs/ locally)
 *
 * Measures every visible link, button, input, select, textarea and summary at 1440x900, 1280x720 and 390x844.
 * Fails if a standalone control is smaller than 40px in either dimension.
 * Allowed exception (WCAG 2.5.8 "inline"): an <a> that is display:inline AND sits inside a block that also
 * contains other non-whitespace text (a link inside a sentence). Those are listed but not failed.
 * Also checks horizontal overflow, that the nav anchors are visible/reachable, and that with reduced motion
 * emulated a nav anchor click does not scroll smoothly (scrollY right after the click equals the final scrollY).
 * Screenshots go to docs/evidence/phase6/.
 */
import path from 'node:path';
import {writeFileSync} from 'node:fs';
import {ROOT, sleep, serveDocs, withBrowser, recorder, writeReport} from './lib.mjs';

const OUT = path.join(ROOT, 'docs', 'evidence', 'phase6');
const MIN = 40;
const srv = await serveDocs();
const rec = recorder('a11y targets after (phase 6)');
const detail = {};

const measure = `(()=>{
 const out=[];
 for(const e of document.querySelectorAll('a[href],button,input,select,textarea,summary,[role=button],[tabindex]:not([tabindex="-1"])')){
  if(e.closest('[hidden]'))continue;
  const cs=getComputedStyle(e),r=e.getBoundingClientRect();
  if(cs.visibility==='hidden'||cs.display==='none'||!e.getClientRects().length)continue;
  if(e.tagName==='INPUT'&&e.type==='hidden')continue;
  let inline=false;
  if(e.tagName==='A'&&cs.display==='inline'){const p=e.parentElement;const own=(e.textContent||'').trim();
   const rest=Array.from(p.childNodes).filter(n=>n!==e).map(n=>n.textContent||'').join('').trim();inline=rest.length>0;}
  out.push({tag:e.tagName,id:e.id,cls:String(e.className).slice(0,30),type:e.type||'',text:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,30),
   w:+r.width.toFixed(1),h:+r.height.toFixed(1),inline});
 }
 return out;})()`;

for (const [name, w, h, mobile] of [['d1440', 1440, 900, false], ['d1280', 1280, 720, false], ['m390', 390, 844, true]]) {
  await withBrowser(rec, name, async b => {
    await b.viewport(w, h, mobile);
    await b.goto(srv.origin, "!!document.querySelector('#cr-scene svg')");
    await sleep(800);
    const d = detail[name] = {};

    // 1. target sizes
    d.controls = await b.eval(measure);
    const standalone = d.controls.filter(c => !c.inline);
    const small = standalone.filter(c => c.w < MIN || c.h < MIN);
    d.exemptInline = d.controls.filter(c => c.inline).map(c => `${c.text} ${c.w}x${c.h}`);
    rec.check(`${name} measured ${d.controls.length} visible controls (${standalone.length} standalone, ${d.exemptInline.length} inline-exempt)`, d.controls.length > 10, '');
    rec.check(`${name} every standalone control is >= ${MIN}x${MIN}px`, small.length === 0,
      small.map(c => `${c.tag}#${c.id}.${c.cls} "${c.text}" ${c.w}x${c.h}`).join(' | '));

    // 2. nav links exist, are visible, and are >= 40px high
    d.nav = await b.eval(`Array.from(document.querySelectorAll('header nav a')).map(a=>{const r=a.getBoundingClientRect(),cs=getComputedStyle(a);return {href:a.getAttribute('href'),text:a.textContent.trim(),w:+r.width.toFixed(1),h:+r.height.toFixed(1),shown:cs.display!=='none'&&r.width>0&&r.left>=-0.5&&(r.right<=innerWidth+0.5||(()=>{const n=a.closest('nav'),ncs=getComputedStyle(n);return (ncs.overflowX==='auto'||ncs.overflowX==='scroll')&&n.scrollWidth>n.clientWidth&&a.offsetLeft+a.offsetWidth<=n.scrollWidth+0.5})())}})`);
    for (const href of ['#control-room', '#workspace', '#vision']) {
      const a = d.nav.find(x => x.href === href);
      rec.check(`${name} nav link ${href} is shown on screen and >= 40px high`, !!a && a.shown && a.h >= MIN && a.w >= 40, JSON.stringify(a));
    }
    rec.check(`${name} footer link is >= 40px high`, await b.eval(`(()=>{const a=document.querySelector('footer a');const r=a.getBoundingClientRect();return r.height>=${MIN}&&r.width>=${MIN}})()`), '');

    // 3. overflow
    d.overflow = await b.eval(`({scrollWidth:document.documentElement.scrollWidth,innerWidth:innerWidth,bodyScrollWidth:document.body.scrollWidth})`);
    rec.check(`${name} no horizontal overflow`, d.overflow.scrollWidth <= d.overflow.innerWidth && d.overflow.bodyScrollWidth <= d.overflow.innerWidth, JSON.stringify(d.overflow));

    // 4. reduced motion: nav anchor click must scroll instantly
    await b.reducedMotion(true);
    d.reduced = await b.eval(`({mq:matchMedia('(prefers-reduced-motion: reduce)').matches,scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior})`);
    rec.check(`${name} reduced motion emulated and html scroll-behavior is not smooth`, d.reduced.mq && d.reduced.scrollBehavior !== 'smooth', JSON.stringify(d.reduced));
    d.scroll = [];
    for (const href of ['#control-room', '#vision', '#workspace', '#how']) {
      await b.eval(`(history.replaceState(null,'',location.pathname),window.scrollTo({top:0,behavior:'instant'}),0)`);
      await sleep(150);
      const s = await b.eval(`(()=>{const a=document.querySelector('header nav a[href="${href}"]');const t=document.querySelector('${href}');
        a.click();const immediate=Math.round(scrollY);return {immediate,top:Math.round(t.getBoundingClientRect().top+scrollY)}})()`);
      await sleep(700);
      const fin = await b.eval('Math.round(scrollY)');
      const row = {href, immediate: s.immediate, final: fin, targetTop: s.top};
      d.scroll.push(row);
      rec.check(`${name} reduced motion: click ${href} jumps instantly (immediate scrollY ${s.immediate} == final ${fin}, moved > 0)`,
        s.immediate === fin && fin > 0, JSON.stringify(row));
    }
    await b.shot(path.join(OUT, `nav-reduced-${w}.png`), null, 300);

    // 5. screenshots with motion normal
    await b.reducedMotion(false);
    await b.eval(`(window.scrollTo({top:0,behavior:'instant'}),0)`);
    await b.shot(path.join(OUT, `hero-${w}.png`), null, 600);
    d.errors = b.drainErrors();
    rec.check(`${name} no console errors`, d.errors.length === 0, d.errors.join(' | '));
  });
}

const s = rec.summary();
writeFileSync(path.join(OUT, 'a11y-targets-after.json'), JSON.stringify({summary: {pass: s.pass, fail: s.fail, total: s.total}, results: s.results, detail}, null, 1));
writeReport(path.join(OUT, 'a11y-targets-REPORT.md'), 'a11y targets after (phase 6)', s,
  'Synthetic data, headless Chrome via CDP, local server. Inline-link exception (WCAG 2.5.8): display:inline <a> inside a block with other text.');
await srv.close();
process.exit(s.fail ? 1 : 0);
