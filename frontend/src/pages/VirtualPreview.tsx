import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Layers, Info } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import Badge from "@/components/ui/Badge";
import SectionHeading from "@/components/ui/SectionHeading";
import { useSession } from "@/context/SessionContext";
import { generatePreview, resolveMediaUrl } from "@/services/api";

export default function VirtualPreview() {
  const { sessionId, analysis, recommendation, preview, setPreview } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const navigate = useNavigate();

  const availablePieces = recommendation?.recommendations[0]
    ? [...recommendation.recommendations[0].outfit_pieces, ...recommendation.recommendations[0].footwear]
    : [];

  const toggleSku = (sku: string | null) => {
    if (!sku) return;
    setSelectedSkus((prev) => (prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]));
  };

  const handleGeneratePreview = async () => {
    if (!analysis || selectedSkus.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generatePreview(sessionId, analysis.analysis_id, selectedSkus);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  if (!analysis) {
    return (
      <PageShell>
        <GlassCard className="max-w-xl mx-auto text-center py-16">
          <AlertTriangle className="h-10 w-10 mx-auto text-gilt-400 mb-4" />
          <p className="text-white/70 mb-6">Run an AI Analysis first to unlock the virtual preview.</p>
          <Button onClick={() => navigate("/ai-analysis")}>Go to AI Analysis</Button>
        </GlassCard>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Phase 5 · Virtual Outfit Preview"
        title="See the Outfit On You"
        subtitle="Selected garments are composited directly onto your uploaded photo using pose-guided image blending."
      />

      <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-royal-400" /> Select Pieces to Try On
          </h3>
          {availablePieces.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-white/50 mb-4">Generate recommendations first to select pieces.</p>
              <Button variant="secondary" onClick={() => navigate("/recommendations")}>
                Go to Recommendations
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {availablePieces.map((piece) => (
                  <button
                    key={piece.sku}
                    onClick={() => toggleSku(piece.sku)}
                    className={`rounded-xl overflow-hidden border-2 transition-all text-left ${
                      piece.sku && selectedSkus.includes(piece.sku)
                        ? "border-gilt-400 shadow-lg shadow-gilt-500/20"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    {piece.image_url && <img src={piece.image_url} alt={piece.name} className="h-24 w-full object-cover" />}
                    <p className="text-xs p-2 text-white/70 truncate">{piece.name}</p>
                  </button>
                ))}
              </div>
              <Button className="w-full" size="lg" onClick={handleGeneratePreview} disabled={selectedSkus.length === 0 || loading}>
                {loading ? "Compositing..." : `Preview ${selectedSkus.length || ""} Selected Piece(s)`}
              </Button>
              {error && <p className="text-crimson-400 text-sm mt-3">{error}</p>}
            </>
          )}
        </GlassCard>

        <GlassCard glow="jade">
          <h3 className="text-lg font-semibold text-white mb-4">Preview Result</h3>
          {loading && <Loader label="Compositing garments onto your photo..." />}
          {!loading && !preview && (
            <div className="text-center py-16">
              <Layers className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/50">Your composited preview will appear here.</p>
            </div>
          )}
          {!loading && preview && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <img
                src={resolveMediaUrl(preview.preview_image_url)}
                alt="Outfit preview"
                className="rounded-xl w-full max-h-[520px] object-contain bg-black/20"
              />
              <div className="mt-4 flex items-center gap-2">
                <Badge color="jade">{preview.engine_used} engine</Badge>
              </div>
              {preview.disclaimer && (
                <div className="mt-4 flex items-start gap-2 text-xs text-white/50 bg-white/5 rounded-lg p-3">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-royal-400" /> {preview.disclaimer}
                </div>
              )}
            </motion.div>
          )}
        </GlassCard>
      </div>
    </PageShell>
  );
}
