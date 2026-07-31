export default function Card({ title, action, children, className = "" }: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-surface p-5 shadow-sm border border-black/5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink/80">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
