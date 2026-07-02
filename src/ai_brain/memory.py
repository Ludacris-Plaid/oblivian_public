import json
import os
import time
import logging
import httpx
from typing import List, Dict, Optional

logger = logging.getLogger("ai_brain.memory")

TURSO_URL = os.getenv("TURSO_DATABASE_URL", "")
TURSO_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")


class BrainMemory:
    """
    Cloud-backed persistent memory for the AI Brain using Turso (libsql).

    Stores reasoning history, past decisions, conversation logs,
    and outcomes so the AI can learn from experience across sessions.
    """

    def __init__(self):
        self._history: List[Dict] = []
        self._ready = bool(TURSO_URL and TURSO_TOKEN)
        if not self._ready:
            logger.warning("Turso not configured — memory disabled")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {TURSO_TOKEN}",
            "Content-Type": "application/json",
        }

    async def _execute(self, sql: str, args: Optional[list] = None) -> list:
        if not self._ready:
            return []
        try:
            stmt = {"sql": sql}
            if args:
                typed_args = []
                for a in args:
                    if isinstance(a, (int, float)):
                        typed_args.append({"type": "integer" if isinstance(a, int) and not isinstance(a, bool) else "real", "value": str(a)})
                    else:
                        typed_args.append({"type": "text", "value": str(a) if a is not None else ""})
                stmt["args"] = typed_args
            body = {"requests": [{"type": "execute", "stmt": stmt}]}
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{TURSO_URL}/v2/pipeline",
                    headers=self._headers(),
                    json=body,
                )
                resp.raise_for_status()
                data = resp.json()
                results = data.get("results", [])
                if results:
                    first = results[0]
                    if first.get("type") == "error":
                        logger.warning(f"Turso SQL error: {first.get('error', {}).get('message', 'unknown')}")
                    elif first.get("type") == "ok":
                        return first.get("response", {}).get("result", {}).get("rows", [])
            return []
        except httpx.HTTPStatusError as e:
            logger.warning(f"Turso HTTP {e.response.status_code}: {e.response.text[:300]}")
            return []
        except Exception as e:
            logger.warning(f"Turso query failed: {e}")
            return []

    async def _ensure_schema(self):
        await self._execute(
            "CREATE TABLE IF NOT EXISTS decisions ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, detail TEXT, "
            "response TEXT, actions_taken TEXT, node_count INTEGER DEFAULT 0, "
            "cred_count INTEGER DEFAULT 0, created_at TEXT)"
        )
        await self._execute(
            "CREATE TABLE IF NOT EXISTS conversations ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT NOT NULL, "
            "content TEXT NOT NULL, session_id TEXT, created_at TEXT)"
        )
        await self._execute(
            "CREATE TABLE IF NOT EXISTS memory_state ("
            "key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT)"
        )
        logger.info("Turso schema ensured")

    async def initialize(self):
        if not self._ready:
            return
        await self._ensure_schema()
        # Set persistent session start timestamp (survives restarts)
        existing = await self.get("session_started_at")
        if not existing:
            await self.set("session_started_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
            logger.info("Turso: new session started")
        else:
            logger.info(f"Turso: session resumed from {existing}")
        logger.info("Turso memory initialized")

    async def get(self, key: str, default=None):
        if not self._ready:
            return default
        rows = await self._execute(
            "SELECT value FROM memory_state WHERE key = ?", [key]
        )
        if rows:
            try:
                for row in rows:
                    val = row[0]
                    if isinstance(val, dict) and "value" in val:
                        return json.loads(val["value"])
                    return json.loads(val)
            except (json.JSONDecodeError, TypeError, Exception):
                for row in rows:
                    if isinstance(row[0], dict) and "value" in row[0]:
                        return row[0]["value"]
        return default

    async def set(self, key: str, value: str) -> bool:
        if not self._ready:
            return False
        val = json.dumps(value) if not isinstance(value, str) else value
        rows = await self._execute(
            "SELECT key FROM memory_state WHERE key = ?", [key]
        )
        if rows:
            await self._execute(
                "UPDATE memory_state SET value = ?, updated_at = datetime('now') WHERE key = ?",
                [val, key],
            )
        else:
            await self._execute(
                "INSERT INTO memory_state (key, value, updated_at) VALUES (?, ?, datetime('now'))",
                [key, val],
            )
        return True

    async def record_decision(self, decision: Dict):
        entry = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            **decision,
        }
        self._history.append(entry)
        if self._ready:
            await self._execute(
                "INSERT INTO decisions (type, detail, response, actions_taken, node_count, cred_count, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
                [
                    decision.get("type", ""),
                    decision.get("detail", "")[:500],
                    decision.get("response", "")[:4000],
                    ",".join(decision.get("actions_taken", [])),
                    decision.get("node_count", 0),
                    decision.get("cred_count", 0),
                ],
            )

    async def record_conversation(self, role: str, content: str, session_id: str = ""):
        if not self._ready:
            return
        await self._execute(
            "INSERT INTO conversations (role, content, session_id, created_at) "
            "VALUES (?, ?, ?, datetime('now'))",
            [role, content[:8000], session_id],
        )

    async def recent_decisions(self, n: int = 10) -> List[Dict]:
        if not self._ready:
            return self._history[-n:]
        rows = await self._execute(
            "SELECT type, detail, actions_taken, created_at FROM decisions ORDER BY id DESC LIMIT ?",
            [str(n)],
        )
        result = []
        for r in rows:
            try:
                def v(idx): return r[idx].get("value", "") if isinstance(r[idx], dict) else str(r[idx])
                result.append({
                    "type": v(0),
                    "detail": v(1),
                    "actions_taken": v(2).split(",") if v(2) else [],
                    "timestamp": v(3),
                })
            except (IndexError, TypeError):
                continue
        return result

    async def recent_conversations(self, n: int = 20) -> List[Dict]:
        if not self._ready:
            return []
        rows = await self._execute(
            "SELECT role, content, created_at FROM conversations ORDER BY id DESC LIMIT ?",
            [str(n)],
        )
        result = []
        for r in rows:
            try:
                def v(i): return r[i].get("value", "") if isinstance(r[i], dict) else str(r[i])
                result.append({"role": v(0), "content": v(1), "timestamp": v(2)})
            except (IndexError, TypeError):
                continue
        return result

    async def context_summary(self) -> str:
        decisions = await self.recent_decisions(5)
        if not decisions:
            return "No prior decisions recorded."
        lines = ["Recent AI Brain decisions:"]
        for d in decisions:
            kind = d.get("type", "unknown")
            detail = d.get("detail", "")
            ts = d.get("timestamp", "?")
            lines.append(f"  - [{ts}] {kind}: {detail[:100]}")
        return "\n".join(lines)

    async def get_learning_insights(self) -> str:
        """Compute adaptive learning insights from all past data."""
        decisions = await self.recent_decisions(200)
        convos = await self.recent_conversations(100)
        if not decisions and not convos:
            return ""

        tool_usage: dict = {}
        attack_prefs: dict = {}
        success_tools: set = set()
        fail_tools: set = set()

        for d in decisions:
            t = d.get("type", "")
            detail = d.get("detail", "")
            # Track tool usage
            for tool in ("nmap", "hydra", "sqlmap", "hashcat", "metasploit", "wpscan", "ffuf", "nikto", "gobuster", "whatweb"):
                if tool in detail.lower() or tool in t.lower():
                    tool_usage[tool] = tool_usage.get(tool, 0) + 1
                    if "completed" in d.get("actions_taken", "") or "success" in detail.lower():
                        success_tools.add(tool)
            # Track attack preferences
            for a in d.get("actions_taken", []):
                if a:
                    attack_prefs[a] = attack_prefs.get(a, 0) + 1

        # User behavior from conversations
        user_intents = [c["content"][:80].lower() for c in convos if c["role"] == "user"]
        scan_count = sum(1 for i in user_intents if "scan" in i)
        exploit_count = sum(1 for i in user_intents if "exploit" in i or "attack" in i)
        info_count = sum(1 for i in user_intents if "status" in i or "show" in i or "what" in i)

        lines = []
        lines.append("═══════════════════════════════════════════")
        lines.append("  ADAPTIVE LEARNING INSIGHTS:")
        lines.append("═══════════════════════════════════════════")

        if tool_usage:
            most_used = sorted(tool_usage.items(), key=lambda x: x[1], reverse=True)[:5]
            lines.append(f"Most used tools: {', '.join(f'{t}({n}x)' for t, n in most_used)}")
        if success_tools:
            lines.append(f"Most successful tools: {', '.join(sorted(success_tools))}")
        if fail_tools:
            lines.append(f"Tools with failures: {', '.join(sorted(fail_tools))}")
        if attack_prefs:
            top_attacks = sorted(attack_prefs.items(), key=lambda x: x[1], reverse=True)[:3]
            lines.append(f"Preferred attack vectors: {', '.join(f'{a}({n}x)' for a, n in top_attacks)}")
        if scan_count or exploit_count or info_count:
            lines.append(f"User behavior: {scan_count} scans, {exploit_count} attacks, {info_count} info requests")
        if tool_usage:
            # Recommendation
            unused = [t for t in ("nikto", "whatweb", "gobuster", "ffuf", "john") if t not in tool_usage]
            if unused:
                lines.append(f"💡 Try unused tools: {', '.join(unused[:3])}")
        if len(decisions) > 10:
            lines.append(f"Learning from {len(decisions)} past decisions across {len(set(d.get('type','?') for d in decisions))} categories")

        return "\n".join(lines)

    async def get_state_summary(self) -> Dict:
        decisions = await self.recent_decisions(1)
        return {
            "decisions_made": len(self._history),
            "last_decision": decisions[0] if decisions else None,
            "last_mutation_mode": await self.get("last_mutation_mode", "none"),
        }

    async def burn_all(self) -> dict:
        """Nuclear option — delete all memory records."""
        if not self._ready:
            return {"status": "error", "message": "Memory not configured"}
        try:
            await self._execute("DELETE FROM decisions")
            await self._execute("DELETE FROM conversations")
            await self._execute("DELETE FROM memory_state")
            self._history = []
            logger.warning("🔥 ALL MEMORY BURNED — Turso tables wiped")
            return {"status": "success", "message": "All memory burned. Tables empty."}
        except Exception as e:
            return {"status": "error", "message": str(e)}
