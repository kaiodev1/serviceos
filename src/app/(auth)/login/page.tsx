import { AuthForm } from '@/components/forms/auth-form';
import { Notice } from '@/components/ui';
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div>
      {error && (
        <Notice error="O link de confirmação expirou ou é inválido. Solicite um novo cadastro ou tente entrar." />
      )}
      <AuthForm mode="login" />
    </div>
  );
}
