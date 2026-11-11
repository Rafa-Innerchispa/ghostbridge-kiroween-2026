/**
 * Dependency-free real-browser QA harness (Chrome DevTools Protocol over Node's built-in WebSocket).
 *
 * Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).
 *
 * Not part of CI: it needs an installed Chrome / Edge. Run the scripts in this folder by hand,
 * e.g.  node tests/browser-qa/m0-signal-forge.qa.mjs
 *
 * Serves docs/ from 127.0.0.2 (so the app runs in BROWSER-ONLY mode, not the localhost API mode),
 * and can start the real Python + SQLite server on a throwaway database for LOCAL mode.
 */
import {spawn, spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const sleep = ms => new Promise(r => setTimeout(r, ms));

const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/markdown'};

/** Static server for docs/ on 127.0.0.2 (browser-only mode). Logs every request path. */
export function serveDocs({port = 0, dir = path.join(ROOT, 'docs')} = {}) {
  const requests = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(dir, rel));
    requests.push({path: rel, status: !file.startsWith(dir) ? 403 : existsSync(file) ? 200 : 404});
    if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (!existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, {'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    res.end(readFileSync(file));
  });
  return new Promise(resolve => server.listen(port, '127.0.0.2', () => resolve({
    origin: `http://127.0.0.2:${server.address().port}/`, requests, close: () => new Promise(r => server.close(r)),
  })));
}

/** Real Python + SQLite GhostBridge server on a throwaway DB (LOCAL mode, 127.0.0.1). */
export async function startPython(port = 8799) {
  const dir = mkdtempSync(path.join(tmpdir(), 'gbpy-'));
  const proc = spawn('python', ['-m', 'ghostbridge', '--database', path.join(dir, 'qa.sqlite3'), '--port', String(port)], {cwd: ROOT, stdio: 'ignore'});
  const origin = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(origin + 'api/verify', {signal: AbortSignal.timeout(2000)})).ok) break; } catch {} await sleep(150); }
  return {origin, stop: () => { proc.kill(); try { rmSync(dir, {recursive: true, force: true}); } catch {} }};
}

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];

function killTree(proc, profile) {
  try {
    if (process.platform === 'win32') {
      if (proc && proc.exitCode === null) spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], {stdio: 'ignore'});
      // Chrome children can detach from the parent tree; every one of them carries the unique profile dir.
      if (profile) spawnSync('powershell', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${path.basename(profile)}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], {stdio: 'ignore'});
    } else if (proc) proc.kill('SIGKILL');
  } catch {}
}

