'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  runWorkflow,
  addChecklistItem,
  uploadOrderFile,
  type ActionResult,
} from '@/features/actions';
import { orderTransitions } from '@/features/domain';
import { type Row, labels } from '@/features/modules';
import { Notice } from '@/components/ui';
export function WorkflowButton({
  label,
  input,
  href,
  destructive = false,
}: {
  label: string;
  input: Record<string, unknown>;
  href?: string;
  destructive?: boolean;
}) {
  const [pending, start] = useTransition(),
    [result, setResult] = useState<ActionResult>({}),
    [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const run = () =>
    start(async () => {
      try {
        const r = await runWorkflow(input);
        setResult(r);
        setConfirm(false);
        if (r.success) {
          if (href && r.id) router.push(href + r.id);
          router.refresh();
        }
      } catch {
        setResult({ error: 'Não foi possível atualizar. Tente novamente.' });
      }
    });
  return (
    <div>
      <button
        disabled={pending}
        onClick={() => (destructive ? setConfirm(true) : run())}
        className="button secondary small"
      >
        {pending ? 'Atualizando…' : label}
      </button>
      {confirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirmar alteração"
          className="fixed inset-0 bg-slate-900/40 grid place-items-center p-5 z-50"
        >
          <div className="card p-7 max-w-md">
            <h2>Confirmar esta alteração?</h2>
            <p className="muted my-4">Esta ação altera o status do registro.</p>
            <div className="flex gap-3">
              <button className="button secondary" onClick={() => setConfirm(false)}>
                Voltar
              </button>
              <button className="button danger" onClick={run} disabled={pending}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      <Notice {...result} />
    </div>
  );
}
export function ChecklistEditor({ templateId }: { templateId: string }) {
  const [label, setLabel] = useState(''),
    [result, setResult] = useState<ActionResult>({}),
    [pending, start] = useTransition();
  return (
    <form
      className="mt-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addChecklistItem(templateId, label);
          setResult(r);
          if (r.success) setLabel('');
        });
      }}
    >
      <div className="field">
        <label htmlFor="checklist-label">Novo item</label>
        <input
          id="checklist-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          maxLength={300}
        />
      </div>
      <button className="button secondary mt-3" disabled={pending}>
        Adicionar item
      </button>
      <Notice {...result} />
    </form>
  );
}
export function OrderExecution({
  order,
  checklist,
  technician,
}: {
  order: Row;
  checklist: Row[];
  technician: boolean;
}) {
  const [result, setResult] = useState<ActionResult>({}),
    [pending, start] = useTransition(),
    [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const [values, setValues] = useState({
    diagnosis: String(order.diagnosis ?? ''),
    performed_service: String(order.performed_service ?? ''),
    notes: String(order.notes ?? ''),
  });
  const closed = ['completed', 'cancelled'].includes(String(order.status));
  const execute = (status: string) =>
    start(async () => {
      try {
        const r = await runWorkflow({ kind: 'order', id: order.id, status, ...values });
        setResult(r);
        setConfirm(false);
        router.refresh();
      } catch {
        setResult({ error: 'Falha de conexão. Tente novamente.' });
      }
    });
  return (
    <div className="card p-6">
      <h2>Execução do atendimento</h2>
      <Notice {...result} />
      <div className="space-y-4 mt-5">
        {(['diagnosis', 'performed_service', 'notes'] as const).map((key) => (
          <div className="field" key={key}>
            <label htmlFor={key}>
              {
                {
                  diagnosis: 'Diagnóstico',
                  performed_service: 'Serviço executado',
                  notes: 'Observações',
                }[key]
              }
            </label>
            <textarea
              id={key}
              disabled={closed}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <h3 className="mt-6 mb-3">Checklist</h3>
      {checklist.length ? (
        checklist.map((item) => (
          <label key={item.id} className="flex gap-3 items-center py-3 border-b border-slate-100">
            <input
              type="checkbox"
              checked={Boolean(item.completed)}
              disabled={closed || pending}
              onChange={(e) => {
                const checked = e.target.checked;
                start(async () => {
                  setResult(await runWorkflow({ kind: 'check', id: item.id, checked }));
                  router.refresh();
                });
              }}
            />
            {String(item.label)}
          </label>
        ))
      ) : (
        <p className="muted text-sm">Esta ordem não possui checklist.</p>
      )}
      {!closed && (
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            disabled={pending}
            className="button secondary"
            onClick={() => execute(String(order.status))}
          >
            Salvar observações
          </button>
          {orderTransitions[String(order.status)]
            ?.filter((s) => !technician || s !== 'cancelled')
            .map((status) => (
              <button
                key={status}
                disabled={pending}
                className={`button ${status === 'cancelled' ? 'secondary' : ''}`}
                onClick={() => (status === 'cancelled' ? setConfirm(true) : execute(status))}
              >
                {{
                  on_the_way: 'Iniciar deslocamento',
                  in_progress: 'Iniciar serviço',
                  paused: 'Pausar',
                  completed: 'Finalizar serviço',
                  cancelled: 'Cancelar OS',
                }[status] ?? labels[status]}
              </button>
            ))}
        </div>
      )}
      {confirm && (
        <div className="notice notice-error">
          <p>Cancelar esta ordem de serviço?</p>
          <div className="flex gap-3 mt-3">
            <button
              className="button danger"
              disabled={pending}
              onClick={() => execute('cancelled')}
            >
              Confirmar cancelamento
            </button>
            <button className="button secondary" onClick={() => setConfirm(false)}>
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export function FileUploader({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition(),
    [result, setResult] = useState<ActionResult>({});
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget,
          data = new FormData(form);
        start(async () => {
          try {
            const r = await uploadOrderFile(data);
            setResult(r);
            if (r.success) form.reset();
          } catch {
            setResult({ error: 'Falha ao enviar. Verifique a conexão e tente novamente.' });
          }
        });
      }}
      className="space-y-3 mt-5"
    >
      <input type="hidden" name="id" value={orderId} />
      <div className="field">
        <label htmlFor="file-type">Tipo do registro</label>
        <select name="type" id="file-type">
          <option value="before">Antes</option>
          <option value="during">Durante</option>
          <option value="after">Depois</option>
          <option value="document">Documento</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="file">Foto ou documento (até 6 MB)</label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
        />
      </div>
      <button className="button secondary" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar arquivo'}
      </button>
      <Notice {...result} />
    </form>
  );
}
export function PrintButton() {
  return (
    <button className="button secondary small" onClick={() => window.print()}>
      Imprimir proposta
    </button>
  );
}
