'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card p-10 text-center">
      <h1>Não foi possível carregar os dados.</h1>
      <p className="muted my-4">
        Confira sua conexão e tente novamente. Se persistir, verifique a configuração do Supabase.
      </p>
      <button className="button" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
