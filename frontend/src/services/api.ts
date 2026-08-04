import axios from "axios";
import type {
  AnalysisResult,
  AnalyticsSummary,
  CatalogItem,
  DashboardReport,
  InventoryItemCreate,
  InventoryItemUpdate,
  InventoryStats,
  OutfitPreviewResponse,
  OwnerProfile,
  OwnerTokenResponse,
  RecommendationRequest,
  RecommendationResponse,
} from "@/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const OWNER_TOKEN_KEY = "visionstyle_owner_token";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(OWNER_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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

export function downloadReportPdfUrl(sessionId: string): string {
  return `${API_BASE}/dashboard/session/${sessionId}/report.pdf`;
}

export function resolveMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const origin = import.meta.env.VITE_API_ORIGIN ?? "";
  return `${origin}${path}`;
}

export async function rateRecommendation(
  sessionId: string,
  recommendationId: string,
  rating: number
): Promise<{ average_rating: number | null; rating_count: number }> {
  const { data } = await api.post("/recommendations/rate", {
    session_id: sessionId,
    recommendation_id: recommendationId,
    rating,
  });
  return data;
}

// --- Phase 9: Smart Showroom -------------------------------------------------

export interface ShowroomSearchParams {
  q?: string;
  category?: string;
  brand?: string;
  gender?: string;
  rack_number?: string;
  available_only?: boolean;
  min_price?: number;
  max_price?: number;
}

export async function searchCatalog(params: ShowroomSearchParams): Promise<CatalogItem[]> {
  const { data } = await api.get<CatalogItem[]>("/catalog/search", { params });
  return data;
}

export async function listBrands(): Promise<string[]> {
  const { data } = await api.get<string[]>("/catalog/brands");
  return data;
}

export async function listRackLocations(): Promise<string[]> {
  const { data } = await api.get<string[]>("/catalog/rack-locations");
  return data;
}

export async function getNearestMatches(sku: string, limit = 6): Promise<CatalogItem[]> {
  const { data } = await api.get<CatalogItem[]>(`/catalog/${sku}/nearest`, { params: { limit } });
  return data;
}

export async function getShowroomInventoryStats(): Promise<InventoryStats> {
  const { data } = await api.get<InventoryStats>("/catalog/stats/inventory");
  return data;
}

// --- Phase 7: Owner authentication -------------------------------------------

export function getOwnerToken(): string | null {
  return localStorage.getItem(OWNER_TOKEN_KEY);
}

export function setOwnerToken(token: string): void {
  localStorage.setItem(OWNER_TOKEN_KEY, token);
}

export function clearOwnerToken(): void {
  localStorage.removeItem(OWNER_TOKEN_KEY);
}

export async function ownerLogin(email: string, password: string): Promise<OwnerTokenResponse> {
  const { data } = await api.post<OwnerTokenResponse>("/auth/login", { email, password });
  return data;
}

export async function getOwnerProfile(): Promise<OwnerProfile> {
  const { data } = await api.get<OwnerProfile>("/auth/me");
  return data;
}

// --- Phase 8: Owner inventory management -------------------------------------

export async function listInventory(params?: { category?: string; active_only?: boolean }): Promise<CatalogItem[]> {
  const { data } = await api.get<CatalogItem[]>("/inventory", { params });
  return data;
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const { data } = await api.get<InventoryStats>("/inventory/stats");
  return data;
}

export async function createInventoryItem(
  payload: InventoryItemCreate,
  images: File[]
): Promise<CatalogItem> {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));
  images.forEach((file) => formData.append("images", file));
  const { data } = await api.post<CatalogItem>("/inventory", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateInventoryItem(sku: string, payload: InventoryItemUpdate): Promise<CatalogItem> {
  const { data } = await api.put<CatalogItem>(`/inventory/${sku}`, payload);
  return data;
}

export async function uploadInventoryImages(sku: string, images: File[]): Promise<CatalogItem> {
  const formData = new FormData();
  images.forEach((file) => formData.append("images", file));
  const { data } = await api.post<CatalogItem>(`/inventory/${sku}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteInventoryItem(sku: string): Promise<void> {
  await api.delete(`/inventory/${sku}`);
}

// --- Phase 10: Analytics ------------------------------------------------------

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const { data } = await api.get<AnalyticsSummary>("/analytics/summary");
  return data;
}
