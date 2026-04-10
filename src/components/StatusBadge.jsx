const styles = {
  pending: 'bg-amber-100 text-amber-900 ring-amber-200',
  progress: 'bg-sky-100 text-sky-900 ring-sky-200',
  done: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
};

const labels = {
  pending: 'Menunggu',
  progress: 'Berjalan',
  done: 'Selesai',
};

export function StatusBadge({ status }) {
  const s = styles[status] || 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${s}`}
    >
      {labels[status] || status}
    </span>
  );
}
