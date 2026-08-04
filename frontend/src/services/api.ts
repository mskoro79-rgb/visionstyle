import axios from "axios";
import type {
  AnalysisResult,
  CatalogItem,
  DashboardReport,
  OutfitPreviewResponse,
  RecommendationRequest,
  RecommendationResponse,
} from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.detail ?? error?.message ?? "Something went wrong. Please try again.";
    return Promise.reject(new Error(message));
  }
);

export async function analyzeImage(file: File, sessionId: string): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("session_id", sessionId);
  const { data } = await api.post<AnalysisResult>("/analysis", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getLatestAnalysis(sessionId: string): Promise<AnalysisResult> {
  const { data } = await api.get<AnalysisResult>(`/analysis/session/${sessionId}/latest`);
  return data;
}

export async function generateRecommendations(
  payload: RecommendationRequest
): Promise<RecommendationResponse> {
  const { data } = await api.post<RecommendationResponse>("/recommendations", payload);
  return data;
}

export async function getLatestRecommendation(sessionId: string): Promise<RecommendationResponse> {
  const { data } = await api.get<RecommendationResponse>(`/recommendations/session/${sessionId}/latest`);
  return data;
}

export async function listCatalog(params?: { category?: string; gender?: string }): Promise<CatalogItem[]> {
  const { data } = await api.get<CatalogItem[]>("/catalog", { params });
  return data;
}

export async function listCategories(): Promise<string[]> {
  const { data } = await api.get<string[]>("/catalog/categories");
  return data;
}

export async function generatePreview(
  sessionId: string,
  analysisId: string,
  outfitSkus: string[]
): Promise<OutfitPreviewResponse> {
  const { data } = await api.post<OutfitPreviewResponse>("/preview", {
    session_id: sessionId,
    analysis_id: analysisId,
    outfit_skus: outfitSkus,
  });
  return data;
}

export async function getLatestPreview(sessionId: string): Promise<OutfitPreviewResponse> {
  const { data } = await api.get<OutfitPreviewResponse>(`/preview/session/${sessionId}/latest`);
  return data;
}

export async function getDashboard(sessionId: string): Promise<DashboardReport> {
  const { data } = await api.get<DashboardReport>(`/dashboard/session/${sessionId}`);
  return data;
}

export function downloadReportUrl(sessionId: string): string {
  return `${API_BASE}/dashboard/session/${sessionId}/report.json`;
}

export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const origin = import.meta.env.VITE_API_ORIGIN ?? "";
  return `${origin}${path}`;
}
