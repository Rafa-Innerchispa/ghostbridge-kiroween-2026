# GhostBridge contributor instructions

Independent Kiroween 2026 project. Use synthetic data only. Never connect company internal systems,
production servers, customer devices or credentials. No external inference required.
Run `python -m unittest discover -s tests -v` and `node --test tests/browser.test.mjs`.
Keep Python and browser event contracts/rules aligned. Label browser simulation
honestly; do not claim hardware integrations or Kiro-generated work without evidence.
Bind the Python API to loopback. Publish only docs/ through GitHub Pages.
Home lab mode (owner-authorized 2026-11-25): ghostbridge/homelab may read the owner's own Home Assistant history
and states, locally. Real data, config, tokens and the ledger stay outside the repo (tests enforce it). The only
HA write is persistent_notification.create with explicit confirmation; alarm, lock and control services are refused in code.
No background jobs. Public docs/ stay synthetic.

