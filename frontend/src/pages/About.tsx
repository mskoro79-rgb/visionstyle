import { Camera, Cpu, Database, Layers, Palette, ShieldCheck } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import SectionHeading from "@/components/ui/SectionHeading";

const STACK = [
  { icon: Camera, title: "Computer Vision", description: "MediaPipe Face Mesh (468 landmarks) + BlazePose for geometric analysis." },
  { icon: Palette, title: "Color Science", description: "sRGB → XYZ → CIE-LAB conversion for perceptually accurate skin-tone classification." },
  { icon: Cpu, title: "Explainable Scoring", description: "Rule-based, weighted scoring engines — every result traces back to a concrete signal." },
  { icon: Database, title: "MongoDB + JSON Fallback", description: "Persists sessions when MongoDB is available; degrades gracefully to in-memory/JSON otherwise." },
  { icon: Layers, title: "Pluggable Virtual Try-On", description: "Composite engine today, architected for IDM-VTON / CatVTON / StableVITON tomorrow." },
  { icon: ShieldCheck, title: "No Login, Session-Based", description: "A local session ID is all that's needed — nothing is tied to a user account." },
];

export default function About() {
  return (
    <PageShell>
      <SectionHeading
        eyebrow="About VisionStyle"
        title="Fashion AI Built on Real Signal, Not Guesswork"
        subtitle="VisionStyle is an end-to-end computer vision and recommendation platform. Every phase of the pipeline — detection, classification, styling, and preview — is built to be transparent, explainable, and production-ready."
      />

      <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {STACK.map((item) => (
          <GlassCard key={item.title} hoverable>
            <div className="h-12 w-12 rounded-xl bg-royal-500/15 flex items-center justify-center mb-4">
              <item.icon className="h-6 w-6 text-royal-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
            <p className="text-white/55 text-sm leading-relaxed">{item.description}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="mt-10">
        <h3 className="text-xl font-semibold text-white mb-4">Our Approach</h3>
        <div className="space-y-4 text-white/60 text-sm leading-relaxed">
          <p>
            Most "AI fashion" demos return the same face shape and body shape regardless of input.
            VisionStyle deliberately avoids that trap: face-shape and body-shape classification are
            driven by five to eight independent geometric ratios scored against similarity profiles
            for every shape category, so results genuinely vary with the photo.
          </p>
          <p>
            Skin tone is sampled from multiple facial regions (cheeks, forehead, nose bridge),
            filtered for shadows and specular highlights, and converted to CIE-LAB — the same color
            space used in professional color-matching — before undertone and depth are classified.
          </p>
          <p>
            Every recommendation is generated with an explicit scoring rationale, and every catalog
            item that's suggested carries a plain-language reason so the "why" is never hidden
            behind a black box.
          </p>
        </div>
      </GlassCard>
    </PageShell>
  );
}
