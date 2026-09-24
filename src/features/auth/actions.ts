'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/session';
import type { ActionResult } from '../actions';
const credentials = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().max(160).optional(),
});
export async function authenticate(
  mode: 'login' | 'register',
  input: unknown,
): Promise<ActionResult> {
  const parsed = credentials.safeParse(input);
  if (!parsed.success)
    return { error: 'Informe um e-mail válido e uma senha com pelo menos 8 caracteres.' };
  const db = await createClient();
  const { email, password, name } = parsed.data;
  if (mode === 'register') {
    const { error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || email.split('@')[0] },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });
    if (error)
      return {
        error: 'Não foi possível criar a conta. Confira os dados ou tente novamente mais tarde.',
      };
    return {
      success: 'Cadastro recebido. Verifique seu e-mail para confirmar a conta e depois entre.',
    };
  }
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { error: 'E-mail ou senha inválidos, ou conta ainda não confirmada.' };
  await db.rpc('accept_invitation');
  redirect('/dashboard');
}
export async function signOut() {
  const db = await createClient();
  await db.auth.signOut();
  redirect('/login');
}
const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().regex(/^\+?[\d\s().-]{8,22}$/),
  document: z.string().max(30),
  city: z.string().trim().min(2).max(100),
  state: z.string().regex(/^[A-Z]{2}$/),
  business_type: z.string().min(1).max(100),
  team_size: z.enum(['solo', '2-5', '6-10', '11-30', '30+']),
  services: z.array(z.string().trim().min(1).max(160)).max(20),
});
export async function onboard(input: unknown): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success)
    return { error: 'Confira os dados obrigatórios, telefone e UF com duas letras.' };
  const { db } = await getUser();
  const { error } = await db.rpc('onboard_company', { payload: parsed.data });
  if (error)
    return {
      error:
        'Não foi possível criar a empresa. Verifique se sua conta já possui vínculo ou se as migrations foram aplicadas.',
    };
  redirect('/dashboard');
}
