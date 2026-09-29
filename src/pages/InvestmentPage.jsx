import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Coins,
  Plus,
  Trash2,
  Save,
  Printer,
  Copy,
  RefreshCw,
  FolderOpen,
  PieChart,
  DollarSign,
  Users,
  Search,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { formatIdr, normalizeIdrTyping, parseIdrInput } from '../utils/formatMoney';
import { formatDate } from '../utils/formatDate';

const LOCAL_STORAGE_KEY = 'batik_binar_investasi_data';

function sampleKertasData() {
  return {
    periode: 'Mei 2025',
    jenisUsaha: 'Produksi Kain Batik Tulis',
    hasilUsahaRaw: '500.000',
    hasilUsaha: 500000,
    status: 'selesai',
    catatan: 'Pembagian bagi hasil sesuai sketsa catatan kertas investor.',
    investors: [
      { id: 'sample-1', namaInvestor: 'Investor A', modalSertaRaw: '100.000', modalSerta: 100000, keterangan: 'BCA - 01928374' },
      { id: 'sample-2', namaInvestor: 'Investor B', modalSertaRaw: '500.000', modalSerta: 500000, keterangan: 'Mandiri - 12839213' },
      { id: 'sample-3', namaInvestor: 'Investor C', modalSertaRaw: '300.000', modalSerta: 300000, keterangan: 'BRI - 82937192' },
    ],
  };
}

