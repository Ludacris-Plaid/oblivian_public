"""
Exfiltration Engine — data staging, compression, encryption, transfer scheduling.
"""
import time
import hashlib


class ExfilEngine:
    def __init__(self):
        self.active = False
        self.stats = {
            "total_bytes_staged": 0,
            "total_bytes_exfiltrated": 0,
            "active_transfers": 0,
            "completed_transfers": 0,
            "failed_transfers": 0,
            "compression_ratio": 0.0,
            "transfer_rate_mbps": 0.0,
            "nodes_exfiltrating": 0,
        }
        self.transfers = []  # [{id, node_id, size, progress, status, channel, started}]
        self.staged_data = []  # [{node_id, type, size, timestamp}]
        self.channels = {
            "dns": {"enabled": True, "speed_mbps": 0.5, "stealth": "high"},
            "http": {"enabled": True, "speed_mbps": 5.0, "stealth": "medium"},
            "websocket": {"enabled": True, "speed_mbps": 20.0, "stealth": "low"},
            "icmp": {"enabled": False, "speed_mbps": 0.1, "stealth": "very_high"},
        }
        self._transfer_id = 0

    def get_status(self) -> dict:
        return {
            "active": self.active,
            "stats": self.stats,
            "channels": self.channels,
            "active_transfers": [t for t in self.transfers if t["status"] == "in_progress"][-20:],
            "staged_data": self.staged_data[-20:],
        }

    def stage_data(self, node_id: str, data_type: str, size_bytes: int):
        self.staged_data.append({
            "node_id": node_id,
            "type": data_type,
            "size_mb": round(size_bytes / 1048576, 2),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })
        self.stats["total_bytes_staged"] += size_bytes

    def start_transfer(self, node_id: str, size_bytes: int, channel: str = "http") -> str:
        self._transfer_id += 1
        tid = f"xfer-{self._transfer_id}"
        self.transfers.append({
            "id": tid,
            "node_id": node_id,
            "size_mb": round(size_bytes / 1048576, 2),
            "progress_pct": 0,
            "status": "in_progress",
            "channel": channel,
            "started": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "checksum": hashlib.sha256(str(size_bytes).encode()).hexdigest()[:12],
        })
        self.stats["active_transfers"] += 1
        self.stats["nodes_exfiltrating"] = len(set(t["node_id"] for t in self.transfers if t["status"] == "in_progress"))
        return tid

    def update_transfer(self, transfer_id: str, progress_pct: float):
        for t in self.transfers:
            if t["id"] == transfer_id:
                t["progress_pct"] = round(progress_pct, 1)
                if progress_pct >= 100:
                    t["status"] = "completed"
                    self.stats["completed_transfers"] += 1
                    self.stats["active_transfers"] = max(0, self.stats["active_transfers"] - 1)
                    self.stats["total_bytes_exfiltrated"] += t["size_mb"] * 1048576
                break

    def fail_transfer(self, transfer_id: str):
        for t in self.transfers:
            if t["id"] == transfer_id:
                t["status"] = "failed"
                self.stats["failed_transfers"] += 1
                self.stats["active_transfers"] = max(0, self.stats["active_transfers"] - 1)
                break

    def tick(self):
        if not self.active:
            return
        active = [t for t in self.transfers if t["status"] == "in_progress"]
        self.stats["active_transfers"] = len(active)
        self.stats["nodes_exfiltrating"] = len(set(t["node_id"] for t in active))
        ch_speeds = [self.channels.get(t.get("channel", "http"), {}).get("speed_mbps", 5) for t in active]
        if ch_speeds:
            self.stats["transfer_rate_mbps"] = round(sum(ch_speeds), 2)
        sizes = [st["size_mb"] for st in self.staged_data]
        if sizes:
            self.stats["compression_ratio"] = round(0.45 + sum(sizes) * 0.0001, 2)

    def stop(self):
        self.active = False
        for t in self.transfers:
            if t["status"] == "in_progress":
                t["status"] = "cancelled"


exfil_engine = ExfilEngine()
