import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { authApi } from '@/lib/api/auth';

/**
 * Authentication hook that verifies user session and manages auth state
 * Automatically refreshes authentication status on mount
 */
export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout, hasRole, hasAnyRole } =
    useAuthStore();

  // Verify authentication status with React Query
  const { data, isLoading: isVerifying, error } = useQuery({
    queryKey: ['auth', 'verify'],
    queryFn: authApi.verify,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Update auth store when verification completes
  useEffect(() => {
    if (data) {
      setUser(data.user);
    } else if (error) {
      setUser(null);
    }
    setLoading(isVerifying);
  }, [data, error, isVerifying, setUser, setLoading]);

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || isVerifying,
    hasRole,
    hasAnyRole,
    login: authApi.login,
    logout: async () => {
      await authApi.logout();
      logout();
    },
  };
}
