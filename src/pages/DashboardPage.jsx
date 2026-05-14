import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Package,
  Hourglass,
  Loader,
  CircleCheck,
  ArrowRight,
  ClipboardList,
  Sparkles,
  Camera,
} from 'lucide-react';
import { api } from '../services/api';
import { ROUTES } from '../constants/routes';

export function DashboardPage() {
  const { user, manager } = useOutletContext();
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get('/dashboard/summary');
        if (!cancelled) setSummary(data);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-6 py-8 md:px-10 md:py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Sparkles className="h-4 w-4 text-batik-teal" aria-hidden />
                Ringkasan hari ini
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Dashboard
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                Halo,{' '}
                <span className="font-semibold text-slate-900 capitalize">{user?.username}</span>{' '}
                — pantau pesanan dan progres tahapan produksi batik.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          {err && (
            <p className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </p>
          )}

          {manager && summary && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total pesanan"
                value={summary.totalOrders ?? 0}
                icon={Package}
                iconBox="bg-slate-100 text-slate-700"
              />
              <StatCard
                label="Tahap menunggu"
                value={summary.steps?.pending ?? 0}
                icon={Hourglass}
                iconBox="bg-slate-100 text-amber-600"
              />
              <StatCard
                label="Sedang dikerjakan"
                value={summary.steps?.progress ?? 0}
                icon={Loader}
                iconBox="bg-slate-100 text-sky-600"
              />
              <StatCard
                label="Tahap selesai"
                value={summary.steps?.done ?? 0}
                icon={CircleCheck}
                iconBox="bg-slate-100 text-emerald-600"
              />
            </div>
          )}

          {!manager && summary?.mySteps && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Tugas menunggu"
                value={summary.mySteps.pending ?? 0}
                icon={Hourglass}
                iconBox="bg-slate-100 text-amber-600"
              />
              <StatCard
                label="Sedang Anda kerjakan"
                value={summary.mySteps.progress ?? 0}
                icon={Loader}
                iconBox="bg-slate-100 text-sky-600"
              />
              <StatCard
                label="Selesai"
                value={summary.mySteps.done ?? 0}
                icon={CircleCheck}
                iconBox="bg-slate-100 text-emerald-600"
              />
            </div>
          )}

          <div className="mt-10 flex flex-wrap gap-3 border-t border-slate-100 pt-8">
            <Link
              to={ROUTES.orders}
              className="inline-flex items-center gap-2 rounded-xl bg-batik-indigo px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-batik-teal"
            >
              Lihat pesanan
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to={ROUTES.myTasks}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ClipboardList className="h-4 w-4 text-batik-teal" aria-hidden />
              Tugas saya
            </Link>
            <Link
              to={ROUTES.newProducts}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Camera className="h-4 w-4 text-batik-teal" aria-hidden />
              Produk baru
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, iconBox }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBox}`}
        >
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
      </div>
    </div>
  );
}
