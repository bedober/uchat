import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Bookmark, MessageCircle, Newspaper, Phone, Settings, ShoppingBag, UserRound, ShieldCheck } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { useCalls } from '../lib/calls';

const NAV = [
  { to: '/', label: 'Chats', icon: MessageCircle },
  { to: '/feed', label: 'Feed', icon: Newspaper },
  { to: '/marketplace', label: 'Market', icon: ShoppingBag },
  { to: '/saved', label: 'Saved', icon: Bookmark },
  { to: '/creator', label: 'Creator', icon: BarChart3 },
  { to: '/calls', label: 'Calls', icon: Phone },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function NavItem({ to, label, icon: Icon, badge, vertical }: { to: string; label: string; icon: typeof Phone; badge?: number; vertical?: boolean }) {
  const { pathname } = useLocation();
  return (
    <NavLink
      to={to}
      end={to !== '/'}
      className={({ isActive }) => {
        const active = isActive || (to === '/' && pathname.startsWith('/c/'));
        return cn(
          'relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors',
          vertical && 'w-14',
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        );
      }}
    >
      <Icon className="h-5 w-5" />
      {label}
      {!!badge && (
        <span className="absolute right-1 top-0.5 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] leading-[18px] text-primary-foreground">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  );
}

export default function Shell() {
  const { unread } = useCalls();
  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="hidden w-20 shrink-0 flex-col items-center gap-2 border-r bg-card py-5 md:flex">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="text-sm font-black">U</span>
        </div>
        {NAV.map((n) => <NavItem key={n.to} {...n} vertical badge={n.to === '/' ? unread : 0} />)}
      </aside>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div role="status" aria-label="UChat security notice" className="flex shrink-0 items-center gap-2 border-b border-emerald-700/30 bg-emerald-950 px-3 py-2 text-xs font-semibold text-emerald-100 sm:px-4">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span><span className="font-extrabold tracking-wide">SECURITY ACTIVE</span> — Sign-in credentials are required. Unauthorized access is prohibited and monitored.</span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
      <nav className="flex shrink-0 justify-around border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((n) => <NavItem key={n.to} {...n} badge={n.to === '/' ? unread : 0} />)}
      </nav>
    </div>
  );
}
