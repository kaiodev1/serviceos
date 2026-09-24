import { getSession } from '@/lib/session';
import { type Row } from '@/features/modules';
import { date, money } from '@/lib/utils';
export async function QuoteDocument({
  quote,
  names,
}: {
  quote: Row;
  names: Record<string, string>;
}) {
  const { db, member, company } = await getSession();
  const { data, error } = await db
    .from('quote_items')
    .select('*')
    .eq('company_id', member.company_id)
    .eq('quote_id', quote.id);
  if (error) throw Error('Não foi possível carregar a proposta');
  return (
    <article className="card p-7 mb-6">
      <div className="flex flex-wrap justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <p className="wordmark text-brand">{company.name}</p>
          <p className="muted mt-2">Proposta de serviços</p>
        </div>
        <div className="text-right">
          <h2>Orçamento #{String(quote.number).padStart(4, '0')}</h2>
          <p className="muted">Válido até {date(String(quote.valid_until))}</p>
        </div>
      </div>
      <div className="my-6">
        <p className="muted text-xs uppercase tracking-wider">Preparado para</p>
        <h2 className="mt-1">{names[String(quote.client_id)]}</h2>
        {quote.address_id ? <p className="muted">{names[String(quote.address_id)]}</p> : null}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Quantidade</th>
              <th>Valor unitário</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{money(item.unit_price)}</td>
                <td>
                  {money(Math.round(Number(item.quantity) * Number(item.unit_price) * 100) / 100)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ml-auto max-w-xs mt-6 space-y-3">
        <p className="flex justify-between muted">
          <span>Subtotal</span>
          <span>{money(Number(quote.subtotal))}</span>
        </p>
        <p className="flex justify-between muted">
          <span>Desconto</span>
          <span>− {money(Number(quote.discount))}</span>
        </p>
        <p className="flex justify-between text-lg font-bold border-t border-slate-100 pt-3">
          <span>Total</span>
          <span className="text-brand">{money(Number(quote.total))}</span>
        </p>
      </div>
      {quote.notes ? (
        <p className="mt-8 pt-6 border-t border-slate-100 whitespace-pre-wrap muted">
          {String(quote.notes)}
        </p>
      ) : null}
    </article>
  );
}
