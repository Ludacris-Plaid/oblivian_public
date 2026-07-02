"""
API Response Schemas
"""

from datetime import datetime
from typing import Any, Optional

class NodeResponse:
    def __init__(self, node_id: str, status: str, last_heartbeat: Optional[datetime]):
        self.node_id = node_id
        self.status = status
        self.last_heartbeat = last_heartbeat

class CredentialResponse:
    def __init__(self, node_id: str, data: Any, timestamp: datetime):
        self.node_id = node_id
        self.data = data
        self.timestamp = timestamp

class EvasionResponse:
    def __init__(self, node_id: str, score: float, confidence: float, timestamp: datetime):
        self.node_id = node_id
        self.score = score
        self.confidence = confidence
        self.timestamp = timestamp
