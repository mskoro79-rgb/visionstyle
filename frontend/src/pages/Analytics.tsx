import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  CartesianGrid,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import SectionHeading from "@/components/ui/SectionHeading";
import ScoreRing from "@/components/ui/ScoreRing";
import { useSession } from "@/context/SessionContext";

const CHART_COLORS = ["#7c3aed", "#f97316", "#10b981", "#d4af37", "#dc143c", "#a78bfa", "#fb923c"];

export default function Analytics() {
  const { analysis, recommendation } = useSession();
  const navigate = useNavigate();

  if (!analysis) {
    return (
      <PageShell>
        <GlassCard className="max-w-xl mx-auto text-center py-16">
          <AlertTriangle className="h-10 w-10 mx-auto text-gilt-400 mb-4" />
          <p className="text-white/70 mb-6">Run an AI Analysis to unlock your analytics dashboard.</p>
          <Button onClick={() => navigate("/ai-analysis")}>Go to AI Analysis</Button>
        </GlassCard>
      </PageShell>
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
    <PageShell>
      <SectionHeading
        eyebrow="Analytics"
        title="Under the Hood of Your Analysis"
        subtitle="Transparent scoring — see exactly how confident the AI is in every classification, and why."
      />

      <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-6">
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

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="flex items-center justify-center h-[280px] text-white/40 text-sm text-center px-8">
              No body shape data — upload a full-body photo during AI Analysis to see this chart.
            </div>
          )}
        </GlassCard>
      </div>

      {recommendation && (
        <GlassCard className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recommendation Confidence</h3>
          <div className="flex items-center gap-6">
            <ScoreRing value={recommendation.recommendations[0].confidence * 100} size={100} strokeWidth={8} label="Match" />
            <p className="text-white/60 text-sm leading-relaxed flex-1">{recommendation.overall_reasoning}</p>
          </div>
        </GlassCard>
      )}
    </PageShell>
  );
}
