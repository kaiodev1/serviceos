import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { getRecord, getFormOptions } from '@/features/data';
import { getSession } from '@/lib/session';
import { canWrite } from '@/lib/permissions';
import { modules } from '@/features/modules';
import { PageHeader } from '@/components/ui';
import { EntityForm } from '@/components/forms/entity-form';
export default async function Edit({
  params,
}: {
  params: Promise<{ module: string; id: string }>;
}) {
  const { module: key, id } = await params;
  if (!modules[key] || !z.uuid().safeParse(id).success) notFound();
  const { db, member } = await getSession();
  if (!canWrite(member.role, modules[key].table) || key === 'work-orders')
    redirect(`/${key}/${id}`);
  const record = await getRecord(key, id);
  if (!record) notFound();
  if (key === 'quotes' && record.status !== 'draft') redirect(`/quotes/${id}`);
  let items;
  if (key === 'quotes') {
    const { data, error } = await db
      .from('quote_items')
      .select('service_id,description,quantity,unit_price')
      .eq('company_id', member.company_id)
      .eq('quote_id', id);
    if (error) throw Error('Não foi possível carregar itens');
    items = (data ?? []).map((i) => ({
      ...i,
      service_id: i.service_id ?? '',
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    }));
  }
  return (
    <>
      <PageHeader title={`Editar ${modules[key].singular}`} />
      <EntityForm
        moduleKey={key}
        record={record}
        options={await getFormOptions(key)}
        initialItems={items}
      />
    </>
  );
}
