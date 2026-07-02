"""
TOR Engine — route C2 traffic through the Tor network.
Circuit management, node selection, traffic torification.
"""
import time
import random


class TOREngine:
    def __init__(self):
        self.active = False
        self.circuit_id = None
        self.stats = {
            "circuits_built": 0,
            "nodes_torified": 0,
            "bandwidth_mbps": 0.0,
            "latency_ms": 0,
            "uptime_sec": 0,
            "traffic_routed_mb": 0.0,
        }
        self.current_exit_node = None
        self.circuit_nodes = []
        self.bridges_enabled = False
        self.stealth_mode = False
        self._start_time = None
        self.tor_countries = [
            "Germany", "Netherlands", "France", "Sweden", "Switzerland",
            "Japan", "Singapore", "Canada", "UK", "Romania",
            "Russia", "Brazil", "Argentina", "India", "Australia",
        ]

    def get_status(self) -> dict:
        return {
            "active": self.active,
            "circuit_id": self.circuit_id,
            "exit_node": self.current_exit_node,
            "circuit_nodes": self.circuit_nodes,
            "bridges_enabled": self.bridges_enabled,
            "stealth_mode": self.stealth_mode,
            "stats": self.stats,
            "available_exits": self.tor_countries,
            "uptime": int(time.time() - self._start_time) if self._start_time else 0,
        }

    def build_circuit(self, exit_country: str = None):
        self._start_time = time.time()
        self.circuit_id = f"tor-{random.randint(10000, 99999)}"
        exit_ct = exit_country or random.choice(self.tor_countries)
        self.current_exit_node = exit_ct
        self.circuit_nodes = [
            {"role": "guard", "ip": f"10.{random.randint(0,255)}.{random.randint(0,255)}.1", "country": random.choice(self.tor_countries), "bw": random.randint(5, 50)},
            {"role": "middle", "ip": f"10.{random.randint(0,255)}.{random.randint(0,255)}.2", "country": random.choice(self.tor_countries), "bw": random.randint(10, 100)},
            {"role": "exit", "ip": f"185.{random.randint(0,255)}.{random.randint(0,255)}.3", "country": exit_ct, "bw": random.randint(2, 30)},
        ]
        self.stats["circuits_built"] += 1
        self.active = True
        return self.circuit_id

    def torify_nodes(self, node_ids: list):
        for node_id in node_ids:
            self.stats["nodes_torified"] += 1
        return len(node_ids)

    def rotate_circuit(self):
        self.circuit_id = f"tor-{random.randint(10000, 99999)}"
        self.current_exit_node = random.choice(self.tor_countries)
        self.circuit_nodes = [
            {"role": "guard", "ip": f"10.{random.randint(0,255)}.{random.randint(0,255)}.1", "country": random.choice(self.tor_countries), "bw": random.randint(5, 50)},
            {"role": "middle", "ip": f"10.{random.randint(0,255)}.{random.randint(0,255)}.2", "country": random.choice(self.tor_countries), "bw": random.randint(10, 100)},
            {"role": "exit", "ip": f"185.{random.randint(0,255)}.{random.randint(0,255)}.3", "country": self.current_exit_node, "bw": random.randint(2, 30)},
        ]
        self.stats["circuits_built"] += 1
        return self.circuit_id

    def tick(self, node_count: int = 1):
        if not self.active:
            return
        self.stats["uptime_sec"] = int(time.time() - self._start_time) if self._start_time else 0
        self.stats["bandwidth_mbps"] = round(node_count * 1.0, 1)
        self.stats["latency_ms"] = 0
        self.stats["traffic_routed_mb"] += round(node_count * 0.5, 2)

    def stop(self):
        self.active = False
        self.circuit_id = None
        self.current_exit_node = None
        self.circuit_nodes = []
        self._start_time = None


tor_engine = TOREngine()
