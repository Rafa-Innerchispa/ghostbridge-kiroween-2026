/**
 * GhostBridge motion grammar: once-per-band entrance and the "Pause motion" control.
 *
 * Loaded by its own <script type="module"> in index.html (app.js is not involved). Without JavaScript nothing is hidden:
 * the hidden entrance state (.is-armed) is only added here, after the module has run.
 *
 * - Entrance: each .band-in below the fold rises 16 px and fades in once (520 ms, CSS in premium.css) when it first
 *   enters the viewport. No idle loops, no scroll-jacking.
 * - Pause motion: header button, aria-pressed, remembered in localStorage under 'ghostbridge-motion'.
 *   Pause or prefers-reduced-motion sets <html data-motion="off">: entrances are skipped and the hero pointer parallax stops (CSS).
 * Builds DOM with createElement and textContent only.
 */
export const STORAGE_KEY = 'ghostbridge-motion';

export function readPaused(storage) {
  try { return storage?.getItem(STORAGE_KEY) === 'paused'; } catch { return false; }
}
export function writePaused(storage, paused) {
  try { storage?.setItem(STORAGE_KEY, paused ? 'paused' : 'running'); } catch { /* private mode: keep the choice for this page only */ }
}
/** Motion runs only when the user has not paused it and the system does not ask for reduced motion. */
export const motionAllowed = ({paused, reduced}) => !paused && !reduced;

export function initMotion({doc = document, win = window, storage = null} = {}) {
  const root = doc.documentElement;
  const mq = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : {matches: false};
  const state = {paused: readPaused(storage), reduced: !!mq.matches};
  let observer = null;
  const armed = new Set();

  const release = el => { el.classList.remove('is-armed', 'is-in'); armed.delete(el); };
  const releaseAll = () => { if (observer) { observer.disconnect(); observer = null; } [...armed].forEach(release); };

  function arm() {
    if (!win.IntersectionObserver || !motionAllowed(state)) return;
    observer = new win.IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        observer.unobserve(el);
        // Next frame so the hidden state is painted before the transition starts.
        win.requestAnimationFrame(() => { el.classList.add('is-in'); win.setTimeout(() => release(el), 600); });
      }
    }, {rootMargin: '0px 0px -8% 0px', threshold: 0});
    for (const el of doc.querySelectorAll('.band-in')) {
      const r = el.getBoundingClientRect();
      if (r.top < win.innerHeight * 0.92) continue;          // already in view at load: never hide it
      el.classList.add('is-armed'); armed.add(el); observer.observe(el);
    }
  }

  // Header control, created here so it never exists as a dead button without JavaScript.
  const header = doc.querySelector('header');
  const btn = doc.createElement('button');
  btn.type = 'button'; btn.id = 'motion-toggle'; btn.className = 'motion-toggle';
  btn.textContent = 'Pause motion';
  const paint = () => {
    const off = !motionAllowed(state);
    root.setAttribute('data-motion', off ? 'off' : 'on');
    btn.setAttribute('aria-pressed', String(state.paused || state.reduced));
    btn.setAttribute('aria-disabled', String(state.reduced));
    btn.title = state.reduced ? 'Your system already asks for reduced motion' : (state.paused ? 'Motion is paused. Select to resume.' : 'Stop entrance effects and hero parallax');
  };
  btn.addEventListener('click', () => {
    if (state.reduced) return;
    state.paused = !state.paused;
    writePaused(storage, state.paused);
    paint();
    if (state.paused) releaseAll();
  });
  if (header) header.append(btn);
  paint();
  arm();
  mq.addEventListener?.('change', e => { state.reduced = !!e.matches; paint(); if (!motionAllowed(state)) releaseAll(); });
  return {state, button: btn, release: releaseAll};
}

