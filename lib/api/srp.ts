import { apiClient } from './client';
import type { SRPRequest, PaginatedResponse, SRPStatus, PaymentMethod } from '@/types';

export interface SRPListParams {
  page?: number;
  pageSize?: number;
  status?: SRPStatus | 'all';
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
}

export interface SRPUpdateRequest {
  status?: SRPStatus;
  payout_amount?: number;
  reject_reason?: string;
  notes?: string;
  payment_method?: PaymentMethod;
}

export interface SRPStats {
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  paid: number;
  total_payout: number;
}

/**
 * SRP (Ship Replacement Program) API service
 * Handles SRP request submission, management, and processing
 */
export const srpApi = {
  /**
   * Get paginated list of SRP requests
   */
  list: async (params: SRPListParams = {}): Promise<PaginatedResponse<SRPRequest>> => {
    return apiClient.get<PaginatedResponse<SRPRequest>>('/api/admin/srp', {
      params,
    });
  },

  /**
   * Get a single SRP request by ID
   */
  getById: async (id: number): Promise<SRPRequest> => {
    return apiClient.get<SRPRequest>(`/api/admin/srp/${id}`);
  },

  /**
   * Update an SRP request (admin only)
   */
  update: async (id: number, data: SRPUpdateRequest): Promise<SRPRequest> => {
    return apiClient.put<SRPRequest>(`/api/admin/srp/${id}`, data);
  },

  /**
   * Approve an SRP request
   */
  approve: async (id: number, payoutAmount?: number): Promise<SRPRequest> => {
    return apiClient.post<SRPRequest>(`/api/admin/srp/${id}/approve`, {
      payout_amount: payoutAmount,
    });
  },

  /**
   * Reject an SRP request
   */
  reject: async (id: number, reason: string): Promise<SRPRequest> => {
    return apiClient.post<SRPRequest>(`/api/admin/srp/${id}/reject`, {
      reject_reason: reason,
    });
  },

  /**
   * Mark an SRP request as paid
   */
  markPaid: async (id: number, paymentMethod: PaymentMethod): Promise<SRPRequest> => {
    return apiClient.post<SRPRequest>(`/api/admin/srp/${id}/paid`, {
      payment_method: paymentMethod,
    });
  },

  /**
   * Bulk approve SRP requests
   */
  bulkApprove: async (ids: number[]): Promise<void> => {
    return apiClient.post<void>('/api/admin/srp/bulk-approve', { ids });
  },

  /**
   * Bulk mark as paid
   */
  bulkMarkPaid: async (ids: number[], paymentMethod: PaymentMethod): Promise<void> => {
    return apiClient.post<void>('/api/admin/srp/bulk-paid', {
      ids,
      payment_method: paymentMethod,
    });
  },

  /**
   * Get SRP statistics
   */
  getStats: async (): Promise<SRPStats> => {
    return apiClient.get<SRPStats>('/api/admin/srp/stats');
  },

  /**
   * Delete an SRP request
   */
  delete: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`/api/admin/srp/${id}`);
  },
};
