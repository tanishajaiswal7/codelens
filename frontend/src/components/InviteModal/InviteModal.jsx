import React, { useState, useEffect } from 'react';
import './InviteModal.css';

function InviteModal({
  isOpen,
  onClose,
  onInviteEmails,
  onGenerateShareLink,
  isSending,
  isGeneratingLink,
  shareLink,
  workspaceName,
}) {
  const [emailText, setEmailText] = useState('');
  const [emails, setEmails] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [inviteResults, setInviteResults] = useState([]);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEmailText('');
      setEmails([]);
      setStatusMessage('');
      setInviteResults([]);
      setShareCopied(false);
    }
  }, [isOpen]);

  const validateEmail = (email) => email.includes('@') && email.includes('.');

  const handleAddEmail = () => {
    const normalized = emailText.trim().toLowerCase();
    if (!normalized) {
      setStatusMessage('Enter an email address and click Add.');
      return;
    }
    if (!validateEmail(normalized)) {
      setStatusMessage('Invalid email format.');
      return;
    }
    if (emails.includes(normalized)) {
      setStatusMessage('This email is already added.');
      return;
    }

    setEmails((prev) => [...prev, normalized]);
    setEmailText('');
    setStatusMessage('');
  };

  const handleRemoveEmail = (email) => {
    setEmails((prev) => prev.filter((item) => item !== email));
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleSendInvites = async (e) => {
    e.preventDefault();
    let currentEmails = [...emails];
    const typedEmail = emailText.trim().toLowerCase();

    if (typedEmail) {
      if (!validateEmail(typedEmail)) {
        setStatusMessage('Invalid email format.');
        setStatusType('error');
        return;
      }
      if (!currentEmails.includes(typedEmail)) {
        currentEmails.push(typedEmail);
      }
    }

    if (currentEmails.length === 0) {
      setStatusMessage('Add at least one team email before sending invites.');
      setStatusType('error');
      return;
    }

    setStatusType('info');
    setStatusMessage(
      currentEmails.length === 1
        ? `Sending invite to ${currentEmails[0]}...`
        : `Sending ${currentEmails.length} invites...`
    );

    const results = await onInviteEmails(currentEmails);
    setInviteResults(results);

    const successEntries = results.filter((item) => item.success);
    const failedEntries = results.filter((item) => !item.success);
    const successCount = successEntries.length;
    const failedInvites = failedEntries.length;

    if (successCount > 0 && failedInvites === 0) {
      setStatusType('success');
      if (successCount === 1) {
        setStatusMessage(
          `✓ Invite created successfully for ${successEntries[0].email}. Email delivery is running in the background. You can also copy the link below and send it manually.`
        );
      } else {
        setStatusMessage(
          `✓ ${successCount} invites created successfully. Email delivery is running in the background. You can also copy the links below and send them manually.`
        );
      }
      setInviteResults(results);
      setEmails([]);
      setEmailText('');
    } else if (successCount > 0 && failedInvites > 0) {
      setStatusType('warning');
      const failureText = failedInvites === 1 ? '1 invite failed.' : `${failedInvites} invites failed.`;
      setStatusMessage(
        `${successCount} invite links created. We are sending emails in the background. ${failureText}`
      );
      setInviteResults(results);
      setEmails(failedEntries.map((item) => item.email));
      setEmailText('');
    } else {
      setStatusType('error');
      const failureText = failedInvites === 1 ? '1 invite failed.' : `${failedInvites} invites failed.`;
      setStatusMessage(failureText || 'Unable to send invites.');
      setInviteResults(results);
      setEmailText('');
    }
  };

  const handleGenerateLink = async () => {
    setShareCopied(false);
    const result = await onGenerateShareLink();
    if (result?.inviteUrl) {
      setStatusMessage('Share link generated successfully.');
    }
  };

  const handleCopyShareLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setShareCopied(true);
  };

  if (!isOpen) return null;

  const successCount = inviteResults.filter((item) => item.success).length;
  const showSuccessState = inviteResults.length > 0 && successCount > 0;

  return (
    <div className="modal-overlay">
      <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invite-header">
          <div>
            <h2>{showSuccessState ? '✓ Invites Sent!' : 'Invite teammates'}</h2>
            <p className="workspace-name">to {workspaceName}</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {showSuccessState ? (
          <div className="invite-body invite-body--success">
            <div className="success-content">
              <div className="success-icon">✓</div>
              <p className="success-message">{successCount} invitation(s) sent successfully!</p>
              <p className="success-note">Email delivery is running in the background. Invitees will receive an email shortly.</p>
              
              {inviteResults.length > 0 && (
                <div className="invite-results invite-results--success">
                  <h3>Sent to:</h3>
                  <ul>
                    {inviteResults.filter((item) => item.success).map((item) => (
                      <li key={item.email} className="success">
                        <div className="result-email">{item.email}</div>
                        {item.inviteUrl && (
                          <div className="invite-url">
                            <code>{item.inviteUrl}</code>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="invite-body">
            <form onSubmit={handleSendInvites} className="invite-form">
              <label htmlFor="invite-email">Add team email</label>
              <div className="invite-input-row">
                <input
                  id="invite-email"
                  type="email"
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  onKeyDown={handleEmailKeyDown}
                  placeholder="Enter teammate email"
                  disabled={isSending || isGeneratingLink}
                  className="invite-input"
                />
                <button
                  type="button"
                  className="btn-primary add-email-btn"
                  onClick={handleAddEmail}
                  disabled={isSending || isGeneratingLink}
                >
                  Add
                </button>
              </div>

              {emails.length > 0 && (
                <div className="chip-list">
                  {emails.map((email) => (
                    <div key={email} className="email-chip">
                      <span>{email}</span>
                      <button type="button" className="chip-close" onClick={() => handleRemoveEmail(email)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={isSending || isGeneratingLink}>
                  {isSending ? 'Sending...' : 'Send Invites'}
                </button>
              </div>
            </form>

            <div className="share-link-panel">
              <p className="panel-label">Shareable workspace link</p>
              <p className="panel-description">
                Generate one reusable link that anyone on your team can use to join the workspace.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleGenerateLink}
                disabled={isGeneratingLink || isSending}
              >
                {isGeneratingLink ? 'Generating...' : 'Generate Share Link'}
              </button>

              {shareLink && (
                <div className="invite-link-box share-link-box">
                  <code>{shareLink}</code>
                  <button className="copy-btn" type="button" onClick={handleCopyShareLink}>
                    {shareCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {statusMessage && !inviteSent && <div className={`invite-status ${statusType}`}>{statusMessage}</div>}

        {inviteResults.length > 0 && !inviteSent && (
          <div className="invite-results">
            <h3>Invite outcomes</h3>
            <ul>
              {inviteResults.map((item) => (
                <li key={item.email} className={item.success ? 'success' : 'error'}>
                  <div>
                    {item.email} — {item.success ? 'Invite link created' : item.error}
                  </div>
                  {item.success && item.inviteUrl && (
                    <div className="invite-url">
                      <code>{item.inviteUrl}</code>
                    </div>
                  )}
                  {item.success && (
                    <div className="invite-note">
                      Email delivery runs in the background. You can copy this invite link and share it manually right away.
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default InviteModal;
