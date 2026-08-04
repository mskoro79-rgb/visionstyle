import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  CartesianGrid,
  PieChart,
  Pie,
} from "recharts";
import { AlertTriangle, Star, Target } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import SectionHeading from "@/components/ui/SectionHeading";
import ScoreRing from "@/components/ui/ScoreRing";
import Loader from "@/components/ui/Loader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useCachedFetch } from "@/hooks/useCachedFetch";
import { useSession } from "@/context/SessionContext";
import { getAnalyticsSummary } from "@/services/api";

const CHART_COLORS = ["#7c3aed", "#f97316", "#10b981", "#d4af37", "#dc143c", "#a78bfa", "#fb923c", "#34d399"];

function PlatformAnalytics() {
  const { data: summary, loading, error } = useCachedFetch("analytics:summary", getAnalyticsSummary, { ttlMs: 30_000 });

  if (loading && !summary) return <Loader label="Aggregating platform analytics..." />;
  if (error) return <p className="text-crimson-400 text-sm">{error}</p>;
  if (!summary) return null;

  const inv = summary.inventory_status;
  const inventoryPie = [
    { name: "Available", value: inv.available_items },
    { name: "Out of Stock", value: inv.out_of_stock_items },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="text-center py-5">
          <p className="text-2xl font-bold gradient-text-royal">{summary.total_analyses}</p>
          <p className="text-xs text-white/50 mt-1">AI Analyses Run</p>
        </GlassCard>
        <GlassCard className="text-center py-5">
          <p className="text-2xl font-bold gradient-text-royal">{summary.total_recommendations}</p>
          <p className="text-xs text-white/50 mt-1">Recommendation Sets</p>
        </GlassCard>
        <GlassCard className="text-center py-5 flex flex-col items-center">
          <p className="text-2xl font-bold gradient-text-emerald flex items-center gap-1">
            <Target className="h-4 w-4" /> {(summary.recommendation_accuracy * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-white/50 mt-1">Recommendation Accuracy</p>
        </GlassCard>
        <GlassCard className="text-center py-5 flex flex-col items-center">
          <p className="text-2xl font-bold gradient-text-royal flex items-center gap-1">
            <Star className="h-4 w-4 fill-gilt-400 text-gilt-400" /> {summary.average_rating?.toFixed(1) ?? "—"}
          </p>
          <p className="text-xs text-white/50 mt-1">Average Outfit Rating</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Most Recommended Categories</h3>
          {summary.most_recommended_categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.most_recommended_categories}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#120c1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {summary.most_recommended_categories.map((entry, i) => (
                    <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Most Recommended Brands</h3>
          {summary.most_recommended_brands.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.most_recommended_brands} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#120c1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#d4af37" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No owner inventory brands yet." />
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Most Recommended Colors</h3>
          {summary.most_recommended_colors.length > 0 ? (
            <div className="flex flex-wrap gap-4 items-end py-4">
              {summary.most_recommended_colors.map((c) => (
                <div key={c.name} className="flex flex-col items-center gap-2">
                  <div
                    className="rounded-full border-2 border-white/20"
                    style={{ backgroundColor: c.name, width: 28 + c.count * 4, height: 28 + c.count * 4 }}
                    title={`${c.name} — ${c.count}`}
                  />
                  <span className="text-[10px] text-white/40">{c.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart />
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Inventory Status</h3>
          {inv.total_items > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={inventoryPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={4}>
                  <Cell fill="#10b981" />
                  <Cell fill="#dc143c" />
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }} />
                <Tooltip contentStyle={{ background: "#120c1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No owner inventory yet — add products in the Owner Portal." />
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Popular Face Shapes</h3>
          {summary.popular_face_shapes.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.popular_face_shapes}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#120c1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Popular Body Shapes</h3>
          {summary.popular_body_shapes.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.popular_body_shapes}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#120c1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Upload full-body photos during AI Analysis to populate this chart." />
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function EmptyChart({ label = "Not enough data yet." }: { label?: string }) {
  return <div className="flex items-center justify-center h-[260px] text-white/40 text-sm text-center px-8">{label}</div>;
}

function SessionAnalytics() {
  const { analysis, recommendation } = useSession();
  const navigate = useNavigate();

  if (!analysis) {
    return (
      <GlassCard className="max-w-xl mx-auto text-center py-16">
        <AlertTriangle className="h-10 w-10 mx-auto text-gilt-400 mb-4" />
        <p className="text-white/70 mb-6">Run an AI Analysis to unlock your personal analysis breakdown.</p>
        <Button onClick={() => navigate("/ai-analysis")}>Go to AI Analysis</Button>
      </GlassCard>
    );
  }

  const faceShapeData = Object.entries(analysis.face_shape.scores).map(([shape, score]) => ({
    shape,
    score: Math.round(score * 100),
  }));

  const bodyShapeData = analysis.body_shape
    ? Object.entries(analysis.body_shape.scores).map(([shape, score]) => ({
        shape: shape.replace("_", " "),
        score: Math.round(score * 100),
      }))
    : [];

  const metricsRadar = [
    { metric: "Face detect.", value: Math.round(analysis.detection_quality.face_detection_confidence * 100) },
    { metric: "Face shape", value: Math.round(analysis.face_shape.confidence * 100) },
    { metric: "Skin tone", value: Math.round(analysis.skin_tone.confidence * 100) },
    { metric: "Body shape", value: Math.round((analysis.body_shape?.confidence ?? 0) * 100) },
    { metric: "Overall", value: Math.round(analysis.overall_confidence * 100) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="flex flex-col items-center justify-center">
          <ScoreRing value={analysis.overall_confidence * 100} label="Overall AI Score" />
        </GlassCard>
        <GlassCard className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Confidence Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={metricsRadar}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
              <Radar dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.35} />
              <Tooltip contentStyle={{ background: "#120c1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Face Shape Score Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={faceShapeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="shape" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#120c1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {faceShapeData.map((entry, i) => (
                  <Cell key={entry.shape} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Body Shape Score Distribution</h3>
          {bodyShapeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bodyShapeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="shape" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#120c1e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Bar dataKey="score" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No body shape data — upload a full-body photo during AI Analysis to see this chart." />
          )}
        </GlassCard>
      </div>

      {recommendation && (
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Top Recommendation Confidence</h3>
          <div className="flex items-center gap-6">
            <ScoreRing value={recommendation.recommendations[0].confidence * 100} size={100} strokeWidth={8} label="Match" />
            <p className="text-white/60 text-sm leading-relaxed flex-1">{recommendation.overall_reasoning}</p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

export default function Analytics() {
  return (
    <PageShell>
      <SectionHeading
        eyebrow="Phase 10 · Analytics Dashboard"
        title="Platform & Personal Analytics"
        subtitle="Aggregate trends across every analysis and recommendation, plus a transparent breakdown of your own session."
      />

      <div className="mt-14">
        <ErrorBoundary fallbackLabel="Couldn't load platform analytics.">
          <PlatformAnalytics />
        </ErrorBoundary>
      </div>

      <div className="mt-14">
        <h3 className="font-display text-2xl font-bold gradient-text-emerald mb-6">Your Session</h3>
        <ErrorBoundary fallbackLabel="Couldn't load your session analytics.">
          <SessionAnalytics />
        </ErrorBoundary>
      </div>
    </PageShell>
  );
}
