export function formatDate(d) {
  if (!d) return '—';
  let x = d;
  if (typeof d === 'string') {
    const ymd = d.slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    if (m) {
      x = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    } else {
      x = ymd;
    }
  }
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(x));
  } catch {
    return String(d);
  }
}

export function formatDateTime(d) {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(d));
  } catch {
    return String(d);
  }
}
