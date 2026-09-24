'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  FileText,
  BriefcaseBusiness,
  Wallet,
  UsersRound,
  Repeat2,
  ChartNoAxesCombined,
  Settings,
  Search,
  Bell,
  Plus,
  ChevronDown,
  LogOut,
  Headset,
  MapPin,
} from 'lucide-react';
import { signOut } from '@/features/auth/actions';
import { modules } from '@/features/modules';
import type { Role } from '@/lib/permissions';
import { Brand } from './brand';
import { ThemeToggle } from './theme-toggle';
const navigation = [
  { title: '', items: [['dashboard', 'Dashboard', LayoutDashboard]] },
  {
    title: 'OPERAÇÃO',
    items: [
      ['leads', 'Leads', Headset],
      ['clients', 'Clientes', Users],
      ['calendar', 'Agenda', CalendarDays],
      ['work-orders', 'Ordens de serviço', ClipboardList],
    ],
  },
  {
    title: 'COMERCIAL',
    items: [
      ['quotes', 'Orçamentos', FileText],
      ['services', 'Serviços', BriefcaseBusiness],
    ],
  },
  { title: 'FINANCEIRO', items: [['payments', 'Pagamentos', Wallet]] },
  {
    title: 'GESTÃO',
    items: [
      ['team', 'Equipe', UsersRound],
      ['recurring', 'Recorrências', Repeat2],
      ['reports', 'Relatórios', ChartNoAxesCombined],
    ],
  },
] as const;
export function Shell({
  children,
  company,
  name,
  role,
  notifications,
}: {
  children: React.ReactNode;
  company: string;
  name: string;
  role: Role;
  notifications: number;
}) {
  const path = usePathname();
  const key = path.split('/')[1];
  return (
    <div className="workspace">
      <header className="app-topbar">
        <div className="app-header">
          <Link
            className="wordmark header-brand"
            href={role === 'technician' ? '/field' : '/dashboard'}
          >
            <Brand />
          </Link>
          <div className="header-company">
            <span className="avatar rounded-lg shrink-0">{company[0]}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{company}</p>
              <p className="muted text-[10px]">Minha empresa</p>
            </div>
          </div>
          <div className="flex-1" />
          <form action="/search" className="search-box header-search w-60">
            <Search size={16} className="text-slate-400" />
            <input name="q" aria-label="Pesquisa global" placeholder="Pesquisar na operação…" />
          </form>
          <ThemeToggle />
          {role !== 'technician' && (
            <details className="menu">
              <summary className="button small" aria-label="Criar novo registro">
                <Plus size={16} />
                <span className="quick-create-label">Novo</span>
                <ChevronDown className="quick-create-chevron" size={13} />
              </summary>
              <div className="dropdown">
                {['clients', 'leads', 'quotes', 'calendar', 'work-orders'].map((k) => (
                  <Link key={k} href={`/${k}/new`}>
                    {modules[k].singular.replace(/^./, (s) => s.toUpperCase())}
                  </Link>
                ))}
              </div>
            </details>
          )}
          <Link
            className="relative icon-button"
            href="/notifications"
            aria-label={`${notifications} notificações não lidas`}
          >
            <Bell size={18} />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-sky-600 text-white text-[9px] rounded-full px-1">
                {notifications}
              </span>
            )}
          </Link>
          <details className="menu">
            <summary className="avatar" aria-label="Menu do usuário">
              {name.substring(0, 2).toUpperCase()}
            </summary>
            <div className="dropdown">
              <p className="text-xs font-semibold p-3">{name}</p>
              <Link href="/settings">Minha empresa</Link>
              <form action={signOut}>
                <button>
                  <LogOut size={14} className="inline mr-2" />
                  Sair da conta
                </button>
              </form>
            </div>
          </details>
        </div>
        <nav className="top-navigation" aria-label="Navegação principal">
          {role !== 'technician' &&
            navigation.map((group) => (
              <div
                className="nav-section"
                key={group.title}
                role="group"
                aria-label={group.title || 'Início'}
              >
                {group.items.map(([route, label, Icon]) => (
                  <Link
                    className={`nav-link ${key === route ? 'active' : ''}`}
                    href={`/${route}`}
                    key={route}
                    aria-current={key === route ? 'page' : undefined}
                  >
                    <Icon size={17} strokeWidth={1.7} />
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          <div className="nav-section nav-utilities">
            {role !== 'technician' && (
              <Link
                className={`nav-link ${key === 'settings' ? 'active' : ''}`}
                href="/settings"
                aria-current={key === 'settings' ? 'page' : undefined}
              >
                <Settings size={17} />
                Configurações
              </Link>
            )}
            <Link
              className={`nav-link ${key === 'field' ? 'active' : ''}`}
              href="/field"
              aria-current={key === 'field' ? 'page' : undefined}
            >
              <MapPin size={17} />
              {role === 'technician' ? 'Meus atendimentos' : 'Modo de campo'}
            </Link>
          </div>
        </nav>
      </header>
      <main className="main">
        <div className="header-breadcrumb text-xs text-slate-400 mb-5">
          Workspace <span className="px-3">/</span>
          <span className="text-slate-700">
            {modules[key]?.title ??
              (
                {
                  dashboard: 'Dashboard',
                  reports: 'Relatórios',
                  settings: 'Configurações',
                  field: 'Em campo',
                  notifications: 'Notificações',
                  search: 'Pesquisa',
                } as Record<string, string>
              )[key]}
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
