import React from 'react';
import { Link } from 'react-router-dom';
import './TermsPage.css';

export default function TermsPage() {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <h1>Terms of Service</h1>
        <p className="legal-sub">Effective: May 2026</p>
      </header>

      <main className="legal-content">
        <p>
          These Terms of Service govern your use of CodeLens AI. By accessing or using our services
          you agree to these terms. Use of the service is subject to account rules and acceptable use policies.
        </p>

        <h2>Accounts</h2>
        <p>You are responsible for activity on your account. Do not share credentials.</p>

        <h2>Limitations</h2>
        <p>We provide the service as-is. We are not liable for code changes you make based on suggestions.</p>

        <div style={{ marginTop: 24 }}>
          <Link to="/landing" className="legal-back">← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
