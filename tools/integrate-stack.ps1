<#
  Integrate the GhostBridge draft PR stack into main, in order, and wait for each deployment.
  Prepared by Kiro for the OWNER to run (the agent is not allowed to merge on its own).

  Order: #10 -> #14 -> #15 -> #16, each with a merge commit (not squash), base changed to main first.
  Every push to main runs CI and the Pages workflow, and Pages runs the test suites before it deploys.
  The script stops at the first problem, so main and the site always stay at the last good step.

  Run from the repository folder:   powershell -NoProfile -ExecutionPolicy Bypass -File tools\integrate-stack.ps1
  Undo a step if needed (on a new branch, then a PR to main):   git revert -m 1 <merge commit>
#>
$ErrorActionPreference = 'Stop'
$repo = 'Rafa-Innerchispa/ghostbridge-kiroween-2026'
$stack = 10, 14, 15, 16

function Fail($msg) { Write-Host "STOP: $msg" -ForegroundColor Red; exit 1 }
function WaitMainRun($workflow, $sha) {
  Write-Host "  waiting for $workflow on main at $($sha.Substring(0,7)) ..."
  for ($i = 0; $i -lt 90; $i++) {
    $runs = gh run list --repo $repo --workflow $workflow --branch main --limit 10 --json databaseId,headSha,status,conclusion | ConvertFrom-Json
    $run = $runs | Where-Object { $_.headSha -eq $sha } | Select-Object -First 1
    if ($run -and $run.status -eq 'completed') {
      if ($run.conclusion -ne 'success') { Fail "$workflow on main finished with '$($run.conclusion)' (run $($run.databaseId)). Nothing after this step was merged." }
      Write-Host "  $workflow OK (run $($run.databaseId))" -ForegroundColor Green; return
    }
    Start-Sleep 10
  }
  Fail "$workflow did not finish within 15 minutes"
}

# 0. Show exactly what will be merged and ask once.
Write-Host "PRs to integrate into main, in this order:" -ForegroundColor Cyan
foreach ($n in $stack) {
  $p = gh pr view $n --repo $repo --json number,title,state,headRefOid,baseRefName,mergeable | ConvertFrom-Json
  if ($p.state -eq 'MERGED') { Write-Host ("  #{0} already merged" -f $n); continue }
  if ($p.state -ne 'OPEN') { Fail "PR #$n is $($p.state)" }
  Write-Host ("  #{0} {1}  head {2}  base {3}  {4}" -f $p.number, $p.title, $p.headRefOid.Substring(0,7), $p.baseRefName, $p.mergeable)
}
$answer = Read-Host "Type YES to merge these into main and publish the site"
if ($answer -cne 'YES') { Write-Host 'Nothing changed.'; exit 0 }

foreach ($n in $stack) {
  $p = gh pr view $n --repo $repo --json state,baseRefName,isDraft,mergeable,headRefOid | ConvertFrom-Json
  if ($p.state -eq 'MERGED') { continue }
  Write-Host "PR #$n" -ForegroundColor Cyan
  if ($p.baseRefName -ne 'main') { gh pr edit $n --repo $repo --base main | Out-Null; Write-Host '  base changed to main'; Start-Sleep 5 }
  $p = gh pr view $n --repo $repo --json mergeable,isDraft | ConvertFrom-Json
  for ($i = 0; $p.mergeable -eq 'UNKNOWN' -and $i -lt 12; $i++) { Start-Sleep 5; $p = gh pr view $n --repo $repo --json mergeable,isDraft | ConvertFrom-Json }
  if ($p.mergeable -ne 'MERGEABLE') { Fail "PR #$n is not mergeable into main ($($p.mergeable))" }
  if ($p.isDraft) { gh pr ready $n --repo $repo | Out-Null; Write-Host '  marked ready for review' }
  gh pr merge $n --repo $repo --merge
  if ($LASTEXITCODE -ne 0) { Fail "merge of PR #$n failed" }
  $sha = (gh pr view $n --repo $repo --json mergeCommit | ConvertFrom-Json).mergeCommit.oid
  Write-Host "  merged as $($sha.Substring(0,7))" -ForegroundColor Green
  WaitMainRun 'ci.yml' $sha
  WaitMainRun 'pages.yml' $sha
}
Write-Host "Done. Site: https://ghostbridge.innerchispa.us/  (a hard refresh may be needed)" -ForegroundColor Green
