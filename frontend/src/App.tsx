import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ParticleBackground from "@/components/ui/ParticleBackground";
import Loader from "@/components/ui/Loader";
import { SessionProvider } from "@/context/SessionContext";

const Home = lazy(() => import("@/pages/Home"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AIAnalysis = lazy(() => import("@/pages/AIAnalysis"));
const Recommendation = lazy(() => import("@/pages/Recommendation"));
const VirtualPreview = lazy(() => import("@/pages/VirtualPreview"));
const Showroom = lazy(() => import("@/pages/Showroom"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const About = lazy(() => import("@/pages/About"));

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <div className="relative min-h-screen bg-void-950">
          <ParticleBackground density={70} />
          <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(220,20,60,0.1),transparent_60%)]" />
          <div className="relative z-10 flex min-h-screen flex-col">
            <Navbar />
            <div className="flex-1">
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
                </Routes>
              </Suspense>
            </div>
            <Footer />
          </div>
        </div>
      </BrowserRouter>
    </SessionProvider>
  );
}
