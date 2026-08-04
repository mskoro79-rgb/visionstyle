import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ParticleBackground from "@/components/ui/ParticleBackground";
import Loader from "@/components/ui/Loader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedOwnerRoute from "@/components/layout/ProtectedOwnerRoute";
import { SessionProvider } from "@/context/SessionContext";
import { OwnerProvider } from "@/context/OwnerContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcut";

const Home = lazy(() => import("@/pages/Home"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AIAnalysis = lazy(() => import("@/pages/AIAnalysis"));
const Recommendation = lazy(() => import("@/pages/Recommendation"));
const VirtualPreview = lazy(() => import("@/pages/VirtualPreview"));
const Showroom = lazy(() => import("@/pages/Showroom"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const About = lazy(() => import("@/pages/About"));
const OwnerLogin = lazy(() => import("@/pages/OwnerLogin"));
const OwnerDashboard = lazy(() => import("@/pages/OwnerDashboard"));

function AppShell() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  // Phase 12 — global keyboard shortcuts (ignored while typing in inputs).
  useKeyboardShortcuts([
    { key: "h", handler: () => navigate("/"), description: "Go to Home" },
    { key: "d", handler: () => navigate("/dashboard"), description: "Go to Dashboard" },
    { key: "a", handler: () => navigate("/ai-analysis"), description: "Go to AI Analysis" },
    { key: "s", handler: () => navigate("/showroom"), description: "Go to Showroom" },
    { key: "t", handler: toggleTheme, description: "Toggle dark/light theme" },
  ]);

  return (
    <div className="relative min-h-screen bg-surface">
      <ParticleBackground density={70} />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(220,20,60,0.1),transparent_60%)]" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-1">
          <ErrorBoundary fallbackLabel="This page hit an unexpected error.">
            <Suspense fallback={<Loader label="Loading..." />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/ai-analysis" element={<AIAnalysis />} />
                <Route path="/recommendations" element={<Recommendation />} />
                <Route path="/virtual-preview" element={<VirtualPreview />} />
                <Route path="/showroom" element={<Showroom />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/about" element={<About />} />
                <Route path="/owner/login" element={<OwnerLogin />} />
                <Route
                  path="/owner/dashboard"
                  element={
                    <ProtectedOwnerRoute>
                      <OwnerDashboard />
                    </ProtectedOwnerRoute>
                  }
                />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <OwnerProvider>
        <SessionProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </SessionProvider>
      </OwnerProvider>
    </ThemeProvider>
  );
}
