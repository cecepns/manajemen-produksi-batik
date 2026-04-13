import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { format, isValid, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';
import { toast } from 'react-toastify';
import { Plus, Save, ChevronRight, Pencil, Trash2, X, Camera, Images } from 'lucide-react';
import { confirmWithToast } from '../utils/toastConfirm';
import { compressOrderPhoto } from '../utils/compressOrderPhoto';
import { api } from '../services/api';
import { ROUTES } from '../constants/routes';
import { formatDate } from '../utils/formatDate';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('id', localeId);

function parseYmd(s) {
  if (!s || !String(s).trim()) return null;
  const d = parse(String(s).trim(), 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : null;
}

function toYmd(date) {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

const emptyStep = () => ({
  _id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
  nama_step: '',
  keterangan: '',
  harga_pekerjaan: '',
  assigned_worker_id: '',
});

const STEP_PRESETS = [
  'Pewarnaan awal',
  'Detail motif',
  'Finishing',
  'Celup / malam',
  'Klowong',
  'Nyanting',
  'Pelorodan',
  'Packing',
];

const defaultSteps = () => STEP_PRESETS.map((nama_step) => ({ ...emptyStep(), nama_step }));

const MAX_FOTO_AWAL_CREATE = 6;

const defaultForm = () => ({
  nama_usaha: 'Batik Binar',
  nama_pemesan: '',
  tanggal_pesanan: new Date().toISOString().slice(0, 10),
  deadline: '',
  jumlah: 1,
  penanggung_jawab: '',
  jenis_bahan: '',
  ukuran_meter: '',
  resep: '',
  keterangan: '',
});

export function OrdersPage() {
  const { manager, owner } = useOutletContext();
  const [orders, setOrders] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderModal, setOrderModal] = useState(
    /** @type {{ mode: 'create' } | { mode: 'edit', id: number } | null} */ (null)
  );
  const [form, setForm] = useState(() => defaultForm());
  const [steps, setSteps] = useState(() => defaultSteps());
  const [saving, setSaving] = useState(false);
  const [editFetchId, setEditFetchId] = useState(null);
  /** @type {[File[], function]} */
  const [createFotoAwal, setCreateFotoAwal] = useState([]);
  const [compressingFoto, setCompressingFoto] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraVideoReady, setCameraVideoReady] = useState(false);
  const cameraStreamRef = useRef(null);
  const cameraVideoRef = useRef(null);

  const createFotoPreviewUrls = useMemo(
    () => createFotoAwal.map((f) => URL.createObjectURL(f)),
    [createFotoAwal]
  );

  useEffect(() => {
    return () => {
      createFotoPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [createFotoPreviewUrls]);

  function stopCameraStream() {
    const s = cameraStreamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setCameraVideoReady(false);
    setCameraOpen(false);
  }

  function markCameraVideoReady() {
    const v = cameraVideoRef.current;
    if (v && v.videoWidth >= 2 && v.videoHeight >= 2) {
      setCameraVideoReady(true);
    }
  }

  useEffect(() => {
    if (!cameraOpen) return;
    const video = cameraVideoRef.current;
    const stream = cameraStreamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      const s = cameraStreamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function openDeviceCamera() {
    if (compressingFoto || createFotoAwal.length >= MAX_FOTO_AWAL_CREATE) return;
    if (!window.isSecureContext) {
      toast.error('Kamera membutuhkan HTTPS atau localhost');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Peramban tidak mendukung akses kamera');
      return;
    }
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }
      cameraStreamRef.current = stream;
      setCameraVideoReady(false);
      setCameraOpen(true);
    } catch (e) {
      toast.error(
        e?.name === 'NotAllowedError'
          ? 'Akses kamera ditolak. Aktifkan izin kamera di pengaturan peramban.'
          : e?.message || 'Tidak bisa membuka kamera'
      );
    }
  }

  async function load() {
    setLoading(true);
    try {
      const list = await api.get('/orders');
      setOrders(list);
      if (manager) {
        const w = await api.get('/users/workers');
        setWorkers(w);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muat ulang saat mount / peran
  }, []);

  function resetOrderModal() {
    stopCameraStream();
    setOrderModal(null);
    setForm(defaultForm());
    setSteps(defaultSteps());
    setCreateFotoAwal([]);
    setCompressingFoto(false);
  }

  function closeModal() {
    if (saving || compressingFoto) return;
    if (cameraOpen) {
      stopCameraStream();
      return;
    }
    resetOrderModal();
  }

  function openCreateModal() {
    setForm(defaultForm());
    setSteps(defaultSteps());
    setCreateFotoAwal([]);
    setOrderModal({ mode: 'create' });
  }

  async function openEditModal(orderId) {
    setEditFetchId(orderId);
    try {
      const data = await api.get(`/orders/${orderId}`);
      setForm({
        nama_usaha: data.nama_usaha?.trim() ? data.nama_usaha : 'Batik Binar',
        nama_pemesan: data.nama_pemesan ?? '',
        tanggal_pesanan: data.tanggal_pesanan?.slice?.(0, 10) ?? data.tanggal_pesanan ?? '',
        deadline: data.deadline?.slice?.(0, 10) ?? data.deadline ?? '',
        jumlah: data.jumlah ?? 1,
        penanggung_jawab: data.penanggung_jawab ?? '',
        jenis_bahan: data.jenis_bahan ?? '',
        ukuran_meter:
          data.ukuran_meter != null && data.ukuran_meter !== ''
            ? String(data.ukuran_meter)
            : '',
        resep: data.resep ?? '',
        keterangan: data.keterangan ?? '',
      });
      setOrderModal({ mode: 'edit', id: orderId });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEditFetchId(null);
    }
  }

  function requestDeleteOrder(row) {
    confirmWithToast(
      `Hapus pesanan "${row.nama_pemesan}"? Data pesanan dan tahapan terkait akan dihapus.`,
      async () => {
        try {
          await api.delete(`/orders/${row.id}`);
          toast.success('Pesanan dihapus');
          await load();
        } catch (e) {
          toast.error(e.message);
        }
      }
    );
  }

  function updateStep(i, field, value) {
    setSteps((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function removeStepAt(index) {
    setSteps((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  async function appendCompressedFotoAwal(fileList) {
    if (!fileList?.length || compressingFoto) return;
    const slots = MAX_FOTO_AWAL_CREATE - createFotoAwal.length;
    if (slots <= 0) {
      toast.warn(`Maksimal ${MAX_FOTO_AWAL_CREATE} foto`);
      return;
    }
    const picked = Array.from(fileList);
    const toProcess = picked.slice(0, slots);
    if (picked.length > slots) {
      toast.warn(`Hanya ${slots} slot tersisa; foto berlebih diabaikan`);
    }
    setCompressingFoto(true);
    const done = [];
    try {
      for (const f of toProcess) {
        try {
          done.push(await compressOrderPhoto(f));
        } catch (err) {
          toast.error(err?.message || 'Gagal memproses gambar');
        }
      }
      if (done.length) {
        setCreateFotoAwal((prev) => [...prev, ...done]);
      }
    } finally {
      setCompressingFoto(false);
    }
  }

  async function capturePhotoFromCamera() {
    const video = cameraVideoRef.current;
    if (!video || video.videoWidth < 2 || video.videoHeight < 2) {
      toast.error('Kamera belum siap, tunggu sebentar');
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error('Gagal mengambil foto');
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    stopCameraStream();
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          toast.error('Gagal mengambil foto');
          return;
        }
        const file = new File([blob], `kamera-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        const dt = new DataTransfer();
        dt.items.add(file);
        await appendCompressedFotoAwal(dt.files);
      },
      'image/jpeg',
      0.92
    );
  }

  async function handleSubmitOrder(e) {
    e.preventDefault();
    if (!orderModal) return;
    if (compressingFoto) return;
    if (!form.tanggal_pesanan?.trim() || !form.deadline?.trim()) {
      toast.error('Tanggal pesanan dan deadline wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const ukm = Number(form.ukuran_meter);
      const payload = {
        ...form,
        jumlah: Number(form.jumlah) || 1,
        ukuran_meter:
          form.ukuran_meter === '' || form.ukuran_meter == null || !Number.isFinite(ukm)
            ? null
            : ukm,
      };
      if (orderModal.mode === 'create') {
        const workflow_steps = steps
          .filter((s) => s.nama_step.trim())
          .map((s) => ({
            nama_step: s.nama_step.trim(),
            keterangan: s.keterangan?.trim() || null,
            harga_pekerjaan: (() => {
              if (s.harga_pekerjaan === '' || s.harga_pekerjaan == null) return null;
              const n = Number(s.harga_pekerjaan);
              return Number.isFinite(n) ? n : null;
            })(),
            assigned_worker_id: s.assigned_worker_id ? Number(s.assigned_worker_id) : null,
          }));
        if (workflow_steps.length === 0) {
          toast.error('Minimal satu tahap dengan nama wajib diisi');
          setSaving(false);
          return;
        }
        if (createFotoAwal.length > MAX_FOTO_AWAL_CREATE) {
          toast.error(`Maksimal ${MAX_FOTO_AWAL_CREATE} foto awal`);
          setSaving(false);
          return;
        }
        if (createFotoAwal.length > 0) {
          const fd = new FormData();
          fd.append('nama_usaha', String(payload.nama_usaha ?? ''));
          fd.append('nama_pemesan', String(payload.nama_pemesan ?? ''));
          fd.append('tanggal_pesanan', String(payload.tanggal_pesanan ?? ''));
          fd.append('deadline', String(payload.deadline ?? ''));
          fd.append('jumlah', String(payload.jumlah ?? 1));
          fd.append('penanggung_jawab', String(payload.penanggung_jawab ?? ''));
          fd.append('jenis_bahan', payload.jenis_bahan != null ? String(payload.jenis_bahan) : '');
          fd.append(
            'ukuran_meter',
            payload.ukuran_meter != null && Number.isFinite(payload.ukuran_meter)
              ? String(payload.ukuran_meter)
              : ''
          );
          fd.append('resep', payload.resep != null ? String(payload.resep) : '');
          fd.append(
            'keterangan',
            payload.keterangan != null && String(payload.keterangan).trim()
              ? String(payload.keterangan).trim()
              : ''
          );
          fd.append('workflow_steps', JSON.stringify(workflow_steps));
          for (const file of createFotoAwal) fd.append('images', file);
          await api.postForm('/orders', fd);
        } else {
          await api.post('/orders', { ...payload, workflow_steps });
        }
        toast.success('Pesanan berhasil dibuat');
      } else {
        await api.put(`/orders/${orderModal.id}`, payload);
        toast.success('Pesanan diperbarui');
      }
      resetOrderModal();
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-batik-ink">Pesanan</h1>
          <p className="text-sm text-batik-indigo/70">
            {manager ? 'Kelola pesanan dan alur produksi.' : 'Pesanan yang terkait tugas Anda.'}
          </p>
        </div>
        {manager && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-batik-indigo px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-batik-teal"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Pesanan baru
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-batik-indigo/60">Memuat data…</p>
        ) : orders.length === 0 ? (
          <p className="p-8 text-center text-sm text-batik-indigo/60">Belum ada pesanan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Usaha / pemesan</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3">Jumlah</th>
                  <th className="px-4 py-3">PJ</th>
                  <th className="px-4 py-3 max-w-[200px]">Keterangan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-batik-teal/90">
                        {o.nama_usaha || 'Batik Binar'}
                      </p>
                      <p className="font-medium text-batik-ink">{o.nama_pemesan}</p>
                      <p className="mt-1 text-xs leading-snug text-batik-indigo/70">
                        <span className="font-medium text-batik-indigo/80">Jenis kain:</span>{' '}
                        {o.jenis_bahan?.trim() ? o.jenis_bahan : '—'}
                        <span className="mx-1.5 text-batik-indigo/40">·</span>
                        <span className="font-medium text-batik-indigo/80">Ukuran:</span>{' '}
                        {o.ukuran_meter != null && o.ukuran_meter !== ''
                          ? `${Number(o.ukuran_meter)} m`
                          : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-batik-indigo/80">{formatDate(o.tanggal_pesanan)}</td>
                    <td className="px-4 py-3 text-batik-indigo/80">{formatDate(o.deadline)}</td>
                    <td className="px-4 py-3">{o.jumlah}</td>
                    <td className="px-4 py-3 text-batik-indigo/80">{o.penanggung_jawab}</td>
                    <td className="max-w-[200px] px-4 py-3 text-batik-indigo/75">
                      {o.keterangan?.trim() ? (
                        <span className="line-clamp-2" title={o.keterangan}>
                          {o.keterangan}
                        </span>
                      ) : (
                        <span className="text-batik-indigo/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Link
                          to={ROUTES.orderDetail(o.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-batik-teal hover:bg-teal-50 hover:underline"
                        >
                          Detail
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                        {manager && (
                          <button
                            type="button"
                            title="Ubah pesanan"
                            disabled={editFetchId === o.id}
                            onClick={() => openEditModal(o.id)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-batik-indigo disabled:opacity-50"
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </button>
                        )}
                        {owner && (
                          <button
                            type="button"
                            title="Hapus pesanan"
                            onClick={() => requestDeleteOrder(o)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {manager && orderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm !m-0">
          <div
            className="absolute inset-0"
            role="presentation"
            onClick={closeModal}
          />
          <form
            onSubmit={handleSubmitOrder}
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-batik-ink">
                {orderModal.mode === 'create' ? 'Pesanan baru' : 'Ubah pesanan'}
              </h2>
              <button
                type="button"
                disabled={saving || compressingFoto}
                onClick={closeModal}
                className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                Tutup
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nama usaha"
                  value={form.nama_usaha}
                  onChange={(v) => setForm((f) => ({ ...f, nama_usaha: v }))}
                  required
                />
                <Field
                  label="Nama pemesan"
                  value={form.nama_pemesan}
                  onChange={(v) => setForm((f) => ({ ...f, nama_pemesan: v }))}
                  required
                />
                <Field
                  label="Penanggung jawab"
                  value={form.penanggung_jawab}
                  onChange={(v) => setForm((f) => ({ ...f, penanggung_jawab: v }))}
                  required
                />
                <FormDatePicker
                  label="Tanggal pesanan"
                  valueYmd={form.tanggal_pesanan}
                  onChangeYmd={(v) => setForm((f) => ({ ...f, tanggal_pesanan: v }))}
                />
                <FormDatePicker
                  label="Deadline"
                  valueYmd={form.deadline}
                  onChangeYmd={(v) => setForm((f) => ({ ...f, deadline: v }))}
                  minDate={parseYmd(form.tanggal_pesanan) ?? undefined}
                />
                <Field
                  label="Jumlah"
                  type="number"
                  min={1}
                  value={form.jumlah}
                  onChange={(v) => setForm((f) => ({ ...f, jumlah: v }))}
                />
                <Field
                  label="Jenis kain"
                  value={form.jenis_bahan}
                  onChange={(v) => setForm((f) => ({ ...f, jenis_bahan: v }))}
                  placeholder="Contoh: primissima, mori, sutera…"
                />
                <Field
                  label="Ukuran (meter)"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.ukuran_meter}
                  onChange={(v) => setForm((f) => ({ ...f, ukuran_meter: v }))}
                  placeholder="Opsional"
                />
              </div>
              {orderModal.mode === 'create' ? (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-sm font-medium text-batik-ink">Foto awal (referensi)</p>
                  <p className="mt-0.5 text-xs text-batik-indigo/60">
                    Hingga {MAX_FOTO_AWAL_CREATE} gambar. Kelola lanjutan di halaman detail.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-batik-teal/40 ${
                        compressingFoto || createFotoAwal.length >= MAX_FOTO_AWAL_CREATE
                          ? 'pointer-events-none opacity-50'
                          : ''
                      }`}
                    >
                      <Images className="h-4 w-4 text-batik-teal" aria-hidden />
                      Galeri
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={compressingFoto || createFotoAwal.length >= MAX_FOTO_AWAL_CREATE}
                        onChange={async (e) => {
                          const list = e.target.files;
                          await appendCompressedFotoAwal(list);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className={`inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-batik-teal/40 ${
                        compressingFoto || createFotoAwal.length >= MAX_FOTO_AWAL_CREATE
                          ? 'pointer-events-none opacity-50'
                          : ''
                      }`}
                      disabled={
                        compressingFoto || createFotoAwal.length >= MAX_FOTO_AWAL_CREATE
                      }
                      onClick={() => openDeviceCamera()}
                    >
                      <Camera className="h-4 w-4 text-batik-teal" aria-hidden />
                      Kamera
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-batik-indigo/50">
                    Kamera membuka preview langsung lewat peramban (HTTPS / localhost). Galeri tetap lewat tombol Galeri.
                  </p>
                  {compressingFoto && (
                    <p className="mt-2 text-xs font-medium text-batik-teal">Mengompres gambar…</p>
                  )}
                  {createFotoAwal.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {createFotoAwal.map((file, idx) => (
                        <div
                          key={`${file.name}-${file.size}-${idx}`}
                          className="group relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-white"
                        >
                          <img
                            src={createFotoPreviewUrls[idx]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            title="Hapus dari daftar unggahan"
                            disabled={compressingFoto}
                            onClick={() =>
                              setCreateFotoAwal((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="absolute right-0.5 top-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-red-600 shadow-sm opacity-0 ring-1 ring-slate-200 transition group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-40"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="mt-4">
                <label className="block text-sm font-medium text-batik-ink">Resep / instruksi</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                  rows={4}
                  value={form.resep}
                  onChange={(e) => setForm((f) => ({ ...f, resep: e.target.value }))}
                  placeholder="Catatan produksi, warna, pola…"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-batik-ink">Keterangan</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                  rows={2}
                  value={form.keterangan}
                  onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Catatan singkat pesanan (opsional)"
                />
              </div>
              {orderModal.mode === 'create' ? (
                <div className="mt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-batik-ink">
                      Tahapan workflow (minimal 1, Tambah tahapan jika diperlukan)
                    </p>
                    <button
                      type="button"
                      onClick={() => setSteps((prev) => [...prev, emptyStep()])}
                      className="text-xs font-semibold text-batik-teal hover:underline"
                    >
                      + Tambah tahap
                    </button>
                  </div>
                  <div className="mt-2 space-y-3">
                    {steps.map((s, i) => (
                      <div
                        key={s._id}
                        className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-medium text-slate-400">Tahap {i + 1}</span>
                          <button
                            type="button"
                            title={steps.length <= 1 ? 'Minimal satu baris tahap' : 'Hapus baris ini'}
                            disabled={steps.length <= 1}
                            onClick={() => removeStepAt(i)}
                            className="inline-flex shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="min-w-0 flex-1">
                            <label className="text-xs text-slate-500">Nama tahap</label>
                            <input
                              className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                              value={s.nama_step}
                              onChange={(e) => updateStep(i, 'nama_step', e.target.value)}
                            />
                          </div>
                          <div className="sm:w-40">
                            <label className="text-xs text-slate-500">Harga (Rp)</label>
                            <input
                              type="number"
                              min={0}
                              step={1000}
                              className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                              value={s.harga_pekerjaan}
                              onChange={(e) => updateStep(i, 'harga_pekerjaan', e.target.value)}
                              placeholder="Opsional"
                            />
                          </div>
                          <div className="sm:w-44">
                            <label className="text-xs text-slate-500">Pekerja (opsional)</label>
                            <select
                              className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                              value={s.assigned_worker_id}
                              onChange={(e) => updateStep(i, 'assigned_worker_id', e.target.value)}
                            >
                              <option value="">—</option>
                              {workers.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.username}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Keterangan tahap</label>
                          <input
                            className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                            value={s.keterangan}
                            onChange={(e) => updateStep(i, 'keterangan', e.target.value)}
                            placeholder="Catatan untuk tahap ini"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                  Tahapan workflow diubah lewat{' '}
                  <Link
                    to={ROUTES.orderDetail(orderModal.id)}
                    className="font-medium text-batik-teal hover:underline"
                    onClick={closeModal}
                  >
                    halaman detail pesanan
                  </Link>
                  .
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                disabled={saving || compressingFoto}
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || compressingFoto}
                className="inline-flex items-center gap-2 rounded-xl bg-batik-indigo px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-batik-teal disabled:opacity-60"
              >
                <Save className="h-4 w-4" aria-hidden />
                {saving
                  ? 'Menyimpan…'
                  : orderModal.mode === 'create'
                    ? 'Simpan pesanan'
                    : 'Simpan perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {cameraOpen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Ambil foto dari kamera"
        >
          <video
            ref={cameraVideoRef}
            className="max-h-[min(65vh,560px)] w-full max-w-lg rounded-xl bg-black object-cover"
            playsInline
            muted
            autoPlay
            onLoadedMetadata={markCameraVideoReady}
            onLoadedData={markCameraVideoReady}
            onCanPlay={markCameraVideoReady}
          />
          <p className="max-w-md text-center text-xs text-white/75">
            Izinkan akses kamera saat diminta. Gunakan tombol Galeri jika ingin pilih file dari album.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={stopCameraStream}
              className="rounded-xl border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!cameraVideoReady}
              onClick={() => capturePhotoFromCamera()}
              className="rounded-xl bg-batik-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Ambil foto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required, min }) {
  return (
    <div>
      <label className="block text-sm font-medium text-batik-ink">{label}</label>
      <input
        type={type}
        required={required}
        min={min}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function FormDatePicker({ label, valueYmd, onChangeYmd, minDate }) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-batik-ink">{label}</label>
      <DatePicker
        selected={parseYmd(valueYmd)}
        onChange={(d) => onChangeYmd(toYmd(d))}
        dateFormat="d MMMM yyyy"
        locale="id"
        placeholderText="Pilih tanggal"
        minDate={minDate}
        popperProps={{ strategy: 'fixed' }}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-batik-ink outline-none ring-batik-teal/30 focus:ring-2"
        wrapperClassName="block w-full"
        calendarClassName="rounded-xl border border-slate-200 font-sans shadow-lg"
        popperClassName="react-datepicker-popper-z"
        showPopperArrow={false}
        autoComplete="off"
      />
    </div>
  );
}
