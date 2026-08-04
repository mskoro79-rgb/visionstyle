interface ScoreBarProps {
  label: string;
  value: number; // 0-100
  color?: string;
}

export default function ScoreBar({ label, value, color = "#7c3aed" }: ScoreBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-white/50">{label}</span>
        <span className="text-white/70 font-medium">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
