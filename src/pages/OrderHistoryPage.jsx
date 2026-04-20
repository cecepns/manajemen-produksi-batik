import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { ROUTES } from '../constants/routes';
import { formatDate } from '../utils/formatDate';

export function OrderHistoryPage() {
  const { manager } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [historyOrders, setHistoryOrders] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!manager) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const all = await api.get('/orders?include_completed=1');
        if (cancelled) return;
        const doneOnly = (all || []).filter((o) => {
          const total = Number(o.total_steps) || 0;
          const done = Number(o.done_steps) || 0;
          return total > 0 && done >= total;
        });
        setHistoryOrders(doneOnly);
      } catch (e) {
        if (!cancelled) toast.error(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manager]);

  if (!manager) {
    return <p className="text-sm text-batik-indigo/60">Halaman ini khusus owner/supervisor.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-batik-ink">History pesanan</h1>
        <p className="text-sm text-batik-indigo/70">
          Arsip pesanan yang seluruh tugas produksinya sudah selesai.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-batik-indigo/60">Memuat data…</p>
        ) : historyOrders.length === 0 ? (
          <p className="p-8 text-center text-sm text-batik-indigo/60">
            Belum ada pesanan yang selesai.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Nama pesanan / pemesan</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3">Jumlah</th>
                  <th className="px-4 py-3">PJ</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyOrders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-slate-50/90">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        #{o.id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-batik-teal/90">
                        {o.nama_usaha || 'Batik Binar'}
                      </p>
                      <p className="font-medium text-batik-ink">{o.nama_pemesan}</p>
                    </td>
                    <td className="px-4 py-3 text-batik-indigo/80">{formatDate(o.tanggal_pesanan)}</td>
                    <td className="px-4 py-3 text-batik-indigo/80">{formatDate(o.deadline)}</td>
                    <td className="px-4 py-3">{o.jumlah}</td>
                    <td className="px-4 py-3 text-batik-indigo/80">{o.penanggung_jawab}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Link
                          to={ROUTES.orderDetail(o.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-batik-teal hover:bg-teal-50 hover:underline"
                        >
                          Detail
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
