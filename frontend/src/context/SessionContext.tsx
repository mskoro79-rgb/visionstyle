import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AnalysisResult, RecommendationResponse, OutfitPreviewResponse, CatalogItem } from "@/types";
import { getLatestAnalysis, getLatestRecommendation, getLatestPreview } from "@/services/api";

const SESSION_STORAGE_KEY = "visionstyle_session_id";
const RECENTLY_VIEWED_KEY = "visionstyle_recently_viewed"; // sessionStorage — cleared when the tab closes
const RECENTLY_VIEWED_LIMIT = 12;

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
  recentlyViewed: CatalogItem[];
  addRecentlyViewed: (item: CatalogItem) => void;
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
  const [recentlyViewed, setRecentlyViewed] = useState<CatalogItem[]>(() => {
    try {
      const raw = sessionStorage.getItem(RECENTLY_VIEWED_KEY);
      return raw ? (JSON.parse(raw) as CatalogItem[]) : [];
    } catch {
      return [];
    }
  });

  const addRecentlyViewed = (item: CatalogItem) => {
    setRecentlyViewed((prev) => {
      const next = [item, ...prev.filter((i) => i.sku !== item.sku)].slice(0, RECENTLY_VIEWED_LIMIT);
      try {
        sessionStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
      } catch {
        // sessionStorage unavailable — in-memory state still updates for this tab
      }
      return next;
    });
  };

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
      recentlyViewed,
      addRecentlyViewed,
    }),
    [sessionId, analysis, recommendation, preview, recentlyViewed]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
