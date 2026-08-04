import type { ReactNode } from "react";
import clsx from "clsx";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div className={clsx(align === "center" ? "text-center mx-auto" : "text-left", "max-w-3xl", className)}>
      {eyebrow && (
        <p className="uppercase tracking-[0.3em] text-xs font-semibold text-gilt-400 mb-3">{eyebrow}</p>
      )}
      <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold gradient-text-royal leading-tight">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-white/60 text-lg leading-relaxed">{subtitle}</p>}
    </div>
  );
}
