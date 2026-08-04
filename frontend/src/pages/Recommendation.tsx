import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Sparkles, ArrowRight, ChevronDown, GitCompare, Info, X } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Loader from "@/components/ui/Loader";
import SectionHeading from "@/components/ui/SectionHeading";
import ScoreBar from "@/components/ui/ScoreBar";
import StarRating from "@/components/ui/StarRating";
import { useSession } from "@/context/SessionContext";
import { generateRecommendations, rateRecommendation } from "@/services/api";
import type { BudgetTier, Gender, Occasion, RecommendationItem, Season, StylePreference } from "@/types";

const OCCASIONS: Occasion[] = ["casual", "formal", "business", "party", "wedding", "date_night", "sport", "travel"];
const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
const BUDGETS: BudgetTier[] = ["budget", "mid_range", "premium", "luxury"];
const STYLES: StylePreference[] = ["minimalist", "streetwear", "classic", "bohemian", "edgy", "romantic", "sporty", "glamorous"];
const GENDERS: Gender[] = ["male", "female", "unisex"];

function SelectGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-white/70 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-lg text-sm capitalize border transition-all ${
              value === opt
                ? "bg-gradient-to-r from-royal-600 to-crimson-500 border-transparent text-white shadow-md"
                : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
            }`}
          >
            {opt.replace("_", " ")}
          </button>
        ))}
      </div>
    </div>
  );
}

function OutfitCard({
  rec,
  expanded,
  onToggleExpand,
  selected,
  onToggleSelect,
  onRate,
  onPreview,
}: {
  rec: RecommendationItem;
  expanded: boolean;
  onToggleExpand: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  onRate: (rating: number) => void;
  onPreview: () => void;
}) {
  return (
    <GlassCard glow="ember" className={selected ? "ring-2 ring-gilt-400" : ""}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-bold text-white leading-snug">{rec.title}</h3>
          <p className="text-white/50 text-xs mt-1">{(rec.confidence * 100).toFixed(0)}% match confidence</p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-white/50 cursor-pointer flex-shrink-0">
          <input type="checkbox" checked={selected} onChange={onToggleSelect} />
          Compare
        </label>
      </div>

      <div className="flex -space-x-3 mb-4">
        {rec.outfit_pieces.slice(0, 5).map((piece) =>
          piece.image_url ? (
            <img
              key={piece.sku}
              src={piece.image_url}
              alt={piece.name}
              loading="lazy"
              decoding="async"
              className="h-14 w-14 rounded-full object-cover border-2 border-void-900"
            />
          ) : null
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
        <ScoreBar label="Fashion" value={rec.scores.fashion_score} color="#7c3aed" />
        <ScoreBar label="Color Harmony" value={rec.scores.color_harmony_score} color="#d4af37" />
        <ScoreBar label="Body Fit" value={rec.scores.body_fit_score} color="#10b981" />
        <ScoreBar label="Occasion Match" value={rec.scores.occasion_match_score} color="#f97316" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <StarRating value={rec.rating} count={rec.rating_count} onRate={onRate} />
        <button onClick={onToggleExpand} className="text-white/50 hover:text-white flex items-center gap-1 text-xs">
          {expanded ? "Hide details" : "View details"}
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-white/60 text-sm mb-4 leading-relaxed">{rec.reason}</p>

            <p className="text-xs uppercase tracking-wide text-white/40 mb-2">Outfit Pieces</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[...rec.outfit_pieces, ...rec.footwear, ...rec.accessories].map((piece) => (
                <div key={piece.sku} className="bg-white/5 rounded-xl overflow-hidden">
                  {piece.image_url && (
                    <img src={piece.image_url} alt={piece.name} loading="lazy" decoding="async" className="h-24 w-full object-cover" />
                  )}
                  <div className="p-2">
                    <p className="text-xs font-medium text-white truncate">{piece.name}</p>
                    <p className="text-[10px] text-white/40">${piece.price?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs uppercase tracking-wide text-white/40 mb-2">Color Palette</p>
            <div className="flex gap-2 mb-4 flex-wrap">
              {rec.color_palette.map((c) => (
                <div key={c.hex_color} className="h-8 w-8 rounded-full border-2 border-white/20" style={{ backgroundColor: c.hex_color }} title={c.reason} />
              ))}
            </div>

            <div className="bg-royal-500/10 border border-royal-500/20 rounded-xl p-4 mb-4">
              <p className="text-xs uppercase tracking-wide text-royal-300 mb-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> AI Explanation Panel
              </p>
              <ul className="space-y-1.5">
                {rec.scores.explanation.map((line, i) => (
                  <li key={i} className="text-xs text-white/60 leading-relaxed">{line}</li>
                ))}
              </ul>
            </div>

            <ul className="space-y-1.5 mb-4">
              {rec.fashion_tips.map((tip, i) => (
                <li key={i} className="text-xs text-white/60 flex gap-2">
                  <span className="text-gilt-400">&#10022;</span> {tip}
                </li>
              ))}
            </ul>

            <Button size="sm" onClick={onPreview} className="w-full">
              Preview This Look <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

function CompareView({ items, onClose }: { items: RecommendationItem[]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl p-6 max-w-4xl w-full mt-10"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold gradient-text-royal flex items-center gap-2">
            <GitCompare className="h-5 w-5" /> Compare Outfits
          </h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {items.map((rec) => (
            <div key={rec.recommendation_id} className="bg-white/5 rounded-xl p-4">
              <h4 className="font-semibold text-white mb-1">{rec.title}</h4>
              <p className="text-xs text-white/40 mb-4">{(rec.confidence * 100).toFixed(0)}% match confidence</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {rec.outfit_pieces.slice(0, 4).map((p) =>
                  p.image_url ? <img key={p.sku} src={p.image_url} alt={p.name} loading="lazy" decoding="async" className="h-16 w-16 rounded-lg object-cover" /> : null
                )}
              </div>
              <div className="space-y-2">
                <ScoreBar label="Fashion" value={rec.scores.fashion_score} color="#7c3aed" />
                <ScoreBar label="Color Harmony" value={rec.scores.color_harmony_score} color="#d4af37" />
                <ScoreBar label="Body Fit" value={rec.scores.body_fit_score} color="#10b981" />
                <ScoreBar label="Occasion Match" value={rec.scores.occasion_match_score} color="#f97316" />
              </div>
              <p className="text-xs text-white/50 mt-4 leading-relaxed">{rec.reason}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Recommendation() {
  const { sessionId, analysis, recommendation, setRecommendation } = useSession();
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const [season, setSeason] = useState<Season>("summer");
  const [budget, setBudget] = useState<BudgetTier>("mid_range");
  const [style, setStyle] = useState<StylePreference>("classic");
  const [gender, setGender] = useState<Gender>("unisex");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!analysis) return;
    setLoading(true);
    setError(null);
    setSelectedIds([]);
    setExpandedId(null);
    try {
      const result = await generateRecommendations({
        session_id: sessionId,
        analysis_id: analysis.analysis_id,
        occasion,
        season,
        budget,
        style_preference: style,
        gender,
      });
      setRecommendation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (recommendationId: string, rating: number) => {
    const result = await rateRecommendation(sessionId, recommendationId, rating);
    if (recommendation) {
      setRecommendation({
        ...recommendation,
        recommendations: recommendation.recommendations.map((r) =>
          r.recommendation_id === recommendationId
            ? { ...r, rating: result.average_rating, rating_count: result.rating_count }
            : r
        ),
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  if (!analysis) {
    return (
      <PageShell>
        <GlassCard className="max-w-xl mx-auto text-center py-16">
          <AlertTriangle className="h-10 w-10 mx-auto text-gilt-400 mb-4" />
          <p className="text-white/70 mb-6">Run an AI Analysis first so we know your face shape, body shape and skin tone.</p>
          <Button onClick={() => navigate("/ai-analysis")}>Go to AI Analysis</Button>
        </GlassCard>
      </PageShell>
    );
  }

  const selectedItems = recommendation?.recommendations.filter((r) => selectedIds.includes(r.recommendation_id)) ?? [];

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Phase 4 + 11 · Diverse Recommendation Engine"
        title="Your Personalized Fashion Edit"
        subtitle="Up to 10 unique, weighted-and-randomized outfit combinations — never the same look twice — each with a transparent score breakdown."
      />

      <div className="mt-14 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-10 items-start">
        <GlassCard className="space-y-6 lg:sticky lg:top-24">
          <SelectGroup label="Occasion" options={OCCASIONS} value={occasion} onChange={setOccasion} />
          <SelectGroup label="Season" options={SEASONS} value={season} onChange={setSeason} />
          <SelectGroup label="Budget" options={BUDGETS} value={budget} onChange={setBudget} />
          <SelectGroup label="Style Preference" options={STYLES} value={style} onChange={setStyle} />
          <SelectGroup label="Gender" options={GENDERS} value={gender} onChange={setGender} />
          <Button className="w-full" size="lg" onClick={handleGenerate} disabled={loading}>
            <Sparkles className="h-5 w-5" /> {loading ? "Styling..." : "Generate Recommendations"}
          </Button>
          {error && <p className="text-crimson-400 text-sm">{error}</p>}
        </GlassCard>

        <div>
          {loading && <Loader label="Scoring the catalog and sampling diverse outfits..." />}

          {!loading && !recommendation && (
            <GlassCard className="text-center py-16">
              <Sparkles className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/50">Set your preferences and generate your first edit.</p>
            </GlassCard>
          )}

          {!loading && recommendation && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <Badge color="jade">{recommendation.recommendations.length} unique outfits generated</Badge>
                {selectedIds.length === 2 && (
                  <Button size="sm" variant="secondary" onClick={() => setShowCompare(true)}>
                    <GitCompare className="h-4 w-4" /> Compare Selected
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {recommendation.recommendations.map((rec) => (
                  <OutfitCard
                    key={rec.recommendation_id}
                    rec={rec}
                    expanded={expandedId === rec.recommendation_id}
                    onToggleExpand={() => setExpandedId((prev) => (prev === rec.recommendation_id ? null : rec.recommendation_id))}
                    selected={selectedIds.includes(rec.recommendation_id)}
                    onToggleSelect={() => toggleSelect(rec.recommendation_id)}
                    onRate={(rating) => handleRate(rec.recommendation_id, rating)}
                    onPreview={() => navigate("/virtual-preview")}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCompare && selectedItems.length === 2 && (
          <CompareView items={selectedItems} onClose={() => setShowCompare(false)} />
        )}
      </AnimatePresence>
    </PageShell>
  );
}
