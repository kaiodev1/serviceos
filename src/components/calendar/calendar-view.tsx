import Link from 'next/link';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getSession } from '@/lib/session';
import { getOptions, recordNames } from '@/features/data';
import { labels, type Row } from '@/features/modules';
import { PageHeader, StatusBadge, EmptyState } from '@/components/ui';
import { canOperate } from '@/lib/permissions';
export async function CalendarView({ search }: { search: Record<string, string | undefined> }) {
  const { db, member } = await getSession();
  const mode = ['day', 'week', 'month'].includes(search.view ?? '') ? search.view! : 'week';
  const parsed =
    search.date && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
      ? new Date(`${search.date}T12:00:00Z`)
      : new Date();
  const anchor = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const start =
    mode === 'day'
      ? anchor
      : mode === 'month'
        ? startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })
        : startOfWeek(anchor, { weekStartsOn: 1 });
  const end =
    mode === 'day'
      ? anchor
      : mode === 'month'
        ? endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })
        : endOfWeek(anchor, { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  let query = db
    .from('appointments')
    .select('*')
    .eq('company_id', member.company_id)
    .gte('scheduled_at', `${format(start, 'yyyy-MM-dd')}T00:00:00-03:00`)
    .lt('scheduled_at', `${format(addDays(end, 1), 'yyyy-MM-dd')}T00:00:00-03:00`)
    .order('scheduled_at')
    .limit(500);
  if (search.responsible) query = query.eq('responsible_id', search.responsible);
  if (search.service) query = query.eq('service_id', search.service);
  if (search.status) query = query.eq('status', search.status);
  const { data, error } = await query;
  if (error) throw Error('Não foi possível carregar a agenda');
  const rows = (data ?? []) as Row[],
    names = await recordNames(rows),
    [team, services] = await Promise.all([getOptions('team'), getOptions('services')]);
  const href = (d: Date) =>
    `/calendar?${new URLSearchParams({ view: mode, date: format(d, 'yyyy-MM-dd'), ...(search.responsible ? { responsible: search.responsible } : {}), ...(search.service ? { service: search.service } : {}), ...(search.status ? { status: search.status } : {}) })}`;
  return (
    <>
      <PageHeader
        title="Agenda"
        description="Seu tempo bem organizado. Sua equipe no lugar certo."
        href={canOperate(member.role) ? '/calendar/new' : undefined}
        action="Novo agendamento"
      />
      <div className="card">
        <div className="toolbar justify-between">
          <div className="flex gap-3 items-center">
            <Link
              className="button secondary small"
              href={href(
                mode === 'month'
                  ? addMonths(anchor, -1)
                  : addDays(anchor, mode === 'week' ? -7 : -1),
              )}
              aria-label="Período anterior"
            >
              ←
            </Link>
            <h2 className="capitalize">{format(anchor, 'MMMM yyyy', { locale: ptBR })}</h2>
            <Link
              className="button secondary small"
              href={href(
                mode === 'month' ? addMonths(anchor, 1) : addDays(anchor, mode === 'week' ? 7 : 1),
              )}
              aria-label="Próximo período"
            >
              →
            </Link>
            <Link href={href(new Date())} className="panel-link">
              Hoje
            </Link>
          </div>
          <div className="flex gap-2">
            {[
              ['day', 'Dia'],
              ['week', 'Semana'],
              ['month', 'Mês'],
              ['list', 'Lista'],
            ].map(([v, l]) => (
              <Link
                key={v}
                href={`/calendar?view=${v}&date=${format(anchor, 'yyyy-MM-dd')}`}
                className={`button small ${mode === v ? '' : 'secondary'}`}
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
        <form className="toolbar border-t border-slate-100">
          <input type="hidden" name="view" value={mode} />
          <input type="hidden" name="date" value={format(anchor, 'yyyy-MM-dd')} />
          <select
            className="max-w-48"
            name="responsible"
            defaultValue={search.responsible}
            aria-label="Técnico"
          >
            <option value="">Toda a equipe</option>
            {team.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="max-w-48"
            name="service"
            defaultValue={search.service}
            aria-label="Serviço"
          >
            <option value="">Todos os serviços</option>
            {services.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className="max-w-44"
            name="status"
            defaultValue={search.status}
            aria-label="Status"
          >
            <option value="">Todos os status</option>
            {['pending', 'confirmed', 'on_the_way', 'in_progress', 'completed', 'cancelled'].map(
              (s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ),
            )}
          </select>
          <button className="button secondary">Filtrar</button>
        </form>
        {mode === 'day' ? (
          rows.length ? (
            <div className="p-5 space-y-3">
              {rows.map((r) => (
                <Link
                  className="card p-5 flex justify-between gap-4"
                  key={r.id}
                  href={`/calendar/${r.id}`}
                >
                  <div>
                    <h3>{names[String(r.client_id)]}</h3>
                    <p className="muted">
                      {names[String(r.service_id)]} · {names[String(r.responsible_id)]}
                    </p>
                  </div>
                  <StatusBadge value={String(r.status)} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Dia livre na agenda"
              description="Os novos agendamentos deste dia aparecerão aqui."
            />
          )
        ) : (
          <div className="overflow-auto rounded-b-xl">
            <div className="calendar-grid">
              {days.map((day) => (
                <div className="calendar-cell" key={day.toISOString()}>
                  <p className="text-xs font-semibold text-slate-500 capitalize">
                    {format(day, 'EEE, dd', { locale: ptBR })}
                  </p>
                  {rows
                    .filter(
                      (r) =>
                        new Date(String(r.scheduled_at)).toLocaleDateString('en-CA', {
                          timeZone: 'America/Fortaleza',
                        }) === format(day, 'yyyy-MM-dd'),
                    )
                    .map((r) => (
                      <Link className="calendar-item" key={r.id} href={`/calendar/${r.id}`}>
                        <strong>
                          {new Date(String(r.scheduled_at)).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Fortaleza',
                          })}{' '}
                          · {names[String(r.client_id)]}
                        </strong>
                        <p>{names[String(r.service_id)]}</p>
                        <p>{names[String(r.responsible_id)]}</p>
                      </Link>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {rows.length === 500 && (
          <p className="notice">Exibindo 500 agendamentos. Use filtros para refinar.</p>
        )}
      </div>
    </>
  );
}
