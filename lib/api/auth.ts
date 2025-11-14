import { apiClient } from './client';
import type { User } from '@/types';

export interface VerifyResponse {
  user: User;
  authenticated: boolean;
}

/**
 * Authentication API service
 * Handles EVE SSO login, verification, and logout
 */
export const authApi = {
  /**
   * Verify current authentication status
   */
  verify: async (): Promise<VerifyResponse> => {
    return apiClient.get<VerifyResponse>('/api/auth/verify');
  },

  /**
   * Initiate EVE SSO login flow
   */
  login: (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/login';
    }
  },

  /**
   * Logout and clear session
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/logout');
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  },

  /**
   * Get current user information
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<VerifyResponse>('/api/auth/verify');
    return response.user;
  },
};
