import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/authApi.js';
import { settingsApi } from '../../api/settingsApi.js';
import GitHubLoginButton from '../../components/GitHubLoginButton/GitHubLoginButton.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { applyTheme } from '../../utils/themeUtils.js';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
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
      const nextUser = await refreshUser();

      // After login, fetch user settings from backend and apply them
      try {
        const response = await settingsApi.getSettings();
        const data = response?.settings;
        if (data?.theme) applyTheme(data.theme);
        if (data?.defaultPersona) localStorage.setItem('codelens-default-persona', data.defaultPersona);
        if (data?.preferredLanguage) localStorage.setItem('codelens-preferred-language', data.preferredLanguage);
        if (data?.emailNotifications) localStorage.setItem('codelens-email-notifications', JSON.stringify(data.emailNotifications));
      } catch (settingsErr) {
        // ignore — fallback to existing localStorage values
      }

      // Check if there's a pending workspace invite
      const pendingInvite = localStorage.getItem('pendingInvite');
      if (pendingInvite) {
        localStorage.removeItem('pendingInvite');
        navigate(`/join/${pendingInvite}`);
      } else {
        navigate(nextUser?.onboardingCompleted ? '/dashboard' : '/onboarding');
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
          <h1>Ship safer and faster — AI reviews that explain the why.</h1>
          <p className="auth-intro-copy">
            Get instant, explainable code reviews with confidence scores. Learn why issues matter, teach your team with Socratic guidance, and keep a searchable history of feedback across repos.
          </p>

          <div style={{ marginTop: 20 }}>
            <Link to="/landing" className="intro-cta">Explore live demo →</Link>
          </div>

          <div className="auth-value-grid">
            <div className="auth-value-card">
              <span className="auth-value-label">What you can do</span>
              <strong>Instant AI reviews — paste code or import a PR</strong>
            </div>
            <div className="auth-value-card">
              <span className="auth-value-label">How it helps</span>
              <strong>Socratic mode & personas to teach and coach</strong>
            </div>
            <div className="auth-value-card">
              <span className="auth-value-label">What you keep</span>
              <strong>Searchable review history and team workflows</strong>
            </div>
          </div>

          <div className="auth-steps">
            <div className="auth-step">
              <span>1</span>
              <p>Sign in quickly with email or secure GitHub connect.</p>
            </div>
            <div className="auth-step">
              <span>2</span>
              <p>Pick a persona or enable Socratic mode for learning.</p>
            </div>
            <div className="auth-step">
              <span>3</span>
              <p>Review code, capture history, and collaborate in workspaces.</p>
            </div>
          </div>
        </aside>

        <section className="auth-card">
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
              {loading ? 'Logging in...' : 'Continue to reviews'}
            </button>
            <p className="auth-helper-text">You’ll land on your dashboard and can continue any pending workspace invite automatically.</p>
          </form>

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <div className="auth-divider-text">or</div>
            <div className="auth-divider-line" />
          </div>

          <GitHubLoginButton />
          <p className="auth-privacy">We only access repos you approve during GitHub connect. Your code and tokens stay private.</p>

          <div className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register" className="auth-footer-link">Register</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
