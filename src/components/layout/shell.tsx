'use client';
import { useState } from 'react';
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
  Wrench,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Headset,
  ArrowUpRight,
  MapPin,
} from 'lucide-react';
import { signOut } from '@/features/auth/actions';
import { modules } from '@/features/modules';
import type { Role } from '@/lib/permissions';
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
  const [open, setOpen] = useState(false);
  const key = path.split('/')[1];
  return (
    <>
      <aside className={`sidebar ${open ? 'mobile-open' : ''}`}>
        <div className="flex items-center justify-between px-3 mb-6">
          <Link className="wordmark" href="/dashboard">
            <span className="brand-icon">
              <Wrench size={19} />
            </span>
            Service<span className="text-brand -ml-2">OS</span>
          </Link>
          <button
            className="mobile-menu icon-button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 mx-1 mb-3">
          <span className="avatar rounded-lg shrink-0">{company[0]}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{company}</p>
            <p className="muted text-[10px]">Minha empresa</p>
          </div>
        </div>
        <nav className="overflow-y-auto flex-1">
          {role === 'technician' ? (
            <Link className="nav-link active" href="/field">
              <MapPin size={17} />
              Meus atendimentos
            </Link>
          ) : (
            navigation.map((group) => (
              <div key={group.title}>
                {group.title && <p className="nav-group">{group.title}</p>}
                {group.items.map(([route, label, Icon]) => (
                  <Link
                    onClick={() => setOpen(false)}
                    className={`nav-link ${key === route ? 'active' : ''}`}
                    href={`/${route}`}
                    key={route}
                  >
                    <Icon size={17} strokeWidth={1.7} />
                    {label}
                  </Link>
                ))}
              </div>
            ))
          )}
        </nav>
        <div className="mt-5 pt-4 border-t border-slate-100">
          {role !== 'technician' && (
            <Link className={`nav-link ${key === 'settings' ? 'active' : ''}`} href="/settings">
              <Settings size={17} />
              Configurações
            </Link>
          )}
          <Link className="nav-link" href="/field">
            <MapPin size={17} />
            Modo de campo <ArrowUpRight size={13} />
          </Link>
          <p className="text-[10px] text-slate-400 px-3 pt-4">Sua operação. Em um só lugar.</p>
        </div>
      </aside>
      <div className="workspace">
        <header className="app-header">
          <button
            className="mobile-menu icon-button"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={19} />
          </button>
          <div className="header-breadcrumb text-xs text-slate-400">
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
          <div className="flex-1" />
          <form action="/search" className="search-box header-search w-60">
            <Search size={16} className="text-slate-400" />
            <input name="q" aria-label="Pesquisa global" placeholder="Pesquisar na operação…" />
          </form>
          {role !== 'technician' && (
            <details className="menu">
              <summary className="button small">
                <Plus size={16} />
                Novo
                <ChevronDown size={13} />
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
        </header>
        <main className="main">{children}</main>
      </div>
    </>
  );
}
