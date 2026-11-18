/**
 * Independent skip-link / target-size audit (qa-auditor, agentic-validation round 1).
 * Run: node tests/browser-qa/skip-link-audit.qa.mjs   (needs Chrome/Edge; serves docs/ on 127.0.0.2)
 * Writes screenshots to docs/evidence/agentic-validation/ and prints a JSON detail block.
 */
import path from 'node:path';
import {writeFileSync} from 'node:fs';
import {ROOT, serveDocs, withBrowser, recorder} from './lib.mjs';

const OUT = path.join(ROOT, 'docs', 'evidence', 'agentic-validation');
const IDS = ['filter-all', 'filter-high', 'filter-medium', 'verify', 'export', 'tamper'];
const srv = await serveDocs();
const rec = recorder('skip-link audit');
const detail = {};

const describe = `(()=>{const e=document.activeElement;if(!e)return null;const cs=getComputedStyle(e),r=e.getBoundingClientRect();
 return {tag:e.tagName,id:e.id,cls:String(e.className).slice(0,40),text:(e.textContent||'').trim().slice(0,40),href:e.getAttribute('href'),
 rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor,
 color:cs.color,bg:cs.backgroundColor,transition:cs.transitionDuration+' '+cs.transitionProperty,scrollY:Math.round(scrollY)}})()`;

