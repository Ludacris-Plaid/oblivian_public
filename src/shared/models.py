"""
Data Models
"""

from dataclasses import dataclass
from typing import Any, Optional
from datetime import datetime

@dataclass
class Node:
    id: str
    status: str  # online, offline, pending
    last_heartbeat: Optional[datetime] = None

@dataclass
class Credential:
    node_id: str
    data: Any
    timestamp: datetime

@dataclass
class EvasionAnalysis:
    node_id: str
    score: float
    confidence: float
    timestamp: datetime
