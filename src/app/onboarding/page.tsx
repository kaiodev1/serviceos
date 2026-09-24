import { OnboardingForm } from '@/components/forms/onboarding';
import { getUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Brand } from '@/components/layout/brand';
import { ThemeToggle } from '@/components/layout/theme-toggle';
export const dynamic = 'force-dynamic';
export default async function Onboarding() {
  const { db, user } = await getUser();
  await db.rpc('accept_invitation');
  const { data, error } = await db
    .from('company_members')
    .select('id,active')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw Error('Não foi possível verificar seu vínculo.');
  if (data?.active) redirect('/dashboard');
  if (data)
    return (
      <main className="p-10">
        <h1>Acesso desativado</h1>
        <p>Peça ao administrador da empresa para reativar seu acesso.</p>
      </main>
    );
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center justify-between w-full max-w-2xl">
        <Brand />
        <ThemeToggle />
      </div>
      <OnboardingForm />
    </main>
  );
}
