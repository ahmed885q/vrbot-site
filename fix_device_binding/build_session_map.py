#!/usr/bin/env python3
"""Install session_map.py into phase24_modules"""
import os
DIR = "/root/vrbot-agent/orchestrator/phase24_modules"
os.makedirs(DIR, exist_ok=True)

def w(name, content):
    path = os.path.join(DIR, name)
    with open(path, "w") as f:
        f.write(content)
    lines = content.count("\n") + (0 if content.endswith("\n") else 1)
    print(f"  [OK] {name}: {lines} lines")

w("session_map.py", r'''"""Session Map — binds farm_id to device_id for consistent stream + control + ADB"""
import time, hashlib
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

# Hardcoded device map: farm_id -> ADB device_id and stream port
# 19 redroid containers running on 88.99.64.19
DEVICE_TABLE = {}
for _i in range(1, 20):
    _fid = f"farm{_i:03d}"
    DEVICE_TABLE[_fid] = {
        "device_id": f"localhost:555{_i + 54}",  # 5555..5573
        "stream_port": 8080 + _i,                 # 8081..8099
        "stream_url": f"http://88.99.64.19:{8080 + _i}/mjpeg",
        "adb_host": f"localhost:555{_i + 54}",
    }

@dataclass
class BoundSession:
    session_id: str
    farm_id: str
    device_id: str
    stream_port: int
    stream_url: str
    user: str = "operator"
    started: float = field(default_factory=time.time)
    active: bool = True
    last_command: Optional[float] = None
    command_count: int = 0
    def to_dict(self):
        return {
            "session_id": self.session_id,
            "farm_id": self.farm_id,
            "device_id": self.device_id,
            "stream_port": self.stream_port,
            "stream_url": self.stream_url,
            "user": self.user,
            "active": self.active,
            "command_count": self.command_count,
            "duration_sec": round(time.time() - self.started, 1),
        }

class SessionMap:
    """
    Single source of truth for farm -> device binding.
    Every subsystem (stream, control, ADB) must use this map.
    No dynamic device resolution — binding is fixed at session start.
    """
    def __init__(self):
        self._sessions: Dict[str, BoundSession] = {}       # session_id -> session
        self._farm_to_session: Dict[str, str] = {}          # farm_id -> session_id
        self._device_to_farm: Dict[str, str] = {}           # device_id -> farm_id
        self._event_log: List[Dict] = []

    # === Core binding API ===

    def bind(self, farm_id, user="operator"):
        """Bind a farm to its device. Returns session with all connection info."""
        if farm_id not in DEVICE_TABLE:
            return {"bound": False, "reason": f"unknown farm: {farm_id}",
                    "available": sorted(DEVICE_TABLE.keys())}

        # Already bound?
        if farm_id in self._farm_to_session:
            existing_sid = self._farm_to_session[farm_id]
            existing = self._sessions.get(existing_sid)
            if existing and existing.active:
                return {"bound": True, "existing": True, "session": existing.to_dict()}

        device = DEVICE_TABLE[farm_id]
        sid = hashlib.md5(f"bind:{farm_id}:{time.time()}".encode()).hexdigest()[:12]

        session = BoundSession(
            session_id=sid,
            farm_id=farm_id,
            device_id=device["device_id"],
            stream_port=device["stream_port"],
            stream_url=device["stream_url"],
            user=user,
        )
        self._sessions[sid] = session
        self._farm_to_session[farm_id] = sid
        self._device_to_farm[device["device_id"]] = farm_id
        self._log("bind", farm_id, device["device_id"], user)

        return {"bound": True, "existing": False, "session": session.to_dict()}

    def unbind(self, farm_id):
        """Clear session for a farm. Must be called on stream stop."""
        sid = self._farm_to_session.pop(farm_id, None)
        if not sid:
            return {"unbound": False, "reason": "not_bound"}

        session = self._sessions.get(sid)
        if session:
            session.active = False
            self._device_to_farm.pop(session.device_id, None)
            self._log("unbind", farm_id, session.device_id, session.user)
            return {"unbound": True, "session": session.to_dict()}
        return {"unbound": True, "session_id": sid}

    # === Lookup API — used by all subsystems ===

    def get_device(self, farm_id):
        """Get bound device_id for a farm. All ADB commands must use this."""
        sid = self._farm_to_session.get(farm_id)
        if sid:
            session = self._sessions.get(sid)
            if session and session.active:
                return {"found": True, "device_id": session.device_id,
                        "stream_url": session.stream_url, "session_id": sid}
        # Fallback to static table (no active session)
        if farm_id in DEVICE_TABLE:
            d = DEVICE_TABLE[farm_id]
            return {"found": True, "device_id": d["device_id"],
                    "stream_url": d["stream_url"], "session_id": None,
                    "note": "no_active_session"}
        return {"found": False, "farm_id": farm_id}

    def get_stream_url(self, farm_id):
        """Get MJPEG stream URL for a farm."""
        info = self.get_device(farm_id)
        if info.get("found"):
            return {"stream_url": info["stream_url"], "farm_id": farm_id}
        return {"stream_url": None, "farm_id": farm_id}

    def get_adb_target(self, farm_id):
        """Get ADB connection string for a farm. Use for all adb -s commands."""
        info = self.get_device(farm_id)
        if info.get("found"):
            return {"adb_target": info["device_id"], "farm_id": farm_id}
        return {"adb_target": None, "farm_id": farm_id}

    def record_command(self, farm_id):
        """Record that a command was sent to this farm's device."""
        sid = self._farm_to_session.get(farm_id)
        if sid:
            session = self._sessions.get(sid)
            if session:
                session.command_count += 1
                session.last_command = time.time()
                return {"recorded": True, "count": session.command_count}
        return {"recorded": False, "reason": "not_bound"}

    # === Bulk operations ===

    def get_all_bindings(self):
        """Get all active farm->device bindings."""
        bindings = {}
        for farm_id, sid in self._farm_to_session.items():
            session = self._sessions.get(sid)
            if session and session.active:
                bindings[farm_id] = {
                    "device_id": session.device_id,
                    "stream_url": session.stream_url,
                    "user": session.user,
                    "commands": session.command_count,
                }
        return bindings

    def get_device_table(self):
        """Get full static device table (all 19 farms)."""
        return dict(DEVICE_TABLE)

    def get_unbound_farms(self):
        """Get farms without active sessions."""
        bound = set(self._farm_to_session.keys())
        return [fid for fid in sorted(DEVICE_TABLE.keys()) if fid not in bound]

    def unbind_all(self):
        """Clear all sessions (emergency reset)."""
        count = 0
        for farm_id in list(self._farm_to_session.keys()):
            self.unbind(farm_id)
            count += 1
        return {"unbound_all": True, "cleared": count}

    # === Logging & stats ===

    def _log(self, action, farm_id, device_id, user=""):
        self._event_log.append({
            "action": action, "farm_id": farm_id,
            "device_id": device_id, "user": user,
            "timestamp": time.time(),
        })
        if len(self._event_log) > 5000:
            self._event_log = self._event_log[-5000:]

    def get_log(self, limit=50):
        return self._event_log[-limit:]

    def get_stats(self):
        active = sum(1 for s in self._sessions.values() if s.active)
        total_cmds = sum(s.command_count for s in self._sessions.values())
        return {
            "total_farms": len(DEVICE_TABLE),
            "active_sessions": active,
            "total_sessions_ever": len(self._sessions),
            "bound_farms": len(self._farm_to_session),
            "unbound_farms": len(DEVICE_TABLE) - len(self._farm_to_session),
            "total_commands": total_cmds,
            "log_entries": len(self._event_log),
        }

session_map = SessionMap()
''')

print(f"\nSession map module installed in {DIR}")
