export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-20 rounded-full bg-white/[0.06]" />
        <div className="h-7 w-40 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-64 rounded-lg bg-white/[0.04]" />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1.5 flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 h-10 rounded-xl bg-white/[0.04]" />
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
        <div className="h-4 w-36 rounded-lg bg-white/[0.06]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded bg-white/[0.04]" />
              <div className="h-10 w-full rounded-lg bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <div className="h-10 w-36 rounded-xl bg-white/[0.04]" />
      </div>
    </div>
  );
}