"""
Proxy Chain Engine — SOCKS5 proxy management, chain routing, bandwidth aggregation.
"""
import time
import random


class ProxyEngine:
    def __init__(self):
        self.active = False
        self.stats = {
            "total_proxies": 0,
            "active_proxies": 0,
            "total_bandwidth_mbps": 0.0,
            "connections_routed": 0,
            "chains_active": 0,
            "uptime_avg_sec": 0,
        }
        self.proxies = {}  # {node_id: {port, bandwidth, connections, uptime, country}}
        self.chains = []   # [{id, nodes, latency, status}]
        self._chain_id_counter = 0

    def get_status(self) -> dict:
        return {
            "active": self.active,
            "stats": self.stats,
            "proxies": list(self.proxies.values()),
            "chains": self.chains,
        }

    def register_proxy(self, node_id: str, port: int = 9050, bandwidth: float = 10.0, country: str = "unknown"):
        self.proxies[node_id] = {
            "node_id": node_id,
            "port": port,
            "bandwidth_mbps": bandwidth,
            "connections": 0,
            "uptime": 0,
            "country": country,
            "status": "active",
            "registered_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        self.stats["total_proxies"] = len(self.proxies)
        self.stats["active_proxies"] = sum(1 for p in self.proxies.values() if p["status"] == "active")

    def create_chain(self, node_ids: list):
        self._chain_id_counter += 1
        latency = random.uniform(20, 200)
        chain = {
            "id": f"chain-{self._chain_id_counter}",
            "nodes": node_ids,
            "hops": len(node_ids),
            "latency_ms": round(latency, 1),
            "status": "active",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        self.chains.append(chain)
        self.stats["chains_active"] = len(self.chains)
        return chain

    def route_connection(self):
        self.stats["connections_routed"] += 1

    def tick(self):
        if not self.active:
            return
        self.stats["active_proxies"] = sum(1 for p in self.proxies.values() if p["status"] == "active")
        total_bw = sum(p["bandwidth_mbps"] for p in self.proxies.values() if p["status"] == "active")
        self.stats["total_bandwidth_mbps"] = round(total_bw, 2)
        for p in self.proxies.values():
            if p["status"] == "active":
                p["uptime"] += 1
                p["connections"] += 0
        uptimes = [p["uptime"] for p in self.proxies.values() if p["status"] == "active"]
        if uptimes:
            self.stats["uptime_avg_sec"] = round(sum(uptimes) / len(uptimes), 0)

    def stop(self):
        self.active = False
        for chain in self.chains:
            chain["status"] = "closed"


proxy_engine = ProxyEngine()
