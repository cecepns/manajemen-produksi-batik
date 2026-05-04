import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Camera, Package, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { api, assetUrl } from '../services/api';
import { formatDate, toYmdLocal } from '../utils/formatDate';
import { compressOrderPhoto } from '../utils/compressOrderPhoto';

const emptyCreateForm = {
  nama_motif: '',
  tanggal_pembuatan: '',
  jumlah: '',
  jenis_kain: '',
  ukuran_kain: '',
  ukuran_jahit: '',
  model_fashion: '',
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
      const rows = await api.get('/new-products');
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toast.error(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      appendIf('tanggal_pembuatan', form.tanggal_pembuatan);
      appendIf('jumlah', form.jumlah);
      appendIf('jenis_kain', form.jenis_kain);
      appendIf('ukuran_kain', form.ukuran_kain);
      appendIf('ukuran_jahit', form.ukuran_jahit);
      appendIf('model_fashion', form.model_fashion);
      appendIf('resep_instruksi', form.resep_instruksi);
      appendIf('foto1_keterangan', form.foto1_keterangan);

      await api.postForm('/new-products', fd);
      toast.success('Produk baru tersimpan');
      setForm(emptyCreateForm);
      clearCreatePhotos();
      await load();
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
      tanggal_pembuatan: toYmdLocal(row.tanggal_pembuatan),
      jumlah: row.jumlah != null ? String(row.jumlah) : '',
      jenis_kain: row.jenis_kain ?? '',
      ukuran_kain: row.ukuran_kain ?? '',
      ukuran_jahit: row.ukuran_jahit ?? '',
      model_fashion: row.model_fashion ?? '',
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
    let jumlah = null;
    if (editForm.jumlah.trim() !== '') {
      const n = Number(editForm.jumlah);
      if (!Number.isFinite(n) || n < 0) {
        toast.error('Jumlah tidak valid');
        return;
      }
      jumlah = Math.floor(n);
    }
    setSaving(true);
    try {
      const body = {
        nama_motif: editForm.nama_motif.trim() || null,
        tanggal_pembuatan: editForm.tanggal_pembuatan.trim() || null,
        jumlah,
        jenis_kain: editForm.jenis_kain.trim() || null,
        ukuran_kain: editForm.ukuran_kain.trim() || null,
        ukuran_jahit: editForm.ukuran_jahit.trim() || null,
        model_fashion: editForm.model_fashion.trim() || null,
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
          Cepat ambil foto (kamera/galeri) lalu simpan. Isian teks boleh menyusul; owner/supervisor
          dan pembuat bisa mengisi atau mengubah detail nanti.
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-slate-600" htmlFor="np-nama">
                Nama motif
              </label>
              <input
                id="np-nama"
                className={textFieldClass}
                value={form.nama_motif}
                onChange={(e) => setForm((f) => ({ ...f, nama_motif: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600" htmlFor="np-tgl">
                Tanggal pembuatan
              </label>
              <input
                id="np-tgl"
                type="date"
                className={textFieldClass}
                value={form.tanggal_pembuatan}
                onChange={(e) => setForm((f) => ({ ...f, tanggal_pembuatan: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600" htmlFor="np-jml">
                Jumlah
              </label>
              <input
                id="np-jml"
                type="number"
                min={0}
                step={1}
                className={textFieldClass}
                value={form.jumlah}
                onChange={(e) => setForm((f) => ({ ...f, jumlah: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600" htmlFor="np-kain">
                Jenis kain
              </label>
              <input
                id="np-kain"
                className={textFieldClass}
                value={form.jenis_kain}
                onChange={(e) => setForm((f) => ({ ...f, jenis_kain: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600" htmlFor="np-uk-kain">
                Ukuran kain
              </label>
              <input
                id="np-uk-kain"
                className={textFieldClass}
                value={form.ukuran_kain}
                onChange={(e) => setForm((f) => ({ ...f, ukuran_kain: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600" htmlFor="np-uk-jahit">
                Ukuran jahit
              </label>
              <input
                id="np-uk-jahit"
                className={textFieldClass}
                value={form.ukuran_jahit}
                onChange={(e) => setForm((f) => ({ ...f, ukuran_jahit: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600" htmlFor="np-model">
                Model fashion
              </label>
              <input
                id="np-model"
                className={textFieldClass}
                value={form.model_fashion}
                onChange={(e) => setForm((f) => ({ ...f, model_fashion: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-medium text-slate-600" htmlFor="np-resep">
                Resep / instruksi
              </label>
              <textarea
                id="np-resep"
                rows={3}
                className={textFieldClass}
                value={form.resep_instruksi}
                onChange={(e) => setForm((f) => ({ ...f, resep_instruksi: e.target.value }))}
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
        <h2 className="flex items-center gap-2 text-lg font-semibold text-batik-ink">
          <Package className="h-5 w-5 text-batik-teal" aria-hidden />
          Daftar produk baru
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-batik-indigo/60">Memuat…</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-batik-indigo/60">Belum ada catatan.</p>
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

                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-xs text-slate-500">Tanggal pembuatan</dt>
                    <dd className="font-medium text-slate-800">
                      {row.tanggal_pembuatan ? formatDate(row.tanggal_pembuatan) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Jumlah</dt>
                    <dd className="font-medium text-slate-800">{row.jumlah ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Jenis kain</dt>
                    <dd className="font-medium text-slate-800">{row.jenis_kain?.trim() || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Ukuran kain</dt>
                    <dd className="font-medium text-slate-800">{row.ukuran_kain?.trim() || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Ukuran jahit</dt>
                    <dd className="font-medium text-slate-800">{row.ukuran_jahit?.trim() || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Model fashion</dt>
                    <dd className="font-medium text-slate-800">
                      {row.model_fashion?.trim() || '—'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <dt className="text-xs text-slate-500">Resep / instruksi</dt>
                    <dd className="whitespace-pre-wrap text-slate-800">
                      {row.resep_instruksi?.trim() || '—'}
                    </dd>
                  </div>
                </dl>

                {editingId === row.id && editForm ? (
                  <div className="mt-4 rounded-xl border border-batik-teal/25 bg-white p-4">
                    <h3 className="text-sm font-semibold text-batik-ink">Edit detail</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-slate-600">Keterangan foto 1</label>
                        <input
                          className={textFieldClass}
                          value={editForm.foto1_keterangan}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, foto1_keterangan: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Nama motif</label>
                        <input
                          className={textFieldClass}
                          value={editForm.nama_motif}
                          onChange={(e) => setEditForm((f) => ({ ...f, nama_motif: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Tanggal pembuatan</label>
                        <input
                          type="date"
                          className={textFieldClass}
                          value={editForm.tanggal_pembuatan}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, tanggal_pembuatan: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Jumlah</label>
                        <input
                          type="number"
                          min={0}
                          className={textFieldClass}
                          value={editForm.jumlah}
                          onChange={(e) => setEditForm((f) => ({ ...f, jumlah: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Jenis kain</label>
                        <input
                          className={textFieldClass}
                          value={editForm.jenis_kain}
                          onChange={(e) => setEditForm((f) => ({ ...f, jenis_kain: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Ukuran kain</label>
                        <input
                          className={textFieldClass}
                          value={editForm.ukuran_kain}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, ukuran_kain: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Ukuran jahit</label>
                        <input
                          className={textFieldClass}
                          value={editForm.ukuran_jahit}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, ukuran_jahit: e.target.value }))
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-slate-600">Model fashion</label>
                        <input
                          className={textFieldClass}
                          value={editForm.model_fashion}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, model_fashion: e.target.value }))
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
      </section>
    </div>
  );
}
