import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../constants/routes';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || ROUTES.dashboard;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Gagal masuk');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-batik-indigo via-batik-teal to-batik-ink p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 shadow-xl backdrop-blur">
        <h1 className="text-center text-2xl font-bold text-batik-ink">Batik Binar Indramayu</h1>
        <p className="mt-1 text-center text-sm text-batik-indigo/70">Masuk dengan username & password</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-batik-ink">
              Username
            </label>
            <input
              id="username"
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-batik-ink outline-none ring-batik-teal/30 focus:ring-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-batik-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-batik-ink outline-none ring-batik-teal/30 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-batik-indigo py-3 text-sm font-semibold text-white transition hover:bg-batik-teal disabled:opacity-60"
          >
            {submitting ? 'Memproses…' : 'Masuk'}
          </button>
        </form>
        {/* <p className="mt-6 text-center text-xs text-batik-indigo/50">
          Demo: owner / owner123 · supervisor / super123 · worker / worker123
        </p> */}
      </div>
    </div>
  );
}
