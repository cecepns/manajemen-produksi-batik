import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Pencil, Trash2, X, ImagePlus } from 'lucide-react';
import { api, assetUrl } from '../services/api';
import { ROUTES } from '../constants/routes';
import { ROLES } from '../constants/roles';
import { formatDate, formatDateTime } from '../utils/formatDate';
import { formatIdr } from '../utils/formatMoney';
import { WorkflowTimeline } from '../components/WorkflowTimeline';
import { StatusBadge } from '../components/StatusBadge';

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, manager } = useOutletContext();
  const isOwner = user?.role === ROLES.owner;

  const [order, setOrder] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});
  const [newStep, setNewStep] = useState({
    nama_step: '',
    keterangan: '',
    harga_pekerjaan: '',
    assigned_worker_id: '',
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const data = await api.get(`/orders/${id}`);
      setOrder(data);
      setForm({
        nama_usaha: data.nama_usaha?.trim() ? data.nama_usaha : 'Batik Binar',
        nama_pemesan: data.nama_pemesan,
        tanggal_pesanan: data.tanggal_pesanan?.slice?.(0, 10) ?? data.tanggal_pesanan,
        deadline: data.deadline?.slice?.(0, 10) ?? data.deadline,
        jumlah: data.jumlah,
        penanggung_jawab: data.penanggung_jawab,
        jenis_bahan: data.jenis_bahan ?? '',
        ukuran_meter:
          data.ukuran_meter != null && data.ukuran_meter !== ''
            ? String(data.ukuran_meter)
            : '',
        resep: data.resep ?? '',
        keterangan: data.keterangan ?? '',
      });
      if (manager) {
        const w = await api.get('/users/workers');
        setWorkers(w);
      }
    } catch (e) {
      setErr(e.message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, manager]);

  async function saveOrder(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const ukm = Number(form.ukuran_meter);
      const updated = await api.put(`/orders/${id}`, {
        ...form,
        jumlah: Number(form.jumlah) || 1,
        ukuran_meter:
          form.ukuran_meter === '' || form.ukuran_meter == null || !Number.isFinite(ukm)
            ? null
            : ukm,
      });
      setOrder((o) => ({ ...o, ...updated }));
      setEditOpen(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e, jenis) {
    const files = e.target.files;
    if (!files?.length) return;
    const fd = new FormData();
    fd.append('jenis', jenis === 'foto_akhir' ? 'foto_akhir' : 'foto_awal');
    for (let i = 0; i < files.length; i++) fd.append('images', files[i]);
    try {
      await api.postForm(`/orders/${id}/images`, fd);
      e.target.value = '';
      await load();
    } catch (err2) {
      setErr(err2.message);
    }
  }

  async function removeImage(imageId) {
    if (!confirm('Hapus gambar ini?')) return;
    try {
      await api.delete(`/order-images/${imageId}`);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function addStep(e) {
    e.preventDefault();
    if (!newStep.nama_step.trim()) return;
    try {
      await api.post(`/orders/${id}/workflow-steps`, {
        nama_step: newStep.nama_step.trim(),
        keterangan: newStep.keterangan?.trim() || null,
        harga_pekerjaan:
          newStep.harga_pekerjaan !== '' && newStep.harga_pekerjaan != null
            ? Number(newStep.harga_pekerjaan)
            : null,
        assigned_worker_id: newStep.assigned_worker_id
          ? Number(newStep.assigned_worker_id)
          : null,
      });
      setNewStep({
        nama_step: '',
        keterangan: '',
        harga_pekerjaan: '',
        assigned_worker_id: '',
      });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function updateStep(stepId, body) {
    try {
      await api.put(`/workflow-steps/${stepId}`, body);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function deleteStep(stepId) {
    if (!confirm('Hapus tahap ini?')) return;
    try {
      await api.delete(`/workflow-steps/${stepId}`);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function deleteOrder() {
    if (!confirm('Hapus pesanan beserta workflow dan gambar?')) return;
    try {
      await api.delete(`/orders/${id}`);
      navigate(ROUTES.orders);
    } catch (e) {
      setErr(e.message);
    }
  }

  if (loading && !order) {
    return <p className="text-sm text-batik-indigo/60">Memuat…</p>;
  }
  if (!order) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{err || 'Pesanan tidak ditemukan.'}</p>
        <Link to={ROUTES.orders} className="text-batik-teal hover:underline">
          ← Kembali ke daftar
        </Link>
      </div>
    );
  }

  const steps = order.workflow_steps || [];
  const allImages = order.images || [];
  const fotoAwal = allImages.filter((img) => !img.jenis || img.jenis === 'foto_awal');
  const fotoAkhir = allImages.filter((img) => img.jenis === 'foto_akhir');
  const totalHargaTahap = steps.reduce((acc, s) => acc + (Number(s.harga_pekerjaan) || 0), 0);
  const semuaTahapSelesai = steps.length > 0 && steps.every((s) => s.status === 'done');

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to={ROUTES.orders} className="text-sm font-medium text-batik-teal hover:underline">
            ← Pesanan
          </Link>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-batik-teal">
            {order.nama_usaha || 'Batik Binar'}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-batik-ink">{order.nama_pemesan}</h1>
          <p className="text-sm text-batik-indigo/70">
            Deadline {formatDate(order.deadline)} · Jumlah {order.jumlah} · PJ: {order.penanggung_jawab}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-batik-indigo/85">
            <span>
              <span className="font-medium text-batik-ink/80">Jenis kain:</span>{' '}
              {order.jenis_bahan?.trim() ? order.jenis_bahan : '—'}
            </span>
            <span>
              <span className="font-medium text-batik-ink/80">Ukuran:</span>{' '}
              {order.ukuran_meter != null && order.ukuran_meter !== ''
                ? `${Number(order.ukuran_meter)} m`
                : '—'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {manager && (
            <button
              type="button"
              onClick={() => setEditOpen((v) => !v)}
              title={editOpen ? 'Tutup edit' : 'Edit pesanan'}
              aria-label={editOpen ? 'Tutup edit' : 'Edit pesanan'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              {editOpen ? <X className="h-5 w-5" aria-hidden /> : <Pencil className="h-5 w-5" aria-hidden />}
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={deleteOrder}
              title="Hapus pesanan"
              aria-label="Hapus pesanan"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50"
            >
              <Trash2 className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {err && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>
      )}

      {manager && editOpen && (
        <form
          onSubmit={saveOrder}
          className="rounded-2xl border border-batik-teal/20 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-batik-ink">Edit detail pesanan</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-batik-ink">Nama usaha</label>
              <input
                className="mt-1 w-full rounded-lg border border-batik-teal/20 px-3 py-2 text-sm"
                value={form.nama_usaha ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, nama_usaha: e.target.value }))}
                required
              />
            </div>
            {['nama_pemesan', 'penanggung_jawab'].map((k) => (
              <div key={k}>
                <label className="text-sm font-medium capitalize text-batik-ink">
                  {k.replace(/_/g, ' ')}
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-batik-teal/20 px-3 py-2 text-sm"
                  value={form[k] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  required
                />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium text-batik-ink">Tanggal pesanan</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-batik-teal/20 px-3 py-2 text-sm"
                value={form.tanggal_pesanan}
                onChange={(e) => setForm((f) => ({ ...f, tanggal_pesanan: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-batik-ink">Deadline</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-batik-teal/20 px-3 py-2 text-sm"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-batik-ink">Jumlah</label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-batik-teal/20 px-3 py-2 text-sm"
                value={form.jumlah}
                onChange={(e) => setForm((f) => ({ ...f, jumlah: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-batik-ink">Jenis kain</label>
              <input
                className="mt-1 w-full rounded-lg border border-batik-teal/20 px-3 py-2 text-sm"
                value={form.jenis_bahan ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, jenis_bahan: e.target.value }))}
                placeholder="Contoh: primissima, mori…"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-batik-ink">Ukuran (meter)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="mt-1 w-full rounded-lg border border-batik-teal/20 px-3 py-2 text-sm"
                value={form.ukuran_meter ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, ukuran_meter: e.target.value }))}
                placeholder="Opsional"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium text-batik-ink">Resep / instruksi</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-batik-teal/20 px-3 py-2 text-sm"
              rows={5}
              value={form.resep}
              onChange={(e) => setForm((f) => ({ ...f, resep: e.target.value }))}
            />
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium text-batik-ink">Keterangan</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-batik-teal/20 px-3 py-2 text-sm"
              rows={2}
              value={form.keterangan ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
              placeholder="Catatan singkat pesanan (opsional)"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-xl bg-batik-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Simpan
          </button>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-batik-ink">Foto awal pesanan / batik</h2>
          <p className="text-xs text-batik-indigo/50">
            Referensi pesanan (hingga 6 file). Bisa diunggah saat buat pesanan baru atau di sini.
          </p>
          {manager && (
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-batik-teal/40 hover:bg-white">
              <ImagePlus className="h-4 w-4 text-batik-teal" aria-hidden />
              Unggah foto awal
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e, 'foto_awal')}
              />
            </label>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {fotoAwal.map((img) => (
              <div key={img.id} className="group relative overflow-hidden rounded-xl border border-batik-teal/10">
                <img
                  src={assetUrl(img.image_url)}
                  alt="Foto awal"
                  className="h-48 w-full object-cover"
                />
                {manager && (
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    title="Hapus gambar"
                    aria-label="Hapus gambar"
                    className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-red-600 shadow-md opacity-0 ring-1 ring-slate-200/80 transition hover:bg-red-50 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            ))}
            {fotoAwal.length === 0 && (
              <p className="text-sm text-batik-indigo/50">Belum ada foto awal.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-batik-ink">Foto akhir (hasil jadi)</h2>
          <p className="text-xs text-batik-indigo/50">
            Dokumentasi hasil akhir bila berbeda dari referensi awal (hingga 6 file).
          </p>
          {manager && (
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-amber-300/80 bg-amber-50/50 px-4 py-2.5 text-sm font-medium text-amber-900/90 transition hover:border-amber-400 hover:bg-amber-50">
              <ImagePlus className="h-4 w-4 text-amber-700" aria-hidden />
              Unggah foto hasil
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e, 'foto_akhir')}
              />
            </label>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {fotoAkhir.map((img) => (
              <div key={img.id} className="group relative overflow-hidden rounded-xl border border-amber-200/80">
                <img
                  src={assetUrl(img.image_url)}
                  alt="Hasil akhir"
                  className="h-48 w-full object-cover"
                />
                {manager && (
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    title="Hapus gambar"
                    aria-label="Hapus gambar"
                    className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-red-600 shadow-md opacity-0 ring-1 ring-slate-200/80 transition hover:bg-red-50 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            ))}
            {fotoAkhir.length === 0 && (
              <p className="text-sm text-batik-indigo/50">Belum ada foto hasil akhir.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-batik-ink">Keterangan pesanan</h2>
        <p className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-batik-indigo/90">
          {order.keterangan?.trim() ? order.keterangan : '—'}
        </p>
      </section>

      <section className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-batik-ink">Resep produksi</h2>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-batik-indigo/90">
          {order.resep?.trim() ? order.resep : '—'}
        </pre>
      </section>

      <section className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-batik-ink">Workflow produksi</h2>
        </div>

        {manager && (
          <form
            onSubmit={addStep}
            className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4"
          >
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-[140px]">
                <label className="text-xs text-batik-indigo/60">Tahap baru</label>
                <input
                  className="mt-1 w-full rounded border border-batik-teal/20 px-2 py-1.5 text-sm"
                  value={newStep.nama_step}
                  onChange={(e) => setNewStep((s) => ({ ...s, nama_step: e.target.value }))}
                  placeholder="Nama tahap"
                />
              </div>
              <div>
                <label className="text-xs text-batik-indigo/60">Harga (Rp)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  className="mt-1 w-full rounded border border-batik-teal/20 px-2 py-1.5 text-sm"
                  value={newStep.harga_pekerjaan}
                  onChange={(e) => setNewStep((s) => ({ ...s, harga_pekerjaan: e.target.value }))}
                  placeholder="Opsional"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-xs text-batik-indigo/60">Pekerja</label>
                <select
                  className="mt-1 w-full rounded border border-batik-teal/20 px-2 py-1.5 text-sm"
                  value={newStep.assigned_worker_id}
                  onChange={(e) => setNewStep((s) => ({ ...s, assigned_worker_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="text-xs text-batik-indigo/60">Keterangan</label>
                <input
                  className="mt-1 w-full rounded border border-batik-teal/20 px-2 py-1.5 text-sm"
                  value={newStep.keterangan}
                  onChange={(e) => setNewStep((s) => ({ ...s, keterangan: e.target.value }))}
                  placeholder="Catatan tahap"
                />
              </div>
            </div>
            <button
              type="submit"
              className="self-start rounded-lg bg-batik-indigo px-4 py-2 text-sm font-medium text-white"
            >
              Tambah tahap
            </button>
          </form>
        )}

        <div className="mt-6 space-y-4">
          {steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              user={user}
              manager={manager}
              workers={workers}
              onUpdate={updateStep}
              onDelete={manager ? deleteStep : null}
            />
          ))}
        </div>

        <div className="mt-8 border-t border-batik-teal/10 pt-6">
          <h3 className="text-sm font-semibold text-batik-ink">Timeline</h3>
          <div className="mt-4">
            <WorkflowTimeline steps={steps} />
          </div>
        </div>
      </section>

      {manager && (
        <section className="rounded-2xl border-2 border-batik-teal/25 bg-gradient-to-br from-white to-teal-50/30 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-batik-ink">Ringkasan pesanan</h2>
              <p className="text-xs text-batik-indigo/60">
                Owner/supervisor selalu melihat riwayat lengkap. Pekerja tidak lagi mengakses pesanan
                setelah tahap mereka selesai.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                semuaTahapSelesai
                  ? 'bg-teal-100 text-teal-900'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {semuaTahapSelesai ? 'Semua tahap selesai' : 'Produksi berjalan'}
            </span>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Usaha</dt>
              <dd className="font-medium text-batik-ink">{order.nama_usaha || 'Batik Binar'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Pemesan</dt>
              <dd className="font-medium text-batik-ink">{order.nama_pemesan}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">PJ</dt>
              <dd className="font-medium text-batik-ink">{order.penanggung_jawab}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Tanggal pesanan</dt>
              <dd>{formatDate(order.tanggal_pesanan)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Deadline</dt>
              <dd>{formatDate(order.deadline)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Jumlah</dt>
              <dd>{order.jumlah}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Jenis kain</dt>
              <dd className="font-medium text-batik-ink">
                {order.jenis_bahan?.trim() ? order.jenis_bahan : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Ukuran (meter)</dt>
              <dd className="font-medium text-batik-ink">
                {order.ukuran_meter != null && order.ukuran_meter !== ''
                  ? `${Number(order.ukuran_meter)} m`
                  : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs text-slate-500">Resep / instruksi</dt>
              <dd className="whitespace-pre-wrap text-batik-indigo/90">
                {order.resep?.trim() ? order.resep : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs text-slate-500">Keterangan</dt>
              <dd className="text-batik-indigo/90">{order.keterangan?.trim() || '—'}</dd>
            </div>
          </dl>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-batik-ink">Foto awal</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {fotoAwal.length === 0 ? (
                  <p className="text-xs text-slate-500">—</p>
                ) : (
                  fotoAwal.map((img) => (
                    <img
                      key={img.id}
                      src={assetUrl(img.image_url)}
                      alt=""
                      className="h-24 w-24 rounded-lg border object-cover"
                    />
                  ))
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-batik-ink">Foto akhir</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {fotoAkhir.length === 0 ? (
                  <p className="text-xs text-slate-500">Belum diunggah</p>
                ) : (
                  fotoAkhir.map((img) => (
                    <img
                      key={img.id}
                      src={assetUrl(img.image_url)}
                      alt=""
                      className="h-24 w-24 rounded-lg border object-cover"
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white/80">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Tahap</th>
                  <th className="px-3 py-2">Keterangan</th>
                  <th className="px-3 py-2">Cuaca</th>
                  <th className="px-3 py-2">Harga</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {steps.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 font-medium text-batik-ink">{s.nama_step}</td>
                    <td className="px-3 py-2 text-slate-600">{s.keterangan?.trim() || '—'}</td>
                    <td className="px-3 py-2 capitalize text-slate-700">{s.cuaca || '—'}</td>
                    <td className="px-3 py-2">{formatIdr(s.harga_pekerjaan)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-right">
                    Total biaya tahapan
                  </td>
                  <td className="px-3 py-2" colSpan={2}>
                    {formatIdr(totalHargaTahap)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function StepRow({ step, user, manager, workers, onUpdate, onDelete }) {
  const mine = step.assigned_worker_id === user?.id;
  const canStatus = manager || mine;
  const canCuaca = manager || mine;

  return (
    <div className="space-y-3 rounded-xl border border-batik-teal/15 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-batik-ink">{step.nama_step}</p>
          <p className="text-xs text-batik-indigo/60">
            {step.assigned_username ? `Ditugaskan: ${step.assigned_username}` : 'Belum ada pekerja'}
          </p>
          <p className="mt-1 text-xs text-batik-indigo/50">
            Mulai {formatDateTime(step.tanggal_mulai)} · Selesai {formatDateTime(step.tanggal_selesai)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={step.status} />
          {canStatus && (
            <select
              className="rounded-lg border border-batik-teal/20 px-2 py-1.5 text-sm"
              value={step.status}
              onChange={(e) => onUpdate(step.id, { status: e.target.value })}
            >
              <option value="pending">Menunggu</option>
              <option value="progress">Berjalan</option>
              <option value="done">Selesai</option>
            </select>
          )}
          {manager && (
            <>
              <select
                className="rounded-lg border border-batik-teal/20 px-2 py-1.5 text-sm"
                value={step.assigned_worker_id ?? ''}
                onChange={(e) =>
                  onUpdate(step.id, {
                    assigned_worker_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">Tanpa pekerja</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.username}
                  </option>
                ))}
              </select>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(step.id)}
                  title="Hapus tahap"
                  aria-label="Hapus tahap"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {manager ? (
          <div className="sm:col-span-2">
            <label className="text-xs text-batik-indigo/60">Keterangan tahap</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-batik-teal/20 px-2 py-1.5 text-sm"
              defaultValue={step.keterangan ?? ''}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v === (step.keterangan ?? '')) return;
                onUpdate(step.id, { keterangan: v || null });
              }}
            />
          </div>
        ) : (
          <div className="sm:col-span-2">
            <p className="text-xs text-batik-indigo/60">Keterangan</p>
            <p className="mt-1 text-sm text-batik-ink">{step.keterangan?.trim() || '—'}</p>
          </div>
        )}
        {manager ? (
          <div>
            <label className="text-xs text-batik-indigo/60">Harga pekerjaan (Rp)</label>
            <input
              type="number"
              min={0}
              step={1000}
              className="mt-1 w-full rounded-lg border border-batik-teal/20 px-2 py-1.5 text-sm"
              defaultValue={step.harga_pekerjaan != null ? String(step.harga_pekerjaan) : ''}
              onBlur={(e) => {
                const raw = e.target.value.trim();
                const next = raw === '' ? null : Number(raw);
                const prev = step.harga_pekerjaan != null ? Number(step.harga_pekerjaan) : null;
                if (next === prev || (next != null && !Number.isFinite(next))) return;
                onUpdate(step.id, { harga_pekerjaan: next });
              }}
            />
          </div>
        ) : (
          <div>
            <p className="text-xs text-batik-indigo/60">Harga</p>
            <p className="mt-1 text-sm font-medium text-batik-ink">
              {formatIdr(step.harga_pekerjaan)}
            </p>
          </div>
        )}
        <div>
          <label className="text-xs text-batik-indigo/60">Cuaca saat pengerjaan</label>
          {canCuaca ? (
            <select
              className="mt-1 w-full rounded-lg border border-batik-teal/20 px-2 py-1.5 text-sm capitalize"
              value={step.cuaca ?? ''}
              onChange={(e) =>
                onUpdate(step.id, { cuaca: e.target.value ? e.target.value : null })
              }
            >
              <option value="">—</option>
              <option value="terang">Terang</option>
              <option value="mendung">Mendung</option>
              <option value="hujan">Hujan</option>
            </select>
          ) : (
            <p className="mt-1 text-sm capitalize text-batik-ink">{step.cuaca || '—'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
