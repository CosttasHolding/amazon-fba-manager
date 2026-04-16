export default function CalculatorLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-20 rounded-full bg-white/[0.06]" />
        <div className="h-7 w-52 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
          <div className="h-5 w-32 rounded-lg bg-white/[0.06]" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded bg-white/[0.04]" />
              <div className="h-10 w-full rounded-lg bg-white/[0.04]" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
          <div className="h-5 w-28 rounded-lg bg-white/[0.06]" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="h-4 w-28 rounded bg-white/[0.04]" />
              <div className="h-6 w-20 rounded bg-white/[0.08]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}