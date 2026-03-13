"""
Flashcard Generator — BUG FIX: _get_doc_context scoped to user_{user_id}_doc_{doc_id}.
"""
import json, re
from typing import List, Dict, Any, Optional
from app.services.ai.groq_client import chat_complete
from app.core.config import settings

PROMPT = """\
You are an expert educational content creator specialising in spaced-repetition flashcards.
Generate exactly {count} flashcards for:
  Subject: {subject_mode}, Difficulty: {difficulty_level}, Topic: {topic}
{context_section}
Rules: 1 concept per card. Front: question/term. Back: answer + brief explanation. Hint: clue (can be null).
Return ONLY a valid JSON array of {count} objects:
[{{"front":"...","back":"...","hint":"..."}}]
No markdown, no explanation outside the array."""

CONTEXT_TMPL = "\nSource material:\n---\n{context}\n---"


class FlashcardGenerator:

    async def generate(
        self, topic: Optional[str], document_id: Optional[int],
        subject_mode: str, difficulty_level: str, count: int = 10,
        user_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        context_section = ""
        # BUG FIX: scoped to user's own namespace
        if document_id and user_id:
            ctx = self._get_doc_context(document_id, user_id)
            if ctx:
                context_section = CONTEXT_TMPL.format(context=ctx[:3000])
        prompt = PROMPT.format(
            count=count, subject_mode=subject_mode, difficulty_level=difficulty_level,
            topic=topic or "key concepts", context_section=context_section,
        )
        raw, _ = await chat_complete(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6, max_tokens=min(4096, count * 120), json_mode=True,
        )
        return self._parse(raw, count)

    def _parse(self, raw: str, count: int) -> List[Dict]:
        raw = re.sub(r"```json|```", "", raw).strip()
        try:
            cards = json.loads(raw)
            if isinstance(cards, dict):
                cards = next((v for v in cards.values() if isinstance(v, list)), [])
            return [
                {"front": str(c["front"]).strip(), "back": str(c["back"]).strip(), "hint": c.get("hint")}
                for c in cards if isinstance(c, dict) and "front" in c and "back" in c
            ][:count]
        except Exception:
            m = re.search(r"\[.*\]", raw, re.DOTALL)
            if m:
                try:
                    return self._parse(m.group(), count)
                except Exception:
                    pass
            return []

    # BUG FIX: exact path — was glob("user_*_doc_N") which leaked other users' data
    def _get_doc_context(self, document_id: int, user_id: int) -> str:
        try:
            path = f"{settings.FAISS_INDEX_PATH}/user_{user_id}_doc_{document_id}_chunks.json"
            with open(path, "r") as f:
                chunks = json.load(f)
            return "\n\n".join(c["content"] for c in chunks[:12])
        except Exception:
            return ""