for (const [name, w, h, mobile] of [['d1440', 1440, 900, false], ['m390', 390, 844, true]]) {
  await withBrowser(rec, name, async b => {
    await b.viewport(w, h, mobile);
    await b.goto(srv.origin, "!!document.querySelector('#cr-scene svg')");
    await b.eval(`new Promise(r=>setTimeout(r,800))`);
    const d = detail[name] = {};
    // (a) first Tab
    d.before = await b.eval(`document.activeElement.tagName+'#'+document.activeElement.id`);
    await b.key('Tab', 'Tab', 9);
    await new Promise(r => setTimeout(r, 400));
    d.tab1 = await b.eval(describe);
    rec.check(`${name} (a) first Tab lands on the skip link`, d.tab1 && /skip-link/.test(d.tab1.cls) && d.tab1.href === '#control-room', JSON.stringify(d.tab1));
    rec.check(`${name} (a) skip link is on screen when focused`, d.tab1 && d.tab1.rect.y >= 0 && d.tab1.rect.x >= 0 && d.tab1.rect.x + d.tab1.rect.w <= w, JSON.stringify(d.tab1?.rect));
    rec.check(`${name} (a) focus ring visible (outline style/width)`, d.tab1 && !/^none/.test(d.tab1.outline) && !/^0px/.test(d.tab1.outline.split(' ').slice(1).join(' ')), d.tab1?.outline);
    const shot = path.join(OUT, `skiplink-focused-${w}.png`);
    await b.shot(shot, null, 300);
    d.shot = shot;
    // (d) contrast
    d.contrast = await b.eval(`(()=>{const e=document.activeElement;const cs=getComputedStyle(e);
      const p=s=>s.match(/[\\d.]+/g).map(Number);const L=c=>{const [r,g,bl]=c.slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*bl};
      const fg=p(cs.color),bg=p(cs.backgroundColor),a=Math.max(L(fg),L(bg)),bb=Math.min(L(fg),L(bg));
      const bd=p(cs.borderTopColor);const ob=p(cs.outlineColor);const ratio=(a+.05)/(bb+.05);
      // outline vs page background behind it (body)
      const pg=p(getComputedStyle(document.body).backgroundColor);const pgL=L(pg.length>3&&pg[3]===0?[11,14,16]:pg);const oL=L(ob);
      return {fg:cs.color,bg:cs.backgroundColor,bgAlpha:bg[3]??1,ratio:+ratio.toFixed(2),outlineColor:cs.outlineColor,outlineVsPage:+(((Math.max(oL,pgL)+.05)/(Math.min(oL,pgL)+.05)).toFixed(2)),pageBg:getComputedStyle(document.body).backgroundColor}})()`);
    rec.check(`${name} (d) skip-link text contrast >= 4.5:1`, d.contrast.ratio >= 4.5 && d.contrast.bgAlpha >= 0.95, JSON.stringify(d.contrast));
    // (e) reduced motion
    await b.reducedMotion(true);
    d.reduced = await b.eval(`(()=>{const e=document.activeElement,cs=getComputedStyle(e);return {mq:matchMedia('(prefers-reduced-motion: reduce)').matches,transition:cs.transitionDuration+' / '+cs.transitionProperty,animation:cs.animationName+' '+cs.animationDuration,htmlScrollBehavior:getComputedStyle(document.documentElement).scrollBehavior,bodyScrollBehavior:getComputedStyle(document.body).scrollBehavior,targetScrollBehavior:getComputedStyle(document.querySelector('#control-room')).scrollBehavior}})()`);
    const noMotion = /^0s/.test(d.reduced.transition) && /^none|0s$/.test(d.reduced.animation) && d.reduced.htmlScrollBehavior !== 'smooth';
    rec.check(`${name} (e) reduced motion: no transition/animation/smooth-scroll on skip link or page`, noMotion, JSON.stringify(d.reduced));
    // (b) Enter
    d.scrollBefore = await b.eval('Math.round(scrollY)');
    await b.key('Enter', 'Enter', 13, '\r');
    await new Promise(r => setTimeout(r, 700));
    d.afterEnter = await b.eval(describe);
    d.hash = await b.eval('location.hash');
    d.scrollAfter = d.afterEnter?.scrollY;
    rec.check(`${name} (b) Enter moves focus to #control-room`, d.afterEnter?.id === 'control-room', JSON.stringify(d.afterEnter));
    rec.check(`${name} (b) hash updated`, d.hash === '#control-room', d.hash);
    d.crTop = await b.eval(`Math.round(document.querySelector('#control-room').getBoundingClientRect().top)`);
    rec.check(`${name} (b) target section reachable (top within viewport)`, d.crTop >= -2 && d.crTop < h, `scrollY ${d.scrollBefore} -> ${d.scrollAfter}, #control-room top=${d.crTop}`);
    d.afterOutline = d.afterEnter?.outline;
    await b.reducedMotion(false);
    // (c) targets and overflow
    d.targets = await b.eval(`(${JSON.stringify(IDS)}).map(id=>{const e=document.getElementById(id);if(!e)return {id,missing:true};const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return {id,w:+r.width.toFixed(1),h:+r.height.toFixed(1),display:cs.display,visible:r.width>0&&r.height>0&&cs.visibility!=='hidden'&&!e.closest('[hidden]'),disabled:!!e.disabled}})`);
    for (const t of d.targets) rec.check(`${name} (c) #${t.id} >= 40x40`, !t.missing && t.visible && t.w >= 40 && t.h >= 40, JSON.stringify(t));
    d.overflow = await b.eval(`({scrollWidth:document.documentElement.scrollWidth,innerWidth:innerWidth,bodyScrollWidth:document.body.scrollWidth})`);
    rec.check(`${name} (c) no horizontal overflow`, d.overflow.scrollWidth <= d.overflow.innerWidth, JSON.stringify(d.overflow));
    d.errors = b.drainErrors();
    rec.check(`${name} no console errors`, d.errors.length === 0, d.errors.join(' | '));
  });
}
const external = srv.requests.filter(r => !/^\/(?:$|[\w.\-\/]+)$/.test(r.path));
detail.requests = srv.requests.map(r => r.status + ' ' + r.path);
detail.thirdParty = 'server only sees same-origin; cross-origin requests not observed by this script';
const s = rec.summary();
writeFileSync(path.join(OUT, 'skip-link-audit.json'), JSON.stringify({summary: {pass: s.pass, fail: s.fail, total: s.total}, results: s.results, detail}, null, 1));
await srv.close();
process.exit(s.fail ? 1 : 0);
