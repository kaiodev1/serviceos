import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { configured, createClient } from './supabase/server';
import type { Role } from './permissions';
export const getUser = cache(async () => {
  if (!configured()) redirect('/setup');
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect('/login');
  return { db, user };
});
export const getSession = cache(async () => {
  const { db, user } = await getUser();
  const { data: member, error } = await db
    .from('company_members')
    .select('id, company_id, role, name, companies(name)')
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle();
  if (error)
    throw new Error(
      'Não foi possível carregar sua empresa. Verifique as migrations e tente novamente.',
    );
  if (!member) redirect('/onboarding');
  const company = member.companies as unknown as { name: string };
  return {
    db,
    user,
    member: {
      id: member.id as string,
      company_id: member.company_id as string,
      role: member.role as Role,
      name: member.name as string,
    },
    company,
  };
});
