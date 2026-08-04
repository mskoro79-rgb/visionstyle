export type FaceShape = "oval" | "round" | "square" | "heart" | "diamond" | "oblong" | "triangle";
export type BodyShape = "rectangle" | "hourglass" | "pear" | "inverted_triangle" | "apple" | "trapezoid";
export type SkinUndertone = "warm" | "cool" | "neutral";
export type SkinDepth = "fair" | "light" | "medium" | "tan" | "deep";
export type Occasion = "casual" | "formal" | "business" | "party" | "wedding" | "date_night" | "sport" | "travel";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type BudgetTier = "budget" | "mid_range" | "premium" | "luxury";
export type StylePreference =
  | "minimalist"
  | "streetwear"
  | "classic"
  | "bohemian"
  | "edgy"
  | "romantic"
  | "sporty"
  | "glamorous";
export type Gender = "male" | "female" | "unisex";

export interface FaceMetrics {
  face_width: number;
  face_height: number;
  jaw_width: number;
  forehead_width: number;
  cheekbone_width: number;
  chin_length: number;
  width_to_height_ratio: number;
}

export interface BodyMetrics {
  shoulder_width: number;
  waist_width: number;
  hip_width: number;
  torso_length: number;
  leg_length: number;
  shoulder_to_hip_ratio: number;
  waist_to_hip_ratio: number;
  waist_to_shoulder_ratio: number;
}

export interface SkinToneResult {
  undertone: SkinUndertone;
  depth: SkinDepth;
  hex_color: string;
  lab_l: number;
  lab_a: number;
  lab_b: number;
  confidence: number;
}

export interface FaceShapeResult {
  shape: FaceShape;
  confidence: number;
  metrics: FaceMetrics;
  scores: Record<string, number>;
}

export interface BodyShapeResult {
  shape: BodyShape;
  confidence: number;
  metrics: BodyMetrics;
  scores: Record<string, number>;
}

export interface DetectionQuality {
  face_detected: boolean;
  face_detection_confidence: number;
  landmarks_detected: boolean;
  pose_detected: boolean;
  pose_landmarks_count: number;
  image_width: number;
  image_height: number;
  warnings: string[];
}

export interface AnalysisResult {
  session_id: string;
  analysis_id: string;
  created_at: string;
  face_shape: FaceShapeResult;
  body_shape: BodyShapeResult | null;
  skin_tone: SkinToneResult;
  overall_confidence: number;
  detection_quality: DetectionQuality;
  image_url: string | null;
}

export interface ColorPaletteEntry {
  name: string;
  hex_color: string;
  reason: string;
}

export interface OutfitPiece {
  category: string;
  sku: string | null;
  name: string;
  image_url: string | null;
  color: string | null;
  price: number | null;
  reason: string;
}

export interface ScoreBreakdown {
  fashion_score: number;
  color_harmony_score: number;
  body_fit_score: number;
  occasion_match_score: number;
  explanation: string[];
}

export interface RecommendationItem {
  recommendation_id: string;
  title: string;
  confidence: number;
  reason: string;
  outfit_pieces: OutfitPiece[];
  color_palette: ColorPaletteEntry[];
  accessories: OutfitPiece[];
  footwear: OutfitPiece[];
  fashion_tips: string[];
  scores: ScoreBreakdown;
  rating: number | null;
  rating_count: number;
}

export interface RecommendationRequest {
  session_id: string;
  analysis_id: string;
  occasion: Occasion;
  season: Season;
  budget: BudgetTier;
  style_preference: StylePreference;
  gender: Gender;
}

export interface RecommendationResponse {
  session_id: string;
  analysis_id: string;
  generated_at: string;
  request: RecommendationRequest;
  recommendations: RecommendationItem[];
  overall_reasoning: string;
}

export type CatalogSource = "catalog" | "inventory";

export interface CatalogItem {
  sku: string;
  category: string;
  name: string;
  brand: string | null;
  price: number;
  currency: string;
  colors: string[];
  image_url: string;
  images: string[];
  gender: Gender;
  styles: StylePreference[];
  occasions: Occasion[];
  seasons: Season[];
  budget_tier: BudgetTier;
  face_shape_fit: FaceShape[];
  body_shape_fit: BodyShape[];
  active: boolean;
  source: CatalogSource;
  rack_number: string | null;
  sizes: string[];
  stock_quantity: number;
  available: boolean;
}

export interface InventoryItemCreate {
  category: string;
  name: string;
  brand?: string;
  price: number;
  currency?: string;
  colors: string[];
  gender: Gender;
  styles: StylePreference[];
  occasions: Occasion[];
  seasons: Season[];
  budget_tier: BudgetTier;
  face_shape_fit: FaceShape[];
  body_shape_fit: BodyShape[];
  rack_number?: string;
  sizes: string[];
  stock_quantity: number;
  available: boolean;
}

export interface InventoryItemUpdate {
  category?: string;
  name?: string;
  brand?: string;
  price?: number;
  colors?: string[];
  gender?: Gender;
  styles?: StylePreference[];
  occasions?: Occasion[];
  seasons?: Season[];
  budget_tier?: BudgetTier;
  face_shape_fit?: FaceShape[];
  body_shape_fit?: BodyShape[];
  rack_number?: string;
  sizes?: string[];
  stock_quantity?: number;
  available?: boolean;
  active?: boolean;
}

export interface InventoryStats {
  total_items: number;
  active_items: number;
  available_items: number;
  out_of_stock_items: number;
  by_category: Record<string, number>;
  by_brand: Record<string, number>;
  by_rack: Record<string, number>;
  total_stock_units: number;
}

export interface OutfitPreviewResponse {
  session_id: string;
  preview_id: string;
  preview_image_url: string;
  engine_used: string;
  generated_at: string;
  disclaimer: string;
}

export interface DashboardReport {
  session_id: string;
  generated_at: string;
  analysis: AnalysisResult | null;
  latest_recommendation: RecommendationResponse | null;
  latest_preview: OutfitPreviewResponse | null;
  ai_score: number;
}

export interface OwnerTokenResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  owner_email: string;
}

export interface OwnerProfile {
  email: string;
  display_name: string;
}

export interface NameCount {
  name: string;
  count: number;
}

export interface AnalyticsSummary {
  total_analyses: number;
  total_recommendations: number;
  most_recommended_colors: NameCount[];
  most_recommended_brands: NameCount[];
  most_recommended_categories: NameCount[];
  popular_face_shapes: NameCount[];
  popular_body_shapes: NameCount[];
  recommendation_accuracy: number;
  average_rating: number | null;
  inventory_status: InventoryStats;
}