export class Browser {
  static async launch() {
    const exe = process.env.CHROME_PATH || CHROME_CANDIDATES.find(existsSync);
    if (!exe) throw new Error('No Chrome/Edge found. Set CHROME_PATH.');
    const profile = mkdtempSync(path.join(tmpdir(), 'gbqa-'));
    const proc = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--force-device-scale-factor=1', '--disable-features=CalculateNativeWinOcclusion,TranslateUI', '--disable-ipc-flooding-protection', '--disable-dev-shm-usage', '--mute-audio', 'about:blank'], {stdio: 'ignore'});
    let port = null;
    for (let i = 0; i < 80 && !port; i++) {
      const f = path.join(profile, 'DevToolsActivePort');
      if (existsSync(f)) port = Number(readFileSync(f, 'utf8').split('\n')[0]);
      else await sleep(150);
    }
    if (!port) { killTree(proc); throw new Error('Chrome DevTools port not found'); }
    let target;
    for (let i = 0; i < 40 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`, {signal: AbortSignal.timeout(2000)})).json()).find(t => t.type === 'page'); } catch {} if (!target) await sleep(150); }
    if (!target) { killTree(proc); throw new Error('DevTools port: no page target'); }
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await Promise.race([new Promise(r => ws.addEventListener('open', r, {once: true})), new Promise((_, rej) => setTimeout(() => rej(new Error('DevTools port: WebSocket open timeout')), 10000))]);
    const b = new Browser(proc, ws, profile);
    await b.send('Page.enable'); await b.send('Runtime.enable'); await b.send('Network.enable'); await b.send('Performance.enable'); await b.send('Inspector.enable').catch(() => {});
    await b.send('Emulation.setFocusEmulationEnabled', {enabled: true}).catch(() => {});
    await b.send('Page.bringToFront').catch(() => {});
    return b;
  }

  constructor(proc, ws, profile) {
    this.proc = proc; this.ws = ws; this.profile = profile; this.nextId = 0; this.pending = new Map();
    this.errors = []; this.failedRequests = []; this.badResponses = []; this.viewportSize = {w: 1440, h: 900};
    ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) { const {res, rej} = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); return; }
      if (m.method === 'Runtime.exceptionThrown') this.errors.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
      else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(m.params.type)) this.errors.push('console.' + m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description).join(' '));
      else if (m.method === 'Inspector.targetCrashed') this.errors.push('RENDERER CRASHED');
      else if (m.method === 'Page.frameNavigated' && !m.params.frame.parentId) (this.navigations ||= []).push(m.params.frame.url);
      else if (m.method === 'Network.loadingFailed' && !m.params.canceled) this.failedRequests.push(m.params.errorText + ' ' + (m.params.requestId));
      else if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) this.badResponses.push(m.params.response.status + ' ' + m.params.response.url);
    });
  }

  /** CDP command with a hard timeout so a stalled renderer fails loudly instead of hanging the run. */
  send(method, params = {}, timeoutMs = 30000) {
    return new Promise((res, rej) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => { this.pending.delete(id); rej(new Error(`CDP timeout (${timeoutMs} ms): ${method}`)); }, timeoutMs);
      this.pending.set(id, {res: v => { clearTimeout(timer); res(v); }, rej: e => { clearTimeout(timer); rej(e); }});
      this.ws.send(JSON.stringify({id, method, params}));
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true});
    if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) + '\n  in: ' + expr.slice(0, 160));
    return r.result.value;
  }
  async waitFor(expr, label, ms = 12000) {
    const t = Date.now();
    while (Date.now() - t < ms) { try { if (await this.eval(expr)) return true; } catch {} await sleep(100); }
    throw new Error('timeout waiting for: ' + label);
  }
  async viewport(w, h, mobile = false) { this.viewportSize = {w, h}; await this.send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile}); }
  async reducedMotion(on) { await this.send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: on ? 'reduce' : 'no-preference'}]}); }
  async goto(url, readyExpr = "document.readyState==='complete'") {
    const t0 = Date.now();
    await this.send('Page.navigate', {url});
    await this.waitFor(readyExpr, 'page ready ' + url, 15000);
    this.lastLoadMs = Date.now() - t0;
    await sleep(500);
  }
  click(sel) { return this.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw new Error('no element '+${JSON.stringify(sel)});e.click();return true})()`); }
  text(sel) { return this.eval(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? null`); }
  prop(sel, p) { return this.eval(`document.querySelector(${JSON.stringify(sel)})?.${p} ?? null`); }
  attr(sel, a) { return this.eval(`document.querySelector(${JSON.stringify(sel)})?.getAttribute(${JSON.stringify(a)}) ?? null`); }
  count(sel) { return this.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`); }
  setRange(sel, value) { return this.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.value=${JSON.stringify(String(value))};e.dispatchEvent(new Event('input',{bubbles:true}));return e.value})()`); }
  async key(key, code, vk, text) {
    await this.send('Input.dispatchKeyEvent', {type: 'keyDown', key, code, windowsVirtualKeyCode: vk, ...(text ? {text} : {})});
    await this.send('Input.dispatchKeyEvent', {type: 'keyUp', key, code, windowsVirtualKeyCode: vk});
  }
  overflow() {
    return this.eval(`(()=>{const w=document.documentElement.clientWidth,bad=[];document.querySelectorAll('body *').forEach(e=>{const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return;const r=e.getBoundingClientRect();if(r.width>0&&r.height>0&&(r.right>w+1||r.left<-1)){let p=e.parentElement,clipped=false;while(p&&p!==document.body){const o=getComputedStyle(p);if(['hidden','auto','scroll','clip'].includes(o.overflowX)){const pr=p.getBoundingClientRect();if(pr.right<=w+1&&pr.left>=-1){clipped=true;break}}p=p.parentElement}if(!clipped)bad.push(e.tagName.toLowerCase()+'.'+String(e.className?.baseVal??e.className).slice(0,40)+' right='+Math.round(r.right))}});return {scrollW:document.documentElement.scrollWidth,clientW:w,bad:bad.slice(0,8)}})()`);
  }
  async metrics() {
    const m = await this.send('Performance.getMetrics');
    const o = Object.fromEntries(m.metrics.map(x => [x.name, x.value]));
    return {jsHeapMB: +(o.JSHeapUsedSize / 1048576).toFixed(1), domNodes: o.Nodes, layoutCount: o.LayoutCount, recalcStyleCount: o.RecalcStyleCount, scriptSec: +o.ScriptDuration.toFixed(3), taskSec: +o.TaskDuration.toFixed(3)};
  }
  /** Screenshot of the viewport, or of one element (full height) when `selector` is given. */
  async shot(file, selector, settleMs = 1500) {
    await sleep(settleMs);
    mkdirSync(path.dirname(file), {recursive: true});
    let params = {format: 'png'};
    if (selector) {
      const r = await this.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error('no element');e.scrollIntoView({block:'start'});const b=e.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height}})()`);
      params = {format: 'png', clip: {...r, scale: 1}, captureBeyondViewport: true};
    }
    const {data} = await this.send('Page.captureScreenshot', params);
    writeFileSync(file, Buffer.from(data, 'base64'));
    return file;
  }
  drainErrors() { const e = [...this.errors]; this.errors = []; return e; }
  /** Kill the WHOLE Chrome process tree (renderer, GPU and utility children), not just the parent. */
  async close() {
    try { this.ws.close(); } catch {}
    killTree(this.proc);
    await sleep(500);
    try { rmSync(this.profile, {recursive: true, force: true}); } catch {}
  }
}

