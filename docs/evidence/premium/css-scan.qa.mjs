import fs from 'node:fs';
const css = fs.readFileSync(process.argv[2], 'utf8');
const lines = css.split('\n');
const re = /([^{}]+)\{([^{}]*)\}/g;
const out = [];
lines.forEach((l, i) => {
  let m; re.lastIndex = 0;
  while ((m = re.exec(l))) {
    const sel = m[1].trim().slice(0, 90), b = m[2];
    const fs_ = b.match(/font(?:-size)?:[^;]*?\b(\d+(?:\.\d+)?)px/);
    if (fs_ && +fs_[1] < 12) out.push(`SMALLFONT ${i + 1} ${sel} ${fs_[1]}px`);
    const h = b.match(/(?:^|;)\s*(?:min-)?height:\s*(\d+)px/);
    if (h && +h[1] < 40 && /button|input|select|a\b|nav|chip|filter|play|slider|pill|launch|marker/.test(sel)) out.push(`SHORT ${i + 1} ${sel} ${h[0].trim()}`);
    if (/--crit|f08a8d|7a3a3d|e5484d/.test(b)) out.push(`RED ${i + 1} ${sel}`);
    if (/--warn|3a2610|33200a|f0d9ac|b78355|2a1a08|302219/.test(b)) out.push(`AMBER ${i + 1} ${sel}`);
    if (/gradient|infinite|box-shadow:[^;]*\d+px/.test(b)) out.push(`FX ${i + 1} ${sel} :: ${(b.match(/gradient[^;]*|infinite|box-shadow:[^;]*/) || [''])[0].slice(0, 80)}`);
  }
});
console.log(out.join('\n'));

