import { StatusBadge } from './StatusBadge';
import { formatDateTime } from '../utils/formatDate';
import { formatIdr } from '../utils/formatMoney';

export function WorkflowTimeline({ steps }) {
  if (!steps?.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
        Belum ada tugas produksi.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0 border-l-2 border-slate-200 pl-6">
      {steps.map((step, i) => (
        <li key={step.id} className="mb-8 ml-1 last:mb-0">
          <span className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full border-2 border-slate-300 bg-white shadow-sm ring-2 ring-white" />
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tahap {i + 1}
                </p>
                <h3 className="text-lg font-semibold text-slate-900">{step.nama_step}</h3>
              </div>
              <StatusBadge status={step.status} />
            </div>
            <dl className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-400">Pekerja</dt>
                <dd className="font-medium text-slate-800">{step.assigned_username || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Cuaca</dt>
                <dd className="capitalize">{step.cuaca || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-400">Keterangan</dt>
                <dd>{step.keterangan?.trim() || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Harga</dt>
                <dd>{formatIdr(step.harga_pekerjaan)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Mulai</dt>
                <dd>{formatDateTime(step.tanggal_mulai)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-400">Selesai</dt>
                <dd>{formatDateTime(step.tanggal_selesai)}</dd>
              </div>
            </dl>
          </div>
        </li>
      ))}
    </ol>
  );
}
