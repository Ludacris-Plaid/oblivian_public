import os
import json
import logging
import httpx
from typing import Optional

logger = logging.getLogger("ai_brain.llm")


class LLMProvider:
    """An LLM provider configuration."""

    def __init__(self, name: str, api_key: str, api_url: str, model: str):
        self.name = name
        self.api_key = api_key
        self.api_url = api_url
        self.model = model
        self.online = bool(api_key)

    @property
    def status(self) -> str:
        return "online" if self.online else "offline"


class LLMInterface:
    """
    Unified LLM interface for the VIRUS C2 AI Brain.

    Supports multiple providers with automatic fallback.
    Primary: Featherless.ai
    Backup: DeepSeek (configured via env)
    """

    def __init__(self):
        self.providers = []
        self.preferred_provider = ""  # set via API for manual override

        # Primary: Featherless.ai
        featherless_key = os.getenv("FEATHERLESS_API_KEY", "")
        if featherless_key:
            self.providers.append(LLMProvider(
                name="featherless",
                api_key=featherless_key,
                api_url=os.getenv(
                    "FEATHERLESS_API_URL",
                    "https://api.featherless.ai/v1/chat/completions",
                ),
                model=os.getenv(
                    "FEATHERLESS_MODEL",
                    "DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-THINKING-HERETIC-UNCENSORED",
                ),
            ))

        # Backup 1: NVIDIA NIM API
        nvidia_key = os.getenv("NVIDIA_API_KEY", "")
        if nvidia_key:
            self.providers.append(LLMProvider(
                name="nvidia",
                api_key=nvidia_key,
                api_url=os.getenv("NVIDIA_API_URL", "https://integrate.api.nvidia.com/v1/chat/completions"),
                model=os.getenv("NVIDIA_MODEL", "deepseek-ai/deepseek-v4-flash"),
            ))

        # Backup 2: OpenCode Go (OpenAI-compatible)
        opencode_key = os.getenv("OPENCODE_API_KEY", "")
        if opencode_key:
            self.providers.append(LLMProvider(
                name="opencode",
                api_key=opencode_key,
                api_url=os.getenv("OPENCODE_API_URL", "https://opencode.ai/zen/go/v1/chat/completions"),
                model=os.getenv("OPENCODE_MODEL", "deepseek-v4-flash"),
            ))

        # Backup: DeepSeek
        deepseek_key = os.getenv("DEEPSEEK_API_KEY", "")
        if deepseek_key:
            self.providers.append(LLMProvider(
                name="deepseek",
                api_key=deepseek_key,
                api_url=os.getenv(
                    "DEEPSEEK_API_URL",
                    "https://api.deepseek.com/v1/chat/completions",
                ),
                model=os.getenv(
                    "DEEPSEEK_MODEL",
                    "deepseek-chat",
                ),
            ))

        # Backup: DeepSeek V4 Flash
        ds4_key = os.getenv("DEEPSEEK_V4_API_KEY", "") or os.getenv("OPENROUTER_API_KEY", "")
        if ds4_key:
            self.providers.append(LLMProvider(
                name="deepseek_v4",
                api_key=ds4_key,
                api_url=os.getenv("DEEPSEEK_V4_API_URL", "https://api.deepseek.com/v1/chat/completions"),
                model=os.getenv("DEEPSEEK_V4_MODEL", "deepseek-v4-flash"),
            ))

        # Fallback: use any FEATHERLESS config as a bare fallback if no key
        if not self.providers:
            self.providers.append(LLMProvider(
                name="featherless_unconfigured",
                api_key="",
                api_url=os.getenv("FEATHERLESS_API_URL", ""),
                model=os.getenv("FEATHERLESS_MODEL", ""),
            ))

    @property
    def status(self) -> str:
        for p in self.providers:
            if p.online:
                return f"online ({p.name})"
        return "offline"

    async def chat(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.4,
        max_tokens: int = 4096,
        timeout: int = 60,
    ) -> dict:
        """
        Send a chat request to the LLM, trying providers in order.

        Returns {"status": "success"|"error", "response": str, "model": str}
        """
        last_error = None
        # Build ordered list: preferred first, then rest
        ordered = list(self.providers)
        if self.preferred_provider:
            pref = next((p for p in ordered if p.name == self.preferred_provider and p.online), None)
            if pref:
                ordered = [pref] + [p for p in ordered if p.name != self.preferred_provider]
        for provider in ordered:
            if not provider.online:
                continue

            payload = {
                "model": provider.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

            try:
                headers = {"Authorization": f"Bearer {provider.api_key}"}
                if provider.name == "deepseek":
                    headers["Accept"] = "application/json"

                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(
                        provider.api_url,
                        json=payload,
                        headers=headers,
                    )
                resp.raise_for_status()
                result = resp.json()
                msg = result.get("choices", [{}])[0].get("message", {})
                text = msg.get("content", "")
                # Capture reasoning_content from OpenCode/NVIDIA APIs and wrap in <think> tags
                reasoning = msg.get("reasoning_content", "")
                if reasoning and not text.startswith("<think>"):
                    text = f"<think>\n{reasoning}\n</think>\n\n{text}"
                logger.info(f"LLM response from {provider.name}/{provider.model}")
                return {
                    "status": "success",
                    "response": text,
                    "model": f"{provider.name}:{provider.model}",
                }
            except Exception as e:
                logger.warning(f"LLM provider {provider.name} failed: {e}")
                last_error = e
                continue

        # All providers failed — return offline response
        context_msg = ""
        if self.providers:
            names = [p.name for p in self.providers]
            context_msg = f"Set API keys in .env for: {', '.join(names)}"
        else:
            context_msg = "Set FEATHERLESS_API_KEY or DEEPSEEK_API_KEY in .env"

        return {
            "status": "error",
            "response": f"[AI Offline] {context_msg}",
            "model": "fallback",
        }

    def parse_json_actions(self, text: str) -> list:
        """
        Extract JSON action blocks from LLM response text.

        Looks for ```json ... ``` blocks and returns parsed list.
        """
        actions = []
        if "```json" not in text:
            return actions
        try:
            start = text.index("```json") + 7
            end = text.index("```", start)
            parsed = json.loads(text[start:end].strip())
            if isinstance(parsed, dict) and "actions" in parsed:
                actions = parsed["actions"]
            elif isinstance(parsed, list):
                actions = parsed
        except (ValueError, json.JSONDecodeError):
            pass
        return actions
