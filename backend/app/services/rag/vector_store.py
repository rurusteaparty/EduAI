import os
import json
import asyncio
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Lazy imports to avoid startup crash if packages missing
try:
    import faiss
    from sentence_transformers import SentenceTransformer
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    logger.warning("FAISS or sentence-transformers not available. Vector search will be disabled.")


class FAISSVectorStore:
    """
    FAISS vector store with per-document namespace isolation.
    
    Each document gets its own index namespace: f"user_{user_id}_doc_{doc_id}"
    Chunks stored as: {namespace}_chunks.json  |  {namespace}.index
    """

    def __init__(self, index_path: str, model_name: str):
        self.index_path = Path(index_path)
        self.index_path.mkdir(parents=True, exist_ok=True)
        self.model_name = model_name
        self.model: Optional[Any] = None
        self.dimension = 384  # all-MiniLM-L6-v2 dimension

    async def initialize(self):
        """Load embedding model on startup."""
        if not FAISS_AVAILABLE:
            logger.warning("FAISS not available — skipping initialization")
            return
        loop = asyncio.get_event_loop()
        self.model = await loop.run_in_executor(
            None,
            lambda: SentenceTransformer(self.model_name)
        )
        logger.info(f"✅ Embedding model loaded: {self.model_name}")

    def _namespace_path(self, namespace: str) -> Tuple[Path, Path]:
        index_file = self.index_path / f"{namespace}.index"
        chunks_file = self.index_path / f"{namespace}_chunks.json"
        return index_file, chunks_file

    async def embed_texts(self, texts: List[str]) -> np.ndarray:
        if not self.model:
            raise RuntimeError("Embedding model not initialized")
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None,
            lambda: self.model.encode(texts, show_progress_bar=False, batch_size=32)
        )
        return np.array(embeddings, dtype=np.float32)

    async def add_documents(
        self,
        namespace: str,
        chunks: List[Dict[str, Any]],
    ) -> int:
        """Add document chunks to FAISS index under a namespace."""
        if not FAISS_AVAILABLE or not self.model:
            logger.warning("FAISS unavailable — skipping indexing")
            return 0

        texts = [chunk["content"] for chunk in chunks]
        embeddings = await self.embed_texts(texts)

        index_file, chunks_file = self._namespace_path(namespace)

        # Load or create index
        if index_file.exists():
            index = faiss.read_index(str(index_file))
            existing_chunks = json.loads(chunks_file.read_text())
        else:
            index = faiss.IndexFlatIP(self.dimension)  # Inner product (cosine after normalize)
            existing_chunks = []

        # Normalize for cosine similarity
        faiss.normalize_L2(embeddings)

        # Add to index
        index.add(embeddings)
        faiss.write_index(index, str(index_file))

        # Save chunk metadata
        for i, chunk in enumerate(chunks):
            existing_chunks.append({
                "id": len(existing_chunks) + i,
                "content": chunk["content"],
                "source": chunk.get("source", ""),
                "page": chunk.get("page", 0),
                "doc_id": chunk.get("doc_id"),
                "user_id": chunk.get("user_id"),
            })

        chunks_file.write_text(json.dumps(existing_chunks, ensure_ascii=False, indent=2))
        logger.info(f"Indexed {len(texts)} chunks in namespace '{namespace}'")
        return len(texts)

    async def search(
        self,
        namespace: str,
        query: str,
        top_k: int = 5,
        score_threshold: float = 0.3,
    ) -> List[Dict[str, Any]]:
        """Search for similar chunks in a namespace."""
        if not FAISS_AVAILABLE or not self.model:
            return []

        index_file, chunks_file = self._namespace_path(namespace)
        if not index_file.exists() or not chunks_file.exists():
            return []

        # Embed query
        query_embedding = await self.embed_texts([query])
        faiss.normalize_L2(query_embedding)

        # Load index and search
        loop = asyncio.get_event_loop()
        index = await loop.run_in_executor(None, lambda: faiss.read_index(str(index_file)))
        k = min(top_k, index.ntotal)
        if k == 0:
            return []

        distances, indices = await loop.run_in_executor(
            None, lambda: index.search(query_embedding, k)
        )

        # Load chunks
        chunks = json.loads(chunks_file.read_text())
        results = []

        for dist, idx in zip(distances[0], indices[0]):
            if idx == -1 or dist < score_threshold:
                continue
            chunk = chunks[idx].copy()
            chunk["score"] = float(dist)
            results.append(chunk)

        return sorted(results, key=lambda x: x["score"], reverse=True)

    async def delete_document(self, namespace: str) -> bool:
        """Remove all index files for a namespace."""
        index_file, chunks_file = self._namespace_path(namespace)
        deleted = False
        for f in [index_file, chunks_file]:
            if f.exists():
                f.unlink()
                deleted = True
        return deleted

    def namespace_exists(self, namespace: str) -> bool:
        index_file, _ = self._namespace_path(namespace)
        return index_file.exists()

    async def get_stats(self, namespace: str) -> Dict[str, Any]:
        index_file, chunks_file = self._namespace_path(namespace)
        if not index_file.exists():
            return {"exists": False, "chunk_count": 0}
        chunks = json.loads(chunks_file.read_text()) if chunks_file.exists() else []
        return {"exists": True, "chunk_count": len(chunks)}


# ─── Singleton ──────────────────────────────────────────────────────────────────

from app.core.config import settings

faiss_store = FAISSVectorStore(
    index_path=settings.FAISS_INDEX_PATH,
    model_name=settings.EMBEDDING_MODEL,
)
