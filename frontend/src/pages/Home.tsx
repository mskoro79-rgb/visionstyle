import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Sparkles, Shirt, TrendingUp, Palette, Layers } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import SectionHeading from "@/components/ui/SectionHeading";

const FEATURES = [
  {
    icon: Camera,
    title: "AI Appearance Analysis",
    description: "Face mesh, pose detection & LAB color science extract face shape, body shape, and skin tone from a single photo.",
    color: "royal" as const,
  },
  {
    icon: Sparkles,
    title: "Explainable Recommendations",
    description: "Every suggestion comes with a clear reason — no black-box styling. See exactly why an outfit works for you.",
    color: "ember" as const,
  },
  {
    icon: Layers,
    title: "Virtual Outfit Preview",
    description: "See outfits composited onto your own photo before you commit — architecture ready for photorealistic try-on.",
    color: "jade" as const,
  },
  {
    icon: Palette,
    title: "Personalized Color Palette",
    description: "Skin-tone-matched color palettes derived from CIE-LAB analysis, not generic seasonal charts.",
    color: "gilt" as const,
  },
  {
    icon: Shirt,
    title: "Curated Fashion Catalog",
    description: "Shirts, jeans, jackets, shoes, watches & belts — filtered by occasion, season, budget and your unique features.",
    color: "crimson" as const,
  },
  {
    icon: TrendingUp,
    title: "AI Confidence Scoring",
    description: "Every prediction ships with a transparent confidence score so you know how much to trust it.",
    color: "royal" as const,
  },
];

const ICON_BG: Record<string, string> = {
  royal: "bg-royal-500/15",
  ember: "bg-ember-500/15",
  jade: "bg-jade-500/15",
  gilt: "bg-gilt-500/15",
  crimson: "bg-crimson-500/15",
};

const ICON_COLOR: Record<string, string> = {
  royal: "text-royal-400",
  ember: "text-ember-400",
  jade: "text-jade-400",
  gilt: "text-gilt-400",
  crimson: "text-crimson-400",
};

const STEPS = [
  { number: "01", title: "Upload Your Photo", description: "A single well-lit photo is all it takes." },
  { number: "02", title: "AI Analyzes You", description: "Face shape, body shape & skin tone, computed in seconds." },
  { number: "03", title: "Get Styled", description: "Receive a full outfit, color palette, and styling rationale." },
];

export default function Home() {
  return (
    <PageShell>
      <section className="relative flex flex-col items-center text-center pt-8 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Badge color="gilt" className="mb-6">
            Computer Vision &middot; Machine Learning &middot; Fashion AI
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.05] max-w-4xl gradient-text-royal"
        >
          Fashion Intelligence, Tailored to Your Face and Body
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 max-w-2xl text-lg text-white/60"
        >
          VisionStyle uses real computer vision — face mesh, pose landmarks, and LAB color
          science — to analyze your appearance and generate outfit recommendations that
          actually explain their reasoning.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row gap-4"
        >
          <Link to="/ai-analysis">
            <Button size="lg">
              <Camera className="h-5 w-5" /> Start AI Analysis
            </Button>
          </Link>
          <Link to="/showroom">
            <Button size="lg" variant="secondary">
              <Shirt className="h-5 w-5" /> Browse Showroom
            </Button>
          </Link>
        </motion.div>

        <div className="mt-6 text-sm text-white/40">No login required — your session stays private on this device.</div>
      </section>

      <section className="py-16">
        <SectionHeading
          eyebrow="Capabilities"
          title="A Full Styling Pipeline, Not Just a Filter"
          subtitle="Every module is built on real detection and scoring logic — nothing here is a static placeholder."
        />
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
            >
              <GlassCard hoverable glow={feature.color} className="h-full">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${ICON_BG[feature.color]}`}>
                  <feature.icon className={`h-6 w-6 ${ICON_COLOR[feature.color]}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{feature.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-16">
        <SectionHeading eyebrow="How it works" title="Three Steps to Your Personalized Edit" />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative"
            >
              <GlassCard className="h-full">
                <span className="font-display text-5xl font-bold gradient-text-emerald opacity-70">{step.number}</span>
                <h3 className="text-xl font-semibold text-white mt-4 mb-2">{step.title}</h3>
                <p className="text-white/55 text-sm">{step.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-16">
        <GlassCard className="text-center py-16 px-8" glow="gilt">
          <h2 className="font-display text-3xl sm:text-4xl font-bold gradient-text-royal mb-4">
            Ready to see your AI-powered style profile?
          </h2>
          <p className="text-white/60 max-w-xl mx-auto mb-8">
            No signup, no waiting — upload a photo and get real, explainable recommendations in moments.
          </p>
          <Link to="/ai-analysis">
            <Button size="lg">
              <Sparkles className="h-5 w-5" /> Analyze My Style
            </Button>
          </Link>
        </GlassCard>
      </section>
    </PageShell>
  );
}
