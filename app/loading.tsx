export default function Loading() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <div className="mb-2 h-7 w-48 animate-pulse rounded bg-ink/10" />
        <div className="mb-6 h-4 w-64 animate-pulse rounded bg-ink/10" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
