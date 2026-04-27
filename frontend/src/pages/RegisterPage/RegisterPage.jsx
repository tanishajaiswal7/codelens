import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/authApi.js';
import GitHubLoginButton from '../../components/GitHubLoginButton/GitHubLoginButton.jsx';
import BackButton from '../../components/BackButton/BackButton.jsx';
import './RegisterPage.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await authApi.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      
      // Check if there's a pending workspace invite
      const pendingInvite = localStorage.getItem('pendingInvite');
      if (pendingInvite) {
        localStorage.removeItem('pendingInvite');
        navigate(`/join/${pendingInvite}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'Registration failed';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-register">
      <div className="auth-layout">
        <aside className="auth-intro-panel">
          <div className="auth-kicker">Get started</div>
          <h1>Create a workspace-ready account in under a minute.</h1>
          <p className="auth-intro-copy">
            Register once, then use the same account for code reviews, GitHub pull requests, invite links, and saved review history.
          </p>

          <div className="auth-value-grid">
            <div className="auth-value-card">
              <span className="auth-value-label">Built for</span>
              <strong>Solo reviews and team collaboration</strong>
            </div>
            <div className="auth-value-card">
              <span className="auth-value-label">You can do</span>
              <strong>Join invites, connect GitHub, and compare personas</strong>
            </div>
            <div className="auth-value-card">
              <span className="auth-value-label">You get</span>
              <strong>Persistent history, settings, and guided onboarding</strong>
            </div>
          </div>

          <div className="auth-steps">
            <div className="auth-step">
              <span>1</span>
              <p>Fill in your account details.</p>
            </div>
            <div className="auth-step">
              <span>2</span>
              <p>Confirm your password and create the account.</p>
            </div>
            <div className="auth-step">
              <span>3</span>
              <p>Jump into your dashboard or a pending workspace invite.</p>
            </div>
          </div>
        </aside>

        <section className="auth-card">
          <BackButton fallback="/" />
          <div className="auth-header">
            <div className="auth-logo">
              Code<span className="logo-accent">Lens</span> AI
            </div>
            <p className="auth-subtitle">Create your account and keep everything in one place.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="auth-error auth-error-banner">{errors.general}</div>
            )}

            <div className="auth-field">
              <label htmlFor="name" className="auth-label">Full Name</label>
              <input
                id="name"
                type="text"
                name="name"
                className="auth-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                autoComplete="name"
                required
              />
              {errors.name && (
                <div className="auth-error">{errors.name}</div>
              )}
            </div>

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
              {errors.email && (
                <div className="auth-error">{errors.email}</div>
              )}
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
                autoComplete="new-password"
                required
              />
              {errors.password && (
                <div className="auth-error">{errors.password}</div>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                className="auth-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              {errors.confirmPassword && (
                <div className="auth-error">{errors.confirmPassword}</div>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
            <p className="auth-helper-text">Your account will be ready for login, workspace invitations, and GitHub connection immediately after registration.</p>
          </form>

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <div className="auth-divider-text">or</div>
            <div className="auth-divider-line" />
          </div>

          <GitHubLoginButton />

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="auth-footer-link">Login</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
