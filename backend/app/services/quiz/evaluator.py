"""
Quiz Evaluator — Groq free tier.
MCQ / True-False: exact string match.
Short Answer: AI semantic evaluation via Groq.
"""
import json
import re
from typing import List, Dict, Any
from app.services.ai.groq_client import chat_complete

EVAL_PROMPT = """\
You are an educational assessment grader. Evaluate each short-answer response.

Award full credit if the answer is correct (exact or paraphrase).
Award half credit if partially correct.
Award zero if incorrect.

Questions:
{questions_json}

Return ONLY a JSON array — one object per question:
[
  {{
    "id": "<question_id>",
    "is_correct": true,
    "points_earned": 10,
    "points_possible": 10,
    "correct_answer": "expected answer",
    "ai_feedback": "brief personalised feedback",
    "explanation": "full explanation"
  }}
]"""


class QuizEvaluator:

    async def evaluate(
        self,
        questions: List[Any],
        user_answers: Dict[str, str],
    ) -> Dict[str, Any]:

        total_points  = sum(q.points for q in questions)
        earned_points = 0
        detailed      : Dict[str, Any] = {}
        feedback      : Dict[str, Any] = {}
        short_qs      : List[Dict]     = []

        for q in questions:
            qid = str(q.id)
            ans = (user_answers.get(qid) or "").strip()

            if q.question_type in ("mcq", "true_false"):
                correct = self._match(ans, q.correct_answer)
                pts     = q.points if correct else 0
                earned_points += pts
                detailed[qid] = {
                    "user_answer":    ans,
                    "correct_answer": q.correct_answer,
                    "is_correct":     correct,
                    "points_earned":  pts,
                    "points_possible": q.points,
                    "explanation":    q.explanation or "",
                }
                feedback[qid] = {
                    "correct":        correct,
                    "explanation":    q.explanation or "",
                    "correct_answer": q.correct_answer,
                }
            else:
                short_qs.append({
                    "id":          qid,
                    "question":    q.question_text,
                    "expected":    q.correct_answer,
                    "user_answer": ans,
                    "points":      q.points,
                    "explanation": q.explanation or "",
                })

        # Batch-evaluate short answers via Groq
        if short_qs:
            sa_results = await self._grade_short_answers(short_qs)
            for r in sa_results:
                qid = r["id"]
                pts = int(r.get("points_earned", 0))
                earned_points += pts
                detailed[qid] = r
                feedback[qid] = {
                    "correct":        r["is_correct"],
                    "explanation":    r.get("explanation", ""),
                    "correct_answer": r.get("correct_answer", ""),
                    "ai_feedback":    r.get("ai_feedback", ""),
                }

        score = round((earned_points / total_points * 100) if total_points else 0, 1)
        return {
            "score":            score,
            "total_points":     total_points,
            "earned_points":    earned_points,
            "detailed_answers": detailed,
            "feedback":         feedback,
        }

    def _match(self, user: str, correct: str) -> bool:
        def norm(s: str) -> str:
            return re.sub(r"^[A-Da-d][.)\s]\s*", "", s).lower().strip().rstrip(".")
        if norm(user) == norm(correct):
            return True
        # Match by leading option letter (A/B/C/D)
        ul = (user[0].upper()  if user    else "")
        cl = (correct[0].upper() if correct else "")
        if ul and cl and ul == cl and (len(correct) < 2 or correct[1] in (". ", ")")):
            return True
        return False

    async def _grade_short_answers(self, questions: List[Dict]) -> List[Dict]:
        prompt = EVAL_PROMPT.format(questions_json=json.dumps(questions, indent=2))
        try:
            raw, _ = await chat_complete(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1500,
                json_mode=True,
            )
            raw = re.sub(r"```json|```", "", raw).strip()
            results = json.loads(raw)
            if isinstance(results, dict):
                results = next((v for v in results.values() if isinstance(v, list)), [])
            return results if isinstance(results, list) else []
        except Exception:
            return [
                {
                    "id":              q["id"],
                    "is_correct":      False,
                    "points_earned":   0,
                    "points_possible": q["points"],
                    "correct_answer":  q["expected"],
                    "ai_feedback":     "Could not auto-grade. Review manually.",
                    "explanation":     q.get("explanation", ""),
                }
                for q in questions
            ]
