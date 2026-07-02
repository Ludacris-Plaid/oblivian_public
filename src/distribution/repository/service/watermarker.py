"""PDF watermarking utilities for unique identification."""

from datetime import datetime
from typing import Optional, Tuple
import uuid
import hashlib
import aiofiles
import aiofiles.os


class PDFWatermarker:
    """Utility class for PDF watermarking and identification."""
    
    @staticmethod
    def generate_pdf_id() -> str:
        """Generate unique PDF ID with timestamp."""
        uid = str(uuid.uuid4())[:12]
        ts = datetime.utcnow().strftime("%Y%m%d%H%M")
        return f"{uid}_{ts}"
    
    @staticmethod
    def generate_watermark(pdf_id: str) -> str:
        """Generate watermark string from PDF ID."""
        hash_obj = hashlib.md5(pdf_id.encode())
        return hash_obj.hexdigest()[:8]
    
    @staticmethod
    def create_watermark_text(
        watermark: str,
        pdf_id: str,
        user_id: Optional[str] = None,
    ) -> str:
        """Create formatted watermark text."""
        parts = [f"ID: {pdf_id}"]
        
        if watermark:
            parts.append(f"Watermark: {watermark}")
        
        if user_id:
            parts.append(f"User: {user_id}")
        
        return "\n".join(parts)
    
    @staticmethod
    def create_metadata_watermark(
        pdf_id: str,
        watermark: str,
    ) -> bytes:
        """Create binary metadata watermark for PDF header."""
        watermark_text = f"BM:{pdf_id}:{watermark}"
        timestamp = datetime.utcnow().isoformat()
        
        metadata = f"BM:ID:{pdf_id}\nBM:TM:{timestamp}\nBM:WM:{watermark}\n"
        return metadata.encode()
    
    @staticmethod
    def create_pdf_header(
        pdf_id: str,
        watermark: str,
        version: str = "1.4",
    ) -> bytes:
        """Create PDF header with watermark metadata."""
        pdf_version = f"%PDF-{version}"
        metadata = PDFWatermarker.create_metadata_watermark(pdf_id, watermark)
        
        return pdf_version.encode() + b"\n" + metadata
    
    @staticmethod
    def create_trailer(
        pdf_id: str,
        watermark: str,
        size: int,
        offset: int,
    ) -> bytes:
        """Create PDF trailer with watermark metadata."""
        metadata = PDFWatermarker.create_metadata_watermark(pdf_id, watermark)
        
        trailer = f"BM:ID:{pdf_id}\n"
        trailer += f"BM:TM:{datetime.utcnow().isoformat()}\n"
        trailer += f"BM:WM:{watermark}\n"
        trailer += f"BM:SZ:{size}\n"
        trailer += f"BM:OF:{offset}\n"
        
        return trailer.encode()
    
    @staticmethod
    def create_xref_table(
        pdf_id: str,
        watermark: str,
        objects: int,
        size: int,
    ) -> bytes:
        """Create PDF xref table with watermark metadata."""
        metadata = PDFWatermarker.create_metadata_watermark(pdf_id, watermark)
        
        xref = f"{objects} 0 1\nBM:ID:{pdf_id}\n"
        xref += f"BM:TM:{datetime.utcnow().isoformat()}\n"
        xref += f"BM:WM:{watermark}\n"
        xref += f"BM:SZ:{size}\n"
        
        return xref.encode()
    
    @staticmethod
    def create_catalog(
        pdf_id: str,
        watermark: str,
    ) -> bytes:
        """Create PDF catalog with watermark metadata."""
        metadata = PDFWatermarker.create_metadata_watermark(pdf_id, watermark)
        
        catalog = f"BM:ID:{pdf_id}\n"
        catalog += f"BM:TM:{datetime.utcnow().isoformat()}\n"
        catalog += f"BM:WM:{watermark}\n"
        catalog += f"BM:CA:1\n"
        
        return catalog.encode()
    
    @staticmethod
    def create_page(
        pdf_id: str,
        watermark: str,
    ) -> bytes:
        """Create PDF page with watermark metadata."""
        metadata = PDFWatermarker.create_metadata_watermark(pdf_id, watermark)
        
        page = f"BM:ID:{pdf_id}\n"
        page += f"BM:TM:{datetime.utcnow().isoformat()}\n"
        page += f"BM:WM:{watermark}\n"
        page += f"BM:PA:1\n"
        
        return page.encode()
    
    @staticmethod
    def create_content_stream(
        pdf_id: str,
        watermark: str,
        content: bytes,
    ) -> bytes:
        """Create PDF content stream with watermark metadata."""
        metadata = PDFWatermarker.create_metadata_watermark(pdf_id, watermark)
        
        stream = f"BM:ID:{pdf_id}\n"
        stream += f"BM:TM:{datetime.utcnow().isoformat()}\n"
        stream += f"BM:WM:{watermark}\n"
        stream += f"BM:CS:{len(content)}\n"
        
        return stream.encode() + content
    
    @staticmethod
    def create_object_header(
        pdf_id: str,
        watermark: str,
        generation: int,
        generation_num: int,
    ) -> bytes:
        """Create PDF object header with watermark metadata."""
        metadata = PDFWatermarker.create_metadata_watermark(pdf_id, watermark)
        
        header = f"BM:ID:{pdf_id}\n"
        header += f"BM:TM:{datetime.utcnow().isoformat()}\n"
        header += f"BM:WM:{watermark}\n"
        header += f"BM:GN:{generation}\n"
        header += f"BM:GNN:{generation_num}\n"
        
        return header.encode()
    
    @staticmethod
    def create_object_end(
        pdf_id: str,
        watermark: str,
    ) -> bytes:
        """Create PDF object end marker with watermark metadata."""
        metadata = PDFWatermarker.create_metadata_watermark(pdf_id, watermark)
        
        end = f"BM:ID:{pdf_id}\n"
        end += f"BM:TM:{datetime.utcnow().isoformat()}\n"
        end += f"BM:WM:{watermark}\n"
        end += f"BM:OE:1\n"
        
        return end.encode()
    
    @staticmethod
    def extract_pdf_id_from_watermark(watermark_text: str) -> Optional[str]:
        """Extract PDF ID from watermark text."""
        for line in watermark_text.split("\n"):
            if line.startswith("ID:"):
                return line.split("ID:")[1].strip()
        
        return None
    
    @staticmethod
    def extract_watermark_from_watermark_text(watermark_text: str) -> Optional[str]:
        """Extract watermark from watermark text."""
        for line in watermark_text.split("\n"):
            if line.startswith("WM:"):
                return line.split("WM:")[1].strip()
        
        return None