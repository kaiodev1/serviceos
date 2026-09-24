import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="p-10 text-center">
      <h1>Registro não encontrado.</h1>
      <p className="muted my-4">Ele pode não existir ou não estar disponível para sua conta.</p>
      <Link className="button" href="/dashboard">
        Voltar ao início
      </Link>
    </main>
  );
}
