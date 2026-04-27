import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi.js';
import './ProtectedRoute.css';

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authApi.getMe();
        setUser(response.data.user);
        setLoading(false);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Auth check failed:', error);
        }
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return <div className="loadingContainer">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  // If children is a function, call it with user; otherwise render it as is
  return typeof children === 'function' ? children(user) : children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.oneOfType([PropTypes.func, PropTypes.node]).isRequired,
};
