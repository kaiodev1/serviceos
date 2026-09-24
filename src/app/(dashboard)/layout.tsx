import { getSession } from '@/lib/session';
import { Shell } from '@/components/layout/shell';
export const dynamic = 'force-dynamic';
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { db, member, company } = await getSession();
  const { count } = await db
    .from('notifications')
    .select('id', { head: true, count: 'exact' })
    .eq('company_id', member.company_id)
    .is('read_at', null);
  return (
    <Shell company={company.name} name={member.name} role={member.role} notifications={count ?? 0}>
      {children}
    </Shell>
  );
}
