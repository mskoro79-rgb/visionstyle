import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, Sparkles, Moon, Sun, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "@/context/ThemeContext";
import { useOwner } from "@/context/OwnerContext";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/ai-analysis", label: "AI Analysis" },
  { to: "/recommendations", label: "Recommendations" },
  { to: "/virtual-preview", label: "Virtual Preview" },
  { to: "/showroom", label: "Showroom" },
  { to: "/analytics", label: "Analytics" },
  { to: "/about", label: "About" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useOwner();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-surface-70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <NavLink to="/" className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-royal-600 via-ember-500 to-gilt-500 flex items-center justify-center shadow-lg shadow-royal-600/30 group-hover:scale-110 transition-transform">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold gradient-text-royal">VisionStyle</span>
        </NavLink>

        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-gilt-400"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle dark/light theme (T)"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <NavLink
            to={isAuthenticated ? "/owner/dashboard" : "/owner/login"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                isActive ? "border-gilt-500/50 text-gilt-400" : "border-white/10 text-white/60 hover:text-white hover:border-white/25"
              )
            }
          >
            <ShieldCheck className="h-4 w-4" /> {isAuthenticated ? "Owner Portal" : "Owner Login"}
          </NavLink>
        </div>

        <button
          className="lg:hidden text-white/80 hover:text-white"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="lg:hidden border-t border-white/5 bg-surface-95 backdrop-blur-xl px-6 py-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "px-4 py-3 rounded-lg text-sm font-medium",
                  isActive ? "bg-white/10 text-gilt-400" : "text-white/60"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 mt-2 pt-4">
            <button onClick={toggleTheme} className="flex items-center gap-2 text-sm text-white/60">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} Toggle theme
            </button>
            <NavLink
              to={isAuthenticated ? "/owner/dashboard" : "/owner/login"}
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 text-sm text-gilt-400"
            >
              <ShieldCheck className="h-4 w-4" /> {isAuthenticated ? "Owner Portal" : "Owner Login"}
            </NavLink>
          </div>
        </div>
      )}
    </header>
  );
}
