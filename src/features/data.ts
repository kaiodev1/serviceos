import 'server-only';
import { getSession } from '@/lib/session';
import { modules, type Option, type Row } from './modules';
export async function getOptions(moduleKey: string): Promise<Option[]> {
  const { db, member } = await getSession();
  const definition = modules[moduleKey];
  const columns =
    moduleKey === 'addresses'
      ? 'id,label,street,client_id'
      : ['quotes', 'work-orders'].includes(moduleKey)
        ? 'id,number,client_id'
        : moduleKey === 'calendar'
          ? 'id,scheduled_at,client_id'
          : ['assets'].includes(moduleKey)
            ? 'id,name,client_id'
            : moduleKey === 'services'
              ? 'id,name,base_price'
              : 'id,name';
  let query = db
    .from(definition.table)
    .select(columns)
    .eq('company_id', member.company_id)
    .limit(200);
  if (moduleKey === 'quotes') query = query.eq('status', 'approved');
  if (moduleKey === 'team' || moduleKey === 'services') query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw new Error('Não foi possível carregar as opções.');
  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    label: String(
      r.name ??
        (r.number ? `#${r.number}` : r.street ? `${r.label} · ${r.street}` : r.scheduled_at),
    ),
    ...(r.client_id ? { client_id: String(r.client_id) } : {}),
    ...(r.base_price != null ? { base_price: Number(r.base_price) } : {}),
  }));
}
export async function getFormOptions(moduleKey: string) {
  const relations = [
    ...new Set(modules[moduleKey].fields.flatMap((f) => (f.relation ? [f.relation] : []))),
    ...(moduleKey === 'quotes' ? ['services'] : []),
  ];
  return Object.fromEntries(
    await Promise.all(relations.map(async (r) => [r, await getOptions(r)] as const)),
  );
}
export async function getRecord(key: string, id: string): Promise<Row | null> {
  const { db, member } = await getSession();
  const { data, error } = await db
    .from(modules[key].table)
    .select('*')
    .eq('company_id', member.company_id)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Não foi possível carregar o registro.');
  return data as Row | null;
}
export async function recordNames(rows: Row[]) {
  const { db, member } = await getSession();
  const relations: Record<string, string> = {
    client_id: 'clients',
    responsible_id: 'company_members',
    service_id: 'services',
    asset_id: 'customer_assets',
    address_id: 'client_addresses',
  };
  const results = await Promise.all(
    Object.entries(relations).map(async ([key, table]) => {
      const ids = [
        ...new Set(rows.map((r) => r[key]).filter((id): id is string => typeof id === 'string')),
      ];
      if (!ids.length) return [];
      const { data, error } = await db
        .from(table)
        .select(key === 'address_id' ? 'id,street,number,city' : 'id,name')
        .eq('company_id', member.company_id)
        .in('id', ids);
      if (error) throw Error('Não foi possível carregar os vínculos.');
      return (data as unknown as Row[]).map(
        (r) => [r.id, String(r.name ?? `${r.street}, ${r.number} · ${r.city}`)] as const,
      );
    }),
  );
  return Object.fromEntries(results.flat());
}
