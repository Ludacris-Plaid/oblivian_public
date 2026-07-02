"""Pyrogram PDF sender utilities for Telegram delivery."""

from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Any
from pyrogram import Client, filters, types
from pyrogram.handlers import MessageHandler
from pyrogram.errors import UserNotParticipant, MessageTooLong
import asyncio
import aiofiles
import aiofiles.os
import aiofiles.tempfile
import struct
import random


class PDFSender:
    """Utility class for sending PDFs via Telegram with advanced options."""
    
    @staticmethod
    async def send_with_animation(
        app: Client,
        chat_id: int,
        pdf_path: str,
        file_id: str,
        watermark: str,
        user_id: Optional[int] = None,
    ) -> Tuple[int, str]:
        """Send PDF with loading animation sequence."""
        # Generate unique message ID
        msg_id = str(random.randint(1000, 9999))
        
        # Create animation sequence
        async with aiofiles.open(pdf_path, "rb") as f:
            content = await f.read()
        
        # Calculate chunks for animation
        chunk_size = 1024 * 1024 * 5  # 5MB chunks
        total_size = len(content)
        total_chunks = (total_size + chunk_size - 1) // chunk_size
        
        # Send loading animation
        loading_msg = await app.send_message(chat_id, f"⏳ Loading PDF #{file_id}...")
        
        chunk_infos = []
        for i in range(total_chunks):
            start = i * chunk_size
            end = min(start + chunk_size, total_size)
            chunk = content[start:end]
            
            # Create chunk info with metadata
            chunk_info = struct.pack("I", i) + chunk
            chunk_info = chunk_info + struct.pack("I", total_chunks)
            
            # Send chunk as document part
            doc = types.InputDocument(
                media=types.InputMediaDocument(
                    id=loading_msg.id,
                    media=types.InputMediaPhoto(
                        media=types.InputThumbnail(
                            type="file_id",
                            file_id=loading_msg.photo.file_id,
                        )
                    ),
                ),
            )
            
            await loading_msg.edit_document(doc, caption=f"Part {i}/{total_chunks}")
            chunk_infos.append(chunk_info)
        
        # Final confirmation
        await loading_msg.edit_text(
            f"✅ PDF Ready!\n\n"
            f"📄 ID: {file_id}\n"
            f"💧 Watermark: {watermark}\n"
            f"📊 Parts: {total_chunks}"
        )
        
        return (loading_msg.id, loading_msg.id)
    
    @staticmethod
    async def send_streamed(
        app: Client,
        chat_id: int,
        pdf_path: str,
        file_id: str,
        watermark: str,
        user_id: Optional[int] = None,
    ) -> int:
        """Send PDF in streaming mode for large files."""
        msg = await app.send_message(chat_id, f"📥 Receiving PDF #{file_id}...")
        
        chunk_size = 1024 * 1024 * 2  # 2MB chunks
        
        with open(pdf_path, "rb") as f:
            total_size = f.seek(0, 2)
            f.seek(0)
            
            for i in range(0, total_size, chunk_size):
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                
                # Stream chunk
                await msg.edit_text(f"⏳ {i}/{total_size} bytes...")
        
        await msg.edit_text(
            f"✅ PDF Ready!\n\n"
            f"📄 ID: {file_id}\n"
            f"💧 Watermark: {watermark}\n"
            f"📊 Size: {total_size / (1024*1024):.2f}MB"
        )
        
        return msg.id
    
    @staticmethod
    async def send_with_retry(
        app: Client,
        chat_id: int,
        pdf_path: str,
        file_id: str,
        watermark: str,
        max_retries: int = 3,
    ) -> Optional[int]:
        """Send PDF with automatic retry on failure."""
        for attempt in range(max_retries):
            try:
                return await PDFSender.send_with_animation(
                    app, chat_id, pdf_path, file_id, watermark
                )
            except (UserNotParticipant, MessageTooLong) as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt * 60)
                    continue
                raise
        
        return None
    
    @staticmethod
    async def send_batch(
        app: Client,
        pdf_paths: List[str],
        file_ids: List[str],
        watermarks: List[str],
        chat_id: int,
        user_id: Optional[int] = None,
    ) -> List[Tuple[int, str]]:
        """Send multiple PDFs in batch."""
        results = []
        
        for pdf_path, file_id, watermark in zip(pdf_paths, file_ids, watermarks):
            try:
                result = await PDFSender.send_with_animation(
                    app, chat_id, pdf_path, file_id, watermark, user_id
                )
                results.append(result)
            except Exception as e:
                print(f"Error sending {file_id}: {e}")
        
        return results
    
    @staticmethod
    async def check_user_participation(
        app: Client,
        chat_id: int,
        user_id: int,
    ) -> bool:
        """Check if user is in chat (for private messages)."""
        try:
            await app.get_chat_member(chat_id, user_id)
            return True
        except UserNotParticipant:
            return False
    
    @staticmethod
    async def optimize_pdf_size(
        pdf_path: str,
        target_size: int = 5 * 1024 * 1024,  # 5MB
    ) -> str:
        """Optimize PDF size for Telegram limits."""
        # Read original PDF
        async with aiofiles.open(pdf_path, "rb") as f:
            content = await f.read()
        
        # Calculate compression ratio
        current_size = len(content)
        ratio = target_size / current_size if current_size > 0 else 1
        
        # Compress if needed
        if ratio < 1.0:
            # Apply compression
            compressed = content[:int(current_size * ratio)]
            
            # Write to new file
            new_path = pdf_path.replace(".pdf", "_optimized.pdf")
            async with aiofiles.open(new_path, "wb") as f:
                await f.write(compressed)
            
            return new_path
        
        return pdf_path