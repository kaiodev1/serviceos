import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import { getSession } from '@/lib/session';
import { canWrite } from '@/lib/permissions';
import { modules, labels, type Row } from '@/features/modules';
import { recordNames } from '@/features/data';
import { PageHeader, EmptyState, StatusBadge } from '@/components/ui';
import { EntityTable } from '@/components/tables/entity-table';
import { CalendarView } from '@/components/calendar/calendar-view';
import { money } from '@/lib/utils';
export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { module: key } = await params,
    definition = modules[key];
  if (!definition) notFound();
  const { db, member } = await getSession();
  if (
    member.role === 'technician' &&
    !['calendar', 'work-orders', 'clients', 'assets', 'addresses', 'services'].includes(key)
  )
    redirect('/field');
  const search = await searchParams;
  const page = Math.max(1, Math.min(100000, Number(search.page) || 1));
  if (key === 'calendar' && search.view !== 'list') return <CalendarView search={search} />;
  let query = db
    .from(definition.table)
    .select('*', { count: 'exact' })
    .eq('company_id', member.company_id);
  const term = (search.q ?? '')
    .replace(/[^\p{L}\p{N}\s@+.-]/gu, '')
    .slice(0, 100)
    .trim();
  if (term && definition.search.length) {
    if (definition.search.includes('number')) {
      if (/^\d+$/.test(term)) query = query.eq('number', term);
      else query = query.eq('number', -1);
    } else query = query.or(definition.search.map((k) => `${k}.ilike.%${term}%`).join(','));
  }
  if (search.status && definition.status?.includes(search.status))
    query = query.eq('status', search.status);
  if (search.type && key === 'clients' && ['business', 'residential'].includes(search.type))
    query = query.eq('type', search.type);
  const sort = definition.fields.some((f) => f.key === 'scheduled_at')
    ? 'scheduled_at'
    : ['custom-fields'].includes(key)
      ? 'name'
      : 'created_at';
  const { data, error, count } = await query
    .order(sort, { ascending: false })
    .range((page - 1) * 25, page * 25 - 1);
  if (error) throw Error('Não foi possível carregar ' + definition.title);
  const rows = (data ?? []) as Row[],
    names = await recordNames(rows),
    writable = canWrite(member.role, definition.table);
  const pageHref = (p: number) =>
    `/${key}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(search).filter((entry): entry is [string, string] => typeof entry[1] === 'string')), page: String(p) }).toString()}`;
  return (
    <>
      <PageHeader
        title={definition.title}
        description={definition.description}
        href={writable ? `/${key}/new` : undefined}
        action={`Novo ${definition.singular}`}
      />
      {key === 'leads' && (
        <div className="tabs">
          <Link className={search.view !== 'kanban' ? 'active' : ''} href="/leads">
            Lista
          </Link>
          <Link className={search.view === 'kanban' ? 'active' : ''} href="/leads?view=kanban">
            Pipeline
          </Link>
        </div>
      )}
      <div className="card">
        <form className="toolbar">
          <div className="search-box max-w-sm flex-1">
            <Search size={16} />
            <input
              name="q"
              defaultValue={search.q}
              placeholder="Buscar registros…"
              aria-label={`Buscar ${definition.title}`}
            />
          </div>
          {search.view && <input type="hidden" name="view" value={search.view} />}{' '}
          {definition.status && (
            <select
              className="max-w-48"
              name="status"
              aria-label="Filtrar por status"
              defaultValue={search.status ?? ''}
            >
              <option value="">Todos os status</option>
              {definition.status.map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          )}
          {key === 'clients' && (
            <select
              className="max-w-44"
              name="type"
              aria-label="Tipo de cliente"
              defaultValue={search.type ?? ''}
            >
              <option value="">Todos os tipos</option>
              <option value="residential">Residencial</option>
              <option value="business">Empresarial</option>
            </select>
          )}
          <button className="button secondary">Filtrar</button>
          <span className="muted text-xs ml-auto">{count ?? 0} registros</span>
        </form>
        {rows.length === 0 ? (
          <EmptyState
            title={
              term || search.status
                ? 'Nenhum resultado encontrado'
                : 'Seu próximo passo começa aqui'
            }
            description="Cadastre um registro ou ajuste os filtros para continuar."
            href={writable ? `/${key}/new` : undefined}
          />
        ) : key === 'leads' && search.view === 'kanban' ? (
          <div className="kanban p-4">
            {definition.status?.map((status) => (
              <div className="kanban-column" key={status}>
                <div className="mb-3">
                  <StatusBadge value={status} />
                </div>
                {rows
                  .filter((r) => r.status === status)
                  .map((r) => (
                    <Link className="card block p-4 mb-3" href={`/leads/${r.id}`} key={r.id}>
                      <h3>{String(r.name)}</h3>
                      <p className="muted text-xs mt-2">{String(r.phone)}</p>
                      <p className="mt-3 font-semibold text-sm">
                        {money(Number(r.estimated_value))}
                      </p>
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <EntityTable moduleKey={key} rows={rows} names={names} />
        )}
        <div className="flex justify-between items-center p-4 border-t border-slate-100 text-xs">
          <span className="muted">
            Página {page} de {Math.max(1, Math.ceil((count ?? 0) / 25))}
            {search.view === 'kanban' ? ' · Pipeline dos registros desta página' : ''}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link className="button secondary small" href={pageHref(page - 1)}>
                Anterior
              </Link>
            )}
            {page * 25 < (count ?? 0) && (
              <Link className="button secondary small" href={pageHref(page + 1)}>
                Próxima
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
