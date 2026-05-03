import { useNavigate } from 'react-router-dom';
import './BackButton.css';

export default function BackButton({ fallback = '/', variant = 'local' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      className={`page-back-button ${variant === 'global' ? 'page-back-button--global' : ''}`}
      onClick={handleBack}
      aria-label="Go back"
      title="Go back"
    >
      ←
    </button>
  );
}
