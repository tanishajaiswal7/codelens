import { useState, useRef, useEffect } from 'react';
import { authApi } from '../../api/authApi.js';
import './ProfileCard.css';

export default function ProfileCard({ user, isOpen, onClose }) {
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarMessage, setAvatarMessage] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    setAvatarPreview(resolveAvatarUrl(user?.avatarUrl));
  }, [user?.avatarUrl, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const resolveAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return '';
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('blob:')) {
      return avatarUrl;
    }
    return `${apiBaseUrl}${avatarUrl}`;
  };

  const handleAvatarButtonClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Please upload a JPG, PNG, WEBP, or GIF image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Avatar must be smaller than 5MB.');
      return;
    }

    setAvatarUploading(true);
    setAvatarError('');
    setAvatarMessage('');

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    const formDataUpload = new FormData();
    formDataUpload.append('avatar', file);

    try {
      const response = await authApi.updateAvatar(formDataUpload);
      const updatedUser = response.data.user;
      setAvatarPreview(resolveAvatarUrl(updatedUser.avatarUrl) || previewUrl);
      setAvatarMessage('Avatar updated successfully.');
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: updatedUser,
      }));
    } catch (error) {
      setAvatarError(error.response?.data?.message || 'Failed to upload avatar.');
      setAvatarPreview(resolveAvatarUrl(user.avatarUrl));
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
      URL.revokeObjectURL(previewUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="profile-card-overlay">
      <div className="profile-card-modal" ref={modalRef}>
        <div className="profile-card-header">
          <h2>Profile</h2>
          <button className="profile-card-close" onClick={onClose}>✕</button>
        </div>

        <div className="profile-card-content">
          {/* Avatar Section */}
          <div className="profile-card-avatar-section">
            <div className="profile-card-avatar">
              {avatarPreview || user?.avatarUrl ? (
                <img
                  src={avatarPreview || resolveAvatarUrl(user?.avatarUrl)}
                  alt={user?.name}
                />
              ) : (
                <span>{(user?.name || 'U').split(' ').map((part) => part[0]).join('').toUpperCase()}</span>
              )}
            </div>
            <div className="profile-card-avatar-info">
              <p className="profile-card-avatar-title">Profile Photo</p>
              <p className="profile-card-avatar-desc">Upload a clear avatar so your account is easy to recognize.</p>
              <div className="profile-card-avatar-actions">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="profile-card-avatar-input"
                />
                <button
                  type="button"
                  className="profile-card-avatar-button"
                  onClick={handleAvatarButtonClick}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? 'Uploading...' : 'Change Avatar'}
                </button>
              </div>
              <p className="profile-card-avatar-hint">PNG, JPG, WEBP or GIF. Max 5MB.</p>
              {avatarMessage && <p className="profile-card-success-message">{avatarMessage}</p>}
              {avatarError && <p className="profile-card-error-message">{avatarError}</p>}
            </div>
          </div>

          {/* User Details Section */}
          <div className="profile-card-divider"></div>

          <div className="profile-card-details">
            <div className="profile-detail-item">
              <span className="profile-detail-label">Name</span>
              <span className="profile-detail-value profile-detail-disabled">{user?.name}</span>
              <p className="profile-detail-note">Managed from your account identity</p>
            </div>
            <div className="profile-detail-item">
              <span className="profile-detail-label">Email</span>
              <span className="profile-detail-value profile-detail-disabled">{user?.email}</span>
              <p className="profile-detail-note">Change email in Settings</p>
            </div>
          </div>
        </div>

        <div className="profile-card-footer">
          <button className="profile-card-close-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
