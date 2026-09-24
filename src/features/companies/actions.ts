'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/session';
import { canManage } from '@/lib/permissions';
import type { ActionResult } from '../actions';
export async function updateCompany(input: unknown): Promise<ActionResult> {
  const { db, member } = await getSession();
  if (!canManage(member.role)) return { error: 'Somente administradores podem alterar a empresa.' };
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(160),
      phone: z.string().regex(/^\+?[\d\s().-]{8,22}$/),
      document: z.string().max(30),
      city: z.string().trim().min(2).max(100),
      state: z.string().regex(/^[A-Z]{2}$/),
      business_type: z.string().trim().min(1).max(100),
    })
    .safeParse(input);
  if (!parsed.success) return { error: 'Confira os dados da empresa, telefone e UF.' };
  const { error } = await db.from('companies').update(parsed.data).eq('id', member.company_id);
  if (error) return { error: 'Não foi possível salvar a empresa.' };
  revalidatePath('/', 'layout');
  return { success: 'Dados da empresa atualizados.' };
}
export async function saveCustomValues(
  entity: string,
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const { db, member } = await getSession();
  if (
    !canManage(member.role) ||
    !z.uuid().safeParse(id).success ||
    !['client', 'asset', 'work_order', 'lead'].includes(entity)
  )
    return { error: 'Sem permissão.' };
  const parsed = z.record(z.uuid(), z.unknown()).safeParse(input);
  if (!parsed.success) return { error: 'Valores inválidos.' };
  const { data, error } = await db
    .from('custom_fields')
    .select('*')
    .eq('company_id', member.company_id)
    .eq('entity_type', entity);
  if (error) return { error: 'Não foi possível carregar os campos.' };
  const records = [];
  for (const field of data ?? []) {
    const raw = parsed.data[field.id];
    let value: unknown = raw;
    if (field.required && (raw === '' || raw == null)) return { error: `Preencha ${field.name}.` };
    if (raw === '' || raw == null) continue;
    if (['number', 'currency'].includes(field.type)) {
      const n = z.coerce.number().finite().safeParse(raw);
      if (!n.success) return { error: `${field.name}: informe um número válido.` };
      value = n.data;
    } else if (field.type === 'checkbox') {
      if (typeof raw !== 'boolean') return { error: 'Valor inválido.' };
    } else {
      const s = z.string().max(5000).safeParse(raw);
      if (!s.success) return { error: 'Texto inválido.' };
      if (field.type === 'date' && !z.iso.date().safeParse(raw).success)
        return { error: 'Data inválida.' };
      if (field.type === 'select' && !(field.options as string[]).includes(s.data))
        return { error: 'Selecione uma opção válida.' };
    }
    records.push({ company_id: member.company_id, field_id: field.id, entity_id: id, value });
  }
  const { error: writeError } = await db.rpc('save_custom_values', {
    cid: member.company_id,
    entity,
    eid: id,
    field_values: Object.fromEntries(records.map((record) => [record.field_id, record.value])),
  });
  if (writeError) return { error: 'Não foi possível salvar os campos.' };
  revalidatePath('/', 'layout');
  return { success: 'Campos atualizados.' };
}
