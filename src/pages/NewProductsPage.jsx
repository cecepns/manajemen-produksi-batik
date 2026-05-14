import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Camera, ChevronLeft, ChevronRight, Package, Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { api, assetUrl } from '../services/api';
import { formatDate } from '../utils/formatDate';
import { compressOrderPhoto } from '../utils/compressOrderPhoto';

const PAGE_SIZE = 10;

const emptyCreateForm = {
  nama_motif: '',
  resep_instruksi: '',
  foto1_keterangan: '',
};

function revokeMap(urls) {
  for (const u of Object.values(urls)) {
    if (u && String(u).startsWith('blob:')) URL.revokeObjectURL(u);
  }
}

export function NewProductsPage() {
  const { user, manager } = useOutletContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyCreateForm);
  const [files, setFiles] = useState({ 1: null, 2: null, 3: null });
  const [previewUrls, setPreviewUrls] = useState({ 1: '', 2: '', 3: '' });
  const previewUrlsRef = useRef(previewUrls);

  const [page, setPage] = useState(1);
  const [listQ, setListQ] = useState('');
  const [qDraft, setQDraft] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(
    () => () => {
      revokeMap(previewUrlsRef.current);
    },
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (listQ) qs.set('q', listQ);
      const res = await api.get(`/new-products?${qs.toString()}`);
      setItems(Array.isArray(res.data) ? res.data : []);
      setTotal(Number(res.total) || 0);
      setTotalPages(Math.max(1, Number(res.totalPages) || 1));
    } catch (e) {
      toast.error(e.message);
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, listQ]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage((p) => Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  function applySearch() {
    setListQ(qDraft.trim());
    setPage(1);
  }

  function setSlotFile(slot, file) {
    if (!file) return;
    setFiles((f) => ({ ...f, [slot]: file }));
    setPreviewUrls((p) => {
      const next = { ...p };
      if (next[slot]) URL.revokeObjectURL(next[slot]);
      next[slot] = URL.createObjectURL(file);
      return next;
    });
  }

  function clearCreatePhotos() {
    setFiles({ 1: null, 2: null, 3: null });
    setPreviewUrls((p) => {
      revokeMap(p);
      return { 1: '', 2: '', 3: '' };
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!files[1]) {
      toast.error('Foto 1 (utama) wajib — ambil dari kamera atau galeri');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('foto1', await compressOrderPhoto(files[1]));
      if (files[2]) fd.append('foto2', await compressOrderPhoto(files[2]));
      if (files[3]) fd.append('foto3', await compressOrderPhoto(files[3]));
      const appendIf = (key, val) => {
        if (val != null && String(val).trim() !== '') fd.append(key, String(val).trim());
      };
      appendIf('nama_motif', form.nama_motif);
      appendIf('resep_instruksi', form.resep_instruksi);
      appendIf('foto1_keterangan', form.foto1_keterangan);

      await api.postForm('/new-products', fd);
      toast.success('Produk baru tersimpan');
      setForm(emptyCreateForm);
      clearCreatePhotos();
      setPage(1);
      setListQ('');
      setQDraft('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(row) {
    setEditingId(row.id);
    setEditForm({
      nama_motif: row.nama_motif ?? '',
      resep_instruksi: row.resep_instruksi ?? '',
      foto1_keterangan: row.foto1_keterangan ?? '',
    });
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;
    setSaving(true);
    try {
      const body = {
        nama_motif: editForm.nama_motif.trim() || null,
        resep_instruksi: editForm.resep_instruksi.trim() || null,
        foto1_keterangan: editForm.foto1_keterangan.trim() || null,
      };
      await api.patch(`/new-products/${editingId}`, body);
      toast.success('Perubahan disimpan');
      closeEdit();
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    if (!confirm('Hapus catatan produk ini beserta fotonya?')) return;
    try {
      await api.delete(`/new-products/${id}`);
      toast.success('Dihapus');
      if (editingId === id) closeEdit();
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const textFieldClass =
    'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2';

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-batik-ink">Produk baru</h1>
        <p className="text-sm text-batik-indigo/70">
          Halaman ini untuk semua role yang sudah masuk. Fokus foto dulu; isian teks singkat (nama
          motif, resep/instruksi, keterangan foto 1) boleh menyusul.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm"
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold text-batik-ink">
          <Camera className="h-5 w-5 text-batik-teal" aria-hidden />
          Tambah catatan
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600" htmlFor="np-f1-cap">
              Keterangan foto 1 (opsional, bisa menyusul)
            </label>
            <input
              id="np-f1-cap"
              className={textFieldClass}
              value={form.foto1_keterangan}
              onChange={(e) => setForm((f) => ({ ...f, foto1_keterangan: e.target.value }))}
              placeholder="Nanti diisi jika ada waktu"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((slot) => (
              <div key={slot} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold text-slate-700">
                  Foto {slot}
                  {slot === 1 ? ' (wajib)' : ' (opsional)'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-batik-teal/40">
                    <Camera className="h-3.5 w-3.5" aria-hidden />
                    Kamera
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setSlotFile(slot, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-batik-teal/40">
                    Galeri
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setSlotFile(slot, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                {previewUrls[slot] ? (
                  <img
                    src={previewUrls[slot]}
                    alt={`Pratinjau ${slot}`}
                    className="mt-3 h-36 w-full rounded-lg object-cover"
                  />
                ) : (
                  <p className="mt-3 text-xs text-slate-500">Belum ada gambar</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600" htmlFor="np-nama">
                Nama motif
              </label>
              <input
                id="np-nama"
                className={textFieldClass}
                value={form.nama_motif}
                onChange={(e) => setForm((f) => ({ ...f, nama_motif: e.target.value }))}
                placeholder="Opsional"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600" htmlFor="np-resep">
                Resep / instruksi
              </label>
              <textarea
                id="np-resep"
                rows={3}
                className={textFieldClass}
                value={form.resep_instruksi}
                onChange={(e) => setForm((f) => ({ ...f, resep_instruksi: e.target.value }))}
                placeholder="Opsional"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-batik-indigo px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-batik-ink">
            <Package className="h-5 w-5 text-batik-teal" aria-hidden />
            Daftar produk baru
          </h2>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:max-w-md sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="text-xs font-medium text-slate-600" htmlFor="np-search">
                Cari
              </label>
              <input
                id="np-search"
                type="search"
                className={textFieldClass}
                value={qDraft}
                onChange={(e) => setQDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applySearch();
                  }
                }}
                placeholder="Nama motif, keterangan, resep, atau pembuat…"
              />
            </div>
            <button
              type="button"
              onClick={applySearch}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:border-batik-teal/40"
            >
              <Search className="h-4 w-4 text-batik-teal" aria-hidden />
              Cari
            </button>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Menampilkan hingga {PAGE_SIZE} data per halaman ({total} total).
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-batik-indigo/60">Memuat…</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-batik-indigo/60">
            {listQ ? 'Tidak ada hasil untuk pencarian ini.' : 'Belum ada catatan.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-6">
            {items.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      #{row.id} · {row.created_by_username ?? '—'} ·{' '}
                      {formatDate(row.created_at)}
                    </p>
                    <p className="mt-1 font-semibold text-batik-ink">
                      {row.nama_motif?.trim() || '— (nama motif menyusul)'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {(manager || Number(user?.id) === Number(row.created_by)) && (
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-batik-teal/40"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Edit detail
                      </button>
                    )}
                    {manager && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                {row.foto1_keterangan?.trim() ? (
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-medium text-slate-600">Keterangan foto 1: </span>
                    {row.foto1_keterangan}
                  </p>
                ) : null}

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[row.foto1_url, row.foto2_url, row.foto3_url].map((url, i) =>
                    url ? (
                      <a
                        key={`${row.id}-${i}`}
                        href={assetUrl(url)}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-lg border border-slate-200 bg-white"
                      >
                        <img
                          src={assetUrl(url)}
                          alt={`Foto ${i + 1}`}
                          className="h-40 w-full object-cover"
                        />
                      </a>
                    ) : (
                      <div
                        key={`${row.id}-empty-${i}`}
                        className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-xs text-slate-400"
                      >
                        Foto {i + 1} kosong
                      </div>
                    )
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500">Resep / instruksi</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                    {row.resep_instruksi?.trim() || '—'}
                  </p>
                </div>

                {editingId === row.id && editForm ? (
                  <div className="mt-4 rounded-xl border border-batik-teal/25 bg-white p-4">
                    <h3 className="text-sm font-semibold text-batik-ink">Edit detail</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-slate-600">
                          Keterangan foto 1
                        </label>
                        <input
                          className={textFieldClass}
                          value={editForm.foto1_keterangan}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, foto1_keterangan: e.target.value }))
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-slate-600">Nama motif</label>
                        <input
                          className={textFieldClass}
                          value={editForm.nama_motif}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, nama_motif: e.target.value }))
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-slate-600">Resep / instruksi</label>
                        <textarea
                          rows={3}
                          className={textFieldClass}
                          value={editForm.resep_instruksi}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, resep_instruksi: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={saving}
                        className="rounded-lg bg-batik-indigo px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Simpan perubahan
                      </button>
                      <button
                        type="button"
                        onClick={closeEdit}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {!loading && total > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-600">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
