import Link from 'next/link';
import { Inbox, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { labels } from '@/features/modules';
export function PageHeader({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p className="muted mt-2">{description}</p>}
      </div>
      {href && (
        <Link className="button" href={href}>
          + {action ?? 'Novo'}
        </Link>
      )}
    </div>
  );
}
export function EmptyState({
  title = 'Tudo pronto para começar',
  description = 'Os registros aparecerão aqui assim que você adicionar o primeiro.',
  href,
  action = 'Criar primeiro registro',
}: {
  title?: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox size={26} />
      </div>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {href && (
        <Link className="button secondary mt-4" href={href}>
          {action}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function StatusBadge({ value }: { value: string }) {
  const green = ['approved', 'completed', 'paid', 'won', 'active'];
  const red = ['cancelled', 'rejected', 'expired', 'lost', 'refunded'];
  const blue = ['in_progress', 'confirmed', 'on_the_way', 'sent'];
  return (
    <span
      className={cn(
        'badge',
        green.includes(value)
          ? 'green'
          : red.includes(value)
            ? 'red'
            : blue.includes(value)
              ? 'blue'
              : ['draft', 'inactive'].includes(value)
                ? 'gray'
                : 'amber',
      )}
    >
      <span className="badge-dot" />
      {labels[value] ?? value}
    </span>
  );
}
export function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card metric">
      <div className="flex items-center justify-between">
        <p>{label}</p>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <p className="muted text-xs">{detail}</p>
    </div>
  );
}
export function Notice({ error, success }: { error?: string; success?: string }) {
  return error || success ? (
    <p
      role={error ? 'alert' : 'status'}
      className={cn('notice', error ? 'notice-error' : 'notice-success')}
    >
      {error || success}
    </p>
  ) : null;
}
