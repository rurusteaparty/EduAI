"""
AI Tutor Service — powered by Groq (llama-3.3-70b-versatile, free tier).
Supports Science / Arts / General modes x Beginner / Intermediate / Advanced.
Optionally augments answers with RAG-retrieved document chunks.
"""
from typing import Optional, List, Dict, Any
from app.services.ai.groq_client import chat_complete
from app.services.rag.retriever import RAGRetriever
from app.core.config import settings

retriever = RAGRetriever()

SYSTEM_PROMPTS = {
    "science": {
        "beginner": (
            "You are EduAI, a warm and patient science tutor for beginners. "
            "Use simple everyday language, concrete analogies, avoid jargon. "
            "Break concepts into small steps. Cover: Maths, Physics, Chemistry, Biology, CS. "
            "End each answer with one follow-up question to check understanding."
        ),
        "intermediate": (
            "You are EduAI, a knowledgeable science tutor for intermediate students. "
            "Use technical terms with brief explanations. Connect ideas across disciplines. "
            "Show problem-solving strategies, not just final answers. Use equations and worked examples."
        ),
        "advanced": (
            "You are EduAI, an expert science tutor for advanced students. "
            "Engage at near-university level with full mathematical rigour. "
            "Reference derivations, edge cases, and current research. "
            "Challenge assumptions and encourage first-principles reasoning."
        ),
    },
    "arts": {
        "beginner": (
            "You are EduAI, a friendly arts and humanities tutor for beginners. "
            "Make History, Literature, Philosophy, and Social Sciences accessible. "
            "Use storytelling and vivid examples. Celebrate multiple interpretations."
        ),
        "intermediate": (
            "You are EduAI, a thoughtful humanities tutor for intermediate learners. "
            "Introduce theoretical frameworks, compare schools of thought, "
            "and develop analytical writing skills."
        ),
        "advanced": (
            "You are EduAI, a scholarly humanities tutor for advanced students. "
            "Engage with critical theory, historiography, and philosophical rigour. "
            "Debate interpretations with evidence. Reference primary sources."
        ),
    },
    "general": {
        "beginner":     "You are EduAI, a supportive all-subjects tutor. Explain clearly, use simple language, step-by-step guidance. Be encouraging.",
        "intermediate": "You are EduAI, a capable all-subjects tutor. Build on existing knowledge, use structured explanations.",
        "advanced":     "You are EduAI, an expert-level tutor. Engage rigorously, challenge assumptions, point to open questions.",
    },
}

RAG_INJECTION = """
---
DOCUMENT CONTEXT (retrieved from student's uploaded file):
{context}
---
Ground your answer in the above context. If drawing on outside knowledge, say so clearly.
"""


class TutorService:

    async def generate_response(
        self,
        user_message: str,
        history: List[Dict[str, str]],
        subject_mode: str = "general",
        difficulty_level: str = "beginner",
        document_id: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> Dict[str, Any]:

        system = (
            SYSTEM_PROMPTS
            .get(subject_mode, SYSTEM_PROMPTS["general"])
            .get(difficulty_level, SYSTEM_PROMPTS["general"]["beginner"])
        )
        sources: List[Dict] = []

        if document_id and user_id:
            try:
                sources = await retriever.retrieve(
                    query=user_message,
                    document_id=document_id,
                    user_id=user_id,
                    top_k=settings.RAG_TOP_K,
                )
                if sources:
                    ctx = "\n\n---\n\n".join(
                        f"[Source {i+1} - {s['source']} p.{s['page']}]\n{s['content']}"
                        for i, s in enumerate(sources)
                    )
                    system += RAG_INJECTION.format(context=ctx)
            except Exception:
                pass

        messages = [
            {"role": m["role"], "content": m["content"]}
            for m in history[-10:]
        ]

        content, tokens = await chat_complete(
            messages=messages,
            system=system,
            temperature=settings.AI_TEMPERATURE,
            max_tokens=settings.AI_MAX_TOKENS,
        )

        return {
            "content":     content,
            "sources":     sources,
            "tokens_used": tokens,
            "model":       settings.AI_MODEL,
        }
