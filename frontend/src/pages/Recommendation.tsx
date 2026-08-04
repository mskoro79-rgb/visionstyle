import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Sparkles, ArrowRight } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import SectionHeading from "@/components/ui/SectionHeading";
import { useSession } from "@/context/SessionContext";
import { generateRecommendations } from "@/services/api";
import type { BudgetTier, Gender, Occasion, Season, StylePreference } from "@/types";

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

export default function Recommendation() {
  const { sessionId, analysis, recommendation, setRecommendation } = useSession();
  const [occasion, setOccasion] = useState<Occasion>("casual");
  const [season, setSeason] = useState<Season>("summer");
  const [budget, setBudget] = useState<BudgetTier>("mid_range");
  const [style, setStyle] = useState<StylePreference>("classic");
  const [gender, setGender] = useState<Gender>("unisex");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!analysis) return;
    setLoading(true);
    setError(null);
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

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Phase 4 · Recommendation Engine"
        title="Your Personalized Fashion Edit"
        subtitle="Tell us the context — occasion, season, budget and style — and we'll explain exactly why each piece works for you."
      />

      <div className="mt-14 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-10 items-start">
        <GlassCard className="space-y-6">
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
          {loading && <Loader label="Scoring the catalog against your profile..." />}

          {!loading && !recommendation && (
            <GlassCard className="text-center py-16">
              <Sparkles className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/50">Set your preferences and generate your first edit.</p>
            </GlassCard>
          )}

          {!loading && recommendation && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {recommendation.recommendations.map((rec) => (
                <GlassCard key={rec.recommendation_id} glow="ember">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-2xl font-bold gradient-text-royal">{rec.title}</h3>
                      <p className="text-white/50 text-sm mt-1">{(rec.confidence * 100).toFixed(0)}% match confidence</p>
                    </div>
                  </div>

                  <p className="text-white/60 text-sm mb-6 leading-relaxed">{rec.reason}</p>

                  <p className="text-xs uppercase tracking-wide text-white/40 mb-3">Outfit Pieces</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    {rec.outfit_pieces.map((piece) => (
                      <div key={piece.sku} className="bg-white/5 rounded-xl overflow-hidden group">
                        {piece.image_url && (
                          <img src={piece.image_url} alt={piece.name} className="h-32 w-full object-cover" />
                        )}
                        <div className="p-3">
                          <p className="text-sm font-medium text-white truncate">{piece.name}</p>
                          <p className="text-xs text-white/40">${piece.price?.toFixed(2)}</p>
                          <p className="text-xs text-white/50 mt-1 leading-snug">{piece.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(rec.footwear.length > 0 || rec.accessories.length > 0) && (
                    <>
                      <p className="text-xs uppercase tracking-wide text-white/40 mb-3">Footwear & Accessories</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                        {[...rec.footwear, ...rec.accessories].map((piece) => (
                          <div key={piece.sku} className="bg-white/5 rounded-xl overflow-hidden">
                            {piece.image_url && (
                              <img src={piece.image_url} alt={piece.name} className="h-24 w-full object-cover" />
                            )}
                            <div className="p-3">
                              <p className="text-sm font-medium text-white truncate">{piece.name}</p>
                              <p className="text-xs text-white/50 mt-1 leading-snug">{piece.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <p className="text-xs uppercase tracking-wide text-white/40 mb-3">Color Palette</p>
                  <div className="flex gap-3 mb-6 flex-wrap">
                    {rec.color_palette.map((c) => (
                      <div key={c.hex_color} className="flex flex-col items-center gap-1" title={c.reason}>
                        <div className="h-10 w-10 rounded-full border-2 border-white/20" style={{ backgroundColor: c.hex_color }} />
                        <span className="text-[10px] text-white/40">{c.hex_color}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs uppercase tracking-wide text-white/40 mb-3">Fashion Tips</p>
                  <ul className="space-y-2 mb-6">
                    {rec.fashion_tips.map((tip, i) => (
                      <li key={i} className="text-sm text-white/60 flex gap-2">
                        <span className="text-gilt-400">&#10022;</span> {tip}
                      </li>
                    ))}
                  </ul>

                  <div className="flex justify-end">
                    <Button onClick={() => navigate("/virtual-preview")}>
                      Preview This Look <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
