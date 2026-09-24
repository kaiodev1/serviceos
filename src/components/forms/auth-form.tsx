'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { authenticate } from '@/features/auth/actions';
import { Notice } from '@/components/ui';
import type { ActionResult } from '@/features/actions';
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [result, setResult] = useState<ActionResult>({});
  const [pending, start] = useTransition();
  return (
    <div className="auth-form">
      <p className="text-brand text-xs font-bold tracking-widest mb-3">SUA OPERAÇÃO COMEÇA AQUI</p>
      <h1>{mode === 'login' ? 'Bom ter você de volta.' : 'Mais organização. Mais futuro.'}</h1>
      <p className="muted">
        {mode === 'login'
          ? 'Entre para acompanhar seu negócio.'
          : 'Crie sua conta e organize sua empresa em um só lugar.'}
      </p>
      <Notice {...result} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = Object.fromEntries(new FormData(event.currentTarget));
          start(async () => {
            try {
              setResult(await authenticate(mode, data));
            } catch (e) {
              if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e;
              setResult({ error: 'Não foi possível conectar. Tente novamente.' });
            }
          });
        }}
      >
        {mode === 'register' && (
          <div className="field">
            <label htmlFor="name">Seu nome</label>
            <input id="name" name="name" autoComplete="name" required />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">E-mail profissional</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com.br"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="Pelo menos 8 caracteres"
            required
          />
        </div>
        <button className="button w-full mt-1" disabled={pending}>
          {pending ? 'Aguarde…' : mode === 'login' ? 'Entrar na minha conta' : 'Criar minha conta'}
        </button>
      </form>
      <p className="muted text-center mt-7">
        {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}{' '}
        <Link className="text-brand font-semibold" href={mode === 'login' ? '/register' : '/login'}>
          {mode === 'login' ? 'Começar agora' : 'Entrar'}
        </Link>
      </p>
    </div>
  );
}
