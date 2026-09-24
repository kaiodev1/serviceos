import Link from 'next/link';
import { getSession } from '@/lib/session';
import { canManage } from '@/lib/permissions';
import { type Row } from '@/features/modules';
import { PageHeader } from '@/components/ui';
import { CompanyForm } from '@/components/forms/company-form';
export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { db, member } = await getSession();
  const { tab = 'company' } = await searchParams;
  const { data, error } = await db
    .from('companies')
    .select('*')
    .eq('id', member.company_id)
    .single();
  if (error) throw Error('Não foi possível carregar a empresa');
  return (
    <>
      <PageHeader
        title="Configurações"
        description="O ServiceOS do jeito que sua empresa precisa."
      />
      <div className="tabs">
        {[
          ['/settings', 'Empresa'],
          ['/team', 'Usuários'],
          ['/services', 'Serviços'],
          ['/custom-fields', 'Campos personalizados'],
          ['/checklists', 'Checklists'],
          ['/notifications', 'Notificações'],
          ['/settings?tab=integrations', 'Integrações'],
          ['/settings?tab=billing', 'Assinatura'],
        ].map(([href, label]) => (
          <Link
            key={href}
            className={
              (href === '/settings' && tab === 'company') || href.endsWith(`=${tab}`)
                ? 'active'
                : ''
            }
            href={href}
          >
            {label}
          </Link>
        ))}
      </div>
      {tab === 'integrations' ? (
        <div className="grid md:grid-cols-3 gap-5">
          {[
            ['WhatsApp', 'Conversas e envio de mensagens.'],
            ['Pix e pagamentos', 'Conexão futura com gateways financeiros.'],
            ['Inteligência artificial', 'Sugestões para ajudar sua equipe.'],
          ].map(([name, description]) => (
            <section className="card p-6" key={name}>
              <span className="badge gray mb-5">Em breve</span>
              <h2>{name}</h2>
              <p className="muted mt-3">{description}</p>
              <p className="text-xs muted mt-5">Integração ainda não disponível.</p>
            </section>
          ))}
        </div>
      ) : tab === 'billing' ? (
        <div className="card p-7">
          <h2>Assinatura</h2>
          <p className="muted mt-3">A cobrança da assinatura ainda não está integrada neste MVP.</p>
        </div>
      ) : (
        <CompanyForm company={data as Row} editable={canManage(member.role)} />
      )}
    </>
  );
}
