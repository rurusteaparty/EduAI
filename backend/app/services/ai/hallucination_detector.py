"""
Hallucination Detection — Groq free tier.
Uses a separate low-temperature call to independently verify
every AI response before showing it to the student.
"""
import json
import re
from typing import Dict, Any, List
from app.services.ai.groq_client import chat_complete
from app.core.config import settings

VERIFY_PROMPT = """\
You are a strict fact-verification engine inside an educational AI.

Analyse the AI response below and return ONLY a JSON object — no markdown, no preamble.

Student query:
{query}

AI response to verify:
{response}

Source context available (if any):
{sources}

Return exactly:
{{
  "confidence_score": <float 0.0-1.0>,
  "is_hallucination": <true|false>,
  "status": "<verified|unverified|flagged>",
  "reasoning": "<one sentence>",
  "flagged_claims": ["<claim>"],
  "verified_claims": ["<claim>"]
}}

Scoring:
0.90-1.00 All claims verifiable, no fabrications
0.75-0.89 Mostly accurate, minor unsupported details
0.50-0.74 Several unverifiable claims
0.00-0.49 Major hallucinations detected

ONLY output the JSON object."""


class HallucinationDetector:
    def __init__(self):
        self.enabled   = settings.VERIFICATION_ENABLED
        self.threshold = settings.CONFIDENCE_THRESHOLD

    async def analyze(
        self,
        response: str,
        sources: List[Dict[str, Any]],
        query: str,
    ) -> Dict[str, Any]:
        if not self.enabled:
            return self._default()

        try:
            sources_text = (
                "\n\n".join(f"{s.get('source','?')}: {s.get('content','')}" for s in sources)
                if sources else "None — response based on general knowledge."
            )

            prompt = VERIFY_PROMPT.format(
                query=query,
                response=response[:2000],   # trim to avoid token limits
                sources=sources_text[:1500],
            )

            raw, _ = await chat_complete(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,   # deterministic for fact-checking
                max_tokens=512,
                json_mode=True,
            )

            # Strip any accidental markdown fences
            raw = re.sub(r"```json|```", "", raw).strip()
            data = json.loads(raw)

            confidence       = float(data.get("confidence_score", 0.85))
            is_hallucination = confidence < self.threshold or bool(data.get("is_hallucination", False))

            return {
                "confidence_score":  round(confidence, 3),
                "is_hallucination":  is_hallucination,
                "status":            "flagged" if is_hallucination else data.get("status", "verified"),
                "reasoning":         data.get("reasoning", ""),
                "flagged_claims":    data.get("flagged_claims", []),
                "verified_claims":   data.get("verified_claims", []),
            }

        except Exception as e:
            return self._default(str(e))

    def _default(self, error: str = "") -> Dict[str, Any]:
        return {
            "confidence_score": 0.85,
            "is_hallucination": False,
            "status":           "unverified",
            "reasoning":        error or "Verification skipped.",
            "flagged_claims":   [],
            "verified_claims":  [],
        }
