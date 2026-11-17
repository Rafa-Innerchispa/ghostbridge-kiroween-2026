Set-Location (Resolve-Path "$PSScriptRoot\..\..\..\..")
$L = "docs/evidence/phase6/audit-logs"
& node "$L/contrast.mjs" > "$L/contrast.txt" 2>&1
& node --check tests/browser-qa/phase6-audit.qa.mjs > "$L/check.txt" 2>&1
"audit check $LASTEXITCODE" | Add-Content "$L/check.txt"
& node --check tests/browser-qa/m0-a4-repro.qa.mjs >> "$L/check.txt" 2>&1
"repro check $LASTEXITCODE" | Add-Content "$L/check.txt"
foreach ($n in 'phase6-audit') {
  $t = Get-Date
  & node "tests/browser-qa/$n.qa.mjs" > "$L/$n.log" 2>&1
  "$n exit $LASTEXITCODE secs $([int]((Get-Date) - $t).TotalSeconds)" | Add-Content "$L/_audit.txt"
}
$t = Get-Date
& node tests/browser-qa/m0-a4-repro.qa.mjs 10 > "$L/m0-a4-repro.log" 2>&1
"m0-a4-repro exit $LASTEXITCODE secs $([int]((Get-Date) - $t).TotalSeconds)" | Add-Content "$L/_audit.txt"
git status --short > "$L/_post-status.txt"
"DONE" | Add-Content "$L/_audit.txt"
