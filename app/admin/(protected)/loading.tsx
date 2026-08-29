function MetricSkeleton() {
  return (
    <div className="metric-tile bg-white/80 backdrop-blur">
      <div className="h-3 w-24 rounded-full bg-[hsl(var(--admin-line))]/70" />
      <div className="mt-4 h-10 w-20 rounded-2xl bg-[hsl(var(--admin-line))]/60" />
      <div className="mt-4 h-3 w-full rounded-full bg-[hsl(var(--admin-line))]/45" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="ticket-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-7 w-24 rounded-full bg-[hsl(var(--admin-line))]/75" />
          <div className="h-3 w-40 rounded-full bg-[hsl(var(--admin-line))]/45" />
        </div>
        <div className="h-3 w-20 rounded-full bg-[hsl(var(--admin-line))]/40" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="panel-muted h-14 animate-pulse" />
        <div className="panel-muted h-14 animate-pulse" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-10 flex-1 rounded-full bg-[hsl(var(--admin-line))]/60" />
        <div className="h-10 w-24 rounded-full bg-[hsl(var(--admin-line))]/45" />
      </div>
    </div>
  );
}

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <section className="panel-surface panel-hero p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-3xl">
            <div className="h-3 w-32 rounded-full bg-[hsl(var(--admin-line))]/70" />
            <div className="mt-4 h-10 w-full max-w-xl rounded-2xl bg-[hsl(var(--admin-line))]/60" />
            <div className="mt-4 h-3 w-full rounded-full bg-[hsl(var(--admin-line))]/40" />
            <div className="mt-2 h-3 w-4/5 rounded-full bg-[hsl(var(--admin-line))]/35" />
          </div>
          <div className="flex gap-2">
            <div className="topbar-pill h-8 w-28" />
            <div className="topbar-pill h-8 w-24" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="queue-column">
          <div className="h-16 rounded-[1rem] bg-white/70" />
          <div className="queue-column-body">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
        <div className="queue-column">
          <div className="h-16 rounded-[1rem] bg-white/70" />
          <div className="queue-column-body">
            <CardSkeleton />
          </div>
        </div>
        <div className="queue-column">
          <div className="h-16 rounded-[1rem] bg-white/70" />
          <div className="queue-column-body">
            <CardSkeleton />
          </div>
        </div>
      </section>
    </div>
  );
}