export function InvestmentPage() {
  const { manager } = useOutletContext();

  // Active form state
  const [editingId, setEditingId] = useState(null);
  const [periode, setPeriode] = useState('Bulan Mei 2025');
  const [jenisUsaha, setJenisUsaha] = useState('Produksi Kain Batik Tulis');
  const [hasilUsahaRaw, setHasilUsahaRaw] = useState('500.000');
  const [status, setStatus] = useState('selesai');
  const [catatan, setCatatan] = useState('');
  const [investors, setInvestors] = useState([
    { id: 'inv-1', namaInvestor: 'Investor A', modalSertaRaw: '100.000', modalSerta: 100000, keterangan: '' },
    { id: 'inv-2', namaInvestor: 'Investor B', modalSertaRaw: '500.000', modalSerta: 500000, keterangan: '' },
    { id: 'inv-3', namaInvestor: 'Investor C', modalSertaRaw: '300.000', modalSerta: 300000, keterangan: '' },
  ]);

  // Saved investments list
  const [savedInvestments, setSavedInvestments] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'history'
  const [isUsingLocalStorage, setIsUsingLocalStorage] = useState(false);

  // Parse hasil usaha
  const hasilUsaha = useMemo(() => {
    const val = parseIdrInput(hasilUsahaRaw);
    return Number.isFinite(val) && val >= 0 ? val : 0;
  }, [hasilUsahaRaw]);

  // Calculations for proportions and bagi hasil
  const calculations = useMemo(() => {
    const totalModal = investors.reduce((sum, inv) => sum + (Number(inv.modalSerta) || 0), 0);
    const rows = investors.map((inv) => {
      const modal = Number(inv.modalSerta) || 0;
      const persentase = totalModal > 0 ? (modal / totalModal) * 100 : 0;
      const bagiHasil = totalModal > 0 ? (modal / totalModal) * hasilUsaha : 0;
      return {
        ...inv,
        modal,
        persentase,
        bagiHasil,
      };
    });

    const totalBagiHasil = rows.reduce((sum, r) => sum + r.bagiHasil, 0);

    return {
      totalModal,
      totalBagiHasil,
      rows,
      investorCount: investors.filter((r) => r.namaInvestor.trim() || r.modalSerta > 0).length,
    };
  }, [investors, hasilUsaha]);

  // Load saved investments from server, fallback to localStorage
  const loadInvestments = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api.get('/investments');
      setSavedInvestments(Array.isArray(data) ? data : []);
      setIsUsingLocalStorage(false);
    } catch {
      // Fallback to localStorage if API is not available/migrated on remote yet
      try {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          setSavedInvestments(JSON.parse(local));
        } else {
          setSavedInvestments([]);
        }
        setIsUsingLocalStorage(true);
      } catch {
        setSavedInvestments([]);
      }
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (manager) {
      loadInvestments();
    }
  }, [manager, loadInvestments]);

  // Save to localStorage helper
  const saveToLocal = (items) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  };

  // Investor row handlers
  const handleInvestorChange = (id, field, value) => {
    setInvestors((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'modalSertaRaw') {
          const norm = normalizeIdrTyping(value);
          const parsed = parseIdrInput(norm);
          return {
            ...item,
            modalSertaRaw: norm,
            modalSerta: Number.isFinite(parsed) ? parsed : 0,
          };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleAddInvestor = (count = 1) => {
    const nextAlpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    setInvestors((prev) => {
      const newItems = [];
      const currentLength = prev.length;
      for (let i = 0; i < count; i++) {
        const idx = currentLength + i;
        const letter = idx < nextAlpha.length ? nextAlpha[idx] : idx + 1;
        newItems.push({
          id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`,
          namaInvestor: `Investor ${letter}`,
          modalSertaRaw: '',
          modalSerta: 0,
          keterangan: '',
        });
      }
      return [...prev, ...newItems];
    });
  };

  const handleRemoveInvestor = (id) => {
    if (investors.length <= 1) {
      toast.info('Minimal tersisa 1 baris investor');
      return;
    }
    setInvestors((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetForm = () => {
    setEditingId(null);
    setPeriode('');
    setJenisUsaha('');
    setHasilUsahaRaw('');
    setStatus('selesai');
    setCatatan('');
    setInvestors([
      { id: '1', namaInvestor: 'Investor A', modalSertaRaw: '', modalSerta: 0, keterangan: '' },
      { id: '2', namaInvestor: 'Investor B', modalSertaRaw: '', modalSerta: 0, keterangan: '' },
      { id: '3', namaInvestor: 'Investor C', modalSertaRaw: '', modalSerta: 0, keterangan: '' },
    ]);
  };

  const handleLoadSample = () => {
    const s = sampleKertasData();
    setEditingId(null);
    setPeriode(s.periode);
    setJenisUsaha(s.jenisUsaha);
    setHasilUsahaRaw(s.hasilUsahaRaw);
    setStatus(s.status);
    setCatatan(s.catatan);
    setInvestors(s.investors);
    toast.success('Contoh data sketsa kertas berhasil dimuat!');
  };

  // Save investment to server or localStorage
  const handleSave = async () => {
    if (!periode.trim()) {
      toast.error('Periode investasi wajib diisi');
      return;
    }
    if (!jenisUsaha.trim()) {
      toast.error('Jenis usaha wajib diisi');
      return;
    }
    if (calculations.totalModal <= 0) {
      toast.error('Minimal harus ada 1 investor dengan modal lebih dari Rp 0');
      return;
    }

    setSaving(true);
    const payload = {
      periode: periode.trim(),
      jenis_usaha: jenisUsaha.trim(),
      hasil_usaha: hasilUsaha,
      status,
      catatan: catatan.trim(),
      investors: calculations.rows.map((row, idx) => ({
        namaInvestor: row.namaInvestor.trim() || `Investor ${idx + 1}`,
        modalSerta: row.modal,
        keterangan: row.keterangan || '',
      })),
    };

    try {
      if (editingId && !String(editingId).startsWith('local-')) {
        await api.put(`/investments/${editingId}`, payload);
        toast.success('Data investasi berhasil diperbarui!');
      } else if (!String(editingId).startsWith('local-')) {
        const res = await api.post('/investments', payload);
        setEditingId(res.id);
        toast.success('Data investasi berhasil disimpan!');
      } else {
        throw new Error('Local update');
      }
      loadInvestments();
    } catch {
      // Fallback local save
      const currentList = [...savedInvestments];
      const newId = editingId || `local-${Date.now()}`;
      const record = {
        id: newId,
        periode: payload.periode,
        jenisUsaha: payload.jenis_usaha,
        hasilUsaha: payload.hasil_usaha,
        totalModal: calculations.totalModal,
        status: payload.status,
        catatan: payload.catatan,
        totalInvestors: payload.investors.length,
        createdAt: new Date().toISOString(),
        investors: payload.investors.map((inv, idx) => ({
          id: `inv-${newId}-${idx}`,
          namaInvestor: inv.namaInvestor,
          modalSerta: inv.modalSerta,
          persentase: calculations.totalModal > 0 ? (inv.modalSerta / calculations.totalModal) * 100 : 0,
          bagiHasil: calculations.totalModal > 0 ? (inv.modalSerta / calculations.totalModal) * payload.hasil_usaha : 0,
          keterangan: inv.keterangan,
        })),
      };

      const existingIdx = currentList.findIndex((item) => item.id === newId);
      let updated;
      if (existingIdx !== -1) {
        updated = currentList.map((item, i) => (i === existingIdx ? record : item));
      } else {
        updated = [record, ...currentList];
      }
      setSavedInvestments(updated);
      saveToLocal(updated);
      setEditingId(newId);
      setIsUsingLocalStorage(true);
      toast.success('Data investasi tersimpan di perangkat lokal!');
    } finally {
      setSaving(false);
    }
  };

  // Edit from history
  const handleEditRecord = async (item) => {
    try {
      let fullData = item;
      if (!item.investors && !String(item.id).startsWith('local-')) {
        fullData = await api.get(`/investments/${item.id}`);
      }
      setEditingId(fullData.id);
      setPeriode(fullData.periode || '');
      setJenisUsaha(fullData.jenisUsaha || '');
      const h = fullData.hasilUsaha ?? 0;
      setHasilUsahaRaw(normalizeIdrTyping(String(Math.round(h))));
      setStatus(fullData.status || 'selesai');
      setCatatan(fullData.catatan || '');

      const loadedInvestors = (fullData.investors || []).map((inv, idx) => {
        const m = Number(inv.modalSerta) || 0;
        return {
          id: inv.id || `inv-${idx}`,
          namaInvestor: inv.namaInvestor || `Investor ${idx + 1}`,
          modalSertaRaw: normalizeIdrTyping(String(Math.round(m))),
          modalSerta: m,
          keterangan: inv.keterangan || '',
        };
      });

      if (loadedInvestors.length > 0) {
        setInvestors(loadedInvestors);
      }
      setActiveTab('form');
      toast.info(`Memuat investasi periode: ${fullData.periode}`);
    } catch (e) {
      toast.error(e.message || 'Gagal memuat data');
    }
  };

  // Delete from history
  const handleDeleteRecord = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Yakin ingin menghapus catatan investasi ini?')) return;
    try {
      if (!String(id).startsWith('local-')) {
        await api.delete(`/investments/${id}`);
      }
      const updated = savedInvestments.filter((item) => item.id !== id);
      setSavedInvestments(updated);
      saveToLocal(updated);
      if (editingId === id) {
        handleResetForm();
      }
      toast.success('Investasi berhasil dihapus');
    } catch {
      const updated = savedInvestments.filter((item) => item.id !== id);
      setSavedInvestments(updated);
      saveToLocal(updated);
      toast.success('Investasi berhasil dihapus dari penyimpanan');
    }
  };

  // Copy WhatsApp summary format
  const handleCopyWhatsApp = () => {
    if (calculations.rows.length === 0) {
      toast.info('Belum ada data investor untuk disalin');
      return;
    }

    const lines = [
      `*📊 LAPORAN BAGI HASIL INVESTASI - BATIK BINAR*`,
      `📅 *Periode:* ${periode || '—'}`,
      `🏭 *Usaha:* ${jenisUsaha || '—'}`,
      `💰 *Hasil Usaha:* ${formatIdr(hasilUsaha)}`,
      `💼 *Total Modal:* ${formatIdr(calculations.totalModal)}`,
      `👥 *Jumlah Investor:* ${calculations.investorCount} Orang`,
      `-----------------------------------------`,
      `*RINCIAN BAGI HASIL:*`,
    ];

    calculations.rows.forEach((row, i) => {
      if (row.namaInvestor.trim() || row.modal > 0) {
        lines.push(
          `${i + 1}. *${row.namaInvestor || `Investor ${i + 1}`}*` +
            `\n   • Modal: ${formatIdr(row.modal)} (${row.persentase.toFixed(2)}%)` +
            `\n   • Bagi Hasil: *${formatIdr(row.bagiHasil)}*` +
            (row.keterangan ? `\n   • Ket: ${row.keterangan}` : '')
        );
      }
    });

    lines.push(`-----------------------------------------`);
    lines.push(`*Total Terbagi:* ${formatIdr(calculations.totalBagiHasil)} (100%)`);
    if (catatan) lines.push(`📝 *Catatan:* ${catatan}`);
    lines.push(`_Dicetak pada: ${formatDate(new Date())}_`);

    const text = lines.join('\n');
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('Ringkasan format WhatsApp berhasil disalin ke clipboard!'))
      .catch(() => toast.error('Gagal menyalin ringkasan'));
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  // Filtered history
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return savedInvestments;
    const q = searchQuery.toLowerCase();
    return savedInvestments.filter(
      (item) =>
        (item.periode && item.periode.toLowerCase().includes(q)) ||
        (item.jenisUsaha && item.jenisUsaha.toLowerCase().includes(q))
    );
  }, [savedInvestments, searchQuery]);

  if (!manager) {
    return <p className="text-sm text-batik-indigo/60">Halaman ini khusus owner/supervisor.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-batik-ink">Investasi & Bagi Hasil Usaha</h1>
            {isUsingLocalStorage && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">
                <AlertCircle className="h-3 w-3" />
                Mode Lokal
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-batik-indigo/70">
            Perhitungan pembagian hasil usaha secara proporsional dan adil berdasarkan modal penyertaan masing-masing investor.
          </p>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'form'
                  ? 'bg-batik-indigo text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kalkulator & Form
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'history'
                  ? 'bg-batik-indigo text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Riwayat Tersimpan ({savedInvestments.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 rounded-xl border border-batik-gold/60 bg-amber-50/70 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
            title="Isi form dengan data contoh dari coretan sketsa kertas"
          >
            <Sparkles className="h-4 w-4 text-amber-600" />
            Contoh Sketsa Kertas
          </button>

          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
            title="Salin ringkasan bagi hasil untuk dikirim ke WhatsApp"
          >
            <Copy className="h-4 w-4 text-emerald-600" />
            Salin WA
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">BATIK BINAR INDRAMAYU</h1>
            <p className="text-xs text-slate-600">Laporan Sistem Bagi Hasil Investasi Usaha</p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>Tanggal Cetak: {formatDate(new Date())}</p>
            <p>Status: <span className="font-semibold uppercase">{status}</span></p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs border-t border-slate-200 pt-2">
          <div><span className="font-semibold">Periode:</span> {periode || '—'}</div>
          <div><span className="font-semibold">Jenis Usaha:</span> {jenisUsaha || '—'}</div>
          <div><span className="font-semibold">Hasil Usaha:</span> {formatIdr(hasilUsaha)}</div>
        </div>
      </div>

      {activeTab === 'form' ? (
        <>
          {/* Summary Metric Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total Modal Serta
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Coins className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-bold text-batik-ink">
                {formatIdr(calculations.totalModal)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Total akumulasi modal semua investor</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Hasil Usaha
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-bold text-emerald-700">
                {formatIdr(hasilUsaha)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Nominal keuntungan usaha yang dibagi</p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total Bagi Hasil
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <PieChart className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-bold text-batik-ink">
                {formatIdr(calculations.totalBagiHasil)}
              </p>
              <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                {calculations.totalModal > 0 ? '✓ 100% Terbagi Adil Sesuai Modal' : 'Menunggu input modal'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Jumlah Investor
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-bold text-batik-ink">
                {calculations.investorCount} <span className="text-sm font-normal text-slate-500">Orang</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-400">{investors.length} baris investor terdaftar</p>
            </div>
          </div>

          {/* Form Header: Periode, Jenis Usaha, Hasil Usaha */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-batik-ink">Parameter Investasi Usaha</h2>
                <p className="text-xs text-slate-500">
                  Isi data periode, bidang usaha, dan nominal hasil usaha yang akan dibagikan ke investor.
                </p>
              </div>
              {editingId && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                  Sedang Mengedit ID #{editingId}
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Periode <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value)}
                  placeholder="Misal: Januari 2025 / Q2 2025"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-batik-indigo focus:ring-2 focus:ring-batik-indigo/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Jenis Usaha <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={jenisUsaha}
                  onChange={(e) => setJenisUsaha(e.target.value)}
                  placeholder="Misal: Produksi Batik Tulis / Kain Sutra"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-batik-indigo focus:ring-2 focus:ring-batik-indigo/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Hasil Usaha (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={hasilUsahaRaw}
                    onChange={(e) => setHasilUsahaRaw(normalizeIdrTyping(e.target.value))}
                    placeholder="500.000"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm font-semibold text-emerald-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-batik-indigo focus:ring-2 focus:ring-batik-indigo/20"
                >
                  <option value="selesai">Selesai (Siap Dibagi)</option>
                  <option value="dibagikan">Sudah Dibagikan</option>
                  <option value="draft">Draft (Konsep)</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Misal: Penjelasan omset kotor, pemotongan bahan, atau no rekening transfer"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-batik-indigo focus:ring-2 focus:ring-batik-indigo/20"
              />
            </div>
          </section>

          {/* Table: Sistem Bagi Hasil (Mirip sketsa kertas user!) */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-col gap-2 p-5 border-b border-slate-200/80 bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-batik-ink">Sistem Bagi Hasil</h2>
                  <span className="rounded-full bg-batik-indigo/10 px-2.5 py-0.5 text-xs font-bold text-batik-indigo">
                    Dibagi Adil Berdasarkan Modal
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Rumus: <span className="font-mono font-medium text-slate-700">(Modal Investor / Total Modal) × Hasil Usaha</span>
                </p>
              </div>

              {/* Quick row addition */}
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => handleAddInvestor(1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  +1 Investor
                </button>
                <button
                  type="button"
                  onClick={() => handleAddInvestor(5)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  +5 Investor
                </button>
                <button
                  type="button"
                  onClick={() => handleAddInvestor(10)}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-100"
                  title="Tambah 10 investor berderet ke bawah"
                >
                  <Users className="h-3.5 w-3.5" />
                  +10 Investor
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 pl-4 pr-2 w-12 text-center">No</th>
                    <th className="py-3 px-3 min-w-[180px]">Nama Investor</th>
                    <th className="py-3 px-3 min-w-[180px]">Modal Serta (Rp)</th>
                    <th className="py-3 px-3 w-32 text-center">Porsi (%)</th>
                    <th className="py-3 px-3 min-w-[180px] text-right">Hasil / Bagi Hasil</th>
                    <th className="py-3 px-3 min-w-[160px] print:hidden">Keterangan / Rekening</th>
                    <th className="py-3 pr-4 pl-2 w-12 text-center print:hidden">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculations.rows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-4 pr-2 text-center font-medium text-slate-400 text-xs">
                        {idx + 1}
                      </td>

                      {/* Nama Investor */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.namaInvestor}
                          onChange={(e) => handleInvestorChange(row.id, 'namaInvestor', e.target.value)}
                          placeholder={`Investor ${idx + 1}`}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-batik-indigo focus:ring-1 focus:ring-batik-indigo print:border-none print:p-0"
                        />
                      </td>

                      {/* Modal Serta */}
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-slate-400 font-medium">
                            Rp
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.modalSertaRaw}
                            onChange={(e) => handleInvestorChange(row.id, 'modalSertaRaw', e.target.value)}
                            placeholder="0"
                            className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2.5 text-sm font-medium text-slate-900 outline-none focus:border-batik-indigo focus:ring-1 focus:ring-batik-indigo print:border-none print:p-0"
                          />
                        </div>
                      </td>

                      {/* Porsi (%) */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-semibold text-slate-700">
                            {row.persentase.toFixed(2)}%
                          </span>
                          {row.persentase > 0 && (
                            <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 print:hidden">
                              <div
                                className="h-full bg-batik-indigo rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, row.persentase))}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Hasil / Bagi Hasil */}
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-bold text-emerald-700 text-sm">
                          {formatIdr(row.bagiHasil)}
                        </span>
                      </td>

                      {/* Keterangan */}
                      <td className="py-2.5 px-3 print:hidden">
                        <input
                          type="text"
                          value={row.keterangan || ''}
                          onChange={(e) => handleInvestorChange(row.id, 'keterangan', e.target.value)}
                          placeholder="No rek / catatan..."
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 outline-none focus:border-batik-indigo"
                        />
                      </td>

                      {/* Action */}
                      <td className="py-2.5 pr-4 pl-2 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => handleRemoveInvestor(row.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus investor ini"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Table Footer: Total */}
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-800 text-sm">
                    <td colSpan={2} className="py-3.5 pl-4 pr-3 text-left">
                      TOTAL SISTEM BAGI HASIL
                    </td>
                    <td className="py-3.5 px-3 text-left text-batik-ink">
                      {formatIdr(calculations.totalModal)}
                    </td>
                    <td className="py-3.5 px-3 text-center text-batik-ink">
                      {calculations.totalModal > 0 ? '100.00%' : '0.00%'}
                    </td>
                    <td className="py-3.5 px-3 text-right text-emerald-800 text-base font-extrabold">
                      {formatIdr(calculations.totalBagiHasil)}
                    </td>
                    <td colSpan={2} className="py-3.5 px-3 text-xs text-slate-500 print:hidden font-normal">
                      {calculations.totalBagiHasil > 0 && hasilUsaha > 0 ? (
                        <span className="text-emerald-700 font-medium">✓ Sesuai Hasil Usaha</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col gap-3 p-4 bg-slate-50/80 border-t border-slate-200 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddInvestor(1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4 text-slate-600" />
                  Tambah Baris Investor
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                  Reset Form
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-batik-indigo px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-batik-teal disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Menyimpan...' : editingId ? 'Perbarui Investasi' : 'Simpan Pembagian Hasil'}
                </button>
              </div>
            </div>
          </section>

          {/* Printable Signatures */}
          <div className="hidden print:grid grid-cols-2 gap-8 mt-12 pt-6 text-xs text-center">
            <div>
              <p className="text-slate-500">Dibuat & Dihitung Oleh,</p>
              <div className="h-20" />
              <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-[160px]">
                Supervisor / Pengelola
              </p>
            </div>
            <div>
              <p className="text-slate-500">Disetujui Oleh,</p>
              <div className="h-20" />
              <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 inline-block min-w-[160px]">
                Owner Batik Binar
              </p>
            </div>
          </div>
        </>
      ) : (
        /* History Tab */
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-batik-ink">Riwayat Investasi Tersimpan</h2>
              <p className="text-xs text-slate-500">
                Daftar pembagian hasil periode sebelumnya yang telah disimpan di database.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari periode / usaha..."
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-batik-indigo"
              />
            </div>
          </div>

          {loadingList ? (
            <div className="py-12 text-center text-sm text-slate-400">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-batik-indigo mb-2" />
              Memuat data riwayat investasi...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">Belum ada riwayat investasi</p>
              <p className="mt-1 text-xs text-slate-400">
                Gunakan tab &quot;Kalkulator &amp; Form&quot; untuk membuat dan menyimpan pembagian hasil investasi baru.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3">Periode</th>
                    <th className="py-3 px-3">Jenis Usaha</th>
                    <th className="py-3 px-3 text-right">Hasil Usaha</th>
                    <th className="py-3 px-3 text-right">Total Modal</th>
                    <th className="py-3 px-3 text-center">Investor</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => handleEditRecord(item)}
                      className="cursor-pointer hover:bg-slate-50/80 transition"
                    >
                      <td className="py-3 px-3 font-semibold text-batik-ink">
                        {item.periode}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {item.jenisUsaha}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        {formatIdr(item.hasilUsaha)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {formatIdr(item.totalModal)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {item.totalInvestors || item.investors?.length || 0} Orang
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                            item.status === 'selesai'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.status === 'dibagikan'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleEditRecord(item)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-batik-indigo hover:bg-slate-50"
                          >
                            Buka / Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteRecord(item.id, e)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
