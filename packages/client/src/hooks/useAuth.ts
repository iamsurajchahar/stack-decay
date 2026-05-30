import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { getMe, logout as apiLogout } from '../api/auth';
import { resetRedirectFlag } from '../api/client';

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (token && !user) {
      // Reset the 401 redirect flag on fresh login
      resetRedirectFlag();
      getMe()
        .then((u) => setAuth(u, token))
        .catch(() => clearAuth());
    }
  }, [token, user, setAuth, clearAuth]);

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    // Clear all cached query data so next login starts fresh
    queryClient.clear();
    clearAuth();
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading: isAuthenticated && !user,
    logout,
  };
}
