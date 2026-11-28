# GhostBridge Home Lab — Home Assistant Security & Read-Only Policy

## 1. Principles of Least Privilege

GhostBridge Home Lab is engineered around a zero-trust model towards Home Assistant write capabilities:

1. **Strictly Read-Only Access:** The daemon observes and correlates telemetry; it never mutates security state.
2. **Blocked Domains:** The client code explicitly intercepts and blocks requests to critical home automation components before any HTTP call leaves the socket.
3. **Data Isolation:** No credentials, long-lived access tokens, internal IP mappings, or private database paths may reside in the git repository.
4. **Boundary Separation:** The public GhostBridge demonstration site hosted on GitHub Pages uses purely synthetic scenarios and has no direct network route to the home lab.

---

## 2. Capability Matrix

| Operation Category | Specific Routes / Services | Status | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **API Health Check** | `GET /api/` | **Allowed** | `HAClient.ping()` allowlist |
| **Zone State Snapshot** | `GET /api/states/<entity_id>` | **Allowed** | Only for configured sensor zones in `homelab.json` |
| **History Period Telemetry** | `GET /api/history/period/<timestamp>` | **Allowed** | Scoped to sensor entities |
| **Alarm Arming / Disarming** | `alarm_control_panel.alarm_arm_*`, `alarm_disarm` | **BLOCKED** | Refused by `HAClient` client validation |
| **Smart Lock Control** | `lock.lock`, `lock.unlock`, `lock.open` | **BLOCKED** | Excluded domain, rejected before dispatch |
| **Cover / Garage Doors** | `cover.open_cover`, `cover.close_cover` | **BLOCKED** | Excluded domain, rejected before dispatch |
| **Generic Switches / Outlets** | `switch.turn_on`, `switch.turn_off` | **BLOCKED** | Excluded domain, rejected before dispatch |
| **Shell Commands / Scripts** | `shell_command.*`, `script.*` | **BLOCKED** | Excluded domain, rejected before dispatch |
| **Proactive Notification** | `persistent_notification.create` | **Controlled** | Dry-run by default; requires explicit `--confirm` flag |
| **Visual Alert Light** | `light.turn_on`, `light.turn_off` | **Controlled** | Only entities explicitly listed in `allowed_lights` |

---

## 3. Privacy & Excluded Entity Prefixes

To prevent unintentional harvesting of personal habits or geo-location telemetry, the following entity domains are hard-coded as non-importable:

- `person.*`
- `device_tracker.*`
- `zone.*`

Any attempt to import or reference entities with these prefixes immediately raises a `PrivacyError`.
