import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
  Menu,
  X,
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
  const location = useLocation();
  const manager = isManager(user?.role);
  const owner = isOwner(user?.role);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-white">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-batik-indigo shadow-xl transition-transform duration-200 md:static md:w-60 md:translate-x-0 md:shadow-none ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 p-4 md:block md:border-0">
            <div className="flex items-center gap-3 md:block">
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
            <button
              type="button"
              onClick={closeMobileMenu}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <nav className="flex flex-col gap-0.5 px-3 py-4">
            <NavLink to={ROUTES.dashboard} className={linkClass} end onClick={closeMobileMenu}>
              <LayoutDashboard className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to={ROUTES.orders} className={linkClass} onClick={closeMobileMenu}>
              <ClipboardList className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
              <span>Pesanan</span>
            </NavLink>
            {manager && (
              <NavLink to={ROUTES.orderHistory} className={linkClass} onClick={closeMobileMenu}>
                <History className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
                <span>History</span>
              </NavLink>
            )}
            <NavLink to={ROUTES.myTasks} className={linkClass} onClick={closeMobileMenu}>
              <ListTodo className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
              <span>Tugas saya</span>
            </NavLink>
            {manager && (
              <NavLink to={ROUTES.hppCalculator} className={linkClass} onClick={closeMobileMenu}>
                <Calculator className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
                <span>Kalkulator HPP</span>
              </NavLink>
            )}
            {manager && (
              <NavLink to={ROUTES.dailyWages} className={linkClass} onClick={closeMobileMenu}>
                <Wallet className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
                <span>Gaji harian</span>
              </NavLink>
            )}
            {owner && (
              <NavLink to={ROUTES.adminUsers} className={linkClass} onClick={closeMobileMenu}>
                <Users className="h-5 w-5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
                <span>Pengguna</span>
              </NavLink>
            )}
          </nav>
          <div className="mt-auto border-t border-white/10 p-4">
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
        </div>
      </aside>
      <div className="flex min-h-0 min-h-screen flex-1 flex-col bg-slate-50">
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <span className="text-sm font-semibold text-slate-900">{user?.username}</span>
          <span className="w-10" aria-hidden />
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet context={{ user, manager, owner }} />
        </main>
      </div>
    </div>
  );
}
