"""Telegram bot configuration settings."""

from dataclasses import dataclass
from typing import Optional
import os


@dataclass
class BotConfig:
    """Telegram bot configuration."""
    
    bot_token: str = os.getenv("BOT_TOKEN", "123456:ABC-DEF123")
    api_id: int = int(os.getenv("API_ID", 123456))
    api_hash: str = os.getenv("API_HASH", "1234567890abcdef1234567890abcdef")
    
    # PDF Storage
    pdf_storage: str = os.getenv("PDF_STORAGE", "pdfs")
    
    # C2 Server
    c2_server_url: str = os.getenv("C2_SERVER_URL", "http://localhost:8000")
    
    # Bot Behavior
    auto_download: bool = True
    max_file_size_mb: int = 50  # Telegram limit
    max_retries: int = 3
    retry_delay_seconds: int = 60
    
    # Performance
    workers: int = 50
    chunk_size_mb: int = 5
    
    @classmethod
    def from_env(cls) -> "BotConfig":
        """Load configuration from environment variables."""
        return cls(
            bot_token=os.getenv("BOT_TOKEN"),
            api_id=int(os.getenv("API_ID", 123456)),
            api_hash=os.getenv("API_HASH"),
            pdf_storage=os.getenv("PDF_STORAGE", "pdfs"),
            c2_server_url=os.getenv("C2_SERVER_URL", "http://localhost:8000"),
            auto_download=os.getenv("AUTO_DOWNLOAD") == "true",
            max_file_size_mb=int(os.getenv("MAX_FILE_SIZE_MB", 50)),
            max_retries=int(os.getenv("MAX_RETRIES", 3)),
            retry_delay_seconds=int(os.getenv("RETRY_DELAY_SECONDS", 60)),
            workers=int(os.getenv("WORKERS", 50)),
            chunk_size_mb=int(os.getenv("CHUNK_SIZE_MB", 5)),
        )


# Command handlers
COMMANDS = [
    ("start", "Initialize bot and show status"),
    ("restart", "Restart bot session"),
    ("status", "Check current bot status"),
    ("stats", "Show distribution statistics"),
    ("help", "Show available commands"),
]

# Inline query handlers
INLINE_QUERIES = [
    ("pdf_download", "Quick PDF download"),
    ("pdf_quick", "Quick access PDF"),
]

# Message handlers
MESSAGE_HANDLERS = [
    ("pdf_request", "Handle PDF request"),
    ("pdf_confirm", "Handle PDF confirmation"),
    ("pdf_retry", "Handle PDF retry"),
]


def get_command_registry():
    """Get command registry from COMMANDS."""
    return {cmd[0]: cmd[1] for cmd in COMMANDS}


def get_inline_registry():
    """Get inline query registry from INLINE_QUERIES."""
    return {query[0]: query[1] for query in INLINE_QUERIES}


def get_message_registry():
    """Get message handler registry from MESSAGE_HANDLERS."""
    return {handler[0]: handler[1] for handler in MESSAGE_HANDLERS}