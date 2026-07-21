"""Tracking de consommation tokens et estimation de coût pour chaque appel LLM.

Deux points d'entrée :
  - UsageTrackerCallback : callback LangChain branché sur _get_llm()
  - track_anthropic_sdk_usage : pour les appels directs via le SDK Anthropic (compte_rendu.py)
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from langchain_core.callbacks import AsyncCallbackHandler
from langchain_core.outputs import LLMResult

logger = logging.getLogger(__name__)

# ── Grille tarifaire (USD / million de tokens) ────────────────────────────────

_PRICING: dict[str, tuple[float, float]] = {
    # Anthropic — (input, output)
    "claude-opus-4-7":   (15.00, 75.00),
    "claude-opus-4-5":   (15.00, 75.00),
    "claude-sonnet-4-6": (3.00,  15.00),
    "claude-sonnet-4-5": (3.00,  15.00),
    "claude-haiku-4-5":  (0.80,   4.00),
    # OpenAI
    "gpt-4o":            (2.50,  10.00),
    "gpt-4o-mini":       (0.15,   0.60),
    "gpt-4-turbo":       (10.00, 30.00),
    "o1":                (15.00, 60.00),
    "o1-mini":           (3.00,  12.00),
    # DeepSeek (tarif cache miss)
    "deepseek-v4-flash": (0.07,   0.28),
    "deepseek-v4-pro":   (0.27,   1.10),
}


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Retourne le coût estimé en USD selon la grille tarifaire connue."""
    price = _PRICING.get(model)
    if not price:
        return 0.0
    in_price, out_price = price
    return round((input_tokens * in_price + output_tokens * out_price) / 1_000_000, 8)


async def _persist(provider: str, model: str, context: str,
                   input_tokens: int, output_tokens: int) -> None:
    """Enregistre un log de consommation en base — fire-and-forget."""
    try:
        from app.infrastructure.db.models.ai_usage import AiUsageLogOrm
        cost = estimate_cost(model, input_tokens, output_tokens)
        await AiUsageLogOrm.create(
            provider=provider,
            model=model,
            context=context,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            cost_usd=cost,
        )
        logger.debug(
            "ai_usage.tracked provider=%s model=%s ctx=%s in=%d out=%d cost=$%.6f",
            provider, model, context, input_tokens, output_tokens, cost,
        )
    except Exception:
        logger.exception("ai_usage.persist.failed provider=%s model=%s", provider, model)


# ── Callback LangChain ────────────────────────────────────────────────────────

class UsageTrackerCallback(AsyncCallbackHandler):
    """Callback branché sur le LLM LangChain.

    Intercepte chaque fin d'appel et extrait les tokens depuis llm_output,
    quel que soit le provider (Anthropic, OpenAI, Groq, DeepSeek).
    """

    def __init__(self, provider: str, model: str, context: str = "unknown") -> None:
        self.provider = provider
        self.model    = model
        self.context  = context

    async def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        try:
            input_tokens = output_tokens = 0
            llm_output = response.llm_output or {}

            # Format Anthropic : {"usage": {"input_tokens": X, "output_tokens": Y}}
            if "usage" in llm_output:
                u = llm_output["usage"]
                input_tokens  = int(u.get("input_tokens", 0) or 0)
                output_tokens = int(u.get("output_tokens", 0) or 0)

            # Format OpenAI / DeepSeek / Groq : {"token_usage": {"prompt_tokens": X, "completion_tokens": Y}}
            elif "token_usage" in llm_output:
                u = llm_output["token_usage"]
                input_tokens  = int(u.get("prompt_tokens", 0) or 0)
                output_tokens = int(u.get("completion_tokens", 0) or 0)

            if input_tokens == 0 and output_tokens == 0:
                return

            asyncio.create_task(
                _persist(self.provider, self.model, self.context, input_tokens, output_tokens)
            )
        except Exception:
            logger.exception("ai_usage.callback.failed")


# ── SDK Anthropic direct (compte_rendu.py) ────────────────────────────────────

def track_anthropic_sdk_usage(response: Any, model: str, context: str = "cr") -> None:
    """À appeler juste après un appel SDK Anthropic synchrone.

    response : objet retourné par client.messages.create()
    Crée une tâche asyncio si une boucle est disponible (depuis asyncio.to_thread).
    """
    try:
        usage = getattr(response, "usage", None)
        if usage is None:
            return
        input_tokens  = int(getattr(usage, "input_tokens",  0) or 0)
        output_tokens = int(getattr(usage, "output_tokens", 0) or 0)
        if input_tokens == 0 and output_tokens == 0:
            return
        # On est dans un thread (asyncio.to_thread) → on schedule la coroutine
        loop = asyncio.get_event_loop()
        asyncio.run_coroutine_threadsafe(
            _persist("anthropic", model, context, input_tokens, output_tokens),
            loop,
        )
    except Exception:
        logger.exception("ai_usage.sdk_track.failed model=%s", model)
