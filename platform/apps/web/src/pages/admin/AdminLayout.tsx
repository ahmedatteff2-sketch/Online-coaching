import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Utensils,
  Library,
  Apple,
  Globe,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/api/auth';
import { cn } from '@/lib/cn';

const items = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/members', icon: Users, label: 'Members' },
  { to: '/admin/training-plans', icon: Dumbbell, label: 'Training Plans' },
  { to: '/admin/nutrition-plans', icon: Utensils, label: 'Nutrition Plans' },
  { to: '/admin/exercise-library', icon: Library, label: 'Exercise Library' },
  { to: '/admin/food-library', icon: Apple, label: 'Food Library' },
  { to: '/admin/landing-page-editor', icon: Globe, label: 'Landing Page' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, clearSession } = useAuthStore();

  async function logout() {
    await authApi.logout().catch(() => undefined);
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-ink-950">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink-700/60 bg-ink-900/70 md:block">
        <SidebarContent onNavigate={() => undefined} onLogout={logout} userName={user?.fullName} />
      </aside>

      {/* Mobile drawer */}
      <div className={cn('fixed inset-0 z-40 md:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}>
        <div
          className={cn('absolute inset-0 bg-black/60 transition-opacity', open ? 'opacity-100' : 'opacity-0')}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-72 border-r border-ink-700/60 bg-ink-900 transition-transform',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarContent onNavigate={() => setOpen(false)} onLogout={logout} userName={user?.fullName} />
        </aside>
      </div>

      <div className="md:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-700/60 bg-ink-950/80 px-4 backdrop-blur md:px-8">
          <button
            type="button"
            className="rounded-lg p-2 text-ink-100 hover:bg-ink-800 md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden text-xs uppercase tracking-[0.3em] text-ink-300 md:block">
            Admin Console
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-medium leading-tight">{user?.fullName}</div>
              <div className="text-xs text-ink-300">Admin</div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-accent-400 text-ink-950 text-sm font-bold">
              {user?.fullName?.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  onNavigate,
  onLogout,
  userName,
}: {
  onNavigate: () => void;
  onLogout: () => void;
  userName?: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5 border-b border-ink-700/60">
        <Logo brand="Coach Pro" />
        <button
          type="button"
          aria-label="Close"
          className="rounded p-1 text-ink-300 hover:bg-ink-800 md:hidden"
          onClick={onNavigate}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="grid gap-1">
          {items.map((it) => (
            <li key={it.to}>
              <NavLink
                onClick={onNavigate}
                to={it.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-accent-400/15 text-accent-300'
                      : 'text-ink-200 hover:bg-ink-800 hover:text-ink-100',
                  )
                }
              >
                <it.icon className="h-4 w-4 shrink-0" />
                <span>{it.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-ink-700/60 p-4">
        {userName ? <div className="mb-3 text-sm text-ink-200">Signed in as {userName}</div> : null}
        <Button variant="secondary" fullWidth onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
