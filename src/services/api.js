const RAW = (import.meta.env.VITE_API_URL || 'https://api.kingcreativestudio.my.id/manajemen-produksi-batik/api').replace(/\/$/, '');
// const RAW = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

/** Origin server (tanpa /api) untuk file statis /uploads */
export function getApiOrigin() {
  if (RAW.endsWith('/api')) return RAW.slice(0, -4) || RAW;
  return RAW;
}

export function assetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${getApiOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildUrl(path) {
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${RAW}${p}`;
}

/**
 * @param {string} method
 * @param {string} path
 * @param {object} [options]
 * @param {unknown} [options.body] — object untuk JSON, atau FormData
 * @param {string} [options.token]
 * @param {boolean} [options.isFormData]
 */
export async function apiRequest(method, path, options = {}) {
  const { body, token, isFormData } = options;
  const headers = {};
  const auth = token ?? localStorage.getItem('token');
  if (auth) headers.Authorization = `Bearer ${auth}`;
  if (body != null && !isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(buildUrl(path), {
    method,
    headers,
    body: body == null ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = typeof data === 'object' && data?.message ? data.message : res.statusText;
    throw new Error(msg || 'Permintaan gagal');
  }
  return data;
}

export const api = {
  get: (path, opts) => apiRequest('GET', path, opts),
  post: (path, body, opts) => apiRequest('POST', path, { ...opts, body }),
  postForm: (path, formData, opts) =>
    apiRequest('POST', path, { ...opts, body: formData, isFormData: true }),
  put: (path, body, opts) => apiRequest('PUT', path, { ...opts, body }),
  patch: (path, body, opts) => apiRequest('PATCH', path, { ...opts, body }),
  delete: (path, opts) => apiRequest('DELETE', path, opts),
  download: async (path, opts = {}) => {
    const headers = {};
    const auth = opts.token ?? localStorage.getItem('token');
    if (auth) headers.Authorization = `Bearer ${auth}`;
    const res = await fetch(buildUrl(path), {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      const msg = typeof data === 'object' && data?.message ? data.message : res.statusText;
      throw new Error(msg || 'Permintaan gagal');
    }
    return res.blob();
  },
};
