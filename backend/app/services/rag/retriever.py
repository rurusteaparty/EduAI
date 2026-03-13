from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class RAGRetriever:
    """
    Retrieves relevant document chunks from FAISS for a given query.
    Used to ground AI responses in uploaded documents.
    """

    async def retrieve(
        self,
        query: str,
        document_id: int,
        user_id: int,
        top_k: int = 5,
        score_threshold: float = 0.25,
    ) -> List[Dict[str, Any]]:
        from app.services.rag.vector_store import faiss_store

        namespace = f"user_{user_id}_doc_{document_id}"

        if not faiss_store.namespace_exists(namespace):
            logger.warning(f"Namespace not found: {namespace}")
            return []

        results = await faiss_store.search(
            namespace=namespace,
            query=query,
            top_k=top_k,
            score_threshold=score_threshold,
        )

        # Format for consumption by TutorService
        return [
            {
                "content": r["content"],
                "source": r.get("source", "Document"),
                "page": r.get("page", 0),
                "score": r.get("score", 0.0),
                "chunk_index": r.get("chunk_index", 0),
            }
            for r in results
        ]

    async def retrieve_from_multiple(
        self,
        query: str,
        document_ids: List[int],
        user_id: int,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Retrieve from multiple documents and merge results."""
        from app.services.rag.vector_store import faiss_store

        all_results = []
        per_doc_k = max(2, top_k // len(document_ids))

        for doc_id in document_ids:
            namespace = f"user_{user_id}_doc_{doc_id}"
            results = await faiss_store.search(
                namespace=namespace,
                query=query,
                top_k=per_doc_k,
            )
            all_results.extend(results)

        # Deduplicate and sort by score
        seen = set()
        unique = []
        for r in sorted(all_results, key=lambda x: x.get("score", 0), reverse=True):
            key = r["content"][:100]
            if key not in seen:
                seen.add(key)
                unique.append(r)

        return unique[:top_k]
