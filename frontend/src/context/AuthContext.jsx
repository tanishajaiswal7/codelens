import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    setIsLoading(true);

    try {
      const response = await authApi.getMe();
      const nextUser = response?.data?.user || null;
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      // Log the error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('[AuthContext] Failed to fetch user:', {
          message: error.message,
          status: error.response?.status,
          url: error.config?.url,
        });
      }
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Mount check - only run once on component mount
    let isMounted = true;

    refreshUser().then((user) => {
      if (isMounted && process.env.NODE_ENV === 'development') {
        console.log('[AuthContext] Initial user refresh complete:', user ? 'authenticated' : 'not authenticated');
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}