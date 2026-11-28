"""Home lab configuration. Config, CSV exports and the SQLite ledger must live OUTSIDE the repository."""
import json
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PRIVATE_DIR = Path(os.environ.get("GHOSTBRIDGE_PRIVATE_DIR", Path.home() / "GhostBridge-privado"))
DEFAULT_CONFIG = DEFAULT_PRIVATE_DIR / "homelab.json"
# Entity domains that identify people or places. They are never imported.
EXCLUDED_PREFIXES = ("person.", "device_tracker.", "zone.")
KINDS = {"contact", "motion"}


class PrivacyError(Exception):
    pass


def assert_private(path):
    """Refuse any path inside the git repository, so real data cannot be committed by accident."""
    resolved = Path(path).resolve()
    if resolved == REPO_ROOT or REPO_ROOT in resolved.parents:
        raise PrivacyError(f"{resolved} is inside the repository. Keep home lab data outside it.")
    return resolved


def load_config(path=None):
    path = assert_private(path or os.environ.get("GHOSTBRIDGE_HOME_CONFIG") or DEFAULT_CONFIG)
    cfg = json.loads(path.read_text(encoding="utf-8-sig"))
    return validate_config(cfg, path)


def validate_config(cfg, path=None):
    if not isinstance(cfg.get("zones"), dict) or not cfg["zones"]:
        raise ValueError("config.zones must be a non-empty object")
    ids = set()
    for entity, zone in cfg["zones"].items():
        if entity.startswith(EXCLUDED_PREFIXES):
            raise ValueError(f"{entity}: person/location entities are never imported")
        if zone.get("kind") not in KINDS:
            raise ValueError(f"{entity}: kind must be one of {sorted(KINDS)}")
        zid = zone.get("id")
        if not isinstance(zid, str) or not zid or zid in ids:
            raise ValueError(f"{entity}: id must be a unique non-empty string")
        ids.add(zid)
        for window in zone.get("expected_open", []):
            if not (isinstance(window, list) and len(window) == 2):
                raise ValueError(f"{entity}: expected_open entries are [\"HH:MM\", \"HH:MM\"]")
    cfg.setdefault("allowed_lights", [])
    cfg.setdefault("alert_light", None)
    cfg.setdefault("alarm_entity", None)
    if any(not str(e).startswith("light.") for e in cfg["allowed_lights"]):
        raise ValueError("allowed_lights may only contain light.* entities")
    if cfg["alert_light"] and cfg["alert_light"] not in cfg["allowed_lights"]:
        raise ValueError("alert_light must also be listed in allowed_lights")
    if cfg["alarm_entity"] and not str(cfg["alarm_entity"]).startswith("alarm_control_panel."):
        raise ValueError("alarm_entity must be an alarm_control_panel.* entity (read only)")
    cfg.setdefault("timezone_offset_hours", 0)
    cfg.setdefault("sensor_faults", [])
    base = Path(path).parent if path else DEFAULT_PRIVATE_DIR
    cfg["db"] = str(assert_private(cfg.get("db") or base / "homelab.sqlite3"))
    return cfg
