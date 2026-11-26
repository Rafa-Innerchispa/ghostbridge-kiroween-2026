"""Controlled Home Assistant client.

Reads states and history. The only write is persistent_notification.create (a message in the HA sidebar), which needs
explicit confirmation. Every other service, including alarm, lock, cover, switch and light, is refused in code.
The URL and token come from environment variables and are never printed or stored.
"""
import ipaddress
import json
import os
import urllib.error
import urllib.parse
import urllib.request

from .config import EXCLUDED_PREFIXES

READ_EXACT = {"/api/", "/api/states"}
READ_PREFIXES = ("/api/states/", "/api/history/period/")
WRITE_ALLOWED = {"/api/services/persistent_notification/create"}


class SafetyError(Exception):
    pass


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # a redirect would resend the token to another host


def _check_host(url, allow_remote):
    parts = urllib.parse.urlparse(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise SafetyError("GHOSTBRIDGE_HA_URL must be http(s)://host[:port]")
    host = parts.hostname
    if host == "localhost" or host.endswith(".local"):
        return
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        address = None
    if address and (address.is_private or address.is_loopback):
        return
    if not allow_remote:
        raise SafetyError("Refusing a non-local Home Assistant host. Set GHOSTBRIDGE_HA_ALLOW_REMOTE=1 to allow it.")


class HAClient:
    def __init__(self, url=None, token=None, timeout=10, allow_remote=None):
        url = url or os.environ.get("GHOSTBRIDGE_HA_URL", "")
        token = token or os.environ.get("GHOSTBRIDGE_HA_TOKEN", "")
        if not url or not token:
            raise SafetyError("Set GHOSTBRIDGE_HA_URL and GHOSTBRIDGE_HA_TOKEN in the environment.")
        if allow_remote is None:
            allow_remote = os.environ.get("GHOSTBRIDGE_HA_ALLOW_REMOTE") == "1"
        _check_host(url, allow_remote)
        self._base = url.rstrip("/")
        self._token = token
        self._timeout = timeout
        self._opener = urllib.request.build_opener(_NoRedirect)

    def __repr__(self):
        return f"HAClient({self._base}, token=***)"

    def _request(self, method, path, body=None):
        route = urllib.parse.urlparse(path).path
        if method == "GET":
            if route not in READ_EXACT and not route.startswith(READ_PREFIXES):
                raise SafetyError(f"GET {route} is not on the read allowlist")
        elif method == "POST":
            if route not in WRITE_ALLOWED:
                raise SafetyError(f"POST {route} is not on the write allowlist")
        else:
            raise SafetyError(f"{method} is not allowed")
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(self._base + path, data=data, method=method, headers={
            "Authorization": f"Bearer {self._token}", "Content-Type": "application/json"})
        try:
            with self._opener.open(request, timeout=self._timeout) as response:
                return json.loads(response.read().decode() or "null")
        except urllib.error.HTTPError as exc:
            raise SafetyError(f"Home Assistant answered HTTP {exc.code} for {route}") from None
        except (urllib.error.URLError, TimeoutError) as exc:
            raise SafetyError(f"Cannot reach Home Assistant: {getattr(exc, 'reason', exc)}") from None

    # Task 1: connection check (read only)
    def ping(self):
        return self._request("GET", "/api/")

    # Task 2: current state of the configured zones (read only)
    def snapshot(self, entities):
        wanted = {e for e in entities if not e.startswith(EXCLUDED_PREFIXES)}
        states = self._request("GET", "/api/states") or []
        return [{"entity_id": s["entity_id"], "state": s["state"], "last_changed": s["last_changed"]}
                for s in states if s.get("entity_id") in wanted]

    # Task 3: history of the configured zones, shaped like the CSV the importer reads (read only)
    def history(self, entities, start_iso, end_iso=None):
        wanted = [e for e in entities if not e.startswith(EXCLUDED_PREFIXES)]
        query = {"filter_entity_id": ",".join(wanted), "minimal_response": "1", "no_attributes": "1"}
        if end_iso:
            query["end_time"] = end_iso
        path = "/api/history/period/" + urllib.parse.quote(start_iso) + "?" + urllib.parse.urlencode(query)
        rows = []
        for series in self._request("GET", path) or []:
            entity = series[0].get("entity_id") if series else None
            for item in series:
                rows.append({"entity_id": item.get("entity_id", entity), "state": item["state"],
                             "last_changed": item["last_changed"]})
        return rows

    # Task 4: a visible message in the HA sidebar. The only write, and it needs confirm=True.
    def notify(self, title, message, confirm=False):
        body = {"title": title[:80], "message": message[:500], "notification_id": "ghostbridge"}
        if not confirm:
            return {"dry_run": True, "would_post": "/api/services/persistent_notification/create", "body": body}
        self._request("POST", "/api/services/persistent_notification/create", body)
        return {"dry_run": False, "sent": True}
