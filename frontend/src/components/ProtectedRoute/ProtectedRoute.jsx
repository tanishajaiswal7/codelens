import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './ProtectedRoute.css';

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (!user.onboardingCompleted && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true });
      return;
    }

    if (user.onboardingCompleted && location.pathname === '/onboarding') {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, location.pathname, navigate, user]);

  if (isLoading) {
    return <div className="loadingContainer">Loading...</div>;
  }

  if (!user) {
    return <div className="loadingContainer">Loading...</div>;
  }

  // If children is a function, call it with user; otherwise render it as is
  return typeof children === 'function' ? children(user) : children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.oneOfType([PropTypes.func, PropTypes.node]).isRequired,
};