/* ------------------------------------------------------------------------------------------------
 * Phase 10 "Immersive depth". Everything below only runs while <html data-motion="on">; the CSS for it lives in depth.css.
 * Pause motion / prefers-reduced-motion flips data-motion to "off": hero vars are cleared, tilt released, counters show their
 * final values, armed reveals are shown. Nothing here changes ledger data or any text a test reads, except the optional
 * count-up of four decorative numbers while they scroll into view. Only transform/opacity are driven from JS.
 * ---------------------------------------------------------------------------------------------- */
export const TILT_MAX = 6;
export const clampTo = (v, max) => Math.max(-max, Math.min(max, v));
/** Tilt for a pointer at (px, py) in 0..1 across an element. Never exceeds +/- max degrees. */
export function tiltFor(px, py, max = TILT_MAX) {
  return {rx: +clampTo((0.5 - py) * 2 * max, max).toFixed(2), ry: +clampTo((px - 0.5) * 2 * max, max).toFixed(2)};
}
/** Ease-out count-up value at progress t (0..1). Always an integer; t >= 1 returns exactly `to`. */
export const countValue = (to, t) => (t >= 1 ? to : Math.round(to * (1 - Math.pow(1 - Math.max(0, t), 3))));
export const SECTIONS = Object.freeze([
  {id: 'control-room', label: 'Control Room'}, {id: 'how', label: 'How it works'}, {id: 'architecture', label: 'Architecture'},
  {id: 'workspace', label: 'Signal lab'}, {id: 'vision', label: 'Product vision'}]);
/** Index of the section the reader is in: the last one whose top has passed 40% of the viewport. */
export function activeSection(tops, vh) {
  let a = 0;
  tops.forEach((t, i) => { if (t <= vh * 0.4) a = i; });
  return a;
}
const TILT_SEL = '.arch-node, .steps li, .vision figure, .v-cta';
const REVEAL_SEL = '.steps li, .arch-node, .arch-verify, .vision figure, .v-outcomes li, .v-cta, .foot-cols > div, .scenario-bar, .workspace .metrics';

