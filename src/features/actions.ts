'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/session';
import { canWrite, canManage } from '@/lib/permissions';
import { modules, moduleSchema } from './modules';
import { quoteTotals } from './domain';
export type ActionResult = { error?: string; success?: string; id?: string };
const itemsSchema = z
  .array(
    z.object({
      service_id: z.preprocess((v) => (v === '' ? null : v), z.uuid().nullable().optional()),
      description: z.string().trim().min(1).max(300),
      quantity: z.coerce.number().positive().max(99999).multipleOf(0.01),
      unit_price: z.coerce.number().nonnegative().max(9999999).multipleOf(0.01),
    }),
  )
  .min(1)
  .max(100);
function dbMessage(code: string, message: string) {
  if (code === '23503')
    return 'Verifique os vínculos: cliente, endereço, ativo e ordem devem corresponder.';
  if (code === '23505') return 'Este registro já existe ou já foi convertido.';
  if (code === '23514') return 'Os valores ou o status são inconsistentes. Confira o formulário.';
  if (code === '42501') return 'Você não tem permissão para esta operação.';
  return code === 'P0001'
    ? message
    : 'Não foi possível salvar. Confira os dados e tente novamente.';
}
export async function saveEntity(
  key: string,
  id: string | null,
  input: unknown,
  items?: unknown,
): Promise<ActionResult> {
  const definition = modules[key];
  if (!definition) return { error: 'Módulo inválido' };
  const { db, member } = await getSession();
  if (!canWrite(member.role, definition.table))
    return { error: 'Você não tem permissão para alterar estes dados.' };
  if (id && !z.uuid().safeParse(id).success) return { error: 'Registro inválido' };
  const parsed = moduleSchema(definition).safeParse(input);
  if (!parsed.success)
    return {
      error: parsed.error.issues
        .map(
          (i) =>
            `${definition.fields.find((f) => f.key === i.path[0])?.label ?? 'Campo'}: ${i.message}`,
        )
        .join(' · '),
    };
  const payload = parsed.data;
  let result;
  if (key === 'quotes') {
    const validatedItems = itemsSchema.safeParse(items);
    if (!validatedItems.success)
      return { error: 'Adicione itens válidos, com descrição, quantidade e preço.' };
    try {
      quoteTotals(validatedItems.data, Number(payload.discount));
    } catch {
      return { error: 'O desconto não pode ultrapassar o subtotal.' };
    }
    result = await db.rpc('save_quote', {
      cid: member.company_id,
      quote_id: id,
      payload,
      items: validatedItems.data,
    });
  } else if (key === 'team') {
    result = await db.rpc('save_member', { cid: member.company_id, member_id: id, payload });
  } else if (key === 'work-orders') {
    if (id) return { error: 'Use a tela de execução para atualizar a ordem.' };
    result = await db.rpc('create_work_order', { cid: member.company_id, payload });
  } else {
    if (key === 'calendar' && payload.quote_id) {
      const { data: quote, error } = await db
        .from('quotes')
        .select('id')
        .eq('company_id', member.company_id)
        .eq('id', payload.quote_id)
        .eq('client_id', payload.client_id)
        .eq('status', 'approved')
        .maybeSingle();
      if (error || !quote) return { error: 'Escolha um orçamento aprovado deste cliente.' };
    }
    if (key === 'payments') {
      const amount = Number(payload.amount),
        paid = Number(payload.paid_amount);
      if (
        (payload.status === 'paid' && (amount !== paid || !payload.paid_at)) ||
        (payload.status === 'partially_paid' && !(paid > 0 && paid < amount)) ||
        (['pending', 'cancelled', 'refunded'].includes(String(payload.status)) && paid !== 0)
      )
        return { error: 'Confira o valor recebido e a data de pagamento para o status escolhido.' };
    }
    const query = id
      ? db.from(definition.table).update(payload).eq('company_id', member.company_id).eq('id', id)
      : db.from(definition.table).insert({ ...payload, company_id: member.company_id });
    result = await query.select('id').single();
  }
  if (result.error) return { error: dbMessage(result.error.code, result.error.message) };
  revalidatePath('/', 'layout');
  return {
    success: 'Registro salvo.',
    id: typeof result.data === 'string' ? result.data : result.data?.id,
  };
}
const workflowSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('quote'),
    id: z.uuid(),
    status: z.enum(['sent', 'approved', 'rejected', 'expired']),
  }),
  z.object({ kind: z.literal('lead'), id: z.uuid() }),
  z.object({ kind: z.literal('recurring'), id: z.uuid() }),
  z.object({ kind: z.literal('check'), id: z.uuid(), checked: z.boolean() }),
  z.object({
    kind: z.literal('order'),
    id: z.uuid(),
    status: z.enum([
      'open',
      'assigned',
      'on_the_way',
      'in_progress',
      'paused',
      'completed',
      'cancelled',
    ]),
    diagnosis: z.string().max(5000),
    performed_service: z.string().max(5000),
    notes: z.string().max(5000),
  }),
  z.object({ kind: z.literal('notifications') }),
]);
export async function runWorkflow(input: unknown): Promise<ActionResult> {
  const parsed = workflowSchema.safeParse(input);
  if (!parsed.success) return { error: 'Dados inválidos.' };
  const { db, member } = await getSession();
  const action = parsed.data;
  let rpc: string;
  let args: Record<string, unknown> = { cid: member.company_id };
  switch (action.kind) {
    case 'quote':
      rpc = 'quote_status';
      args = { ...args, qid: action.id, next_status: action.status };
      break;
    case 'lead':
      rpc = 'convert_lead';
      args = { ...args, lid: action.id };
      break;
    case 'recurring':
      rpc = 'generate_recurring';
      args = { ...args, rid: action.id };
      break;
    case 'check':
      rpc = 'check_order_item';
      args = { ...args, item_id: action.id, checked: action.checked };
      break;
    case 'order':
      rpc = 'update_order';
      args = {
        ...args,
        oid: action.id,
        next_status: action.status,
        diagnosis: action.diagnosis,
        performed_service: action.performed_service,
        notes: action.notes,
      };
      break;
    case 'notifications':
      rpc = 'read_notifications';
      break;
  }
  const { data, error } = await db.rpc(rpc, args);
  if (error) return { error: dbMessage(error.code, error.message) };
  revalidatePath('/', 'layout');
  return { success: 'Atualizado com sucesso.', id: typeof data === 'string' ? data : undefined };
}
export async function addChecklistItem(templateId: string, label: string): Promise<ActionResult> {
  const input = z
    .object({ templateId: z.uuid(), label: z.string().trim().min(1).max(300) })
    .safeParse({ templateId, label });
  if (!input.success) return { error: 'Informe uma descrição válida.' };
  const { db, member } = await getSession();
  if (!canManage(member.role)) return { error: 'Sem permissão' };
  const { error } = await db
    .from('checklist_template_items')
    .insert({ company_id: member.company_id, template_id: templateId, label: input.data.label });
  if (error) return { error: dbMessage(error.code, error.message) };
  revalidatePath('/checklists/' + templateId);
  return { success: 'Item adicionado.' };
}
export async function uploadOrderFile(form: FormData): Promise<ActionResult> {
  const input = z
    .object({ id: z.uuid(), type: z.enum(['before', 'during', 'after', 'document']) })
    .safeParse({ id: form.get('id'), type: form.get('type') });
  const file = form.get('file');
  if (!input.success || !(file instanceof File) || file.size === 0 || file.size > 6 * 1024 * 1024)
    return { error: 'Selecione um arquivo de até 6 MB.' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime =
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      ? 'image/jpeg'
      : bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
        ? 'image/png'
        : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
            String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
          ? 'image/webp'
          : String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-'
            ? 'application/pdf'
            : null;
  if (!mime || mime !== file.type)
    return { error: 'Envie uma imagem JPEG, PNG, WebP ou um PDF válido.' };
  const { db, member, user } = await getSession();
  const { data: order } = await db
    .from('work_orders')
    .select('id')
    .eq('company_id', member.company_id)
    .eq('id', input.data.id)
    .maybeSingle();
  if (!order) return { error: 'Ordem indisponível.' };
  const path = `${member.company_id}/${order.id}/${crypto.randomUUID()}`;
  const uploaded = await db.storage
    .from('work-order-files')
    .upload(path, bytes, { contentType: mime });
  if (uploaded.error) return { error: 'Não foi possível enviar o arquivo.' };
  const { error } = await db.from('work_order_files').insert({
    company_id: member.company_id,
    work_order_id: order.id,
    type: input.data.type,
    file_path: path,
    mime_type: mime,
    uploaded_by: user.id,
  });
  if (error) {
    await db.storage.from('work-order-files').remove([path]);
    return { error: 'Não foi possível vincular o arquivo à ordem.' };
  }
  revalidatePath('/work-orders/' + order.id);
  return { success: 'Arquivo enviado.' };
}
