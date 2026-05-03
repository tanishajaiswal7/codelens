import React from 'react';
import { Link } from 'react-router-dom';
import './PrivacyPage.css';

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <h1>Privacy Policy</h1>
        <p className="legal-sub">Last updated: May 2026</p>
      </header>

      <main className="legal-content">
        <p>
          CodeLens AI respects your privacy. This page summarizes how we collect, use, and
          share information when you use our services. We collect account information
          (email, GitHub profile) to authenticate and store review history. We do not
          sell your personal data.
        </p>

        <h2>Data we collect</h2>
        <p>Account and profile information, review metadata, and minimal analytics for product improvement.</p>

        <h2>Contact</h2>
        <p>If you have questions, email us at privacy@codelens.ai or open an issue on our GitHub repository.</p>

        <div style={{ marginTop: 24 }}>
          <Link to="/landing" className="legal-back">← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
