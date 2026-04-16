export default function SalesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-20 rounded-full bg-white/[0.06]" />
        <div className="h-7 w-28 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-48 rounded-lg bg-white/[0.04]" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
            <div className="h-3 w-20 rounded-full bg-white/[0.06]" />
            <div className="h-7 w-16 rounded-lg bg-white/[0.08]" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 rounded-lg bg-white/[0.06]" />
          <div className="h-9 w-28 rounded-xl bg-white/[0.04]" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <div className="h-4 w-1/5 rounded bg-white/[0.06]" />
            <div className="h-4 w-1/5 rounded bg-white/[0.04]" />
            <div className="h-4 w-1/6 rounded bg-white/[0.06]" />
            <div className="h-4 w-1/6 rounded bg-white/[0.04]" />
            <div className="h-6 w-16 rounded-full bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}