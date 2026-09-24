'use client';
import { useState, useTransition } from 'react';
import { onboard } from '@/features/auth/actions';
import { Notice } from '@/components/ui';
import type { ActionResult } from '@/features/actions';
const sectors = [
  'Climatização',
  'Elétrica',
  'Energia solar',
  'Hidráulica',
  'Piscinas',
  'Segurança eletrônica',
  'Assistência técnica',
  'Limpeza',
  'Dedetização',
  'Manutenção predial',
  'Outro',
];
export function OnboardingForm() {
  const [step, setStep] = useState(0),
    [result, setResult] = useState<ActionResult>({}),
    [pending, start] = useTransition();
  const [values, setValues] = useState({
    name: '',
    phone: '',
    document: '',
    city: '',
    state: '',
    business_type: '',
    team_size: 'solo',
    services: '',
  });
  const update = (key: keyof typeof values, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));
  return (
    <div className="card p-7 w-full max-w-2xl">
      <p className="text-brand text-xs font-semibold tracking-widest">BEM-VINDO AO SERVICEOS</p>
      <div className="flex gap-2 my-6">
        {[0, 1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded ${n <= step ? 'bg-sky-500' : 'bg-slate-100'}`}
          />
        ))}
      </div>
      <h1>
        {
          [
            'Vamos conhecer sua empresa.',
            'O que sua empresa faz?',
            'Quem faz acontecer com você?',
            'Seu primeiro catálogo.',
          ][step]
        }
      </h1>
      <p className="muted mt-2 mb-7">
        Etapa {step + 1} de 4 · Você poderá ajustar esses dados depois.
      </p>
      <Notice {...result} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 3) {
            setStep(step + 1);
            return;
          }
          start(async () =>
            setResult(
              await onboard({
                ...values,
                services: values.services
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              }),
            ),
          );
        }}
      >
        <div className="form-grid">
          {step === 0 &&
            (['name', 'phone', 'document', 'city', 'state'] as const).map((key) => (
              <div className="field" key={key}>
                <label htmlFor={key}>
                  {
                    {
                      name: 'Nome da empresa',
                      phone: 'Telefone',
                      document: 'CPF / CNPJ (opcional)',
                      city: 'Cidade',
                      state: 'UF',
                    }[key]
                  }
                </label>
                <input
                  id={key}
                  required={key !== 'document'}
                  maxLength={key === 'state' ? 2 : 160}
                  value={values[key]}
                  onChange={(e) =>
                    update(key, key === 'state' ? e.target.value.toUpperCase() : e.target.value)
                  }
                />
              </div>
            ))}
          {step === 1 && (
            <div className="field col-span-full">
              <label htmlFor="business">Área de atuação</label>
              <select
                id="business"
                required
                value={values.business_type}
                onChange={(e) => update('business_type', e.target.value)}
              >
                <option value="">Selecione uma área</option>
                {sectors.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          {step === 2 && (
            <div className="field col-span-full">
              <label htmlFor="size">Tamanho da equipe</label>
              <select
                id="size"
                value={values.team_size}
                onChange={(e) => update('team_size', e.target.value)}
              >
                {[
                  ['solo', 'Somente eu'],
                  ['2-5', '2–5 pessoas'],
                  ['6-10', '6–10 pessoas'],
                  ['11-30', '11–30 pessoas'],
                  ['30+', 'Mais de 30 pessoas'],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {step === 3 && (
            <div className="field col-span-full">
              <label htmlFor="services">Serviços iniciais (um por linha)</label>
              <textarea
                id="services"
                value={values.services}
                onChange={(e) => update('services', e.target.value)}
                placeholder={'Visita técnica\nInstalação\nManutenção preventiva'}
                rows={5}
              />
              <p className="muted text-xs">
                Os serviços serão criados sem preço. Ajuste os valores no catálogo antes de elaborar
                propostas.
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <button type="button" className="button secondary" onClick={() => setStep(step - 1)}>
              Voltar
            </button>
          ) : (
            <span />
          )}
          <button disabled={pending} className="button">
            {pending ? 'Criando sua empresa…' : step < 3 ? 'Continuar' : 'Ir para minha operação'}
          </button>
        </div>
      </form>
    </div>
  );
}
