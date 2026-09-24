import Link from 'next/link';
import { Phone, MapPin, ArrowRight } from 'lucide-react';
import { getSession } from '@/lib/session';
import { recordNames } from '@/features/data';
import { type Row } from '@/features/modules';
import { PageHeader, EmptyState, StatusBadge } from '@/components/ui';
export default async function Field() {
  const { db, member } = await getSession();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' });
  const start = `${today}T00:00:00-03:00`,
    end = new Date(new Date(start).getTime() + 86400000).toISOString();
  const { data, error } = await db
    .from('work_orders')
    .select('*,clients(phone)')
    .eq('company_id', member.company_id)
    .eq('responsible_id', member.id)
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .neq('status', 'cancelled')
    .order('scheduled_at')
    .limit(100);
  if (error) throw Error('Não foi possível carregar seus atendimentos');
  const rows = (data ?? []) as Row[],
    names = await recordNames(rows);
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Seu dia, em campo."
        description="Os atendimentos atribuídos a você para hoje."
      />
      {!rows.length ? (
        <div className="card">
          <EmptyState
            title="Nenhuma ordem para hoje"
            description="As ordens atribuídas a você aparecerão aqui."
          />
          <div className="p-5 text-center">
            <Link className="button secondary" href="/calendar?view=day">
              Ver agendamentos
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((row) => (
            <article className="card p-6" key={row.id}>
              <div className="flex justify-between items-center mb-4">
                <p className="text-brand font-bold">
                  {new Date(String(row.scheduled_at)).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Fortaleza',
                  })}
                </p>
                <StatusBadge value={String(row.status)} />
              </div>
              <h2>{names[String(row.client_id)]}</h2>
              <p className="muted mt-1">{names[String(row.service_id)]}</p>
              <p className="muted flex gap-2 my-4">
                <MapPin size={17} />
                {names[String(row.address_id)] ?? 'Endereço não informado'}
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {row.address_id ? (
                  <a
                    className="button secondary"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(names[String(row.address_id)] ?? '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin size={17} />
                    Abrir rota
                  </a>
                ) : null}
                {(row.clients as { phone?: string } | null)?.phone ? (
                  <a
                    className="button secondary"
                    href={`tel:${(row.clients as { phone: string }).phone.replace(/[^\d+]/g, '')}`}
                  >
                    <Phone size={17} />
                    Ligar
                  </a>
                ) : null}
              </div>
              <Link className="button w-full min-h-12" href={`/work-orders/${row.id}`}>
                Abrir atendimento <ArrowRight size={17} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
