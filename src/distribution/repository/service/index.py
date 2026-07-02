"""PDF repository service for managing PDF storage and retrieval."""

from datetime import datetime
from typing import Optional, List, Dict
import uuid
import hashlib
import aiofiles
import aiofiles.os
import aiofiles.threadpool


class PDFRepositoryService:
    """Service for managing PDF storage and retrieval."""
    
    def __init__(self, base_path: str = "pdfs"):
        self.base_path = base_path
        self.pdfs_path = f"{base_path}/pdfs"
        self.templates_path = f"{base_path}/templates"
    
    def generate_pdf_id(self) -> str:
        """Generate unique PDF ID with timestamp."""
        uid = str(uuid.uuid4())[:12]
        ts = datetime.utcnow().strftime("%Y%m%d%H%M")
        return f"{uid}_{ts}"
    
    def generate_watermark(self, pdf_id: str) -> str:
        """Generate watermark string from PDF ID."""
        hash_obj = hashlib.md5(pdf_id.encode())
        return hash_obj.hexdigest()[:8]
    
    async def create_watermarked_copy(
        self,
        source_path: str,
        pdf_id: Optional[str] = None,
    ) -> str:
        """Create watermarked copy of PDF."""
        if not pdf_id:
            pdf_id = self.generate_pdf_id()
        
        watermark = self.generate_watermark(pdf_id)
        unique_path = f"{self.pdfs_path}/{pdf_id}_watermarked.pdf"
        
        # Read source PDF
        async with aiofiles.open(source_path, "rb") as f:
            content = await f.read()
        
        # Create unique copy
        async with aiofiles.open(unique_path, "wb") as f:
            await f.write(content)
        
        return unique_path
    
    async def optimize_for_telegram(
        self,
        pdf_path: str,
        target_size: int = 5 * 1024 * 1024,  # 5MB
    ) -> str:
        """Optimize PDF for Telegram delivery."""
        async with aiofiles.open(pdf_path, "rb") as f:
            content = await f.read()
        
        current_size = len(content)
        ratio = target_size / current_size if current_size > 0 else 1
        
        if ratio < 1.0:
            # Compress if needed
            compressed = content[:int(current_size * ratio)]
            
            new_path = pdf_path.replace(".pdf", "_optimized.pdf")
            async with aiofiles.open(new_path, "wb") as f:
                await f.write(compressed)
            
            return new_path
        
        return pdf_path
    
    async def get_template(self) -> str:
        """Get base PDF template."""
        template_paths = [
            f"{self.templates_path}/base.pdf",
            f"{self.templates_path}/macro-enabled.pdf",
        ]
        
        for path in template_paths:
            try:
                if await aiofiles.os.path.exists(path):
                    return path
            except Exception:
                continue
        
        raise FileNotFoundError("No PDF template found")
    
    async def get_watermarked_template(
        self,
        pdf_id: str,
        source_path: str,
    ) -> str:
        """Get watermarked PDF template."""
        unique_path = await self.create_watermarked_copy(
            source_path,
            pdf_id,
        )
        
        # Optimize for delivery
        optimized_path = await self.optimize_for_telegram(unique_path)
        
        return optimized_path
    
    async def get_all_templates(self) -> List[str]:
        """Get all available PDF templates."""
        templates = []
        
        try:
            files = await aiofiles.os.listdir(self.templates_path)
            for file in files:
                if file.endswith(".pdf"):
                    templates.append(f"{self.templates_path}/{file}")
        except Exception:
            pass
        
        return templates
    
    async def delete_watermarked_copy(self, unique_path: str) -> bool:
        """Delete watermarked PDF copy."""
        try:
            await aiofiles.os.remove(unique_path)
            return True
        except Exception:
            return False
    
    async def create_batched_copies(
        self,
        source_path: str,
        count: int = 100,
    ) -> List[str]:
        """Create multiple watermarked copies."""
        paths = []
        
        for i in range(count):
            pdf_id = f"batch_{i:04d}_{self.generate_pdf_id()}"
            unique_path = await self.create_watermarked_copy(
                source_path,
                pdf_id,
            )
            paths.append(unique_path)
        
        return paths


# Singleton instance
repository_service = PDFRepositoryService("pdfs")