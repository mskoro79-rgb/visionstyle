import type { ReactNode } from "react";
import clsx from "clsx";

interface BadgeProps {
  children: ReactNode;
  color?: "royal" | "ember" | "jade" | "gilt" | "crimson";
  className?: string;
}

const colorMap: Record<string, string> = {
  royal: "bg-royal-600/15 text-royal-300 border-royal-500/30",
  ember: "bg-ember-500/15 text-ember-400 border-ember-500/30",
  jade: "bg-jade-500/15 text-jade-400 border-jade-500/30",
  gilt: "bg-gilt-500/15 text-gilt-400 border-gilt-500/30",
  crimson: "bg-crimson-500/15 text-crimson-400 border-crimson-500/30",
};

export default function Badge({ children, color = "royal", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide border backdrop-blur-sm",
        colorMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}
