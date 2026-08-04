"""Phase 14 — extension point for a voice assistant ("Hey VisionStyle...").

A production implementation would sit in front of `ChatbotAdapter`
(chatbot_adapter.py): speech-to-text on the way in, the same grounded
chat reasoning, then text-to-speech on the way out. Kept as a distinct
adapter so a native mobile app (Phase 14 — mobile-ready API) can call
speech transcription directly without round-tripping through this server
if on-device STT is available.
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class VoiceAssistantAdapter(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, mime_type: str) -> str:
        """Speech-to-text for a voice query."""
        raise NotImplementedError

    @abstractmethod
    async def synthesize(self, text: str) -> bytes:
        """Text-to-speech for a spoken reply."""
        raise NotImplementedError


class NotConfiguredVoiceAssistantAdapter(VoiceAssistantAdapter):
    async def transcribe(self, audio_bytes: bytes, mime_type: str) -> str:
        raise NotImplementedError(
            "Voice assistant is not yet configured. Implement transcribe() with a speech-to-text "
            "provider and register it here."
        )

    async def synthesize(self, text: str) -> bytes:
        raise NotImplementedError(
            "Voice assistant is not yet configured. Implement synthesize() with a text-to-speech "
            "provider and register it here."
        )
