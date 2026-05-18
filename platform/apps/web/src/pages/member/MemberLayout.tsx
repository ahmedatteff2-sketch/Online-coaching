import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Dumbbell,
  Utensils,
  Scale,
  Ruler,
  Camera,
  TrendingUp,
  ClipboardList,
  StickyNote,
  User,
  LogOut,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/api/auth';
import { cn } from '@/lib/cn';

const navItems = [
  { to: '/member/dashboard', label: 'Home', icon: Home },
  { to: '/member/workouts', label: 'Workouts', icon: Dumbbell },
  { to: '/member/nutrition', label: 'Nutrition', icon: Utensils },
  { to: '/member/weight', label: 'Weight', icon: Scale },
  { to: '/member/progress', label: 'Progress', icon: TrendingUp },
];

const moreItems = [
  { to: '/member/measurements', label: 'Measurements', icon: Ruler },
  { to: '/member/photos', label: 'Photos', icon: Camera },
  { to: '/member/check-in', label: 'Weekly check-in', icon: ClipboardList },
  { to: '/member/notes', label: 'Notes', icon: StickyNote },
  { to: '/member/profile', label: 'Profile', icon: User },
];

export function MemberLayout() {
  const navigate = useNavigate();
  const { user, clearSession } = useAuthStore();

  async function logout() {
    await authApi.logout().catch(() => undefined);
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-ink-950 pb-24 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-ink-700/60 bg-ink-950/80 backdrop-blur">
        <div className="container-app flex h-14 items-center justify-between">
          <Logo brand="Coach Pro" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:inline">{user?.fullName}</span>
            <Button size="sm" variant="ghost" onClick={logout} aria-label="Logout">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Side nav (desktop) */}
      <div className="container-app pt-6 md:flex md:gap-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="grid gap-1">
            {[...navItems, ...moreItems].map((it) => (
              <NavLink
                key={it.to}
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
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-700/60 bg-ink-950/95 backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {navItems.map((it) => (
            <li key={it.to}>
              <NavLink
                to={it.to}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                    isActive ? 'text-accent-400' : 'text-ink-200',
                  )
                }
              >
                <it.icon className="h-5 w-5" />
                {it.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
