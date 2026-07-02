"""
DDoS Engine — multi-vector attack coordination, bandwidth tracking, target management.
"""
import time
import random


class DDOSEngine:
    def __init__(self):
        self.active = False
        self.stats = {
            "total_requests": 0,
            "requests_per_second": 0,
            "bandwidth_gbps": 0.0,
            "active_nodes": 0,
            "attack_duration_sec": 0,
            "packets_sent": 0,
            "targets_hit": 0,
        }
        self.targets = []
        self.attack_types = {
            "http_flood": {"bandwidth_factor": 0.1, "speed": "high"},
            "syn_flood": {"bandwidth_factor": 0.5, "speed": "medium"},
            "udp_flood": {"bandwidth_factor": 1.2, "speed": "high"},
            "slowloris": {"bandwidth_factor": 0.05, "speed": "slow"},
            "dns_amplification": {"bandwidth_factor": 2.0, "speed": "medium"},
            "icmp_flood": {"bandwidth_factor": 0.3, "speed": "high"},
        }
        self.current_attack = None
        self._start_time = None

    def get_status(self) -> dict:
        return {
            "active": self.active,
            "current_attack": self.current_attack,
            "targets": self.targets,
            "attack_types": self.attack_types,
            "stats": self.stats,
            "duration": int(time.time() - self._start_time) if self._start_time else 0,
        }

    def launch(self, target: str, attack_type: str = "http_flood", nodes: int = 1):
        self.active = True
        self.current_attack = {"target": target, "type": attack_type}
        self._start_time = time.time()
        self.targets.append({
            "target": target,
            "type": attack_type,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "active",
        })
        self.stats["active_nodes"] = nodes

    def tick(self, node_count: int):
        if not self.active:
            return
        elapsed = time.time() - self._start_time if self._start_time else 1
        self.stats["attack_duration_sec"] = int(elapsed)
        if self.current_attack:
            atype = self.attack_types.get(self.current_attack["type"], {})
            factor = atype.get("bandwidth_factor", 0.1)
            self.stats["total_requests"] += int(node_count * factor * 100)
            self.stats["packets_sent"] += int(node_count * factor * 1000)
            self.stats["requests_per_second"] = int(node_count * factor * 50)
            self.stats["bandwidth_gbps"] = round(node_count * factor * 0.8, 2)
            self.stats["targets_hit"] = len(self.targets)

    def stop(self):
        self.active = False
        if self.current_attack:
            self.current_attack["status"] = "stopped"
        if self.targets:
            self.targets[-1]["status"] = "stopped"
        self._start_time = None


ddos_engine = DDOSEngine()
