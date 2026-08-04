export default function Loader({ label = "Analyzing..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-white/10" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-royal-500 border-r-ember-500 animate-spin" />
      </div>
      <p className="text-white/60 text-sm tracking-wide animate-pulse-glow">{label}</p>
    </div>
  );
}
