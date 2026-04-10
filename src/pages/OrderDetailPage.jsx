import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Pencil, Trash2, X, ImagePlus } from 'lucide-react';
import { api, assetUrl } from '../services/api';
import { ROUTES } from '../constants/routes';
import { ROLES } from '../constants/roles';
import { formatDate, formatDateTime } from '../utils/formatDate';
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
  const [newStep, setNewStep] = useState({ nama_step: '', assigned_worker_id: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const data = await api.get(`/orders/${id}`);
      setOrder(data);
      setForm({
        nama_pemesan: data.nama_pemesan,
        tanggal_pesanan: data.tanggal_pesanan?.slice?.(0, 10) ?? data.tanggal_pesanan,
        deadline: data.deadline?.slice?.(0, 10) ?? data.deadline,
        jumlah: data.jumlah,
        penanggung_jawab: data.penanggung_jawab,
        resep: data.resep ?? '',
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
      const updated = await api.put(`/orders/${id}`, {
        ...form,
        jumlah: Number(form.jumlah) || 1,
      });
      setOrder((o) => ({ ...o, ...updated }));
      setEditOpen(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e) {
    const files = e.target.files;
    if (!files?.length) return;
    const fd = new FormData();
    for (let i = 0; i < Math.min(files.length, 2); i++) fd.append('images', files[i]);
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
        assigned_worker_id: newStep.assigned_worker_id
          ? Number(newStep.assigned_worker_id)
          : null,
      });
      setNewStep({ nama_step: '', assigned_worker_id: '' });
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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to={ROUTES.orders} className="text-sm font-medium text-batik-teal hover:underline">
            ← Pesanan
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-batik-ink">{order.nama_pemesan}</h1>
          <p className="text-sm text-batik-indigo/70">
            Deadline {formatDate(order.deadline)} · Jumlah {order.jumlah} · PJ: {order.penanggung_jawab}
          </p>
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
          <h2 className="text-lg font-semibold text-batik-ink">Foto referensi</h2>
          <p className="text-xs text-batik-indigo/50">Maksimal 2 gambar per pesanan</p>
          {manager && (
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-batik-teal/40 hover:bg-white">
              <ImagePlus className="h-4 w-4 text-batik-teal" aria-hidden />
              Unggah gambar
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            </label>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(order.images || []).map((img) => (
              <div key={img.id} className="group relative overflow-hidden rounded-xl border border-batik-teal/10">
                <img
                  src={assetUrl(img.image_url)}
                  alt="Referensi"
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
            {(!order.images || order.images.length === 0) && (
              <p className="text-sm text-batik-indigo/50">Belum ada foto.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-batik-ink">Resep produksi</h2>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-batik-indigo/90">
            {order.resep?.trim() ? order.resep : '—'}
          </pre>
        </section>
      </div>

      <section className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-batik-ink">Workflow produksi</h2>
        </div>

        {manager && (
          <form
            onSubmit={addStep}
            className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4"
          >
            <div className="min-w-[160px] flex-1">
              <label className="text-xs text-batik-indigo/60">Tahap baru</label>
              <input
                className="mt-1 w-full rounded border border-batik-teal/20 px-2 py-1.5 text-sm"
                value={newStep.nama_step}
                onChange={(e) => setNewStep((s) => ({ ...s, nama_step: e.target.value }))}
                placeholder="Nama tahap"
              />
            </div>
            <div className="w-44">
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
            <button
              type="submit"
              className="rounded-lg bg-batik-indigo px-4 py-2 text-sm font-medium text-white"
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
    </div>
  );
}

function StepRow({ step, user, manager, workers, onUpdate, onDelete }) {
  const mine = step.assigned_worker_id === user?.id;
  const canStatus = manager || mine;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-batik-teal/15 p-4 sm:flex-row sm:items-center sm:justify-between">
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
  );
}
