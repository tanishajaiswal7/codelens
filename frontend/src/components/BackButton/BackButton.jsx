import { useNavigate } from 'react-router-dom';
import './BackButton.css';

export default function BackButton({ fallback = '/' }) {
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
      className="page-back-button"
      onClick={handleBack}
      aria-label="Go back"
      title="Go back"
    >
      ←
    </button>
  );
}
