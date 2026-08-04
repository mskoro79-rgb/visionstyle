import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  glow?: "royal" | "ember" | "jade" | "gilt" | "crimson" | "none";
}

const glowMap: Record<string, string> = {
  royal: "hover:shadow-royal-600/30",
  ember: "hover:shadow-ember-500/30",
  jade: "hover:shadow-jade-500/30",
  gilt: "hover:shadow-gilt-500/30",
  crimson: "hover:shadow-crimson-500/30",
  none: "",
};

export default function GlassCard({
  children,
  hoverable = false,
  glow = "royal",
  className,
  ...rest
}: GlassCardProps) {
  return (
    <div
      className={clsx(
        "glass-panel rounded-2xl p-6",
        hoverable && "card-hover cursor-pointer",
        hoverable && glowMap[glow],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
