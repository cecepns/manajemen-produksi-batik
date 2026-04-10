export function formatDate(d) {
  if (!d) return '—';
  const x = typeof d === 'string' ? d.slice(0, 10) : d;
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
