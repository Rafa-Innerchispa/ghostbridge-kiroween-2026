# Authentic Kiro implementation tasks

**This checklist is NOT yet executed.** Created in advance to reduce Kiro credit usage. Tick items only after completing the corresponding real Kiro action.

- [ ] 1. Open the existing public GhostBridge repository in Kiro IDE or CLI (owner's approved Google Kiro account). Read `AGENTS.md`, `KIRO.md`, original `.kiro/specs/ghostbridge-mvp/`, and this spec.
- [ ] 2. Have Kiro inspect the relevant frontend and test files and confirm any design adjustments before coding.
- [ ] 3. Implement non-mutating severity filter with **All**, **High**, **Medium**. Default All, reset to All, accessible control state, responsive styles.
- [ ] 4. Unit-test filtering with mixed incident severities, no matches and no incidents, switching filters, unchanged ledger, and unchanged verification/export output.
- [ ] 5. Run Python tests, Node tests, JS syntax check. Fix real failures, no fake PASS claims.
- [ ] 6. Run browser lab with Night Watch, Normal Shift, Access Denied on desktop/mobile; verify expected visible card counts (3/2/1 etc.).
- [ ] 7. Record actual Kiro contributions in `docs/KIRO_EVIDENCE.md`: product (IDE/CLI), prompt, user-approved account type (not user ID/token), session date/reference, exact file diff summary, test results, and commit. Label original Codex work honestly.
- [ ] 8. Push the Kiro-authored branch, open PR with evidence, ensure CI passes, then merge after review.
- [ ] 9. Verify GitHub Pages anonymous deploy and update Devpost write-up to describe **actual** Kiro use.

**Safety**: no production connections, InnerOS orchestration, agents external to Kiro, subscriptions, paid inference, or live devices. Do not auto-submit Devpost.