export default function EmptyState({ title, body, action, className = "" }: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-dashed border-border px-4 py-8 text-center ${className}`}>
      <p className="text-sm font-medium text-muted">{title}</p>
      {body && <p className="mt-1 text-xs text-muted">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
