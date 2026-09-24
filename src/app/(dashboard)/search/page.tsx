import Link from 'next/link';
import { getSession } from '@/lib/session';
import { PageHeader, EmptyState } from '@/components/ui';
import { type Row } from '@/features/modules';
export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const { db, member } = await getSession();
  const term = q
    .replace(/[^\p{L}\p{N}\s@+.-]/gu, '')
    .trim()
    .slice(0, 100);
  let rows: { label: string; href: string; type: string }[] = [];
  if (term) {
    const results = await Promise.all(
      ['clients', 'work_orders', 'quotes'].map(async (table) => {
        let query = db.from(table).select('*').eq('company_id', member.company_id).limit(10);
        if (table === 'clients') query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%`);
        else if (/^\d+$/.test(term)) query = query.eq('number', term);
        else return [];
        const { data, error } = await query;
        if (error) throw Error('Não foi possível pesquisar');
        return ((data ?? []) as Row[]).map((r) => ({
          label: String(r.name ?? '#' + r.number),
          href: `/${table === 'work_orders' ? 'work-orders' : table}/${r.id}`,
          type:
            table === 'clients' ? 'Cliente' : table === 'quotes' ? 'Orçamento' : 'Ordem de serviço',
        }));
      }),
    );
    rows = results.flat();
  }
  return (
    <>
      <PageHeader
        title="Pesquisar"
        description="Encontre clientes pelo nome ou telefone, ordens e orçamentos pelo número."
      />
      <form className="flex gap-3 mb-6">
        <input
          name="q"
          aria-label="Termo de pesquisa"
          defaultValue={q}
          placeholder="Nome, telefone ou número…"
          required
        />
        <button className="button">Pesquisar</button>
      </form>
      <div className="card">
        {rows.length ? (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => (
              <Link key={r.href} href={r.href} className="block p-5">
                <p className="muted text-xs">{r.type}</p>
                <h3>{r.label}</h3>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title={term ? 'Nenhum registro encontrado' : 'O que você está procurando?'}
            description="Digite um nome, telefone ou número para começar."
          />
        )}
      </div>
    </>
  );
}
