"""
Quiz Generator — BUG FIX: _get_doc_context now scoped to user_{user_id}_doc_{doc_id}
to prevent cross-user data leakage (was using glob user_* which returned any user's data).
"""
import json, re
from typing import List, Dict, Any, Optional
from app.services.ai.groq_client import chat_complete
from app.core.config import settings

PROMPT = """\
You are an expert educational assessment designer.
Generate exactly {count} quiz questions for:
  Subject: {subject_mode}, Difficulty: {difficulty_level}, Topic: {topic}, Types: {types}
{context_section}
MCQ: 4 options "A. ..." etc, one correct. True/False: options ["True","False"]. Short Answer: options null.
Points: beginner=5, intermediate=10, advanced=15
Return ONLY a valid JSON array:
[{{"type":"mcq","question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correct_answer":"A. ...","explanation":"...","points":10}}]
No markdown, no text outside the array."""

CONTEXT_TMPL = "\nSource material:\n---\n{context}\n---\nBase all questions on this content."


class QuizGenerator:

    async def generate(
        self, topic: Optional[str], document_id: Optional[int],
        subject_mode: str, difficulty_level: str, count: int = 10,
        question_types: List[str] = None, user_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        if not question_types:
            question_types = ["mcq"]
        context_section = ""
        # BUG FIX: pass user_id — only read that user's document chunks
        if document_id and user_id:
            ctx = self._get_doc_context(document_id, user_id)
            if ctx:
                context_section = CONTEXT_TMPL.format(context=ctx[:3000])
        prompt = PROMPT.format(
            count=count, subject_mode=subject_mode, difficulty_level=difficulty_level,
            topic=topic or "general knowledge", types=", ".join(question_types),
            context_section=context_section,
        )
        raw, _ = await chat_complete(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4, max_tokens=min(4096, count * 200), json_mode=True,
        )
        return self._parse(raw, count)

    def _parse(self, raw: str, count: int) -> List[Dict]:
        raw = re.sub(r"```json|```", "", raw).strip()
        try:
            qs = json.loads(raw)
            if isinstance(qs, dict):
                qs = next((v for v in qs.values() if isinstance(v, list)), [])
            validated = []
            for q in qs:
                if not isinstance(q, dict) or "question" not in q or "correct_answer" not in q:
                    continue
                validated.append({
                    "type": q.get("type", "mcq"), "question": str(q["question"]).strip(),
                    "options": q.get("options"), "correct_answer": str(q["correct_answer"]).strip(),
                    "explanation": q.get("explanation", ""), "points": int(q.get("points", 10)),
                })
            return validated[:count]
        except Exception:
            m = re.search(r"\[.*\]", raw, re.DOTALL)
            if m:
                try:
                    return self._parse(m.group(), count)
                except Exception:
                    pass
            return []

    # BUG FIX: exact user-scoped path — was glob("user_*_doc_N") leaking other users' data
    def _get_doc_context(self, document_id: int, user_id: int) -> str:
        try:
            path = f"{settings.FAISS_INDEX_PATH}/user_{user_id}_doc_{document_id}_chunks.json"
            with open(path, "r") as f:
                chunks = json.load(f)
            return "\n\n".join(c["content"] for c in chunks[:15])
        except Exception:
            return ""
