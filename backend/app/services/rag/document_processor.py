import os
import asyncio
from typing import Tuple, List, Dict, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """
    Processes uploaded documents using LangChain text splitters,
    extracts metadata, and indexes chunks into FAISS.
    """

    def __init__(self):
        from app.core.config import settings
        self.chunk_size = settings.CHUNK_SIZE
        self.chunk_overlap = settings.CHUNK_OVERLAP

    def _get_text_splitter(self):
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        return RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    async def extract_text(self, file_path: str) -> Tuple[str, Dict[str, Any]]:
        """Extract raw text and metadata from a file."""
        ext = Path(file_path).suffix.lower().lstrip(".")
        loop = asyncio.get_event_loop()

        if ext == "pdf":
            return await loop.run_in_executor(None, self._extract_pdf, file_path)
        elif ext == "docx":
            return await loop.run_in_executor(None, self._extract_docx, file_path)
        elif ext in ("txt", "md"):
            return await loop.run_in_executor(None, self._extract_text, file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

    def _extract_pdf(self, file_path: str) -> Tuple[str, Dict]:
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            pages = []
            for page_num, page in enumerate(doc):
                text = page.get_text("text")
                if text.strip():
                    pages.append(f"[Page {page_num + 1}]\n{text}")

            full_text = "\n\n".join(pages)
            metadata = {
                "page_count": len(doc),
                "word_count": len(full_text.split()),
            }
            doc.close()
            return full_text, metadata
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise

    def _extract_docx(self, file_path: str) -> Tuple[str, Dict]:
        try:
            from docx import Document
            doc = Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            full_text = "\n\n".join(paragraphs)
            return full_text, {
                "page_count": None,
                "word_count": len(full_text.split()),
            }
        except Exception as e:
            logger.error(f"DOCX extraction failed: {e}")
            raise

    def _extract_text(self, file_path: str) -> Tuple[str, Dict]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        return text, {"page_count": None, "word_count": len(text.split())}

    def _split_into_chunks(
        self,
        text: str,
        source: str,
        doc_id: int,
        user_id: int,
    ) -> List[Dict[str, Any]]:
        splitter = self._get_text_splitter()
        raw_chunks = splitter.split_text(text)

        chunks = []
        for i, chunk in enumerate(raw_chunks):
            if chunk.strip():
                # Try to detect page from [Page N] markers
                page = 0
                import re
                match = re.search(r"\[Page (\d+)\]", chunk)
                if match:
                    page = int(match.group(1))
                    chunk = re.sub(r"\[Page \d+\]\n?", "", chunk).strip()

                chunks.append({
                    "content": chunk,
                    "source": source,
                    "page": page,
                    "chunk_index": i,
                    "doc_id": doc_id,
                    "user_id": user_id,
                })

        return chunks

    async def process_and_index(
        self,
        file_path: str,
        user_id: int,
        doc_id: int,
    ) -> Tuple[str, int, Dict[str, Any]]:
        """
        Full pipeline: extract → split → embed → index.
        Returns (namespace, chunk_count, metadata).
        """
        from app.services.rag.vector_store import faiss_store

        source = Path(file_path).name
        logger.info(f"Processing document: {source}")

        # Step 1: Extract text
        full_text, metadata = await self.extract_text(file_path)

        if not full_text.strip():
            raise ValueError("Document appears to be empty or could not be parsed")

        # Step 2: Split into chunks
        chunks = await asyncio.get_event_loop().run_in_executor(
            None,
            self._split_into_chunks,
            full_text,
            source,
            doc_id,
            user_id,
        )

        logger.info(f"Split into {len(chunks)} chunks")

        # Step 3: Index into FAISS
        namespace = f"user_{user_id}_doc_{doc_id}"
        chunk_count = await faiss_store.add_documents(namespace=namespace, chunks=chunks)

        metadata["chunk_count"] = chunk_count
        logger.info(f"Indexed {chunk_count} chunks under namespace: {namespace}")

        return namespace, chunk_count, metadata
