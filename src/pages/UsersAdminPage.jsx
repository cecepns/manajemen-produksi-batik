import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import {
  UserPlus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Save,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { ROUTES } from '../constants/routes';
import { formatDateTime } from '../utils/formatDate';
import { confirmWithToast } from '../utils/toastConfirm';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 1000;

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'worker', label: 'Pekerja' },
];

const defaultCreateForm = () => ({ username: '', password: '', role: 'worker' });

function roleBadgeClass(role) {
  if (role === 'owner') return 'bg-violet-100 text-violet-800 ring-violet-200';
  if (role === 'supervisor') return 'bg-sky-100 text-sky-800 ring-sky-200';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function RoleIcon({ role }) {
  if (role === 'owner') return <ShieldCheck className="h-3.5 w-3.5" aria-hidden />;
  if (role === 'supervisor') return <Shield className="h-3.5 w-3.5" aria-hidden />;
  return <User className="h-3.5 w-3.5" aria-hidden />;
}

export function UsersAdminPage() {
  const { owner, user } = useOutletContext();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(() => defaultCreateForm());
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', password: '', role: 'worker' });
  const [saving, setSaving] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [listVersion, setListVersion] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (debouncedSearch) q.set('search', debouncedSearch);
        const data = await api.get(`/admin/users?${q.toString()}`);
        if (cancelled) return;
        setList(data.data || []);
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
  }, [owner, page, debouncedSearch, listVersion]);

  if (!owner) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  function resetCreateModal() {
    setCreateModalOpen(false);
    setCreateForm(defaultCreateForm());
  }

  function closeCreateModal() {
    if (saving) return;
    resetCreateModal();
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/users', createForm);
      toast.success('Pengguna berhasil ditambahkan');
      resetCreateModal();
      setSearchInput('');
      setDebouncedSearch('');
      setPage(1);
      setListVersion((v) => v + 1);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(row) {
    setCreateModalOpen(false);
    setEditId(row.id);
    setEditForm({ username: row.username, password: '', role: row.role });
  }

  async function handleEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        username: editForm.username.trim(),
        role: editForm.role,
      };
      if (editForm.password.trim()) body.password = editForm.password;
      await api.put(`/admin/users/${editId}`, body);
      toast.success('Data pengguna diperbarui');
      setEditId(null);
      setListVersion((v) => v + 1);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(row) {
    if (row.id === user?.id) return;
    confirmWithToast(`Hapus pengguna "${row.username}"? Tindakan ini tidak dapat dibatalkan.`, () => {
      void (async () => {
        try {
          await api.delete(`/admin/users/${row.id}`);
          toast.success('Pengguna dihapus');
          setListVersion((v) => v + 1);
        } catch (e) {
          toast.error(e.message);
        }
      })();
    });
  }

  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen pengguna</h1>
          <p className="text-sm text-slate-600">
            Tambah, ubah role, dan hapus akun. Hanya <strong>Owner</strong> yang dapat mengakses halaman ini.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditId(null);
            setCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-batik-indigo px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-batik-teal"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Pengguna baru
        </button>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Cari username… (tunggu 1 detik setelah mengetik)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none ring-batik-teal/30 placeholder:text-slate-400 focus:ring-2"
          autoComplete="off"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Memuat…</p>
        ) : list.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {debouncedSearch
              ? `Tidak ada pengguna cocok dengan “${debouncedSearch}”.`
              : 'Belum ada pengguna.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Dibuat</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.username}
                      {row.id === user?.id && (
                        <span className="ml-2 text-xs font-normal text-slate-500">(Anda)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${roleBadgeClass(row.role)}`}
                      >
                        <RoleIcon role={row.role} />
                        {ROLE_OPTIONS.find((r) => r.value === row.role)?.label || row.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(row.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="Ubah"
                          aria-label="Ubah pengguna"
                          onClick={() => openEdit(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          title={row.id === user?.id ? 'Tidak dapat menghapus akun sendiri' : 'Hapus'}
                          aria-label="Hapus pengguna"
                          disabled={row.id === user?.id}
                          onClick={() => handleDelete(row)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
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
              Menampilkan {startItem}–{endItem} dari {total} pengguna
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

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm !m-0">
          <div className="absolute inset-0" role="presentation" onClick={closeCreateModal} />
          <form
            onSubmit={handleCreate}
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Pengguna baru</h2>
              <button
                type="button"
                disabled={saving}
                onClick={closeCreateModal}
                className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                Tutup
              </button>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Username</label>
                  <input
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                    value={createForm.username}
                    onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Role</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                    value={createForm.role}
                    onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                disabled={saving}
                onClick={closeCreateModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-batik-indigo px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-batik-teal disabled:opacity-60"
              >
                <Save className="h-4 w-4" aria-hidden />
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm !m-0">
          <div
            className="absolute inset-0"
            role="presentation"
            onClick={() => !saving && setEditId(null)}
          />
          <form
            onSubmit={handleEdit}
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Ubah pengguna</h2>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditId(null)}
                className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                Tutup
              </button>
            </div>
            <div className="space-y-4 px-6 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Username</label>
              <input
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                value={editForm.username}
                onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Password baru (opsional)</label>
              <input
                type="password"
                minLength={6}
                placeholder="Kosongkan jika tidak diubah"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                value={editForm.password}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Role</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-batik-indigo px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-batik-teal disabled:opacity-60"
              >
                <Save className="h-4 w-4" aria-hidden />
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
