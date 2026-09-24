import { getSession } from '@/lib/session';
import { PageHeader, EmptyState } from '@/components/ui';
import { WorkflowButton } from '@/components/forms/workflows';
import { date } from '@/lib/utils';
export default async function Notifications() {
  const { db, member } = await getSession();
  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('company_id', member.company_id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw Error('Não foi possível carregar notificações');
  return (
    <>
      <PageHeader title="Notificações" description="As atualizações da sua operação." />
      <div className="mb-5">
        <WorkflowButton label="Marcar todas como lidas" input={{ kind: 'notifications' }} />
      </div>
      <div className="card">
        {data?.length ? (
          <ul className="divide-y divide-slate-100">
            {data.map((n) => (
              <li key={n.id} className="p-5 flex gap-4">
                <span
                  className={`w-2 h-2 rounded-full mt-2 ${n.read_at ? 'bg-slate-200' : 'bg-sky-500'}`}
                />
                <div>
                  <h3>{n.title}</h3>
                  <p className="muted text-xs mt-1">
                    {date(n.created_at)} · {n.read_at ? 'Lida' : 'Não lida'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Você está em dia"
            description="Novos leads, aprovações e pagamentos aparecerão aqui."
          />
        )}
      </div>
    </>
  );
}
