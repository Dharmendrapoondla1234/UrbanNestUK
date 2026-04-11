"""
UrbanNest AI — Gemini 2.0 Flash Client (Python)
Fixed model: v1beta/gemini-2.0-flash — the working free-tier model.
v1/gemini-1.5-flash-latest is DEPRECATED and returns 404.
"""
import os as _os, sys as _sys
_backend_dir = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
if _backend_dir not in _sys.path:
    _sys.path.insert(0, _backend_dir)

import os
import json
import asyncio
import logging
import httpx
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── Correct working model endpoints (priority order) ───────────────
GEMINI_MODELS = [
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
]

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")


class GeminiError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


async def call_gemini(
    prompt: str,
    *,
    json_mode: bool = False,
    temperature: float = None,
    max_tokens: int = 2048,
    timeout: float = 20.0,
) -> Any:
    """
    Call Gemini API with automatic model fallback.
    Returns parsed JSON if json_mode=True, else raw text string.
    """
    if not GEMINI_API_KEY:
        raise GeminiError("API_KEY_MISSING",
            "GEMINI_API_KEY not set. Get a free key at aistudio.google.com")

    temp = temperature if temperature is not None else (0.1 if json_mode else 0.7)

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temp,
            "maxOutputTokens": max_tokens,
        },
    }

    last_error = None
    async with httpx.AsyncClient(timeout=timeout) as client:
        for model_url in GEMINI_MODELS:
            try:
                url = f"{model_url}?key={GEMINI_API_KEY}"
                r = await client.post(url, json=payload)

                if r.status_code in (404, 400):
                    # Model unavailable — try next
                    body = r.json()
                    msg = body.get("error", {}).get("message", f"HTTP {r.status_code}")
                    logger.warning(f"Model {model_url} unavailable: {msg}")
                    last_error = GeminiError("MODEL_NOT_FOUND", msg)
                    continue

                if r.status_code == 403:
                    body = r.json()
                    msg = body.get("error", {}).get("message", "Forbidden")
                    raise GeminiError("AUTH_FAILED",
                        f"API key invalid or API not enabled: {msg}. "
                        "Enable 'Generative Language API' in Google Cloud Console.")

                if r.status_code == 429:
                    raise GeminiError("RATE_LIMITED",
                        "Rate limit reached (60 req/min on free tier). Retry after 1 second.")

                if not r.is_success:
                    body = r.json()
                    msg = body.get("error", {}).get("message", f"HTTP {r.status_code}")
                    last_error = GeminiError("API_ERROR", msg)
                    continue

                data = r.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]

                if not json_mode:
                    return text.strip()

                # Parse JSON response
                clean = (text
                    .replace("```json", "")
                    .replace("```", "")
                    .strip())
                try:
                    return json.loads(clean)
                except json.JSONDecodeError:
                    # Try to extract JSON object/array
                    import re
                    m = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', clean)
                    if m:
                        return json.loads(m.group(1))
                    raise GeminiError("JSON_PARSE_ERROR",
                        "Gemini returned invalid JSON. Try again.")

            except GeminiError:
                raise
            except httpx.TimeoutException:
                last_error = GeminiError("TIMEOUT", f"Request timed out after {timeout}s")
                continue
            except Exception as e:
                last_error = GeminiError("NETWORK_ERROR", str(e))
                continue

    raise last_error or GeminiError("ALL_MODELS_FAILED",
        "All Gemini models failed. Check your API key and network.")


def call_gemini_sync(prompt: str, **kwargs) -> Any:
    """Synchronous wrapper for use in Celery tasks."""
    return asyncio.run(call_gemini(prompt, **kwargs))
