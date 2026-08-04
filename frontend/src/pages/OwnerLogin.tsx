import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, LogIn } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import SectionHeading from "@/components/ui/SectionHeading";
import { useOwner } from "@/context/OwnerContext";

export default function OwnerLogin() {
  const { login, isAuthenticated } = useOwner();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/owner/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/owner/dashboard" replace />;
  }

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Phase 7 · Owner Access"
        title="Showroom Owner Login"
        subtitle="Inventory management is restricted to the showroom owner. There is no shopper account system — sessions are anonymous."
      />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto mt-14">
        <GlassCard glow="royal">
          <div className="h-12 w-12 rounded-xl bg-royal-500/15 flex items-center justify-center mb-6 mx-auto">
            <Lock className="h-6 w-6 text-royal-400" />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5" htmlFor="owner-email">
                Owner Email
              </label>
              <input
                id="owner-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-white outline-none focus:border-royal-500/60 transition-colors"
                placeholder="owner@visionstyle.ai"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5" htmlFor="owner-password">
                Password
              </label>
              <input
                id="owner-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-white outline-none focus:border-royal-500/60 transition-colors"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-crimson-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              <LogIn className="h-5 w-5" /> {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </GlassCard>
      </motion.div>
    </PageShell>
  );
}
