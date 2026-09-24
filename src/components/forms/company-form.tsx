'use client';
import { useState, useTransition } from 'react';
import { updateCompany } from '@/features/companies/actions';
import { type ActionResult } from '@/features/actions';
import { type Row } from '@/features/modules';
import { Notice } from '@/components/ui';
export function CompanyForm({ company, editable }: { company: Row; editable: boolean }) {
  const [result, setResult] = useState<ActionResult>({}),
    [pending, start] = useTransition();
  return (
    <form
      className="card form-card"
      onSubmit={(e) => {
        e.preventDefault();
        const values = Object.fromEntries(new FormData(e.currentTarget));
        start(async () => setResult(await updateCompany(values)));
      }}
    >
      <h2 className="mb-6">Dados da empresa</h2>
      <Notice {...result} />
      <div className="form-grid">
        {Object.entries({
          name: 'Nome da empresa',
          phone: 'Telefone',
          document: 'Documento',
          city: 'Cidade',
          state: 'UF',
          business_type: 'Área de atuação',
        }).map(([key, label]) => (
          <div className="field" key={key}>
            <label htmlFor={key}>{label}</label>
            <input
              id={key}
              name={key}
              defaultValue={String(company[key] ?? '')}
              disabled={!editable}
              required={key !== 'document'}
              maxLength={key === 'state' ? 2 : 160}
            />
          </div>
        ))}
      </div>
      {editable && (
        <button className="button mt-7" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      )}
    </form>
  );
}
