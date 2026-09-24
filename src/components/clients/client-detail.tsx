import Link from 'next/link';
import { getSession } from '@/lib/session';
import { recordNames } from '@/features/data';
import { type Row } from '@/features/modules';
import { EmptyState } from '@/components/ui';
import { EntityTable } from '@/components/tables/entity-table';
const tabs: Record<string, { label: string; table: string; module: string }> = {
  addresses: { label: 'Endereços', table: 'client_addresses', module: 'addresses' },
  assets: { label: 'Ativos', table: 'customer_assets', module: 'assets' },
  quotes: { label: 'Orçamentos', table: 'quotes', module: 'quotes' },
  orders: { label: 'Ordens', table: 'work_orders', module: 'work-orders' },
  payments: { label: 'Pagamentos', table: 'payments', module: 'payments' },
  recurring: { label: 'Recorrências', table: 'recurring_services', module: 'recurring' },
};
export async function ClientDetail({ client, tab }: { client: Row; tab: string }) {
  const { db, member } = await getSession();
  const selected = tabs[tab] ? tab : 'addresses';
  const current = tabs[selected];
  const { data, error } = await db
    .from(current.table)
    .select('*')
    .eq('company_id', member.company_id)
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw Error('Não foi possível carregar o histórico');
  const rows = (data ?? []) as Row[],
    names = await recordNames(rows);
  return (
    <section className="mt-7">
      <div className="tabs">
        {Object.entries(tabs).map(([key, value]) => (
          <Link
            className={selected === key ? 'active' : ''}
            key={key}
            href={`/clients/${client.id}?tab=${key}`}
          >
            {value.label}
          </Link>
        ))}
      </div>
      <div className="card">
        <div className="panel-title">
          <h2>{current.label}</h2>
          {member.role !== 'technician' && (
            <Link className="panel-link" href={`/${current.module}/new?client_id=${client.id}`}>
              + Adicionar
            </Link>
          )}
        </div>
        {rows.length ? (
          <EntityTable moduleKey={current.module} rows={rows} names={names} />
        ) : (
          <EmptyState
            title="Ainda não há registros"
            description="Os dados vinculados a este cliente aparecerão aqui."
          />
        )}
        {rows.length === 50 && <p className="muted p-4">Exibindo os 50 registros mais recentes.</p>}
      </div>
    </section>
  );
}
