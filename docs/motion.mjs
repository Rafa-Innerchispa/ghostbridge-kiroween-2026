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

if (typeof document !== 'undefined' && !globalThis.__GB_MOTION_NO_AUTO__) {
  let store = null;
  try { store = window.localStorage; } catch { store = null; }
  initMotion({storage: store});
}
