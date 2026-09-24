import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { modules, type Row } from '@/features/modules';
import { getSession } from '@/lib/session';
import { canWrite } from '@/lib/permissions';
import { getFormOptions, getRecord } from '@/features/data';
import { EntityForm } from '@/components/forms/entity-form';
import { PageHeader } from '@/components/ui';
export default async function New({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { module: key } = await params,
    definition = modules[key];
  if (!definition) notFound();
  const { member, db } = await getSession();
  if (!canWrite(member.role, definition.table)) redirect(`/${key}`);
  const search = await searchParams;
  const record: Row = { id: '' };
  for (const k of [
    'client_id',
    'service_id',
    'asset_id',
    'address_id',
    'responsible_id',
    'work_order_id',
  ])
    if (z.uuid().safeParse(search[k]).success) record[k] = search[k];
  let items;
  if (key === 'calendar' && search.quote_id && z.uuid().safeParse(search.quote_id).success) {
    const quote = await getRecord('quotes', search.quote_id);
    if (!quote || quote.status !== 'approved') notFound();
    Object.assign(record, {
      client_id: quote.client_id,
      address_id: quote.address_id,
      quote_id: quote.id,
    });
    const { data } = await db
      .from('quote_items')
      .select('service_id')
      .eq('company_id', member.company_id)
      .eq('quote_id', quote.id)
      .not('service_id', 'is', null)
      .limit(1);
    if (data?.[0]) record.service_id = data[0].service_id;
  }
  if (
    key === 'work-orders' &&
    search.appointment_id &&
    z.uuid().safeParse(search.appointment_id).success
  ) {
    const appointment = await getRecord('calendar', search.appointment_id);
    if (!appointment) notFound();
    for (const k of ['client_id', 'address_id', 'service_id', 'responsible_id', 'scheduled_at'])
      record[k] = appointment[k];
    record.appointment_id = appointment.id;
    if (appointment.quote_id) {
      const quote = await getRecord('quotes', String(appointment.quote_id));
      record.total = quote?.total;
    }
  }
  if (key === 'quotes' && search.duplicate && z.uuid().safeParse(search.duplicate).success) {
    const quote = await getRecord('quotes', search.duplicate);
    if (!quote) notFound();
    Object.assign(record, quote, { id: '', status: 'draft' });
    const { data, error } = await db
      .from('quote_items')
      .select('service_id,description,quantity,unit_price')
      .eq('company_id', member.company_id)
      .eq('quote_id', quote.id);
    if (error) throw Error('Não foi possível duplicar.');
    items = (data ?? []).map((i) => ({
      ...i,
      service_id: i.service_id ?? '',
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    }));
  }
  if (key === 'payments' && record.work_order_id) {
    const order = await getRecord('work-orders', String(record.work_order_id));
    if (!order) notFound();
    record.client_id = order.client_id;
    record.amount = order.total;
  }
  return (
    <>
      <PageHeader
        title={`Novo ${definition.singular}`}
        description="Preencha os dados abaixo. Campos com * são obrigatórios."
      />
      <EntityForm
        moduleKey={key}
        options={await getFormOptions(key)}
        record={record}
        initialItems={items}
      />
    </>
  );
}
