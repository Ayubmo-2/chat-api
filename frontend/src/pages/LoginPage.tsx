import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';

const s = {
  page: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' } as const,
  card: { background: '#1a1d27', padding: '2rem', borderRadius: '12px', width: '360px', display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  title: { fontSize: '1.5rem', fontWeight: 700, textAlign: 'center' as const },
  input: { padding: '0.75rem', borderRadius: '8px', border: '1px solid #2d3748', background: '#0f1117', color: '#e2e8f0', fontSize: '1rem', width: '100%' },
  btn: { padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' },
  toggle: { textAlign: 'center' as const, fontSize: '0.875rem', color: '#a0aec0', cursor: 'pointer' },
  error: { color: '#fc8181', fontSize: '0.875rem', textAlign: 'center' as const },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body = isRegister ? { username, email, password } : { email, password };
      const res = await apiFetch(`/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong');
        return;
      }

      const { accessToken, refreshToken } = await res.json();
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      navigate('/rooms');
    } catch {
      setError('Network error. Is the API server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <form style={s.card} onSubmit={handleSubmit}>
        <div style={s.title}>{isRegister ? 'Create account' : 'Sign in'}</div>
        {isRegister && (
          <input
            style={s.input}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        <input
          style={s.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={s.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div style={s.error}>{error}</div>}
        <button style={s.btn} type="submit" disabled={loading}>
          {loading ? 'Loading...' : isRegister ? 'Register' : 'Login'}
        </button>
        <div style={s.toggle} onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
        </div>
      </form>
    </div>
  );
}
