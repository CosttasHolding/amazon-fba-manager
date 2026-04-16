export default function InventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-20 rounded-full bg-white/[0.06]" />
        <div className="h-7 w-36 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-52 rounded-lg bg-white/[0.04]" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
            <div className="h-3 w-24 rounded-full bg-white/[0.06]" />
            <div className="h-7 w-14 rounded-lg bg-white/[0.08]" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <div className="h-5 w-44 rounded-lg bg-white/[0.06]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <div className="h-4 w-1/4 rounded bg-white/[0.06]" />
            <div className="h-4 w-1/6 rounded bg-white/[0.04]" />
            <div className="h-4 w-1/6 rounded bg-white/[0.04]" />
            <div className="h-6 w-16 rounded-full bg-white/[0.04]" />
            <div className="h-4 w-1/6 rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}