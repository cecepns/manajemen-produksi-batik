import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { formatIdr } from '../utils/formatMoney';

const baseItems = [
  { key: 'bahanUtama', label: 'Biaya bahan utama' },
  { key: 'bahanPendukung', label: 'Biaya bahan pendukung' },
  { key: 'pekerjaanCap', label: 'Biaya pekerjaan cap' },
  { key: 'pekerjaanLain1', label: 'Biaya pekerjaan lain 1' },
  { key: 'pekerjaanLain2', label: 'Biaya pekerjaan lain 2' },
  { key: 'finishing', label: 'Biaya finishing' },
  { key: 'jahit', label: 'Biaya jahit' },
  { key: 'packing', label: 'Biaya packing' },
  { key: 'ongkir', label: 'Biaya ongkir' },
  { key: 'lainLain', label: 'Biaya lain-lain' },
];

const defaults = Object.fromEntries(baseItems.map((i) => [i.key, '']));

export function HppCalculatorPage() {
  const { manager } = useOutletContext();
  const [form, setForm] = useState(defaults);
  const [qty, setQty] = useState('1');
  const [marginPercent, setMarginPercent] = useState('30');

  const summary = useMemo(() => {
    const totalBiaya = baseItems.reduce((acc, item) => acc + (Number(form[item.key]) || 0), 0);
    const jumlahProduksi = Math.max(1, Number(qty) || 1);
    const hppPerUnit = totalBiaya / jumlahProduksi;
    const margin = Math.max(0, Number(marginPercent) || 0);
    const saranHargaJual = hppPerUnit * (1 + margin / 100);
    return { totalBiaya, jumlahProduksi, hppPerUnit, margin, saranHargaJual };
  }, [form, qty, marginPercent]);

  if (!manager) {
    return <p className="text-sm text-batik-indigo/60">Halaman ini khusus owner/supervisor.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-batik-ink">Kalkulator HPP</h1>
        <p className="text-sm text-batik-indigo/70">
          Hitung harga pokok produksi per batch dan per unit, lalu dapatkan saran harga jual.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          {baseItems.map((item) => (
            <div key={item.key}>
              <label className="block text-sm font-medium text-batik-ink">{item.label}</label>
              <input
                type="number"
                min={0}
                step={100}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2"
                value={form[item.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [item.key]: e.target.value }))}
                placeholder="0"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-batik-ink">Jumlah produksi (unit)</label>
            <input
              type="number"
              min={1}
              step={1}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-batik-ink">Target margin (%)</label>
            <input
              type="number"
              min={0}
              step={1}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-batik-teal/30 focus:ring-2"
              value={marginPercent}
              onChange={(e) => setMarginPercent(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Total biaya produksi" value={formatIdr(summary.totalBiaya)} />
        <Card label="Jumlah produksi" value={`${summary.jumlahProduksi} unit`} />
        <Card label="HPP per unit" value={formatIdr(summary.hppPerUnit)} />
        <Card
          label={`Saran harga jual (+${summary.margin}%)`}
          value={formatIdr(summary.saranHargaJual)}
        />
      </section>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-batik-ink">{value}</p>
    </article>
  );
}
