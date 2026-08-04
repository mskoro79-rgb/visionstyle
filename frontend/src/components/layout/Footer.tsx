import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gilt-400" />
          <span className="text-white/50 text-sm">
            &copy; {new Date().getFullYear()} VisionStyle — AI Powered Personalized Fashion Recommendation System
          </span>
        </div>
        <p className="text-white/30 text-xs">Built with computer vision, not guesswork.</p>
      </div>
    </footer>
  );
}
