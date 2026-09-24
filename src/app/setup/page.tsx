import { Wrench, Database, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { configured } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function Setup() {
  if (configured()) redirect('/login');
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-xl p-10">
        <div className="wordmark mb-10">
          <span className="brand-icon">
            <Wrench size={20} />
          </span>
          ServiceOS
        </div>
        <Database className="text-brand mb-5" size={32} />
        <h1>Vamos conectar sua operação.</h1>
        <p className="muted mt-4">
          A aplicação está instalada. Para começar a cadastrar sua empresa e seus clientes, conecte
          o banco de dados.
        </p>
        <ol className="list-decimal pl-5 my-7 space-y-4">
          <li>Crie um projeto Supabase.</li>
          <li>
            Aplique os arquivos em <code>supabase/migrations</code>, na ordem numérica.
          </li>
          <li>
            Copie <code>.env.example</code> para <code>.env.local</code> e preencha a URL e a chave
            pública do projeto.
          </li>
          <li>Reinicie o servidor e crie sua conta.</li>
        </ol>
        <p className="muted text-sm mb-6">
          As instruções completas estão no README. Nenhum dado de demonstração é carregado
          automaticamente.
        </p>
        <Link href="/login" className="button">
          Acessar minha conta <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
