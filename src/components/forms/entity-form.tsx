'use client';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { modules, labels, type Row, type Option } from '@/features/modules';
import { saveEntity, type ActionResult } from '@/features/actions';
import { Notice } from '@/components/ui';
import { money } from '@/lib/utils';
type Item = { service_id: string; description: string; quantity: number; unit_price: number };
export function EntityForm({
  moduleKey,
  record,
  options,
  initialItems,
}: {
  moduleKey: string;
  record?: Row;
  options: Record<string, Option[]>;
  initialItems?: Item[];
}) {
  const definition = modules[moduleKey],
    router = useRouter();
  const [pending, start] = useTransition(),
    [result, setResult] = useState<ActionResult>({});
  const defaults = Object.fromEntries(
    definition.fields.map((f) => {
      let value =
        record?.[f.key] ??
        (f.type === 'checkbox'
          ? true
          : f.type === 'number'
            ? ['duration_minutes'].includes(f.key)
              ? 60
              : f.key === 'interval_value'
                ? 1
                : 0
            : (f.options?.[0] ?? ''));
      if (f.type === 'datetime-local' && value)
        value = new Date(new Date(String(value)).getTime() - 3 * 3600000)
          .toISOString()
          .slice(0, 16);
      if (['metadata', 'options'].includes(f.key) && typeof value === 'object')
        value = JSON.stringify(value, null, 2);
      return [f.key, value];
    }),
  );
  const { register, handleSubmit, watch } = useForm<Record<string, unknown>>({
    defaultValues: defaults,
  });
  // React Hook Form subscriptions update dependent address/asset choices as the client changes.
  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedClient = watch('client_id');
  const discount = Number(watch('discount') || 0);
  const [items, setItems] = useState<Item[]>(
    initialItems ?? [{ service_id: '', description: '', quantity: 1, unit_price: 0 }],
  );
  const changeItem = (index: number, patch: Partial<Item>) =>
    setItems((all) => all.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <form
      className="card form-card"
      onSubmit={handleSubmit((values) =>
        start(async () => {
          try {
            const response = await saveEntity(moduleKey, record?.id || null, values, items);
            setResult(response);
            if (response.id) {
              router.push(`/${moduleKey}/${response.id}`);
              router.refresh();
            }
          } catch {
            setResult({ error: 'Falha de conexão. Tente novamente.' });
          }
        }),
      )}
    >
      <Notice {...result} />
      {moduleKey === 'team' && (
        <p className="notice notice-success">
          O membro acessará a empresa ao criar uma conta e confirmar este mesmo e-mail. Compartilhe
          o endereço de cadastro com ele.
        </p>
      )}
      <div className="form-grid">
        {definition.fields.map((field) => (
          <div
            className={`field ${field.type === 'textarea' ? 'col-span-full' : ''}`}
            key={field.key}
          >
            <label htmlFor={field.key}>
              {field.label}
              {field.required ? ' *' : ''}
            </label>
            {field.type === 'textarea' ? (
              <textarea id={field.key} {...register(field.key)} required={field.required} />
            ) : field.type === 'select' ? (
              <select id={field.key} {...register(field.key)} required={field.required}>
                <option value="">Selecione</option>
                {field.options?.map((o) => (
                  <option key={o} value={o}>
                    {labels[o] ?? o}
                  </option>
                ))}
                {field.relation &&
                  options[field.relation]
                    ?.filter(
                      (o) => !o.client_id || !selectedClient || o.client_id === selectedClient,
                    )
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
              </select>
            ) : (
              <input
                id={field.key}
                {...register(field.key)}
                type={field.type ?? 'text'}
                required={field.required}
                min={field.min}
                step={field.step}
                readOnly={moduleKey === 'team' && Boolean(record?.id) && field.key === 'email'}
              />
            )}
          </div>
        ))}
      </div>
      {moduleKey === 'quotes' && (
        <section className="mt-8 border-t border-slate-100 pt-6">
          <h2>Itens da proposta</h2>
          <div className="space-y-4 my-5">
            {items.map((item, index) => (
              <div key={index} className="p-4 rounded-lg bg-slate-50 space-y-3">
                <div className="field">
                  <label htmlFor={`service-${index}`}>Serviço do catálogo (opcional)</label>
                  <select
                    id={`service-${index}`}
                    value={item.service_id}
                    onChange={(e) => {
                      const s = options.services?.find((o) => o.id === e.target.value);
                      changeItem(index, {
                        service_id: e.target.value,
                        ...(s ? { description: s.label, unit_price: s.base_price ?? 0 } : {}),
                      });
                    }}
                  >
                    <option value="">Item personalizado</option>
                    {options.services?.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`description-${index}`}>Descrição</label>
                  <input
                    id={`description-${index}`}
                    required
                    value={item.description}
                    onChange={(e) => changeItem(index, { description: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-3">
                  <div className="field flex-1">
                    <label htmlFor={`quantity-${index}`}>Quantidade</label>
                    <input
                      id={`quantity-${index}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={item.quantity}
                      onChange={(e) => changeItem(index, { quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="field flex-1">
                    <label htmlFor={`price-${index}`}>Preço unitário</label>
                    <input
                      id={`price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unit_price}
                      onChange={(e) => changeItem(index, { unit_price: Number(e.target.value) })}
                    />
                  </div>
                  <button
                    className="icon-button mb-1"
                    type="button"
                    aria-label={`Remover item ${index + 1}`}
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <button
              className="button secondary small"
              type="button"
              onClick={() =>
                setItems([
                  ...items,
                  { service_id: '', description: '', quantity: 1, unit_price: 0 },
                ])
              }
            >
              <Plus size={15} />
              Adicionar item
            </button>
            <strong>
              Total:{' '}
              {money(
                items.reduce((s, i) => s + Math.round(i.quantity * i.unit_price * 100), 0) / 100 -
                  discount,
              )}
            </strong>
          </div>
        </section>
      )}
      <div className="flex justify-end gap-3 mt-8 border-t border-slate-100 pt-6">
        <Link href={`/${moduleKey}`} className="button secondary">
          Cancelar
        </Link>
        <button className="button" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar ' + definition.singular}
        </button>
      </div>
    </form>
  );
}
