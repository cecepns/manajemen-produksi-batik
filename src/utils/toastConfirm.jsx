import { toast } from 'react-toastify';

/**
 * Konfirmasi aksi (mis. hapus) lewat toast — bukan window.confirm.
 */
export function confirmWithToast(message, onConfirm, options = {}) {
  const { confirmText = 'Hapus', cancelText = 'Batal' } = options;

  toast(
    ({ closeToast }) => (
      <div className="text-sm text-slate-800">
        <p className="mb-3 max-w-xs pr-2 font-medium leading-snug">{message}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => closeToast()}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
            onClick={() => {
              closeToast();
              onConfirm();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    ),
    {
      autoClose: false,
      closeOnClick: false,
      closeButton: true,
      draggable: false,
    }
  );
}
