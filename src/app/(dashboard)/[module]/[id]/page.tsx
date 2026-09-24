import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { canManage, canWrite } from '@/lib/permissions';
import { getRecord, recordNames } from '@/features/data';
import { modules, type Row } from '@/features/modules';
import { PageHeader, StatusBadge } from '@/components/ui';
import { displayValue } from '@/components/tables/entity-table';
import {
  WorkflowButton,
  ChecklistEditor,
  OrderExecution,
  FileUploader,
  PrintButton,
} from '@/components/forms/workflows';
import { ClientDetail } from '@/components/clients/client-detail';
import { QuoteDocument } from '@/components/quotes/quote-document';
import { date } from '@/lib/utils';
import { CustomFields } from '@/components/forms/custom-fields';
export default async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ module: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { module: key, id } = await params,
    definition = modules[key];
  if (!definition || !z.uuid().safeParse(id).success) notFound();
  const { db, member } = await getSession();
  if (
    member.role === 'technician' &&
    !['clients', 'calendar', 'work-orders', 'assets', 'addresses', 'services'].includes(key)
  )
    redirect('/field');
  const row = await getRecord(key, id);
  if (!row) notFound();
  const names = await recordNames([row]);
  const writable = canWrite(member.role, definition.table);
  const { data: activities, error: activityError } = await db
    .from('activity_logs')
    .select('*')
    .eq('company_id', member.company_id)
    .eq('entity_type', definition.table)
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (activityError) throw Error('Não foi possível carregar as atividades');
  let checklist: Row[] = [],
    files: { id: string; type: string; url: string }[] = [];
  if (key === 'work-orders') {
    const [checks, uploads] = await Promise.all([
      db
        .from('work_order_checklists')
        .select('*')
        .eq('company_id', member.company_id)
        .eq('work_order_id', id)
        .order('id'),
      db
        .from('work_order_files')
        .select('*')
        .eq('company_id', member.company_id)
        .eq('work_order_id', id)
        .order('created_at'),
    ]);
    if (checks.error || uploads.error) throw Error('Não foi possível carregar a execução');
    checklist = (checks.data ?? []) as Row[];
    files = await Promise.all(
      (uploads.data ?? []).map(async (file) => {
        const { data, error } = await db.storage
          .from('work-order-files')
          .createSignedUrl(file.file_path, 300);
        if (error) throw Error('Não foi possível acessar um anexo');
        return { id: file.id, type: file.type, url: data.signedUrl };
      }),
    );
  }
  const { tab } = await searchParams;
  const entityType = (
    { clients: 'client', assets: 'asset', 'work-orders': 'work_order', leads: 'lead' } as Record<
      string,
      string
    >
  )[key];
  let customFields: Row[] = [];
  let customValues: Record<string, unknown> = {};
  if (entityType && member.role !== 'technician') {
    const [definitions, values] = await Promise.all([
      db
        .from('custom_fields')
        .select('*')
        .eq('company_id', member.company_id)
        .eq('entity_type', entityType),
      db
        .from('custom_field_values')
        .select('field_id,value')
        .eq('company_id', member.company_id)
        .eq('entity_id', id),
    ]);
    if (definitions.error || values.error)
      throw Error('Não foi possível carregar os campos personalizados.');
    customFields = (definitions.data ?? []) as Row[];
    customValues = Object.fromEntries(
      customFields.map((f) => [f.id, f.type === 'checkbox' ? false : '']),
    );
    for (const value of values.data ?? []) customValues[value.field_id] = value.value;
  }
  return (
    <>
      <PageHeader
        title={String(
          row.name ??
            `${definition.singular.replace(/^./, (c) => c.toUpperCase())}${row.number ? ' #' + String(row.number).padStart(4, '0') : ''}`,
        )}
        description={key === 'clients' ? String(row.phone) : definition.description}
      />
      <div className="flex flex-wrap items-center gap-3 mb-6 no-print">
        {row.status ? <StatusBadge value={String(row.status)} /> : null}
        <Link className="button secondary small" href={`/${key}`}>
          ← Voltar
        </Link>
        {writable &&
          key !== 'work-orders' &&
          (key !== 'quotes' || row.status === 'draft') &&
          !(key === 'team' && row.role === 'owner') && (
            <Link className="button secondary small" href={`/${key}/${id}/edit`}>
              Editar
            </Link>
          )}
        {key === 'clients' &&
          writable &&
          [
            ['quotes', 'Novo orçamento'],
            ['calendar', 'Agendar'],
            ['work-orders', 'Criar OS'],
          ].map(([route, label]) => (
            <Link className="button small" key={route} href={`/${route}/new?client_id=${id}`}>
              {label}
            </Link>
          ))}
        {key === 'leads' && row.status === 'won' && writable && (
          <WorkflowButton
            label="Converter em cliente"
            input={{ kind: 'lead', id }}
            href="/clients/"
          />
        )}
        {key === 'quotes' && writable && (
          <>
            {row.status === 'draft' && (
              <WorkflowButton
                label="Marcar como enviado"
                input={{ kind: 'quote', id, status: 'sent' }}
              />
            )}
            {['sent', 'viewed'].includes(String(row.status)) && (
              <>
                <WorkflowButton
                  label="Aprovar orçamento"
                  input={{ kind: 'quote', id, status: 'approved' }}
                />
                <WorkflowButton
                  label="Rejeitar"
                  input={{ kind: 'quote', id, status: 'rejected' }}
                  destructive
                />
              </>
            )}
            {row.status === 'approved' && (
              <Link className="button small" href={`/calendar/new?quote_id=${id}`}>
                Criar agendamento
              </Link>
            )}
            <Link className="button secondary small" href={`/quotes/new?duplicate=${id}`}>
              Duplicar
            </Link>
            <PrintButton />
          </>
        )}
        {key === 'calendar' &&
          writable &&
          !['completed', 'cancelled'].includes(String(row.status)) && (
            <Link className="button small" href={`/work-orders/new?appointment_id=${id}`}>
              Criar ordem de serviço
            </Link>
          )}
        {key === 'work-orders' && row.status === 'completed' && canManage(member.role) && (
          <>
            <Link className="button small" href={`/payments/new?work_order_id=${id}`}>
              Registrar pagamento
            </Link>
            <Link
              className="button secondary small"
              href={`/recurring/new?client_id=${row.client_id}&service_id=${row.service_id}&responsible_id=${row.responsible_id}${row.asset_id ? '&asset_id=' + row.asset_id : ''}`}
            >
              Criar recorrência
            </Link>
            <Link className="button secondary small" href="/follow-ups/new">
              Criar follow-up
            </Link>
          </>
        )}
        {key === 'recurring' && Boolean(row.active) && canManage(member.role) && (
          <WorkflowButton
            label="Gerar próxima visita"
            input={{ kind: 'recurring', id }}
            href="/calendar/"
          />
        )}
      </div>
      {key === 'quotes' ? (
        <QuoteDocument quote={row} names={names} />
      ) : (
        <div className="card p-6 detail-grid">
          {definition.fields
            .filter((f) => !['diagnosis', 'performed_service'].includes(f.key))
            .map((f) => (
              <div key={f.key}>
                <p className="muted text-xs mb-1">{f.label}</p>
                <div className="detail-value font-medium">
                  {f.key === 'client_id' ? (
                    <Link className="text-brand" href={`/clients/${row.client_id}`}>
                      {displayValue(f.key, row[f.key], names)}
                    </Link>
                  ) : (
                    displayValue(f.key, row[f.key], names)
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
      {customFields.length > 0 && (
        <CustomFields
          fields={customFields}
          initial={customValues}
          entity={entityType}
          id={id}
          editable={canManage(member.role)}
        />
      )}
      {key === 'clients' && <ClientDetail client={row} tab={tab ?? 'addresses'} />}{' '}
      {key === 'checklists' && <ChecklistTemplate id={id} editable={canManage(member.role)} />}{' '}
      {key === 'work-orders' && (
        <div className="grid xl:grid-cols-[1.5fr_1fr] gap-6 mt-6">
          <OrderExecution
            order={row}
            checklist={checklist}
            technician={member.role === 'technician'}
          />
          <div className="card p-6">
            <h2>Fotos e documentos</h2>
            <div className="space-y-3 mt-4">
              {files.map((file, i) => (
                <a
                  className="button secondary w-full"
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {
                    { before: 'Antes', during: 'Durante', after: 'Depois', document: 'Documento' }[
                      file.type
                    ]
                  }{' '}
                  · Anexo {i + 1} ↗
                </a>
              ))}
              {!files.length && <p className="muted">Nenhum arquivo anexado.</p>}
            </div>
            <FileUploader orderId={id} />
          </div>
        </div>
      )}
      {activities?.length ? (
        <section className="card p-6 mt-6">
          <h2>Atividade recente</h2>
          <ol className="mt-5 space-y-4">
            {activities.map((log) => (
              <li className="flex gap-3 items-start" key={log.id}>
                <span className="h-2 w-2 rounded-full bg-sky-400 mt-2" />
                <div>
                  <p className="text-sm">
                    {log.action === 'insert' ? 'Registro criado' : 'Registro atualizado'}
                    {log.metadata?.status && log.metadata.status !== log.metadata.previous_status
                      ? ` · ${displayValue('status', log.metadata.status)}`
                      : ''}
                  </p>
                  <p className="muted text-xs">
                    {date(log.created_at)} ·{' '}
                    {new Date(log.created_at).toLocaleTimeString('pt-BR', {
                      timeZone: 'America/Fortaleza',
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
async function ChecklistTemplate({ id, editable }: { id: string; editable: boolean }) {
  const { db, member } = await getSession();
  const { data, error } = await db
    .from('checklist_template_items')
    .select('id,label')
    .eq('company_id', member.company_id)
    .eq('template_id', id)
    .order('position');
  if (error) throw Error('Falha ao carregar checklist');
  return (
    <div className="card p-6 mt-6">
      <h2>Itens do modelo</h2>
      <ul className="space-y-3 mt-4">
        {data?.map((item) => (
          <li key={item.id}>○ {item.label}</li>
        ))}
      </ul>
      {editable && <ChecklistEditor templateId={id} />}
    </div>
  );
}
