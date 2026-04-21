import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { ROUTES } from '../constants/routes';
import { formatDate, formatDateTime } from '../utils/formatDate';
import { StatusBadge } from '../components/StatusBadge';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 1000;

export function MyTasksPage() {
  const { user, manager } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listVersion, setListVersion] = useState(0);

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
      setLoading(true);
      try {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (debouncedSearch) q.set('search', debouncedSearch);
        const data = await api.get(`/my-tasks?${q.toString()}`);
        if (cancelled) return;
        setTasks(data.data || []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setPage(data.page ?? page);
      } catch (e) {
        if (!cancelled) toast.error(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, listVersion]);

  async function setStatus(stepId, status) {
    try {
      await api.put(`/workflow-steps/${stepId}`, { status });
      toast.success('Status diperbarui');
      setListVersion((v) => v + 1);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function setCuaca(stepId, cuaca) {
    try {
      await api.put(`/workflow-steps/${stepId}`, { cuaca: cuaca || null });
      toast.success('Cuaca diperbarui');
      setListVersion((v) => v + 1);
    } catch (e) {
      toast.error(e.message);
    }
  }

  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-batik-ink">Tugas produksi</h1>
        <p className="text-sm text-batik-indigo/70">
          {manager
            ? 'Semua tahap produksi (tim). Supervisor/owner dapat mengubah penugasan dan status.'
            : 'Hanya tahap yang ditugaskan ke akun Anda. Ubah status dan cuaca untuk tugas Anda saja.'}
        </p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Cari nama pesanan, pemesan, tahap, atau nomor pesanan… (debounce 1 detik)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none ring-batik-teal/30 placeholder:text-slate-400 focus:ring-2"
          autoComplete="off"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-batik-indigo/60">Memuat…</p>
        ) : tasks.length === 0 ? (
          <p className="p-8 text-center text-sm text-batik-indigo/60">
            {debouncedSearch
              ? `Tidak ada tugas cocok dengan “${debouncedSearch}”.`
              : 'Belum ada tugas produksi.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 p-2 sm:p-4">
            {tasks.map((t) => {
              const canEdit = manager || t.assigned_worker_id === user?.id;
              return (
                <li
                  key={t.id}
                  className="rounded-xl border border-transparent p-3 transition hover:border-slate-100 hover:bg-slate-50/80"
                >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      to={ROUTES.orderDetail(t.order_id)}
                      className="text-lg font-semibold text-batik-teal hover:underline"
                    >
                      {t.nama_usaha || `Pesanan #${t.order_id}`}
                    </Link>
                    <p className="text-sm text-batik-indigo/70">
                      Pemesan: {t.nama_pemesan} · Pesanan #{t.order_id} · Deadline{' '}
                      {formatDate(t.deadline)} · Qty {t.jumlah}
                    </p>
                    <p className="mt-2 font-medium text-batik-ink">{t.nama_step}</p>
                    <p className="text-xs text-batik-indigo/60">
                      Ditugaskan ke: {t.assigned_username || 'Belum ditentukan'}
                    </p>
                    <p className="text-xs text-batik-indigo/50">
                      Mulai {formatDateTime(t.tanggal_mulai)} · Selesai{' '}
                      {formatDateTime(t.tanggal_selesai)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={t.status} />
                    <select
                      className="rounded-lg border border-batik-teal/20 px-2 py-1.5 text-sm"
                      value={t.status}
                      disabled={!canEdit}
                      onChange={(e) => setStatus(t.id, e.target.value)}
                    >
                      <option value="pending">Menunggu</option>
                      <option value="progress">Berjalan</option>
                      <option value="done">Selesai</option>
                    </select>
                    <div className="w-full min-w-[10rem] sm:w-auto">
                      <label className="sr-only" htmlFor={`cuaca-${t.id}`}>
                        Cuaca
                      </label>
                      <select
                        id={`cuaca-${t.id}`}
                        className="w-full rounded-lg border border-batik-teal/20 px-2 py-1.5 text-sm capitalize"
                        value={t.cuaca ?? ''}
                        disabled={!canEdit}
                        onChange={(e) => setCuaca(t.id, e.target.value)}
                      >
                        <option value="">Cuaca…</option>
                        <option value="terang">Terang</option>
                        <option value="mendung">Mendung</option>
                        <option value="hujan">Hujan</option>
                      </select>
                    </div>
                  </div>
                </div>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && total > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Menampilkan {startItem}–{endItem} dari {total} tugas
            </p>
            <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:items-center">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-3"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Sebelumnya
              </button>
              <span className="inline-flex h-9 items-center justify-center text-center text-sm text-slate-600 sm:min-w-[7rem]">
                Halaman {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-3"
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
