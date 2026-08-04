"""Phase 14 — extension point for a physical Smart Mirror deployment.

A smart mirror is, architecturally, just another API client: a camera
feed replaces the file upload in `POST /api/v1/analysis`, and the
existing composite/VTON preview pipeline renders back to the mirror's
display instead of a browser. The one new capability a mirror needs that
a browser client doesn't is *continuous* frame analysis rather than a
single upload — that streaming contract is what this adapter defines,
so it can be implemented as a WebSocket endpoint later without
redesigning the CV pipeline itself (`app/services/cv/analyzer.py` already
takes a raw BGR frame and is reusable as-is).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator

import numpy as np

from app.models.schemas import AnalysisResult


class SmartMirrorStreamAdapter(ABC):
    @abstractmethod
    async def stream_analysis(self, frames: AsyncIterator[np.ndarray], session_id: str) -> AsyncIterator[AnalysisResult]:
        """Continuously analyze incoming camera frames, yielding updated results
        as detection confidence changes (e.g. the shopper turns or steps back)."""
        raise NotImplementedError


class NotConfiguredSmartMirrorAdapter(SmartMirrorStreamAdapter):
    async def stream_analysis(self, frames: AsyncIterator[np.ndarray], session_id: str) -> AsyncIterator[AnalysisResult]:
        raise NotImplementedError(
            "Smart Mirror streaming is not yet implemented. Wire a WebSocket endpoint that feeds "
            "frames into app.services.cv.analyzer.vision_analyzer and yields results here."
        )
        yield  # pragma: no cover — makes this an async generator for the ABC contract
