import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

/**
 * Authentication state store using Zustand
 * Manages user authentication state and role-based permissions
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: true,

        setUser: (user) =>
          set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
          }),

        setLoading: (loading) =>
          set({
            isLoading: loading,
          }),

        logout: () =>
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          }),

        /**
         * Check if user has a specific role or any of the specified roles
         */
        hasRole: (role) => {
          const { user } = get();
          if (!user) return false;

          if (Array.isArray(role)) {
            return role.some((r) => user.roles.includes(r));
          }

          return user.roles.includes(role);
        },

        /**
         * Check if user has any of the specified roles
         */
        hasAnyRole: (roles) => {
          const { user } = get();
          if (!user) return false;

          return roles.some((role) => user.roles.includes(role));
        },
      }),
      {
        name: 'auth-storage',
        // Only persist user data, not loading state
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    )
  )
);
