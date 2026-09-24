import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { PageHeader, MetricCard, EmptyState } from '@/components/ui';
import { money } from '@/lib/utils';
type Report = {
  revenue: number;
  paid_orders: number;
  completed: number;
  repeat_clients: number;
  months: { month_key: string; revenue: number }[];
  services: { name: string; quantity: number; value: number }[];
  team: { name: string; quantity: number }[];
};
export default async function Reports() {
  const { db, member } = await getSession();
  if (member.role === 'technician') redirect('/field');
  const [report, metrics] = await Promise.all([
    db.rpc('report_metrics', { cid: member.company_id }),
    db.rpc('dashboard_metrics', { cid: member.company_id }),
  ]);
  if (report.error || metrics.error) throw Error('Falha ao carregar relatórios');
  const r = report.data as Report;
  const max = Math.max(1, ...r.months.map((m) => m.revenue));
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Transforme sua operação em decisões mais claras."
      />
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard
          label="Receita total"
          value={money(r.revenue)}
          detail="Somente pagamentos com status pago"
        />
        <MetricCard
          label="Ticket médio"
          value={money(r.paid_orders ? r.revenue / r.paid_orders : 0)}
          detail="Receita / ordens com pagamento integral"
        />
        <MetricCard
          label="Ordens concluídas"
          value={r.completed}
          detail={`${r.repeat_clients} clientes com mais de uma OS concluída`}
        />
        <MetricCard
          label="Conversão de propostas"
          value={`${metrics.data.conversion}%`}
          detail="Aprovadas / propostas enviadas"
        />
      </div>
      <section className="card p-6 mt-6">
        <h2>Receita por mês</h2>
        <p className="muted text-xs mt-1">Últimos 12 meses · valores recebidos</p>
        {r.months.length ? (
          <div className="space-y-5 mt-6">
            {r.months.map((m) => (
              <div className="grid grid-cols-[70px_1fr_120px] items-center gap-4" key={m.month_key}>
                <span className="muted text-xs">{m.month_key}</span>
                <div className="bar">
                  <span style={{ width: `${(m.revenue / max) * 100}%` }} />
                </div>
                <strong className="text-right text-sm">{money(m.revenue)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Os números começam com o primeiro pagamento"
            description="Registre seus recebimentos para acompanhar a evolução."
          />
        )}
      </section>
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <section className="card p-6">
          <h2>Serviços mais executados</h2>
          <p className="muted text-xs mt-1">Ordens concluídas · todo o período</p>
          {r.services.length ? (
            <ul className="mt-5 space-y-4">
              {r.services.map((s) => (
                <li key={s.name} className="flex justify-between">
                  <span>{s.name}</span>
                  <strong>
                    {s.quantity} · {money(s.value)}
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nenhum serviço concluído" />
          )}
        </section>
        <section className="card p-6">
          <h2>Produtividade da equipe</h2>
          <p className="muted text-xs mt-1">Ordens concluídas por responsável · todo o período</p>
          {r.team.length ? (
            <ul className="mt-5 space-y-4">
              {r.team.map((t) => (
                <li key={t.name} className="flex justify-between">
                  <span>{t.name}</span>
                  <strong>{t.quantity} ordens</strong>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aguardando os primeiros atendimentos" />
          )}
        </section>
      </div>
    </>
  );
}
