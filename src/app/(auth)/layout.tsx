import { Wrench, CheckCircle2 } from 'lucide-react';
import { configured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  if (!configured()) redirect('/setup');
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="wordmark">
          <span className="brand-icon">
            <Wrench size={20} />
          </span>
          ServiceOS
        </div>
        <div>
          <p className="text-sky-300 text-xs tracking-widest font-semibold mb-5">
            MENOS PLANILHAS. MAIS POSSIBILIDADES.
          </p>
          <h1>
            Sua operação.
            <br />
            Em um só lugar.
          </h1>
          <p className="text-slate-300 mt-7 text-lg max-w-md">
            Do primeiro contato ao próximo atendimento. Tudo conectado para sua empresa seguir em
            frente.
          </p>
          <div className="mt-10 space-y-4 text-slate-200">
            {[
              'Clientes e oportunidades organizados',
              'Equipe conectada, no escritório e em campo',
              'Clareza para decidir o próximo passo',
            ].map((t) => (
              <p key={t} className="flex gap-3">
                <CheckCircle2 size={18} className="text-sky-300" />
                {t}
              </p>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400">Feito para quem faz acontecer.</p>
      </section>
      <section className="auth-panel">{children}</section>
    </main>
  );
}
