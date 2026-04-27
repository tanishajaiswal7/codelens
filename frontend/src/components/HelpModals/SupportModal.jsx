import { useState } from 'react';
import './HelpModals.css';

const OFFICIAL_SUPPORT_EMAIL = 'support@codelens.ai';

export default function SupportModal({ isOpen, onClose, user }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // In a real app, you'd send this to your backend
      console.log('Support request:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitted(true);
      // Auto-close modal after showing success message
      setTimeout(() => {
        onClose();
        // Reset form after closing
        setSubmitted(false);
        setFormData({
          name: user?.name || '',
          email: '',
          subject: '',
          message: '',
          type: 'general'
        });
      }, 2000);
    } catch (error) {
      console.error('Error submitting support request:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💬 Support & Help</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {submitted ? (
            <div className="support-success">
              <div className="success-icon">✓</div>
              <h3>Thank you for reaching out!</h3>
              <p>Your support request has been submitted successfully. Our support team will review it and get back to you at the email address you provided within 24 hours.</p>
              <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-2)' }}>
                You can also reach us directly at <strong>{OFFICIAL_SUPPORT_EMAIL}</strong>
              </p>
            </div>
          ) : (
            <>
              <div className="support-header">
                <h3>Get in Touch</h3>
                <p>We're here to help! Choose the method that works best for you:</p>
                
                <div className="support-contact-options">
                  <div className="contact-option">
                    <span className="contact-icon">📧</span>
                    <div>
                      <strong>Direct Email</strong>
                      <p><a href={`mailto:${OFFICIAL_SUPPORT_EMAIL}`}>{OFFICIAL_SUPPORT_EMAIL}</a></p>
                    </div>
                  </div>
                  
                  <div className="contact-option">
                    <span className="contact-icon">📋</span>
                    <div>
                      <strong>Submit a Request</strong>
                      <p>Use the form below to submit your inquiry</p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="support-form">
                <div className="form-group">
                  <label>Issue Type</label>
                  <select 
                    name="type" 
                    value={formData.type}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="general">General Question</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="billing">Billing</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Your Name</label>
                  <input 
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Your Email</label>
                  <input 
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="form-input"
                    required
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '4px' }}>
                    We'll use this email to send you a response
                  </p>
                </div>

                <div className="form-group">
                  <label>Subject</label>
                  <input 
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Brief subject"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Message</label>
                  <textarea 
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Describe your issue or question..."
                    className="form-input form-textarea"
                    rows="5"
                    required
                  />
                </div>
              </form>
            </>
          )}
        </div>

        <div className="modal-footer">
          {!submitted && (
            <>
              <button 
                className="btn-secondary" 
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Request'}
              </button>
            </>
          )}
          {submitted && (
            <button className="btn-primary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
