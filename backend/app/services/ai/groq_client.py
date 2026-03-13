"""
Shared Groq client — used by tutor, hallucination detector,
flashcard generator, quiz generator, and quiz evaluator.

Free tier model: llama-3.3-70b-versatile
Rate limits (free): 30 req/min, 14,400 req/day, 6,000 tokens/min
"""
from groq import AsyncGroq
from app.core.config import settings

# Singleton async client
_client: AsyncGroq | None = None


def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY is not set.\n"
                "Get a free key at https://console.groq.com → API Keys\n"
                "Then add it to backend/.env"
            )
        _client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _client


async def chat_complete(
    messages: list[dict],
    system: str = "",
    temperature: float | None = None,
    max_tokens: int | None = None,
    json_mode: bool = False,
) -> tuple[str, int]:
    """
    Call Groq chat completion.
    Returns (response_text, total_tokens).
    """
    client = get_groq_client()

    kwargs: dict = {
        "model":       settings.AI_MODEL,
        "max_tokens":  max_tokens or settings.AI_MAX_TOKENS,
        "temperature": temperature if temperature is not None else settings.AI_TEMPERATURE,
        "messages":    [{"role": "system", "content": system}, *messages] if system else messages,
    }

    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    resp  = await client.chat.completions.create(**kwargs)
    text  = resp.choices[0].message.content or ""
    tokens = (resp.usage.prompt_tokens or 0) + (resp.usage.completion_tokens or 0)
    return text, tokens