export function initDepth({doc = document, win = window} = {}) {
  const root = doc.documentElement;
  const on = () => root.getAttribute('data-motion') === 'on';
  const IO = win.IntersectionObserver;
  const raf = f => win.requestAnimationFrame(f);
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const vt = !!(win.CSS && win.CSS.supports && win.CSS.supports('animation-timeline: view()'));
  root.setAttribute('data-vt', String(vt));
  const el = (tag, cls) => { const n = doc.createElement(tag); if (cls) n.className = cls; return n; };

  // ---- hero camera: pointer and scroll drive CSS variables; light only moves while the hero is on screen ----
  const stage = doc.getElementById('cr-stage');
  let live = false;
  const setLive = () => { if (stage) stage.setAttribute('data-live', String(live && !doc.hidden && on())); };
  const clearHero = () => { if (!stage) return; for (const k of ['--hx', '--hy', '--hs', '--mx', '--my']) stage.style.removeProperty(k); stage.classList.remove('is-hot'); };
  if (stage) {
    if (IO) new IO(es => { live = es.some(e => e.isIntersecting); setLive(); paint(); }, {threshold: 0}).observe(stage);
    doc.addEventListener('visibilitychange', setLive);
    let pr = 0, pe = null;
    stage.addEventListener('pointermove', e => {
      if (!on() || e.pointerType === 'touch') return;
      pe = e;
      if (!pr) pr = raf(() => {
        pr = 0; const r = stage.getBoundingClientRect(); if (!pe || !r.width) return;
        const x = pe.clientX - r.left, y = pe.clientY - r.top;
        stage.style.setProperty('--hx', clampTo((x / r.width - 0.5) * 2, 1).toFixed(3));
        stage.style.setProperty('--hy', clampTo((y / r.height - 0.5) * 2, 1).toFixed(3));
        stage.style.setProperty('--mx', x.toFixed(0) + 'px'); stage.style.setProperty('--my', y.toFixed(0) + 'px');
        stage.classList.add('is-hot');
      });
    }, {passive: true});
    stage.addEventListener('pointerleave', () => { stage.style.setProperty('--hx', '0'); stage.style.setProperty('--hy', '0'); stage.classList.remove('is-hot'); });
  }

  // ---- sticky section progress: top bar plus a right-hand rail (rail shows from 1181 px up) ----
  const bar = el('div', 'd-progress'); bar.setAttribute('aria-hidden', 'true'); const fill = el('i'); bar.append(fill);
  const rail = el('nav', 'd-rail'); rail.setAttribute('aria-label', 'Section progress');
  const links = SECTIONS.map(s => { const a = el('a'); a.href = '#' + s.id; const t = el('span'); t.textContent = s.label; a.append(t); rail.append(a); return a; });
  doc.body.append(bar, rail);
  let current = -1;
  function paint() {
    const max = root.scrollHeight - win.innerHeight, y = win.scrollY || 0;
    fill.style.transform = 'scaleX(' + (max > 0 ? clamp01(y / max) : 0).toFixed(4) + ')';
    const tops = SECTIONS.map(s => { const n = doc.getElementById(s.id); return n ? n.getBoundingClientRect().top : Infinity; });
    const a = activeSection(tops, win.innerHeight);
    if (a !== current) { current = a; links.forEach((l, i) => { if (i === a) l.setAttribute('aria-current', 'location'); else l.removeAttribute('aria-current'); }); }
    if (stage && live && on()) { const h = stage.offsetHeight || 1; stage.style.setProperty('--hs', clamp01(y / h).toFixed(3)); }
  }
  let sr = 0;
  win.addEventListener('scroll', () => { if (!sr) sr = raf(() => { sr = 0; paint(); }); }, {passive: true});
  win.addEventListener('resize', () => { if (!sr) sr = raf(() => { sr = 0; paint(); }); });
  paint();

  // ---- 3D tilt on feature cards: spring return, max 6 degrees, fine pointers only ----
  const tiltEls = [...doc.querySelectorAll(TILT_SEL)];
  tiltEls.forEach(n => n.classList.add('d-tilt'));
  const fine = !!(win.matchMedia && win.matchMedia('(hover: hover) and (pointer: fine)').matches);
  let cur = null, tr = 0, tev = null;
  const release = n => { if (!n) return; n.classList.remove('is-tilting'); n.style.setProperty('--rx', '0'); n.style.setProperty('--ry', '0'); };
  if (fine) {
    doc.addEventListener('pointermove', e => {
      if (!on()) return;
      const t = e.target && e.target.closest ? e.target.closest(TILT_SEL) : null;
      if (t !== cur) { release(cur); cur = t; }
      if (!t) return;
      tev = e;
      if (!tr) tr = raf(() => {
        tr = 0; if (!cur || !tev) return;
        const r = cur.getBoundingClientRect(); if (!r.width || !r.height) return;
        const px = (tev.clientX - r.left) / r.width, py = (tev.clientY - r.top) / r.height, {rx, ry} = tiltFor(px, py);
        cur.classList.add('is-tilting');
        cur.style.setProperty('--rx', String(rx)); cur.style.setProperty('--ry', String(ry));
        cur.style.setProperty('--gx', (clamp01(px) * 100).toFixed(0) + '%'); cur.style.setProperty('--gy', (clamp01(py) * 100).toFixed(0) + '%');
      });
    }, {passive: true});
    root.addEventListener('pointerleave', () => { release(cur); cur = null; });
  }

  // ---- scroll reveals: CSS view-timeline when supported, otherwise an IntersectionObserver fallback ----
  const revEls = [...doc.querySelectorAll(REVEAL_SEL)];
  revEls.forEach(n => {
    n.classList.add('d-rev');
    const sibs = n.parentElement ? [...n.parentElement.children].filter(c => c.classList.contains('d-rev')) : [n];
    n.style.setProperty('--i', String(Math.min(5, Math.max(0, sibs.indexOf(n)))));
  });
  let revIO = null;
  const armed = new Set();
  function armReveal() {
    if (vt || !IO || !on() || revIO) return;
    revIO = new IO(es => { for (const e of es) { if (!e.isIntersecting) continue; revIO.unobserve(e.target); const t = e.target; raf(() => t.classList.add('d-in')); } }, {rootMargin: '0px 0px -8% 0px'});
    for (const n of revEls) { if (n.getBoundingClientRect().top < win.innerHeight * 0.92) continue; n.classList.add('d-arm'); armed.add(n); revIO.observe(n); }
  }
  function disarmReveal() { if (revIO) { revIO.disconnect(); revIO = null; } for (const n of armed) n.classList.remove('d-arm', 'd-in'); armed.clear(); }

  // ---- count-up for decorative numbers (final value is the markup; it is restored at once when motion stops) ----
  const counters = [...doc.querySelectorAll('[data-count]')];
  const counting = new Map();     // el -> raf id
  let countIO = null;
  const finishCount = n => { const id = counting.get(n); if (id) win.cancelAnimationFrame(id); counting.delete(n); n.textContent = n.getAttribute('data-count'); };
  function armCounts() {
    if (!IO || !on() || countIO) return;
    countIO = new IO(es => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        const n = e.target; countIO.unobserve(n);
        const to = Number(n.getAttribute('data-count')), t0 = win.performance.now(), dur = 700;
        const step = now => { const t = (now - t0) / dur; n.textContent = String(countValue(to, t)); if (t < 1) counting.set(n, raf(step)); else counting.delete(n); };
        counting.set(n, raf(step));
      }
    }, {threshold: 0.6});
    for (const n of counters) { if (n.getBoundingClientRect().top < win.innerHeight * 0.92) continue; n.textContent = '0'; countIO.observe(n); }
  }
  function disarmCounts() { if (countIO) { countIO.disconnect(); countIO = null; } for (const n of counters) finishCount(n); }

  // ---- architecture: signal pulse runs once, node to node, when the diagram is seen ----
  const flow = doc.querySelector('.arch-flow');
  if (flow) {
    [...flow.children].forEach((n, i) => n.style.setProperty('--k', String(i)));
    if (IO) { const fio = new IO(es => { if (es.some(e => e.isIntersecting)) { flow.classList.add('d-seen'); fio.disconnect(); } }, {threshold: 0.45}); fio.observe(flow); }
    else flow.classList.add('d-seen');
  }

  // ---- metrics: a changed number gives one pulse (the number itself is never animated or delayed) ----
  const metrics = doc.querySelector('.metrics');
  if (metrics && win.MutationObserver) {
    new win.MutationObserver(ms => {
      if (!on()) return;
      for (const m of ms) {
        const n = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        if (!n || !n.classList || n.tagName !== 'STRONG') continue;
        n.classList.remove('is-tick'); void n.offsetWidth; n.classList.add('is-tick');
        win.setTimeout(() => n.classList.remove('is-tick'), 650);
      }
    }).observe(metrics, {childList: true, characterData: true, subtree: true});
  }

  // ---- follow Pause motion / reduced motion ----
  function sync() {
    if (on()) { armReveal(); armCounts(); setLive(); paint(); }
    else { clearHero(); setLive(); release(cur); cur = null; tiltEls.forEach(release); disarmReveal(); disarmCounts(); }
  }
  if (win.MutationObserver) new win.MutationObserver(sync).observe(root, {attributes: true, attributeFilter: ['data-motion']});
  sync();
  return {sync, links, bar, rail};
}

if (typeof document !== 'undefined' && !globalThis.__GB_MOTION_NO_AUTO__) {
  let store = null;
  try { store = window.localStorage; } catch { store = null; }
  initMotion({storage: store});
  initDepth();
}
