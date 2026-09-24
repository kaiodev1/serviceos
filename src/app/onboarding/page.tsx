import { OnboardingForm } from '@/components/forms/onboarding';
import { getUser } from '@/lib/session';
import { redirect } from 'next/navigation';
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
    <main className="min-h-screen flex items-center justify-center p-6">
      <OnboardingForm />
    </main>
  );
}
