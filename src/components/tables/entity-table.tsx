import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui';
import { labels, modules, type Row } from '@/features/modules';
import { date, money } from '@/lib/utils';
export function displayValue(key: string, value: unknown, names: Record<string, string> = {}) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (
    [
      'total',
      'amount',
      'paid_amount',
      'base_price',
      'estimated_value',
      'discount',
      'subtotal',
    ].includes(key)
  )
    return money(Number(value));
  if (key.endsWith('_at'))
    return `${date(String(value))}${key === 'scheduled_at' ? ' · ' + new Date(String(value)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' }) : ''}`;
  if (
    [
      'valid_until',
      'due_date',
      'next_date',
      'next_action',
      'scheduled_for',
      'installed_at',
    ].includes(key)
  )
    return date(String(value));
  if (key.endsWith('_id')) return names[String(value)] ?? 'Registro vinculado';
  if (key === 'number') return '#' + String(value).padStart(4, '0');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return labels[String(value)] ?? String(value);
}
export function EntityTable({
  moduleKey,
  rows,
  names = {},
}: {
  moduleKey: string;
  rows: Row[];
  names?: Record<string, string>;
}) {
  const definition = modules[moduleKey];
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {definition.columns.map((c) => (
              <th key={c}>{labels[c] ?? definition.fields.find((f) => f.key === c)?.label ?? c}</th>
            ))}
            <th>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {definition.columns.map((c, i) => (
                <td key={c}>
                  {c === 'status' ? (
                    <StatusBadge value={String(row[c])} />
                  ) : c === 'active' ? (
                    <StatusBadge value={row[c] ? 'active' : 'inactive'} />
                  ) : i === 0 ? (
                    <Link
                      className="font-semibold hover:text-sky-600"
                      href={`/${moduleKey}/${row.id}`}
                    >
                      {displayValue(c, row[c], names)}
                    </Link>
                  ) : (
                    displayValue(c, row[c], names)
                  )}
                </td>
              ))}
              <td>
                <Link
                  className="text-slate-400 hover:text-sky-600"
                  href={`/${moduleKey}/${row.id}`}
                  aria-label="Abrir registro"
                >
                  <ArrowUpRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
