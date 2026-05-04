export function formatIdr(n) {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  const rounded = Math.round(num * 100) / 100;
  const isWhole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(rounded);
}

/** Pemisah ribuan titik, desimal koma (contoh: 10.000,50) */
function formatThousandsInt(intStr) {
  const s = String(intStr).replace(/\D/g, '');
  if (!s) return '';
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Normalisasi input nominal saat diketik (IDR): digit + titik ribuan, opsional desimal koma.
 */
export function normalizeIdrTyping(raw) {
  const s = String(raw ?? '');
  const lastComma = s.lastIndexOf(',');
  let left;
  let right = '';
  if (lastComma !== -1) {
    left = s.slice(0, lastComma);
    right = s.slice(lastComma + 1).replace(/\D/g, '').slice(0, 2);
  } else {
    left = s;
  }
  const digitsOnly = left.replace(/\D/g, '');
  if (!digitsOnly && !right) return '';
  const trimmed = digitsOnly.replace(/^0+(?=\d)/, '') || (digitsOnly.includes('0') ? '0' : '');
  const intPart = trimmed === '' && digitsOnly ? '0' : trimmed || '';
  if (!intPart && !right) return '';
  const intFmt = intPart ? formatThousandsInt(intPart) : '0';
  return right ? `${intFmt},${right}` : intFmt;
}

/**
 * Parse string nominal format Indonesia ke angka (untuk API).
 */
export function parseIdrInput(str) {
  if (str == null || String(str).trim() === '') return NaN;
  const s = String(str).trim();
  const lastComma = s.lastIndexOf(',');
  let intRaw;
  let decRaw = '';
  if (lastComma !== -1) {
    intRaw = s.slice(0, lastComma).replace(/\D/g, '');
    decRaw = s.slice(lastComma + 1).replace(/\D/g, '').slice(0, 2);
  } else {
    intRaw = s.replace(/\D/g, '');
  }
  if (!intRaw && !decRaw) return NaN;
  const core = decRaw ? `${intRaw || '0'}.${decRaw}` : intRaw || '0';
  const n = Number(core);
  return Number.isFinite(n) ? n : NaN;
}
