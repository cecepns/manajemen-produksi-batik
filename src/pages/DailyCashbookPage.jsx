import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { format, isValid, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';
import { toast } from 'react-toastify';
import { Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { formatDate } from '../utils/formatDate';
import { formatIdr } from '../utils/formatMoney';
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

function todayYmdLocal() {
  return format(new Date(), 'yyyy-MM-dd');
}

function currentMonthStartYmdLocal() {
  return `${format(new Date(), 'yyyy-MM')}-01`;
}

const PRESET_AMOUNTS = [1700, 5000, 7500, 10000, 15000, 17000, 20000, 25000, 50000];

export function DailyCashbookPage() {
  const { manager } = useOutletContext();
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [pemasukanIncluded, setPemasukanIncluded] = useState(0);
  const [pengeluaranIncluded, setPengeluaranIncluded] = useState(0);
  const [saldoIncluded, setSaldoIncluded] = useState(0);
  const [pemasukanAll, setPemasukanAll] = useState(0);
  const [pengeluaranAll, setPengeluaranAll] = useState(0);
  const [saldoAll, setSaldoAll] = useState(0);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => currentMonthStartYmdLocal());
  const [to, setTo] = useState(() => todayYmdLocal());
  const [categoryFilter, setCategoryFilter] = useState('');
  const [form, setForm] = useState({
    entry_date: todayYmdLocal(),
    category_code: '',
    amount: '',
    note: '',
    included_in_total: true,
  });
  const [saving, setSaving] = useState(false);

  const pemasukanCats = useMemo(
    () => categories.filter((c) => c.flow === 'in'),
    [categories]
  );
  const pengeluaranCats = useMemo(
    () => categories.filter((c) => c.flow === 'out'),
    [categories]
  );

  const load = useCallback(async () => {
    if (!manager) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      if (categoryFilter) q.set('category_code', categoryFilter);
      const data = await api.get(`/daily-cashbook?${q.toString()}`);
      setEntries(data.data || []);
      setPemasukanIncluded(data.pemasukanIncluded ?? 0);
      setPengeluaranIncluded(data.pengeluaranIncluded ?? 0);
      setSaldoIncluded(data.saldoIncluded ?? 0);
      setPemasukanAll(data.pemasukanAll ?? 0);
      setPengeluaranAll(data.pengeluaranAll ?? 0);
      setSaldoAll(data.saldoAll ?? 0);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [manager, from, to, categoryFilter]);

  useEffect(() => {
    if (!manager) return;
    (async () => {
      try {
        const meta = await api.get('/daily-cashbook/meta');
        const cats = meta.categories || [];
        setCategories(cats);
        setForm((f) =>
          f.category_code || !cats.length ? f : { ...f, category_code: cats[0].code }
        );
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, [manager]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.entry_date?.trim()) {
      toast.error('Tanggal wajib diisi');
      return;
    }
    if (!form.category_code || !form.amount) {
      toast.error('Kategori dan nominal wajib');
      return;
    }
    setSaving(true);
    try {
      await api.post('/daily-cashbook', {
        entry_date: form.entry_date,
        category_code: form.category_code,
        amount: Number(form.amount),
        note: form.note || null,
        included_in_total: form.included_in_total,
      });
      toast.success('Entri tersimpan');
      setForm((f) => ({
        ...f,
        amount: '',
        note: '',
      }));
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleIncluded(row) {
    try {
      await api.patch(`/daily-cashbook/${row.id}`, {
        included_in_total: !row.included_in_total,
      });
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function removeRow(id) {
    if (!confirm('Hapus entri ini?')) return;
    try {
      await api.delete(`/daily-cashbook/${id}`);
      toast.success('Dihapus');
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (!manager) {
    return <p className="text-sm text-batik-indigo/60">Hanya owner/supervisor.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-batik-ink">Kas harian</h1>
        <p className="text-sm text-batik-indigo/70">
          Catat pemasukan dan pengeluaran per kategori (mirip kalkulator HPP), simpan per tanggal,
          lalu ringkas dengan filter dan daftar.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-batik-ink">Entri baru</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CashDatePicker
            label="Tanggal"
            labelClassName="text-xs font-medium text-slate-600"
            inputId="cash-entry-date"
            valueYmd={form.entry_date}
            onChangeYmd={(v) => setForm((f) => ({ ...f, entry_date: v }))}
          />
          <div className="min-w-0 sm:col-span-2 lg:col-span-3">
            <label className="text-xs font-medium text-slate-600" htmlFor="cash-category">
              Kategori
            </label>
            <select
              id="cash-category"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={form.category_code}
              onChange={(e) => setForm((f) => ({ ...f, category_code: e.target.value }))}
            >
              {categories.length === 0 ? (
                <option value="">Memuat kategori…</option>
              ) : (
                <>
                  <optgroup label="Pemasukan">
                    {pemasukanCats.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Pengeluaran / gaji">
                    {pengeluaranCats.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="text-xs font-medium text-slate-600">Catatan (opsional)</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Mis. shift, referensi bon…"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs font-medium text-slate-600">Nominal cepat</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setForm((f) => ({ ...f, amount: String(a) }))}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  Number(form.amount) === a
                    ? 'border-batik-teal bg-teal-50 text-batik-teal'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-batik-teal/40'
                }`}
              >
                {formatIdr(a)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="min-w-[10rem] flex-1">
            <label className="text-xs font-medium text-slate-600">Nominal (manual)</label>
            <input
              type="number"
              min={0}
              step={100}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.included_in_total}
              onChange={(e) =>
                setForm((f) => ({ ...f, included_in_total: e.target.checked }))
              }
            />
            Hitung ke saldo (dicentang)
          </label>
          <button
            type="submit"
            disabled={saving || !categories.length}
            className="rounded-xl bg-batik-indigo px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Menyimpan…' : 'Simpan entri'}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-batik-ink">Filter & ringkasan</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
          <CashDatePicker
            label="Dari"
            labelClassName="text-xs text-slate-500"
            inputId="cash-filter-from"
            valueYmd={from}
            onChangeYmd={setFrom}
            maxDate={parseYmd(to) ?? undefined}
          />
          <CashDatePicker
            label="Sampai"
            labelClassName="text-xs text-slate-500"
            inputId="cash-filter-to"
            valueYmd={to}
            onChangeYmd={setTo}
            minDate={parseYmd(from) ?? undefined}
          />
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500" htmlFor="cash-filter-cat">
              Kategori (filter)
            </label>
            <select
              id="cash-filter-cat"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Semua kategori</option>
              <optgroup label="Pemasukan">
                {pemasukanCats.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Pengeluaran / gaji">
                {pengeluaranCats.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-900/75">
              Pemasukan (dicentang)
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-900">{formatIdr(pemasukanIncluded)}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-900/75">
              Pengeluaran (dicentang)
            </p>
            <p className="mt-1 text-xl font-bold text-amber-900">{formatIdr(pengeluaranIncluded)}</p>
          </div>
          <div className="rounded-xl border border-batik-teal/25 bg-teal-50/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-teal-900/80">Saldo (dicentang)</p>
            <p className="mt-1 text-xl font-bold text-teal-950">{formatIdr(saldoIncluded)}</p>
            <p className="mt-1 text-[11px] text-teal-900/70">Pemasukan − pengeluaran</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-[11px] font-medium uppercase text-slate-500">Semua pemasukan (filter)</p>
            <p className="text-lg font-semibold text-slate-800">{formatIdr(pemasukanAll)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-[11px] font-medium uppercase text-slate-500">Semua pengeluaran (filter)</p>
            <p className="text-lg font-semibold text-slate-800">{formatIdr(pengeluaranAll)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-[11px] font-medium uppercase text-slate-500">Saldo semua entri (filter)</p>
            <p className="text-lg font-semibold text-slate-800">{formatIdr(saldoAll)}</p>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-batik-indigo/60">Memuat…</p>
        ) : entries.length === 0 ? (
          <p className="mt-6 text-sm text-batik-indigo/60">Belum ada data di rentang ini.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Tgl</th>
                  <th className="px-3 py-2">Kategori</th>
                  <th className="px-3 py-2">Arah</th>
                  <th className="px-3 py-2">Catatan</th>
                  <th className="px-3 py-2">Nominal</th>
                  <th className="px-3 py-2">Hitung</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.entry_date)}</td>
                    <td className="px-3 py-2">{row.category_label}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          row.flow_type === 'in'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {row.flow_type === 'in' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2 text-slate-600">
                      {row.note?.trim() || '—'}
                    </td>
                    <td className="px-3 py-2 font-medium">{formatIdr(row.amount)}</td>
                    <td className="px-3 py-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={!!row.included_in_total}
                          onChange={() => toggleIncluded(row)}
                        />
                        <span className="text-xs">hitung</span>
                      </label>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CashDatePicker({
  label,
  labelClassName,
  inputId,
  valueYmd,
  onChangeYmd,
  minDate,
  maxDate,
}) {
  return (
    <div className="w-full min-w-0">
      <label htmlFor={inputId} className={`block ${labelClassName}`}>
        {label}
      </label>
      <DatePicker
        id={inputId}
        selected={parseYmd(valueYmd)}
        onChange={(d) => onChangeYmd(toYmd(d))}
        dateFormat="d MMMM yyyy"
        locale="id"
        placeholderText="Pilih tanggal"
        minDate={minDate}
        maxDate={maxDate}
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
