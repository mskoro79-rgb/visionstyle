import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2, Scan } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Loader from "@/components/ui/Loader";
import ImageUploader from "@/components/ui/ImageUploader";
import SectionHeading from "@/components/ui/SectionHeading";
import ScoreRing from "@/components/ui/ScoreRing";
import { useSession } from "@/context/SessionContext";
import { analyzeImage, resolveMediaUrl } from "@/services/api";

export default function AIAnalysis() {
  const { sessionId, analysis, setAnalysis } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeImage(file, sessionId);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Phase 3 · AI Analysis"
        title="Real Computer Vision Analysis"
        subtitle="Face mesh landmarks, pose detection, and CIE-LAB color science — every result is computed from your actual photo, not a template."
      />

      <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div>
          <ImageUploader onFileSelected={setFile} disabled={loading} />
          <div className="mt-6 flex justify-center">
            <Button size="lg" onClick={handleAnalyze} disabled={!file || loading}>
              <Scan className="h-5 w-5" /> {loading ? "Analyzing..." : "Run AI Analysis"}
            </Button>
          </div>
          {error && (
            <div className="mt-4 flex items-start gap-2 text-crimson-400 text-sm bg-crimson-500/10 border border-crimson-500/30 rounded-xl p-4">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}
          {loading && <Loader label="Running face mesh, pose detection & skin tone analysis..." />}
        </div>

        <div>
          {!analysis && !loading && (
            <GlassCard className="text-center py-16">
              <Scan className="h-12 w-12 mx-auto text-white/20 mb-4" />
              <p className="text-white/50">Upload a photo and run analysis to see your results here.</p>
            </GlassCard>
          )}

          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <GlassCard glow="jade">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-jade-400" /> Analysis Complete
                  </h3>
                  <ScoreRing value={analysis.overall_confidence * 100} size={80} strokeWidth={7} label="Confidence" />
                </div>

                {analysis.image_url && (
                  <img
                    src={resolveMediaUrl(analysis.image_url)}
                    alt="Analyzed"
                    className="rounded-xl w-full max-h-72 object-cover mb-6"
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Face Shape</p>
                    <p className="text-xl font-bold gradient-text-royal capitalize">{analysis.face_shape.shape}</p>
                    <p className="text-xs text-white/40 mt-1">{(analysis.face_shape.confidence * 100).toFixed(0)}% confidence</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Body Shape</p>
                    <p className="text-xl font-bold gradient-text-royal capitalize">
                      {analysis.body_shape ? analysis.body_shape.shape.replace("_", " ") : "N/A"}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      {analysis.body_shape ? `${(analysis.body_shape.confidence * 100).toFixed(0)}% confidence` : "Upload full-body photo"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-white/5 rounded-xl p-4 flex items-center gap-4">
                  <div
                    className="h-12 w-12 rounded-full border-2 border-white/20 flex-shrink-0"
                    style={{ backgroundColor: analysis.skin_tone.hex_color }}
                  />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/40 mb-1">Skin Tone</p>
                    <p className="font-semibold text-white capitalize">
                      {analysis.skin_tone.depth} &middot; {analysis.skin_tone.undertone} undertone
                    </p>
                    <p className="text-xs text-white/40">{analysis.skin_tone.hex_color.toUpperCase()}</p>
                  </div>
                </div>

                {analysis.detection_quality.warnings.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {analysis.detection_quality.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gilt-400 bg-gilt-500/10 border border-gilt-500/20 rounded-lg p-3">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {w}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  <Badge color="royal">Face detection {(analysis.detection_quality.face_detection_confidence * 100).toFixed(0)}%</Badge>
                  <Badge color="jade">{analysis.detection_quality.pose_detected ? "Pose detected" : "No pose"}</Badge>
                  <Badge color="gilt">{analysis.detection_quality.image_width}×{analysis.detection_quality.image_height}px</Badge>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button onClick={() => navigate("/recommendations")}>
                    Get Recommendations <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
