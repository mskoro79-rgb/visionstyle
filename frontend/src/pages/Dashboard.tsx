import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Download, RefreshCcw, Sparkles, Layers, FileText, SplitSquareHorizontal } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ScoreRing from "@/components/ui/ScoreRing";
import SectionHeading from "@/components/ui/SectionHeading";
import Loader from "@/components/ui/Loader";
import { useSession } from "@/context/SessionContext";
import { downloadReportPdfUrl, downloadReportUrl, getDashboard, resolveMediaUrl } from "@/services/api";
import type { DashboardReport } from "@/types";

function BeforeAfterView({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const [split, setSplit] = useState(50);
  return (
    <div className="relative rounded-xl overflow-hidden select-none" style={{ aspectRatio: "3/4" }}>
      <img src={afterUrl} alt="After — outfit preview" className="absolute inset-0 h-full w-full object-cover" />
      <img
        src={beforeUrl}
        alt="Before — original photo"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
      />
      <div className="absolute inset-y-0 pointer-events-none" style={{ left: `${split}%` }}>
        <div className="w-0.5 h-full bg-gilt-400" />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(e) => setSplit(Number(e.target.value))}
        className="absolute bottom-3 left-1/2 -translate-x-1/2 w-3/4 accent-gilt-400"
      />
      <span className="absolute top-2 left-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded">Before</span>
      <span className="absolute top-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded">After</span>
    </div>
  );
}

export default function Dashboard() {
  const { sessionId, resetSession } = useSession();
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getDashboard(sessionId);
        setReport(data);
      } catch {
        setReport(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  return (
    <PageShell>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
        <SectionHeading
          align="left"
          eyebrow="No login required"
          title="Your Style Dashboard"
          subtitle={`Session ${sessionId.slice(0, 16)}... — stored locally on this device, no account needed.`}
          className="mx-0"
        />
        <div className="flex gap-3">
          {report?.analysis && (
            <>
              <a href={downloadReportPdfUrl(sessionId)} download>
                <Button variant="secondary">
                  <FileText className="h-4 w-4" /> PDF Report
                </Button>
              </a>
              <a href={downloadReportUrl(sessionId)} download>
                <Button variant="secondary">
                  <Download className="h-4 w-4" /> JSON
                </Button>
              </a>
            </>
          )}
          <Button variant="ghost" onClick={resetSession}>
            <RefreshCcw className="h-4 w-4" /> New Session
          </Button>
        </div>
      </div>

      {loading && <Loader label="Loading your dashboard..." />}

      {!loading && (!report || !report.analysis) && (
        <GlassCard className="text-center py-20">
          <Camera className="h-12 w-12 mx-auto text-white/20 mb-4" />
          <p className="text-white/60 mb-6">
            No analysis yet for this session. Start with AI Analysis to populate your dashboard.
          </p>
          <Link to="/ai-analysis">
            <Button size="lg">
              <Camera className="h-5 w-5" /> Start AI Analysis
            </Button>
          </Link>
        </GlassCard>
      )}

      {!loading && report && report.analysis && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard glow="gilt" className="flex flex-col items-center justify-center text-center">
              <ScoreRing value={report.ai_score} label="AI Score" />
              <p className="text-white/50 text-sm mt-4">Composite of analysis + recommendation confidence</p>
            </GlassCard>

            <GlassCard className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4">Appearance Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wide text-white/40">Face Shape</p>
                  <p className="text-xl font-bold gradient-text-royal capitalize">{report.analysis.face_shape.shape}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wide text-white/40">Body Shape</p>
                  <p className="text-xl font-bold gradient-text-royal capitalize">
                    {report.analysis.body_shape ? report.analysis.body_shape.shape.replace("_", " ") : "N/A"}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 col-span-2 flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full border-2 border-white/20 flex-shrink-0"
                    style={{ backgroundColor: report.analysis.skin_tone.hex_color }}
                  />
                  <p className="text-sm text-white capitalize">
                    {report.analysis.skin_tone.depth} skin, {report.analysis.skin_tone.undertone} undertone
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {report.analysis.image_url && report.latest_preview ? (
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <SplitSquareHorizontal className="h-5 w-5 text-jade-400" /> Before vs After
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setShowBeforeAfter((v) => !v)}>
                  {showBeforeAfter ? "Side-by-side view" : "Slider view"}
                </Button>
              </div>
              {showBeforeAfter ? (
                <div className="max-w-md mx-auto">
                  <BeforeAfterView
                    beforeUrl={resolveMediaUrl(report.analysis.image_url)}
                    afterUrl={resolveMediaUrl(report.latest_preview.preview_image_url)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/40 mb-2 text-center">Before</p>
                    <img src={resolveMediaUrl(report.analysis.image_url)} alt="Original" className="rounded-xl w-full max-h-72 object-cover" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-2 text-center">After</p>
                    <img src={resolveMediaUrl(report.latest_preview.preview_image_url)} alt="Preview" className="rounded-xl w-full max-h-72 object-cover bg-black/20" />
                  </div>
                </div>
              )}
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard>
                <h3 className="text-lg font-semibold text-white mb-4">Current Session Photo</h3>
                {report.analysis.image_url ? (
                  <img
                    src={resolveMediaUrl(report.analysis.image_url)}
                    alt="Session"
                    className="rounded-xl w-full max-h-72 object-cover"
                  />
                ) : (
                  <p className="text-white/40 text-sm">No image on file.</p>
                )}
              </GlassCard>

              <GlassCard>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-jade-400" /> Outfit Preview
                </h3>
                {report.latest_preview ? (
                  <img
                    src={resolveMediaUrl(report.latest_preview.preview_image_url)}
                    alt="Preview"
                    className="rounded-xl w-full max-h-72 object-contain bg-black/20"
                  />
                ) : (
                  <div className="text-center py-10">
                    <p className="text-white/40 text-sm mb-4">No virtual preview generated yet.</p>
                    <Link to="/virtual-preview">
                      <Button variant="secondary" size="sm">Generate Preview</Button>
                    </Link>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          <GlassCard glow="ember">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-ember-400" /> Color Palette & Fashion Tips
            </h3>
            {report.latest_recommendation ? (
              <>
                <div className="flex gap-3 flex-wrap mb-6">
                  {report.latest_recommendation.recommendations[0]?.color_palette.map((c) => (
                    <div key={c.hex_color} className="h-10 w-10 rounded-full border-2 border-white/20" style={{ backgroundColor: c.hex_color }} title={c.reason} />
                  ))}
                </div>
                <ul className="space-y-2">
                  {report.latest_recommendation.recommendations[0]?.fashion_tips.map((tip, i) => (
                    <li key={i} className="text-sm text-white/60 flex gap-2">
                      <span className="text-gilt-400">&#10022;</span> {tip}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/40 text-sm mb-4">No recommendations generated yet.</p>
                <Link to="/recommendations">
                  <Button variant="secondary" size="sm">Get Recommendations</Button>
                </Link>
              </div>
            )}
          </GlassCard>

          <div className="flex flex-wrap gap-3">
            <Badge color="royal">Analysis ID: {report.analysis.analysis_id.slice(0, 14)}...</Badge>
            <Badge color="jade">Generated {new Date(report.generated_at).toLocaleString()}</Badge>
          </div>
        </motion.div>
      )}
    </PageShell>
  );
}
