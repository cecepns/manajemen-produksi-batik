import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  ListTodo,
  LogOut,
  Factory,
  Users,
  Wallet,
  History,
  Calculator,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';
import { isManager, isOwner } from '../constants/roles';

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/25'
      : 'text-white/90 hover:bg-white/10 hover:text-white'
  }`;

export function MainLayout() {
  const { user, logout } = useAuth();
  const manager = isManager(user?.role);
  const owner = isOwner(user?.role);

  return (
    <div className="flex min-h-screen flex-col bg-white md:flex-row">
      <aside className="shrink-0 bg-batik-indigo md:w-60 md:min-h-screen">
        <div className="flex items-center gap-3 border-b border-white/10 p-4 md:block md:border-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white md:mb-3 md:h-11 md:w-11">
            <Factory className="h-5 w-5 md:h-6 md:w-6" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
              Produksi
            </p>
            <h1 className="text-base font-semibold leading-tight text-white md:text-lg">
              Batik Binar
            </h1>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1 px-2 pb-3 md:flex-col md:gap-0.5 md:px-3 md:pb-4">
          <NavLink to={ROUTES.dashboard} className={linkClass} end>
            <LayoutDashboard className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to={ROUTES.orders} className={linkClass}>
            <ClipboardList className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
            <span>Pesanan</span>
          </NavLink>
          {manager && (
            <NavLink to={ROUTES.orderHistory} className={linkClass}>
              <History className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
              <span>History</span>
            </NavLink>
          )}
          <NavLink to={ROUTES.myTasks} className={linkClass}>
            <ListTodo className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
            <span>Tugas saya</span>
          </NavLink>
          {manager && (
            <NavLink to={ROUTES.hppCalculator} className={linkClass}>
              <Calculator className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
              <span>Kalkulator HPP</span>
            </NavLink>
          )}
          {manager && (
            <NavLink to={ROUTES.dailyWages} className={linkClass}>
              <Wallet className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
              <span>Gaji harian</span>
            </NavLink>
          )}
          {owner && (
            <NavLink to={ROUTES.adminUsers} className={linkClass}>
              <Users className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
              <span>Pengguna</span>
            </NavLink>
          )}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 p-4 md:block">
          <p className="truncate text-sm font-medium text-white">{user?.username}</p>
          <p className="text-xs capitalize text-white/60">{user?.role}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 py-2.5 text-xs font-medium text-white transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Keluar
          </button>
        </div>
      </aside>
      <div className="flex min-h-0 min-h-screen flex-1 flex-col bg-slate-50">
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-3 md:hidden">
          <span className="text-sm font-semibold text-slate-900">{user?.username}</span>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 text-sm font-medium text-batik-teal"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Keluar
          </button>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet context={{ user, manager, owner }} />
        </main>
      </div>
    </div>
  );
}
