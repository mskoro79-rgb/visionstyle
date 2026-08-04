import { useState } from "react";
import { Star } from "lucide-react";
import clsx from "clsx";

interface StarRatingProps {
  value: number | null;
  count?: number;
  onRate?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
}

/** Phase 12 — Outfit Rating widget. Session-only (no account needed to rate). */
export default function StarRating({ value, count = 0, onRate, size = 18, readOnly = false }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value ?? 0;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          className={clsx("transition-transform", !readOnly && "hover:scale-110 cursor-pointer")}
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          <Star
            width={size}
            height={size}
            className={star <= display ? "fill-gilt-400 text-gilt-400" : "text-white/20"}
          />
        </button>
      ))}
      {count > 0 && <span className="text-xs text-white/40 ml-1">({count})</span>}
    </div>
  );
}
