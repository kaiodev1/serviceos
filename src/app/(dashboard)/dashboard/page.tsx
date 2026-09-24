import Link from 'next/link';
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Wallet,
  Users,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { recordNames } from '@/features/data';
import { type Row } from '@/features/modules';
import { PageHeader, MetricCard, EmptyState, StatusBadge } from '@/components/ui';
import { EntityTable } from '@/components/tables/entity-table';
import { money, date } from '@/lib/utils';
export default async function Dashboard() {
  const { db, member } = await getSession();
  if (member.role === 'technician') redirect('/field');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
  const start = `${today}T00:00:00-03:00`,
    end = new Date(new Date(start).getTime() + 86400000).toISOString();
  const [metrics, appointments, quotes, recurrences, followups, activity] = await Promise.all([
    db.rpc('dashboard_metrics', { cid: member.company_id }),
    db
      .from('appointments')
      .select('*')
      .eq('company_id', member.company_id)
      .gte('scheduled_at', start)
      .lt('scheduled_at', end)
      .neq('status', 'cancelled')
      .order('scheduled_at')
      .limit(8),
    db
      .from('quotes')
      .select('*')
      .eq('company_id', member.company_id)
      .order('created_at', { ascending: false })
      .limit(5),
    db
      .from('recurring_services')
      .select('*')
      .eq('company_id', member.company_id)
      .eq('active', true)
      .order('next_date')
      .limit(4),
    db
      .from('follow_ups')
      .select('*')
      .eq('company_id', member.company_id)
      .eq('status', 'pending')
      .lte('scheduled_for', today)
      .order('scheduled_for')
      .limit(5),
    db
      .from('activity_logs')
      .select('*')
      .eq('company_id', member.company_id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);
  if ([metrics, appointments, quotes, recurrences, followups, activity].some((r) => r.error))
    throw Error('Não foi possível carregar o dashboard');
  const m = metrics.data as Record<string, number>,
    appts = (appointments.data ?? []) as Row[],
    qs = (quotes.data ?? []) as Row[],
    rs = (recurrences.data ?? []) as Row[],
    names = await recordNames([...appts, ...qs, ...rs]);
  return (
    <>
      <PageHeader
        title={`Olá, ${member.name.split(' ')[0]}.`}
        description="Vamos fazer de hoje um bom dia para o seu negócio."
        href="/calendar/new"
        action="Novo agendamento"
      />
      <div className="flex items-center gap-2 text-xs muted mb-6">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Sua operação em tempo real
        <span className="ml-auto capitalize">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            timeZone: 'America/Fortaleza',
          })}
        </span>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        <MetricCard
          label="Atendimentos hoje"
          value={m.today_count}
          detail={`${m.today_completed} concluídos · ${m.today_progress} em andamento`}
          icon={<CalendarDays size={17} />}
        />
        <MetricCard
          label="Ordens abertas"
          value={m.open_orders}
          detail="Acompanhe o andamento da sua operação"
          icon={<ClipboardList size={17} />}
        />
        <MetricCard
          label="Orçamentos em aberto"
          value={money(m.pending_value)}
          detail={`${m.pending_quotes} aguardando resposta`}
          icon={<FileText size={17} />}
        />
        <MetricCard
          label="Faturamento do mês"
          value={money(m.revenue)}
          detail="Pagamentos integralmente recebidos no mês"
          icon={<Wallet size={17} />}
        />
        <MetricCard
          label="Clientes para reativar"
          value={m.reactivate}
          detail="Sem atendimento concluído há 180 dias"
          icon={<Users size={17} />}
        />
        <MetricCard
          label="Conversão de orçamentos"
          value={`${m.conversion}%`}
          detail="Propostas aprovadas entre as enviadas"
          icon={<TrendingUp size={17} />}
        />
      </div>
      <div className="grid xl:grid-cols-[1.7fr_1fr] gap-6 mt-7">
        <div className="space-y-6">
          <section className="card">
            <Panel title="Agenda de hoje" href="/calendar" label="Ver agenda" />
            {appts.length ? (
              <EntityTable moduleKey="calendar" rows={appts} names={names} />
            ) : (
              <EmptyState
                title="Um dia cheio de possibilidades"
                description="Você ainda não tem atendimentos agendados para hoje."
                href="/calendar/new"
                action="Agendar atendimento"
              />
            )}
          </section>
          <section className="card">
            <Panel title="Orçamentos recentes" href="/quotes" label="Ver todos" />
            {qs.length ? (
              <EntityTable moduleKey="quotes" rows={qs} names={names} />
            ) : (
              <EmptyState
                title="Sua próxima venda começa aqui"
                description="Crie uma proposta e acompanhe a aprovação."
                href="/quotes/new"
                action="Criar orçamento"
              />
            )}
          </section>
          <section className="card">
            <Panel title="Follow-ups de hoje e atrasados" href="/follow-ups" label="Ver todos" />
            {followups.data?.length ? (
              <div className="divide-y divide-slate-100">
                {followups.data.map((f) => (
                  <Link
                    className="flex justify-between gap-4 p-5"
                    key={f.id}
                    href={`/follow-ups/${f.id}`}
                  >
                    <div>
                      <p className="font-medium">{f.notes}</p>
                      <p className="muted text-xs mt-1">{date(f.scheduled_for)}</p>
                    </div>
                    <StatusBadge value="pending" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="Tudo em dia" description="Nenhum follow-up pendente para hoje." />
            )}
          </section>
        </div>
        <div className="space-y-6">
          <section className="card">
            <Panel title="Visão financeira" href="/payments" label="Detalhes" />
            <div className="p-6 space-y-6">
              {[
                ['Recebido neste mês', m.revenue, 'text-emerald-600'],
                ['A receber', m.receivable, 'text-slate-700'],
                ['Em atraso', m.overdue, 'text-amber-700'],
              ].map(([label, value, color]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="muted">{label}</span>
                  <strong className={String(color)}>{money(Number(value))}</strong>
                </div>
              ))}
              <Link className="button secondary w-full" href="/reports">
                Explorar relatórios <ArrowUpRight size={15} />
              </Link>
            </div>
          </section>
          <section className="card">
            <Panel title="Próximas recorrências" href="/recurring" label="Ver todas" />
            {rs.length ? (
              <div className="divide-y divide-slate-100">
                {rs.map((r) => (
                  <Link className="block p-5" key={r.id} href={`/recurring/${r.id}`}>
                    <p className="font-medium">{names[String(r.client_id)]}</p>
                    <p className="muted text-xs mt-1">
                      {names[String(r.service_id)]} · {date(String(r.next_date))}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Construa relações duradouras"
                description="Programe o próximo serviço dos seus clientes."
              />
            )}
          </section>
          <section className="card">
            <Panel title="Atividade recente" />
            <div className="p-5 space-y-5">
              {activity.data?.length ? (
                activity.data.map((a) => (
                  <div className="flex gap-3" key={a.id}>
                    <span className="w-2 h-2 bg-sky-300 rounded-full mt-2 shrink-0" />
                    <div>
                      <p className="text-xs">
                        {
                          (
                            {
                              clients: 'Cliente',
                              leads: 'Lead',
                              quotes: 'Orçamento',
                              appointments: 'Agendamento',
                              work_orders: 'Ordem',
                              payments: 'Pagamento',
                              recurring_services: 'Recorrência',
                              follow_ups: 'Follow-up',
                            } as Record<string, string>
                          )[a.entity_type]
                        }{' '}
                        {a.action === 'insert' ? 'criado' : 'atualizado'}
                      </p>
                      <p className="muted text-[11px] mt-1">{date(a.created_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted text-sm">Suas primeiras atividades aparecerão aqui.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
function Panel({ title, href, label }: { title: string; href?: string; label?: string }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      {href && (
        <Link href={href} className="panel-link">
          {label} →
        </Link>
      )}
    </div>
  );
}
