'use client';
import { useState, useTransition } from 'react';
import { saveCustomValues } from '@/features/companies/actions';
import { type ActionResult } from '@/features/actions';
import { type Row } from '@/features/modules';
import { Notice } from '@/components/ui';
export function CustomFields({
  fields,
  initial,
  entity,
  id,
  editable,
}: {
  fields: Row[];
  initial: Record<string, unknown>;
  entity: string;
  id: string;
  editable: boolean;
}) {
  const [values, setValues] = useState(initial),
    [result, setResult] = useState<ActionResult>({}),
    [pending, start] = useTransition();
  return (
    <form
      className="card p-6 mt-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setResult(await saveCustomValues(entity, id, values)));
      }}
    >
      <h2 className="mb-5">Informações personalizadas</h2>
      <Notice {...result} />
      <div className="form-grid">
        {fields.map((f) => (
          <div className="field" key={f.id}>
            <label htmlFor={f.id}>
              {String(f.name)}
              {f.required ? ' *' : ''}
            </label>
            {f.type === 'select' ? (
              <select
                id={f.id}
                disabled={!editable}
                value={String(values[f.id] ?? '')}
                required={Boolean(f.required)}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              >
                <option value="">Selecione</option>
                {(f.options as string[]).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                id={f.id}
                disabled={!editable}
                value={String(values[f.id] ?? '')}
                required={Boolean(f.required)}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            ) : (
              <input
                id={f.id}
                disabled={!editable}
                type={
                  f.type === 'checkbox'
                    ? 'checkbox'
                    : ['number', 'currency'].includes(String(f.type))
                      ? 'number'
                      : f.type === 'date'
                        ? 'date'
                        : 'text'
                }
                step={f.type === 'currency' ? '0.01' : 'any'}
                required={Boolean(f.required) && f.type !== 'checkbox'}
                checked={f.type === 'checkbox' ? Boolean(values[f.id]) : undefined}
                value={f.type === 'checkbox' ? undefined : String(values[f.id] ?? '')}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [f.id]: f.type === 'checkbox' ? e.target.checked : e.target.value,
                  }))
                }
              />
            )}
          </div>
        ))}
      </div>
      {editable && (
        <button className="button secondary mt-6" disabled={pending}>
          Salvar informações
        </button>
      )}
    </form>
  );
}
