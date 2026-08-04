"""Phase 14 — extension point for an AI styling chatbot.

Mirrors the `VTONEngine` pluggable-adapter pattern used for virtual
try-on (see `app/services/outfit_preview/vton_adapter.py`): define the
contract now, wire a real LLM-backed implementation later without
touching API routes.

Production wiring would call an LLM (e.g. via the Anthropic API) with a
system prompt grounded in the shopper's current `AnalysisResult` /
`RecommendationResponse` (already available via `session_service`) so the
chatbot can answer "why does this suit me?" or "show me something bolder"
using the same signals the recommendation engine used — not a generic
fashion chatbot with no knowledge of the shopper's actual profile.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from app.models.schemas import AnalysisResult, RecommendationResponse


class ChatbotAdapter(ABC):
    @abstractmethod
    async def reply(
        self,
        message: str,
        conversation_history: list[dict[str, str]],
        analysis: AnalysisResult | None,
        recommendation: RecommendationResponse | None,
    ) -> str:
        """Return a grounded reply using the shopper's own analysis/recommendation context."""
        raise NotImplementedError


class NotConfiguredChatbotAdapter(ChatbotAdapter):
    """Default no-op adapter until an LLM provider is configured."""

    async def reply(
        self,
        message: str,
        conversation_history: list[dict[str, str]],
        analysis: AnalysisResult | None,
        recommendation: RecommendationResponse | None,
    ) -> str:
        raise NotImplementedError(
            "AI chatbot is not yet configured. Implement ChatbotAdapter.reply() with an LLM "
            "provider (e.g. the Anthropic API) and register it in place of NotConfiguredChatbotAdapter."
        )
