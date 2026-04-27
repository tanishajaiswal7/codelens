import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/authApi.js';
import './ForgotPasswordPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setDevResetUrl('');

    try {
      const response = await authApi.forgotPassword({ email });
      setMessage(response.data.message || 'Reset instructions sent.');
      if (response.data.resetUrl) {
        setDevResetUrl(response.data.resetUrl);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not process request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            Code<span className="logo-accent">Lens</span> AI
          </div>
          <p className="auth-subtitle">Reset your password</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {message && <div className="auth-success">{message}</div>}
          {error && <div className="auth-error">{error}</div>}

          {devResetUrl && (
            <div className="auth-dev-reset-link">
              <a href={devResetUrl}>Open reset link</a>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div className="auth-footer">
          Back to{' '}
          <Link to="/login" className="auth-footer-link">Login</Link>
        </div>
      </div>
    </div>
  );
}
