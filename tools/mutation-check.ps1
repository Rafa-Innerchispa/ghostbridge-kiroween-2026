# Deliberate-mutation check for the Phase 6 pure models (Kiro main session). Each mutation must make the tests fail.
Set-Location (Join-Path $PSScriptRoot '..')
$out = "docs\evidence\phase6\mutation-check.log"; Remove-Item $out -ErrorAction SilentlyContinue
$muts = @(
  @('docs\time_machine.mjs', 'const heldAt = door.sec + DOOR_HELD_THRESHOLD;', 'const heldAt = door.sec + DOOR_HELD_THRESHOLD - 1;'),
  @('docs\time_machine.mjs', 'holdPass = hold >= DOOR_HELD_THRESHOLD', 'holdPass = hold > DOOR_HELD_THRESHOLD'),
  @('docs\time_machine.mjs', 'windowPass = gap <= WINDOW_SECONDS', 'windowPass = gap < WINDOW_SECONDS'),
  @('docs\time_machine.mjs', 'caseId: good?.id ?? null', 'caseId: null'),
  @('docs\trust_lab.mjs', "else if (recomputed === null || r.hash !== recomputed)", "else if (recomputed === null)"),
  @('docs\trust_lab.mjs', "if (failedAt !== null) { out.push", "if (false) { out.push"),
  @('docs\trust_lab.mjs', "const copy = structuredClone(rows);", "const copy = rows;"),
  @('docs\trust_lab.mjs', "else if (r.previous !== previous)", "else if (false)")
)
foreach ($m in $muts) {
  $f = $m[0]; $orig = Get-Content $f -Raw
  if (-not $orig.Contains($m[1])) { "SKIP (pattern missing) $f :: $($m[1])" | Add-Content $out; continue }
  Set-Content $f ($orig.Replace($m[1], $m[2])) -NoNewline
  $o = node --test --test-reporter=tap tests/time_machine.test.mjs tests/trust_lab.test.mjs 2>&1 | Out-String
  $fail = [regex]::Match($o, '(?m)^# fail (\d+)').Groups[1].Value
  Set-Content $f $orig -NoNewline
  "$(if ([int]$fail -gt 0) {'KILLED  '} else {'SURVIVED'}) fail=$fail $f :: $($m[1])" | Add-Content $out
}
git diff --stat docs\time_machine.mjs docs\trust_lab.mjs | Add-Content $out
"DONE" | Add-Content $out

