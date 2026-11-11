/**
 * Safety guard for unattended Kiro runs (PreToolUse hook).
 *
 * Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).
 *
 * Reads the hook JSON on stdin. If the pending tool call looks destructive or reaches outside the
 * agreed scope, it exits 2 (which blocks the call) and prints the reason on stderr. Otherwise exit 0.
 *
 * It is a seat belt, not a sandbox: a determined command can evade pattern matching.
 * Everything routine (edit files, run tests, commit, push a feature branch, open a PR) stays allowed.
 */

const RULES = [
  [/\bgit\s+push\b[^\n]*(--force\b|--force-with-lease\b|\s-f\b)/i, 'force-push is blocked'],
  [/\bgit\s+push\b[^\n]*\s(origin\s+)?(HEAD:)?(refs\/heads\/)?(main|master)\b/i, 'pushing directly to main/master is blocked; push a feature branch and open a PR'],
  [/\bgit\s+reset\s+--hard\b/i, 'git reset --hard is blocked'],
  [/\bgit\s+clean\s+-[a-z]*f/i, 'git clean -f is blocked'],
  [/\bgit\s+branch\s+-D\b/i, 'git branch -D is blocked'],
  [/\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/i, 'discarding all working-tree changes is blocked'],
  [/\bgit\s+config\b/i, 'changing git config is blocked'],
  [/--no-verify\b/i, 'skipping git hooks is blocked'],
  [/\bgh\s+pr\s+merge\b/i, 'merging PRs is reserved for the owner'],
  [/\bgh\s+(repo|release|secret|variable|workflow)\s+(delete|create|set|run|enable|disable)\b/i, 'changing repo settings/secrets/workflows is blocked'],
  [/\bgh\s+api\b[^\n]*(-X|--method)\s*(DELETE|PUT|PATCH|POST)\b/i, 'mutating GitHub API calls are blocked'],
  [/\bgh\s+issue\s+(close|delete|transfer)\b/i, 'closing/deleting issues is reserved for the owner'],
  [/\b(npm|pnpm|yarn)\s+publish\b/i, 'publishing packages is blocked'],
  [/\b(Stop-Computer|Restart-Computer|shutdown(\.exe)?|diskpart|format(\.com)?\s+[a-z]:|Clear-Disk|Remove-Partition)\b/i, 'system-level commands are blocked'],
  [/\b(iex|Invoke-Expression)\b[^\n]*(Invoke-WebRequest|iwr|curl|wget|DownloadString)/i, 'piping downloaded content into a shell is blocked'],
  [/\b(Invoke-WebRequest|iwr|curl|wget)\b[^\n]*\|\s*(iex|Invoke-Expression|sh|bash|powershell)\b/i, 'piping downloaded content into a shell is blocked'],
  [/\b(reg\s+(add|delete)|Set-ItemProperty\s+-Path\s+['"]?HK|New-Service|sc(\.exe)?\s+(create|delete)|schtasks\s+\/create|Set-ExecutionPolicy)\b/i, 'registry/service/scheduler/policy changes are blocked'],
  [/\b(taskkill\b[^\n]*\/IM|Stop-Process\b[^\n]*-Name\b)/i, 'killing processes by image name would hit unrelated apps; kill by PID or by unique command line'],
  [/\bGet-Process\b[^\n|]*\|\s*Stop-Process/i, 'killing processes by name would hit unrelated apps; kill by PID or by unique command line'],
  [/\b(netsh\s+advfirewall|New-NetFirewallRule|Set-NetFirewall|Add-MpPreference|Set-MpPreference)\b/i, 'firewall/antivirus changes are blocked'],
  [/(\.env\b|id_rsa|id_ed25519|\.pem\b|credentials\.json|\.kiro[\\/]settings[\\/]mcp\.json)[^\n]*(cat|type|Get-Content|Copy-Item|Invoke-WebRequest|curl|Out-File|>)/i, 'reading or exfiltrating secret-like files is blocked'],
];

// Recursive deletes are allowed only inside the project, the OS temp folder, or QA scratch dirs.
// PowerShell/cmd forms need -Recurse or /s; unix rm needs a short flag cluster containing r (-r, -rf, -fr).
// "-Force" also contains an r, so the short-flag form is only applied to `rm`.
const RECURSIVE_DELETE = /\b(Remove-Item|ri|del|rd|rmdir)\b[^\n]*(-Recurse|\/s\b)|\brm\s+(?:-\S+\s+)*-[a-zA-Z]*[rR]/i;
const SAFE_DELETE_SCOPE = /(ghostbridge-kiroween-2026|[\\/]Temp[\\/]|\$env:TEMP|%TEMP%|gbqa-|gbpy-|gbfont|node_modules)/i;

/** @param {string} text command / tool input text. @returns {string|null} reason to block, or null to allow. */
export function evaluate(text) {
  const s = String(text);
  for (const [re, why] of RULES) if (re.test(s)) return why;
  if (RECURSIVE_DELETE.test(s) && !SAFE_DELETE_SCOPE.test(s)) return 'recursive delete outside the project or the temp folder is blocked';
  return null;
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

// Run only when executed as a hook (not when imported by the unit test).
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('guard-destructive.mjs')) {
  const raw = await readStdin();
  let text = raw;
  try {
    const j = JSON.parse(raw);
    const input = j.tool_input ?? j.toolInput ?? j.input ?? j.arguments ?? j;
    text = typeof input === 'string' ? input : JSON.stringify(input);
    // JSON.stringify escapes backslashes and newlines; decode so patterns see the real command.
    text = text.replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\"/g, '"');
  } catch { /* not JSON: scan the raw text */ }
  const why = evaluate(text);
  if (why) {
    process.stderr.write(`GhostBridge guard blocked this action: ${why}.\nIf this is intentional, ask the owner to run it manually.\n`);
    process.exit(2);
  }
  process.exit(0);
}
