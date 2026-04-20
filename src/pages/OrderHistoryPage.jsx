import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { api } from '../services/api';
import { ROUTES } from '../constants/routes';
import { formatDate } from '../utils/formatDate';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 800;

export function OrderHistoryPage() {
  const { manager } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!manager) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          only_completed: '1',
        });
        if (debouncedSearch) q.set('search', debouncedSearch);
        const data = await api.get(`/orders?${q.toString()}`);
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : data?.data || [];
        const totalRows = Array.isArray(data) ? rows.length : data?.total ?? rows.length;
        const pages = Array.isArray(data)
          ? Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
          : data?.totalPages ?? 1;
        const nextPage = Array.isArray(data) ? page : data?.page ?? page;
        setHistoryOrders(rows);
        setTotal(totalRows);
        setTotalPages(pages);
        setPage(nextPage);
      } catch (e) {
        if (!cancelled) toast.error(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manager, page, debouncedSearch]);

  if (!manager) {
    return <p className="text-sm text-batik-indigo/60">Halaman ini khusus owner/supervisor.</p>;
  }

  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-batik-ink">History pesanan</h1>
        <p className="text-sm text-batik-indigo/70">
          Arsip pesanan yang seluruh tugas produksinya sudah selesai.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-white p-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Cari nama pesanan, pemesan, PJ, nomor telepon, atau nomor pesanan…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none ring-batik-teal/30 placeholder:text-slate-400 focus:ring-2"
              autoComplete="off"
            />
          </div>
        </div>
        {loading ? (
          <p className="p-8 text-center text-sm text-batik-indigo/60">Memuat data…</p>
        ) : historyOrders.length === 0 ? (
          <p className="p-8 text-center text-sm text-batik-indigo/60">
            {debouncedSearch
              ? `Tidak ada history pesanan cocok dengan “${debouncedSearch}”.`
              : 'Belum ada pesanan yang selesai.'}
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
        {!loading && total > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Menampilkan {startItem}–{endItem} dari {total} history pesanan
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Sebelumnya
              </button>
              <span className="min-w-[7rem] text-center text-sm text-slate-600">
                Halaman {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