const INFRA = /CDP timeout|navigated or closed|timeout waiting for|DevTools port|RENDERER CRASHED|WebSocket|eval failed: .*(context|Cannot find context)/i;

/**
 * Run one independent QA scenario on a FRESH browser. Assertion failures (check(..., false)) are
 * kept and never retried. Only infrastructure errors (stalled renderer, lost target, timeouts) are
 * retried, and the checks from the failed attempt are discarded. Retries are counted for the report.
 */
export async function withBrowser(rec, name, fn, {retries = 2} = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const mark = rec.results.length;
    let b;
    try { b = await Browser.launch(); await fn(b); await b.close(); rec.scenarios.push({name, ok: true, attempts: attempt + 1}); return; }
    catch (err) {
      const msg = String(err.stack || err.message || err);
      if (b) await b.close();
      rec.results.length = mark;
      if (INFRA.test(msg) && attempt < retries) { rec.retries.push(`${name}: attempt ${attempt + 1} lost to infrastructure (${msg.split('\n')[0].slice(0, 90)})`); console.log(`  retrying scenario ${name} (${rec.retries.at(-1)})`); continue; }
      rec.check(`${name} completed without a driver error`, false, msg.split('\n').slice(0, 3).join(' | '));
      return;
    }
  }
}

/** Minimal check recorder + report writer. */
export function recorder(title) {
  const results = [], retries = [], scenarios = [];
  const check = (name, ok, detail = '') => { results.push({name, ok: !!ok, detail: String(detail)}); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail && !ok ? '  -> ' + detail : '')); return !!ok; };
  const summary = () => {
    const pass = results.filter(r => r.ok).length, fail = results.length - pass;
    console.log(`\n${title}: ${pass} passed, ${fail} failed, ${results.length} total`);
    return {pass, fail, total: results.length, results};
  };
  return {check, results, retries, scenarios, summary: () => ({...summary(), retries, scenarios})};
}

export function writeReport(file, title, summary, extra = '') {
  const retryNote = summary.retries?.length ? `**Harness retries (infrastructure only, assertions are never retried):** ${summary.retries.length}\n${summary.retries.map(r => '- ' + r).join('\n')}` : '**Harness retries:** 0';
  const scen = summary.scenarios?.length ? '**Scenarios:** ' + summary.scenarios.map(s => `  (attempts: )`).join('; ') : '';
  const lines = [`# ${title}`, '', `**${summary.pass} passed, ${summary.fail} failed, ${summary.total} checks.**`, '', retryNote, '', scen, '', extra, '', '| Result | Check | Detail |', '|---|---|---|'];
  for (const r of summary.results) lines.push(`| ${r.ok ? 'PASS' : '**FAIL**'} | ${r.name.replace(/\|/g, '\\|')} | ${r.detail.replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 160)} |`);
  mkdirSync(path.dirname(file), {recursive: true});
  writeFileSync(file, lines.join('\n') + '\n');
}
