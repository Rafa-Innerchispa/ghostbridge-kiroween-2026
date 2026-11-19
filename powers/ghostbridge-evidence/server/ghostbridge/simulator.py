def scenario(name):
    if name == "night":
        signals = [("door-01", "door.open", 180), ("zone-01", "presence.dwell", 360),
                   ("camera-01", "camera.offline", None), ("door-01", "door.closed", None), ("reader-01", "access.granted", None)]
    elif name == "normal":
        signals = [("door-01", "door.closed", None), ("zone-01", "presence.dwell", 30),
                   ("camera-01", "camera.online", None), ("reader-01", "access.granted", None)]
    elif name == "denied":
        signals = [("reader-01", "access.denied", None)]
    else:
        raise ValueError("Unknown scenario; choose night, normal or denied")
    return [dict(id=f"{name}-{i+1}", device=d, type=t, at=f"2026-10-30T22:{i:02}:00Z",
                 data={} if duration is None else {"duration_seconds": duration})
            for i, (d, t, duration) in enumerate(signals)]
