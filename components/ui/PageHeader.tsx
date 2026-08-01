export default function PageHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-ink" dir="auto">{title}</h1>
        {subtitle && <p className="text-sm text-ink/50 mt-0.5" dir="auto">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
