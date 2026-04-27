import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/authApi.js';
import GitHubLoginButton from '../../components/GitHubLoginButton/GitHubLoginButton.jsx';
import BackButton from '../../components/BackButton/BackButton.jsx';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authApi.login(formData);
      
      // Check if there's a pending workspace invite
      const pendingInvite = localStorage.getItem('pendingInvite');
      if (pendingInvite) {
        localStorage.removeItem('pendingInvite');
        navigate(`/join/${pendingInvite}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-login">
      <div className="auth-layout">
        <aside className="auth-intro-panel">
          <div className="auth-kicker">CodeLens AI</div>
          <h1>Review code with clear, structured AI feedback.</h1>
          <p className="auth-intro-copy">
            Sign in to paste code, review GitHub pull requests, and get explanations that help you understand the why behind every suggestion.
          </p>

          <div className="auth-value-grid">
            <div className="auth-value-card">
              <span className="auth-value-label">What you can do</span>
              <strong>Paste code or import a PR</strong>
            </div>
            <div className="auth-value-card">
              <span className="auth-value-label">How it helps</span>
              <strong>Compare personas and learn step by step</strong>
            </div>
            <div className="auth-value-card">
              <span className="auth-value-label">What you keep</span>
              <strong>History, settings, and workspace invites</strong>
            </div>
          </div>

          <div className="auth-steps">
            <div className="auth-step">
              <span>1</span>
              <p>Sign in with email or GitHub.</p>
            </div>
            <div className="auth-step">
              <span>2</span>
              <p>Choose a persona or Socratic mode.</p>
            </div>
            <div className="auth-step">
              <span>3</span>
              <p>Review code, save history, and join workspaces.</p>
            </div>
          </div>
        </aside>

        <section className="auth-card">
          <BackButton fallback="/" />
          <div className="auth-header">
            <div className="auth-logo">
              Code<span className="logo-accent">Lens</span> AI
            </div>
            <p className="auth-subtitle">Welcome back. Pick the fastest path to your next review.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error auth-error-banner">{error}</div>}

            <div className="auth-field">
              <label htmlFor="email" className="auth-label">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                className="auth-input"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password" className="auth-label">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                className="auth-input"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <div className="auth-forgot-wrap">
                <Link to="/forgot-password" className="auth-forgot-link">Forgot password?</Link>
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <p className="auth-helper-text">You’ll land on your dashboard and can continue any pending workspace invite automatically.</p>
          </form>

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <div className="auth-divider-text">or</div>
            <div className="auth-divider-line" />
          </div>

          <GitHubLoginButton />

          <div className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register" className="auth-footer-link">Register</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
