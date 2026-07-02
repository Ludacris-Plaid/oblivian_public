"""
System Constants
"""

REDIS_URL = "redis://localhost:6379"
C2_PORT = 8000
C2_HOST = "0.0.0.0"
WS_ENDPOINT = "/ws"
GUI_URL = f"ws://localhost:{C2_PORT}{WS_ENDPOINT}"

# Animation speeds
HEARTBEAT_INTERVAL = 2.0  # seconds
CREDENTIAL_INTERVAL = 1.5  # seconds
EVASION_INTERVAL = 3.0  # seconds
