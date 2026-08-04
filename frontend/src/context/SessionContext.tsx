import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AnalysisResult, RecommendationResponse, OutfitPreviewResponse } from "@/types";
import { getLatestAnalysis, getLatestRecommendation, getLatestPreview } from "@/services/api";

const SESSION_STORAGE_KEY = "visionstyle_session_id";

function generateSessionId(): string {
  return `sess_${crypto.randomUUID().replace(/-/g, "")}`;
}

interface SessionContextValue {
  sessionId: string;
  analysis: AnalysisResult | null;
  recommendation: RecommendationResponse | null;
  preview: OutfitPreviewResponse | null;
  setAnalysis: (a: AnalysisResult | null) => void;
  setRecommendation: (r: RecommendationResponse | null) => void;
  setPreview: (p: OutfitPreviewResponse | null) => void;
  resetSession: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string>(() => {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const fresh = generateSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, fresh);
    return fresh;
  });

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [preview, setPreview] = useState<OutfitPreviewResponse | null>(null);

  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);

    // Hydrate in-memory session state from the backend so a page refresh
    // (or landing directly on Recommendations/Analytics) doesn't lose
    // previously generated results for this session.
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled([
        getLatestAnalysis(sessionId),
        getLatestRecommendation(sessionId),
        getLatestPreview(sessionId),
      ]);
      if (cancelled) return;
      if (results[0].status === "fulfilled") setAnalysis(results[0].value);
      if (results[1].status === "fulfilled") setRecommendation(results[1].value);
      if (results[2].status === "fulfilled") setPreview(results[2].value);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const resetSession = () => {
    const fresh = generateSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, fresh);
    setSessionId(fresh);
    setAnalysis(null);
    setRecommendation(null);
    setPreview(null);
  };

  const value = useMemo(
    () => ({
      sessionId,
      analysis,
      recommendation,
      preview,
      setAnalysis,
      setRecommendation,
      setPreview,
      resetSession,
    }),
    [sessionId, analysis, recommendation, preview]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
