import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { MessageCircle, Newspaper, Phone, Settings, ShoppingBag, UserRound } from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { useCalls } from '../lib/calls';

const NAV = [
  { to: '/', label: 'Chats', icon: MessageCircle },
  { to: '/feed', label: 'Feed', icon: Newspaper },
  { to: '/marketplace', label: 'Market', icon: ShoppingBag },
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
          'relative flex flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium transition-colors sm:text-sm',
          vertical && 'w-14 rounded-xl',
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        );
      }}
    >
      <Icon className="h-6 w-6" strokeWidth={2} />
      <span>{label}</span>
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
    <div className="flex h-full flex-col bg-background md:flex-row">
      <aside className="hidden w-20 shrink-0 flex-col items-center gap-2 border-r bg-card py-5 md:flex">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="text-sm font-black">U</span>
        </div>
        {NAV.map((n) => <NavItem key={n.to} {...n} vertical badge={n.to === '/' ? unread : 0} />)}
      </aside>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
      <nav aria-label="Main navigation" className="grid shrink-0 grid-cols-6 items-center border-t border-border bg-card px-1 pb-[env(safe-area-inset-bottom)] pt-1 md:hidden">
        {NAV.map((n) => <NavItem key={n.to} {...n} badge={n.to === '/' ? unread : 0} />)}
      </nav>
    </div>
  );
}
