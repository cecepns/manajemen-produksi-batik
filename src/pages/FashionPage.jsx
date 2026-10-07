import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Shirt,
  Camera,
  Image as ImageIcon,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Printer,
  Maximize2,
  DollarSign,
  User,
  Clock,
  Scissors,
  FileText,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { api, assetUrl } from '../services/api';
import { formatDate } from '../utils/formatDate';
import { formatIdr } from '../utils/formatMoney';
import { compressOrderPhoto } from '../utils/compressOrderPhoto';

const PAGE_SIZE = 12;

const emptyForm = {
  nama_produk: '',
  harga: '',
  penjahit: '',
  jenis_bahan: '',
  harga_jahit: '',
  harga_jual: '',
  waktu_produksi: '',
  keterangan: '',
};

function revokePhotoSlots(urls) {
  for (const u of Object.values(urls)) {
    if (u && String(u).startsWith('blob:')) URL.revokeObjectURL(u);
  }
}

export function FashionPage() {
  const { user, manager, owner } = useOutletContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [listQ, setListQ] = useState('');
  const [qDraft, setQDraft] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [sheetViewItem, setSheetViewItem] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Form states
  const [formData, setFormData] = useState(emptyForm);
  const [selectedFiles, setSelectedFiles] = useState({ 1: null, 2: null, 3: null, 4: null, 5: null });
  const [previewUrls, setPreviewUrls] = useState({ 1: '', 2: '', 3: '', 4: '', 5: '' });
  const previewUrlsRef = useRef(previewUrls);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(
    () => () => {
      revokePhotoSlots(previewUrlsRef.current);
    },
    []
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (listQ) qs.set('q', listQ);
      const res = await api.get(`/fashion?${qs.toString()}`);
      setItems(Array.isArray(res.data) ? res.data : []);
      setTotal(Number(res.total) || 0);
      setTotalPages(Math.max(1, Number(res.totalPages) || 1));
    } catch (e) {
      toast.error(e.message || 'Gagal memuat data fashion');
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, listQ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage((p) => Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  function applySearch() {
    setListQ(qDraft.trim());
    setPage(1);
  }

  function handleResetSearch() {
    setQDraft('');
    setListQ('');
    setPage(1);
  }

  async function handleSlotFileChange(slot, file) {
    if (!file) return;
    try {
      setCompressing(true);
      toast.info(`Mengompres foto ${slot}…`, { autoClose: 1200 });
      const compressed = await compressOrderPhoto(file);
      setSelectedFiles((prev) => ({ ...prev, [slot]: compressed }));
      setPreviewUrls((prev) => {
        const next = { ...prev };
        if (next[slot] && next[slot].startsWith('blob:')) URL.revokeObjectURL(next[slot]);
        next[slot] = URL.createObjectURL(compressed);
        return next;
      });
      toast.success(`Foto ${slot} siap!`, { autoClose: 1000 });
    } catch (err) {
      toast.error(err.message || `Gagal memproses foto ${slot}`);
    } finally {
      setCompressing(false);
    }
  }

  function handleClearSlot(slot) {
    setSelectedFiles((prev) => ({ ...prev, [slot]: null }));
    setPreviewUrls((prev) => {
      const next = { ...prev };
      if (next[slot] && next[slot].startsWith('blob:')) URL.revokeObjectURL(next[slot]);
      next[slot] = '';
      return next;
    });
  }

  function resetForm() {
    setFormData(emptyForm);
    setSelectedFiles({ 1: null, 2: null, 3: null, 4: null, 5: null });
    revokePhotoSlots(previewUrls);
    setPreviewUrls({ 1: '', 2: '', 3: '', 4: '', 5: '' });
    setEditingItem(null);
    setIsCreateOpen(false);
  }

  function openCreateModal() {
    resetForm();
    setIsCreateOpen(true);
  }

  function openEditModal(item) {
    resetForm();
    setEditingItem(item);
    setFormData({
      nama_produk: item.nama_produk || '',
      harga: item.harga != null ? String(item.harga) : '',
      penjahit: item.penjahit || '',
      jenis_bahan: item.jenis_bahan || '',
      harga_jahit: item.harga_jahit != null ? String(item.harga_jahit) : '',
      harga_jual: item.harga_jual != null ? String(item.harga_jual) : '',
      waktu_produksi: item.waktu_produksi || '',
      keterangan: item.keterangan || '',
    });
    setPreviewUrls({
      1: item.foto1_url ? assetUrl(item.foto1_url) : '',
      2: item.foto2_url ? assetUrl(item.foto2_url) : '',
      3: item.foto3_url ? assetUrl(item.foto3_url) : '',
      4: item.foto4_url ? assetUrl(item.foto4_url) : '',
      5: item.foto5_url ? assetUrl(item.foto5_url) : '',
    });
    setIsCreateOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!formData.nama_produk.trim()) {
      toast.error('Nama produk wajib diisi');
      return;
    }
    if (!editingItem && !selectedFiles[1]) {
      toast.error('Foto 1 (utama) wajib diisi untuk produk baru');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('nama_produk', formData.nama_produk.trim());
      if (formData.harga) fd.append('harga', formData.harga.trim());
      if (formData.penjahit) fd.append('penjahit', formData.penjahit.trim());
      if (formData.jenis_bahan) fd.append('jenis_bahan', formData.jenis_bahan.trim());
      if (formData.harga_jahit) fd.append('harga_jahit', formData.harga_jahit.trim());
      if (formData.harga_jual) fd.append('harga_jual', formData.harga_jual.trim());
      if (formData.waktu_produksi) fd.append('waktu_produksi', formData.waktu_produksi.trim());
      if (formData.keterangan) fd.append('keterangan', formData.keterangan.trim());

      // Append files
      for (let s = 1; s <= 5; s++) {
        if (selectedFiles[s]) {
          fd.append(`foto${s}`, selectedFiles[s]);
        }
      }

      if (editingItem) {
        await api.patch(`/fashion/${editingItem.id}`, fd, { isFormData: true });
        toast.success('Produk fashion berhasil diperbarui');
      } else {
        await api.postForm('/fashion', fd);
        toast.success('Produk fashion berhasil disimpan');
      }

      resetForm();
      loadData();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan produk');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Hapus produk fashion "${item.nama_produk}" beserta semua fotonya?`)) {
      return;
    }
    try {
      await api.delete(`/fashion/${item.id}`);
      toast.success('Produk berhasil dihapus');
      if (sheetViewItem?.id === item.id) setSheetViewItem(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus produk');
    }
  }

  if (!manager) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Shirt className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-3 text-base font-semibold text-slate-800">Akses Terbatas</h3>
        <p className="mt-1 text-sm text-slate-500">
          Menu Direktori Fashion hanya dapat diakses oleh Supervisor dan Owner.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-4 sm:space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-batik-indigo text-white shadow-sm">
              <Shirt className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-batik-ink sm:text-2xl">
                Direktori Fashion
              </h1>
              <p className="line-clamp-2 text-xs text-batik-indigo/70 sm:text-sm">
                Katalog & arsip produk fashion yang kita produksi (5 foto dalam 1 lembar tampilan)
              </p>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-auto flex shrink-0 items-center">
          <button
            type="button"
            onClick={openCreateModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-batik-indigo px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-batik-teal"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tambah produk fashion
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applySearch();
              }
            }}
            placeholder="Cari nama produk, penjahit, jenis bahan…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs sm:text-sm text-slate-900 outline-none ring-batik-teal/30 placeholder:text-slate-400 focus:ring-2"
          />
          {qDraft && (
            <button
              type="button"
              onClick={handleResetSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="w-full sm:w-auto flex shrink-0 items-center">
          <button
            type="button"
            onClick={applySearch}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <Search className="h-3.5 w-3.5 text-slate-500" />
            Cari
          </button>
        </div>
      </div>

      {/* Grid List Products (Cards Sesuai Sketsa 5 Foto 1 Lembar) */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-batik-indigo/60">
          Memuat produk fashion…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Shirt className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-700">Belum ada produk fashion</h3>
          <p className="mt-1 text-sm text-slate-500">
            {listQ ? `Tidak ditemukan produk cocok dengan "${listQ}"` : 'Mulai tambahkan direktori produk fashion baru.'}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-batik-indigo px-4 py-2 text-sm font-semibold text-white transition hover:bg-batik-teal"
          >
            <Plus className="h-4 w-4" />
            Tambah sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 w-full min-w-0">
          {items.map((item) => {
            const photos = [item.foto1_url, item.foto2_url, item.foto3_url, item.foto4_url, item.foto5_url];
            const topPhotos = photos.slice(0, 3);
            const bottomPhotos = photos.slice(3, 5);

            const modalCost = (Number(item.harga) || 0) + (Number(item.harga_jahit) || 0);
            const margin = item.harga_jual != null ? Number(item.harga_jual) - modalCost : null;

            return (
              <div
                key={item.id}
                className="group relative flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Header Card */}
                <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/60 p-3 sm:p-4">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="inline-flex rounded-md bg-batik-indigo/10 px-2 py-0.5 text-xs font-semibold text-batik-indigo">
                        #{item.id}
                      </span>
                      {item.waktu_produksi && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200/70">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[120px]">{item.waktu_produksi}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 truncate text-base font-bold text-batik-ink sm:text-lg" title={item.nama_produk}>
                      {item.nama_produk}
                    </h3>
                    <p className="truncate text-xs text-slate-500">
                      Oleh <span className="font-medium text-slate-700">{item.created_by_username || 'Admin'}</span> · {formatDate(item.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                    <button
                      type="button"
                      title="Lihat 1 lembar penuh / cetak"
                      onClick={() => setSheetViewItem(item)}
                      className="rounded-lg p-1.5 sm:p-2 text-slate-500 transition hover:bg-slate-100 hover:text-batik-indigo"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    {(manager || Number(user?.id) === Number(item.created_by)) && (
                      <button
                        type="button"
                        title="Edit produk"
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-1.5 sm:p-2 text-slate-500 transition hover:bg-slate-100 hover:text-batik-indigo"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {(manager || Number(user?.id) === Number(item.created_by)) && (
                      <button
                        type="button"
                        title="Hapus produk"
                        onClick={() => handleDelete(item)}
                        className="rounded-lg p-1.5 sm:p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 5-Photo Gallery Grid (3 foto atas + 2 foto bawah) */}
                <div className="w-full min-w-0 border-b border-slate-100 bg-slate-100/50 p-2 sm:p-3">
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full min-w-0">
                    {topPhotos.map((url, i) => (
                      <div
                        key={i}
                        className="group/img relative w-full min-w-0 aspect-[3/4] overflow-hidden rounded-lg sm:rounded-xl border border-slate-200/80 bg-white"
                      >
                        {url ? (
                          <>
                            <img
                              src={assetUrl(url)}
                              alt={`${item.nama_produk} Foto ${i + 1}`}
                              className="h-full w-full object-cover transition duration-200 group-hover/img:scale-105"
                            />
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(assetUrl(url))}
                              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover/img:opacity-100"
                            >
                              <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow" />
                            </button>
                            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] sm:text-[10px] font-medium text-white">
                              Foto {i + 1}
                            </span>
                          </>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center p-1 text-center text-xs text-slate-400">
                            <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 opacity-40" />
                            <span className="mt-0.5 text-[9px] sm:text-[10px]">Foto {i + 1}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-1.5 sm:mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 w-full min-w-0">
                    {bottomPhotos.map((url, i) => {
                      const slotNum = i + 4;
                      return (
                        <div
                          key={slotNum}
                          className="group/img relative w-full min-w-0 aspect-[4/3] overflow-hidden rounded-lg sm:rounded-xl border border-slate-200/80 bg-white"
                        >
                          {url ? (
                            <>
                              <img
                                src={assetUrl(url)}
                                alt={`${item.nama_produk} Foto ${slotNum}`}
                                className="h-full w-full object-cover transition duration-200 group-hover/img:scale-105"
                              />
                              <button
                                type="button"
                                onClick={() => setLightboxUrl(assetUrl(url))}
                                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover/img:opacity-100"
                              >
                                <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow" />
                              </button>
                              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] sm:text-[10px] font-medium text-white">
                                Foto {slotNum}
                              </span>
                            </>
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center p-1 text-center text-xs text-slate-400">
                              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 opacity-40" />
                              <span className="mt-0.5 text-[9px] sm:text-[10px]">Foto {slotNum}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Body Details: Harga, Penjahit, Bahan, Harga Jahit, Harga Jual, Keterangan */}
                <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 sm:gap-3">
                    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-2 sm:p-2.5">
                      <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-slate-500">
                        <User className="h-3 w-3 shrink-0 text-batik-teal" />
                        Penjahit
                      </span>
                      <p className="mt-0.5 truncate font-semibold text-slate-800" title={item.penjahit || '—'}>
                        {item.penjahit || '—'}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-2 sm:p-2.5">
                      <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-slate-500">
                        <Layers className="h-3 w-3 shrink-0 text-batik-indigo" />
                        Jenis Bahan
                      </span>
                      <p className="mt-0.5 truncate font-semibold text-slate-800" title={item.jenis_bahan || '—'}>
                        {item.jenis_bahan || '—'}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-2 sm:p-2.5">
                      <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-slate-500">
                        <DollarSign className="h-3 w-3 shrink-0 text-amber-600" />
                        Harga Modal
                      </span>
                      <p className="mt-0.5 truncate font-semibold text-slate-800">
                        {item.harga != null ? formatIdr(item.harga) : '—'}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-2 sm:p-2.5">
                      <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-slate-500">
                        <Scissors className="h-3 w-3 shrink-0 text-purple-600" />
                        Harga Jahit
                      </span>
                      <p className="mt-0.5 truncate font-semibold text-slate-800">
                        {item.harga_jahit != null ? formatIdr(item.harga_jahit) : '—'}
                      </p>
                    </div>

                    <div className="col-span-2 min-w-0 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-2 sm:p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-emerald-800">
                          <Sparkles className="h-3 w-3 shrink-0 text-emerald-600" />
                          Harga Jual
                        </span>
                        {margin != null && margin > 0 && (
                          <span className="text-[10px] font-semibold text-emerald-700">
                            Margin +{formatIdr(margin)}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs sm:text-sm font-bold text-emerald-950">
                        {item.harga_jual != null ? formatIdr(item.harga_jual) : '—'}
                      </p>
                    </div>
                  </div>

                  {item.keterangan && (
                    <div className="mt-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-2 sm:p-2.5 text-xs text-slate-600 break-words">
                      <span className="font-semibold text-slate-700">Keterangan: </span>
                      {item.keterangan}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setSheetViewItem(item)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-batik-teal hover:underline"
                    >
                      Buka 1 lembar detail
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex w-full min-w-0 max-w-full flex-col gap-2.5 rounded-2xl border border-slate-200/90 bg-white p-3 sm:px-4 sm:py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="truncate text-center text-xs text-slate-500 sm:text-left">
            Menampilkan {total} total produk fashion
          </p>
          <div className="flex w-full sm:w-auto items-center justify-between gap-1 sm:justify-center sm:gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 sm:h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Sebelumnya</span>
            </button>
            <span className="px-1 text-center text-xs sm:text-sm font-medium text-slate-600 whitespace-nowrap">
              Hal {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex h-8 sm:h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <span>Berikutnya</span>
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Tambah / Edit Produk Fashion (dengan 5 slot foto & compress) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 sm:p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={resetForm} />
          <form
            onSubmit={handleSave}
            className="relative flex max-h-[92vh] w-full max-w-3xl min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-batik-indigo text-white">
                  <Shirt className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-batik-ink">
                    {editingItem ? 'Edit Produk Fashion' : 'Tambah Produk Fashion Baru'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Upload hingga 5 foto (otomatis dikompres) dan lengkapi rincian produk
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                disabled={saving || compressing}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {/* 5 Foto Upload Slots */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-batik-ink">
                    5 Foto Produk (Sesuai Sketsa 1 Lembar)
                  </label>
                  <span className="text-xs text-slate-500">
                    *Foto otomatis dikompres ke format efisien
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[1, 2, 3, 4, 5].map((slot) => {
                    const preview = previewUrls[slot];
                    return (
                      <div
                        key={slot}
                        className="relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 text-center"
                      >
                        <span className="text-[11px] font-semibold text-slate-700">
                          Foto {slot} {slot === 1 ? '(Utama)' : ''}
                        </span>

                        <div className="relative mt-2 aspect-[3/4] overflow-hidden rounded-lg border border-slate-200 bg-white">
                          {preview ? (
                            <>
                              <img
                                src={preview}
                                alt={`Preview slot ${slot}`}
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleClearSlot(slot)}
                                className="absolute right-1 top-1 rounded bg-red-600/90 p-1 text-white hover:bg-red-700"
                                title="Hapus foto ini"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center p-2 text-slate-400">
                              <ImageIcon className="h-6 w-6 opacity-40" />
                              <span className="mt-1 text-[10px]">Kosong</span>
                            </div>
                          )}
                        </div>

                        {/* Upload buttons */}
                        <div className="mt-2 flex gap-1">
                          <label className="flex-1 cursor-pointer rounded-md border border-slate-200 bg-white py-1 text-center text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-100">
                            <Camera className="mx-auto h-3.5 w-3.5 text-batik-indigo" />
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="sr-only"
                              disabled={saving || compressing}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleSlotFileChange(slot, f);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <label className="flex-1 cursor-pointer rounded-md border border-slate-200 bg-white py-1 text-center text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-100">
                            <ImageIcon className="mx-auto h-3.5 w-3.5 text-batik-teal" />
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              disabled={saving || compressing}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleSlotFileChange(slot, f);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Nama Produk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama_produk}
                    onChange={(e) => setFormData((f) => ({ ...f, nama_produk: e.target.value }))}
                    placeholder="Contoh: Kemeja Batik Pria Slimfit Motif Parang"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Penjahit
                  </label>
                  <input
                    type="text"
                    value={formData.penjahit}
                    onChange={(e) => setFormData((f) => ({ ...f, penjahit: e.target.value }))}
                    placeholder="Nama penjahit / vendor jahit"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Jenis Bahan
                  </label>
                  <input
                    type="text"
                    value={formData.jenis_bahan}
                    onChange={(e) => setFormData((f) => ({ ...f, jenis_bahan: e.target.value }))}
                    placeholder="Contoh: Katun Primissima 50s, Mori"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Harga Modal / Bahan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.harga}
                    onChange={(e) => setFormData((f) => ({ ...f, harga: e.target.value }))}
                    placeholder="Contoh: 125000"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Harga / Ongkos Jahit (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.harga_jahit}
                    onChange={(e) => setFormData((f) => ({ ...f, harga_jahit: e.target.value }))}
                    placeholder="Contoh: 45000"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.harga_jual}
                    onChange={(e) => setFormData((f) => ({ ...f, harga_jual: e.target.value }))}
                    placeholder="Contoh: 250000"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Waktu Produksi
                  </label>
                  <input
                    type="text"
                    value={formData.waktu_produksi}
                    onChange={(e) => setFormData((f) => ({ ...f, waktu_produksi: e.target.value }))}
                    placeholder="Contoh: 3 hari, 1 minggu"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Keterangan
                  </label>
                  <textarea
                    rows={3}
                    value={formData.keterangan}
                    onChange={(e) => setFormData((f) => ({ ...f, keterangan: e.target.value }))}
                    placeholder="Catatan tambahan, ukuran pola jahit, variasi warna, dsb."
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={resetForm}
                disabled={saving || compressing}
                className="rounded-xl border border-slate-200 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || compressing}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-batik-indigo px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-batik-teal disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {saving ? 'Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Simpan Produk Fashion'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: 1 LEMBAR PENUH (Sheet View / Cetak Sesuai Gambar Sketsa) */}
      {sheetViewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setSheetViewItem(null)} />
          <div
            className="relative flex max-h-[95vh] w-full max-w-4xl min-w-0 flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-6 shadow-2xl print:m-0 print:max-h-none print:w-full print:border-none print:shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <Shirt className="h-5 w-5 text-batik-indigo" />
                <span className="text-sm sm:text-base font-semibold text-batik-ink">Lembar Produk Fashion</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cetak</span> Lembar
                </button>
                <button
                  type="button"
                  onClick={() => setSheetViewItem(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Sheet View (Exact Match to User Sketch) */}
            <div className="flex-1 overflow-y-auto pt-3 sm:pt-4 print:overflow-visible">
              <div className="rounded-2xl border border-slate-200/90 sm:border-2 bg-white p-3.5 sm:p-6 shadow-sm min-w-0">
                <div className="mb-4 flex items-start justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-batik-teal">
                      Katalog Produksi Batik Binar
                    </span>
                    <h2 className="text-2xl font-black text-batik-ink">{sheetViewItem.nama_produk}</h2>
                    <p className="text-xs text-slate-500">ID Produk: #{sheetViewItem.id} · Dibuat: {formatDate(sheetViewItem.created_at)}</p>
                  </div>
                  {sheetViewItem.waktu_produksi && (
                    <div className="rounded-xl bg-amber-50 px-3 py-1.5 text-right ring-1 ring-amber-200/80">
                      <span className="text-[10px] font-semibold uppercase text-amber-800">Waktu Produksi</span>
                      <p className="text-xs font-bold text-amber-950">{sheetViewItem.waktu_produksi}</p>
                    </div>
                  )}
                </div>

                {/* Grid 5 Foto Sesuai Sketsa Pak Edy */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Galeri Foto Produk (5 Foto)</p>
                  
                  {/* Baris Atas 3 Foto */}
                  <div className="grid grid-cols-3 gap-3">
                    {[sheetViewItem.foto1_url, sheetViewItem.foto2_url, sheetViewItem.foto3_url].map((url, i) => (
                      <div
                        key={i}
                        className="relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-300 bg-slate-50"
                      >
                        {url ? (
                          <img
                            src={assetUrl(url)}
                            alt={`Foto ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            Foto {i + 1} Kosong
                          </div>
                        )}
                        <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          Foto {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Baris Bawah 2 Foto */}
                  <div className="grid grid-cols-2 gap-3">
                    {[sheetViewItem.foto4_url, sheetViewItem.foto5_url].map((url, i) => {
                      const num = i + 4;
                      return (
                        <div
                          key={num}
                          className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-300 bg-slate-50"
                        >
                          {url ? (
                            <img
                              src={assetUrl(url)}
                              alt={`Foto ${num}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                              Foto {num} Kosong
                            </div>
                          )}
                          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            Foto {num}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rincian Produk Sesuai Sketsa "Produk ...." */}
                <div className="mt-6 border-t-2 border-slate-100 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Rincian Informasi Produk</h4>
                  <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[11px] font-semibold text-slate-500">Penjahit</span>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">{sheetViewItem.penjahit || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[11px] font-semibold text-slate-500">Jenis Bahan</span>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">{sheetViewItem.jenis_bahan || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[11px] font-semibold text-slate-500">Harga Modal / Bahan</span>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">
                        {sheetViewItem.harga != null ? formatIdr(sheetViewItem.harga) : '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[11px] font-semibold text-slate-500">Harga / Ongkos Jahit</span>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">
                        {sheetViewItem.harga_jahit != null ? formatIdr(sheetViewItem.harga_jahit) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                    <div>
                      <span className="text-xs font-semibold text-emerald-800">Harga Jual Produk</span>
                      <p className="text-2xl font-black text-emerald-950">
                        {sheetViewItem.harga_jual != null ? formatIdr(sheetViewItem.harga_jual) : '—'}
                      </p>
                    </div>
                    {sheetViewItem.harga_jual != null && (
                      <div className="text-right">
                        <span className="text-xs font-semibold text-emerald-800">Estimasi Margin Keuntungan</span>
                        <p className="text-base font-bold text-emerald-900">
                          +{formatIdr(Number(sheetViewItem.harga_jual) - ((Number(sheetViewItem.harga) || 0) + (Number(sheetViewItem.harga_jahit) || 0)))}
                        </p>
                      </div>
                    )}
                  </div>

                  {sheetViewItem.keterangan && (
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                      <span className="text-xs font-semibold text-slate-600">Catatan & Keterangan:</span>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{sheetViewItem.keterangan}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Gambar Penuh */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Preview Penuh"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
