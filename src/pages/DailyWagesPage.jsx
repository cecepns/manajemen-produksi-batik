import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { format, isValid, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';
import { toast } from 'react-toastify';
import { Trash2 } from 'lucide-react';
import Select from 'react-select';
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

const PRESET_AMOUNTS = [1700, 5000, 7500, 10000, 15000, 17000, 20000, 25000, 50000];

/** @type {import('react-select').StylesConfig<{ value: string; label: string }, false>} */
const workerSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 38,
    borderRadius: '0.5rem',
    borderColor: state.isFocused ? 'rgb(45 212 191 / 0.45)' : 'rgb(226 232 240)',
    boxShadow: state.isFocused ? '0 0 0 2px rgb(20 184 166 / 0.25)' : 'none',
    '&:hover': { borderColor: 'rgb(203 213 225)' },
    fontSize: '0.875rem',
  }),
  valueContainer: (base) => ({ ...base, padding: '2px 10px' }),
  placeholder: (base) => ({ ...base, color: 'rgb(148 163 184)' }),
  menu: (base) => ({ ...base, zIndex: 50, borderRadius: '0.5rem', overflow: 'hidden' }),
  menuList: (base) => ({ ...base, padding: 4 }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.875rem',
    borderRadius: '0.375rem',
    backgroundColor: state.isSelected
      ? 'rgb(79 70 229)'
      : state.isFocused
        ? 'rgb(240 253 250)'
        : 'transparent',
    color: state.isSelected ? 'white' : 'rgb(15 23 42)',
  }),
  singleValue: (base) => ({ ...base, color: 'rgb(15 23 42)' }),
};

export function DailyWagesPage() {
  const { manager } = useOutletContext();
  const [workers, setWorkers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [totalIncluded, setTotalIncluded] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 7) + '-01');
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [workerFilter, setWorkerFilter] = useState('');
  const [form, setForm] = useState({
    work_date: new Date().toISOString().slice(0, 10),
    worker_id: '',
    jenis_pekerjaan: '',
    amount: '',
    included_in_total: true,
  });
  const [saving, setSaving] = useState(false);

  const workerOptions = useMemo(
    () =>
      workers.map((w) => ({
        value: String(w.id),
        label: w.username,
      })),
    [workers]
  );

  const workerFilterOptions = useMemo(
    () => [{ value: '', label: 'Semua pekerja' }, ...workerOptions],
    [workerOptions]
  );

  const formWorkerValue = useMemo(
    () => workerOptions.find((o) => o.value === form.worker_id) ?? null,
    [workerOptions, form.worker_id]
  );

  const filterWorkerValue = useMemo(
    () => workerFilterOptions.find((o) => o.value === workerFilter) ?? workerFilterOptions[0],
    [workerFilterOptions, workerFilter]
  );

  const load = useCallback(async () => {
    if (!manager) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      if (workerFilter) q.set('worker_id', workerFilter);
      const data = await api.get(`/daily-wages?${q.toString()}`);
      setEntries(data.data || []);
      setTotalIncluded(data.totalIncluded ?? 0);
      setTotalAll(data.totalAll ?? 0);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [manager, from, to, workerFilter]);

  useEffect(() => {
    if (!manager) return;
    (async () => {
      try {
        const w = await api.get('/users/workers');
        setWorkers(w);
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
    if (!form.work_date?.trim()) {
      toast.error('Tanggal wajib diisi');
      return;
    }
    if (!form.worker_id || !form.amount) {
      toast.error('Pekerja dan nominal wajib');
      return;
    }
    setSaving(true);
    try {
      await api.post('/daily-wages', {
        work_date: form.work_date,
        worker_id: Number(form.worker_id),
        jenis_pekerjaan: form.jenis_pekerjaan,
        amount: Number(form.amount),
        included_in_total: form.included_in_total,
      });
      toast.success('Entri tersimpan');
      setForm((f) => ({
        ...f,
        jenis_pekerjaan: '',
        amount: '',
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
      await api.patch(`/daily-wages/${row.id}`, {
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
      await api.delete(`/daily-wages/${id}`);
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
        <h1 className="text-2xl font-bold text-batik-ink">Gaji harian pegawai</h1>
        <p className="text-sm text-batik-indigo/70">
          Catat pekerjaan per hari, centang masuk total, lihat ringkasan di bawah.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-batik-ink">Entri baru</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <WageDatePicker
            label="Tanggal"
            labelClassName="text-xs font-medium text-slate-600"
            inputId="daily-wage-work-date"
            valueYmd={form.work_date}
            onChangeYmd={(v) => setForm((f) => ({ ...f, work_date: v }))}
          />
          <div className="min-w-0">
            <label className="text-xs font-medium text-slate-600" htmlFor="daily-wage-worker">
              Nama pekerja
            </label>
            <Select
              inputId="daily-wage-worker"
              instanceId="daily-wage-worker"
              className="mt-1"
              classNamePrefix="rs-worker"
              options={workerOptions}
              value={formWorkerValue}
              onChange={(opt) =>
                setForm((f) => ({ ...f, worker_id: opt ? opt.value : '' }))
              }
              placeholder="Pilih karyawan…"
              isClearable
              isSearchable
              noOptionsMessage={() => 'Tidak ada karyawan'}
              styles={workerSelectStyles}
              menuPlacement="auto"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="text-xs font-medium text-slate-600">Jenis pekerjaan</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.jenis_pekerjaan}
              onChange={(e) => setForm((f) => ({ ...f, jenis_pekerjaan: e.target.value }))}
              placeholder="Contoh: pewarnaan, ngelem, finishing"
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
            Masukkan ke total (centang)
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-batik-indigo px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Menyimpan…' : 'Simpan entri'}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-batik-teal/15 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-batik-ink">Filter & daftar</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
          <WageDatePicker
            label="Dari"
            labelClassName="text-xs text-slate-500"
            inputId="daily-wage-filter-from"
            valueYmd={from}
            onChangeYmd={setFrom}
            maxDate={parseYmd(to) ?? undefined}
          />
          <WageDatePicker
            label="Sampai"
            labelClassName="text-xs text-slate-500"
            inputId="daily-wage-filter-to"
            valueYmd={to}
            onChangeYmd={setTo}
            minDate={parseYmd(from) ?? undefined}
          />
          <div className="min-w-0">
            <label className="text-xs text-slate-500" htmlFor="daily-wage-filter-worker">
              Pekerja
            </label>
            <Select
              inputId="daily-wage-filter-worker"
              instanceId="daily-wage-filter-worker"
              className="mt-1"
              classNamePrefix="rs-worker-filter"
              options={workerFilterOptions}
              value={filterWorkerValue}
              onChange={(opt) => setWorkerFilter(opt ? opt.value : '')}
              isSearchable
              noOptionsMessage={() => 'Tidak ada'}
              styles={workerSelectStyles}
              menuPlacement="auto"
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-teal-800/80">
              Total (hanya yang dicentang)
            </p>
            <p className="mt-1 text-2xl font-bold text-teal-900">{formatIdr(totalIncluded)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Total semua entri (filter)
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{formatIdr(totalAll)}</p>
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
                  <th className="px-3 py-2">Pekerja</th>
                  <th className="px-3 py-2">Jenis</th>
                  <th className="px-3 py-2">Nominal</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.work_date)}</td>
                    <td className="px-3 py-2">{row.worker_username}</td>
                    <td className="px-3 py-2 text-slate-600">{row.jenis_pekerjaan || '—'}</td>
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

function WageDatePicker({
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
