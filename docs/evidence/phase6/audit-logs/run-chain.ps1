Set-Location (Resolve-Path "$PSScriptRoot\..\..\..\..")
$L = "docs/evidence/phase6/audit-logs"
function Run($n, $log) {
  $t = Get-Date
  & node "tests/browser-qa/$n.qa.mjs" > "$L/$log.log" 2>&1
  $code = $LASTEXITCODE
  "$log exit $code secs $([int]((Get-Date) - $t).TotalSeconds)" | Add-Content "$L/_chain.txt"
}
foreach ($i in 1..5) { Run 'm0-signal-forge' "m0-run$i" }
foreach ($n in 'phase6-experience','a11y-targets-after','skip-link-audit','forge-focus-audit','m5-control-room') { Run $n $n }
"DONE" | Add-Content "$L/_chain.txt"
