/**
 * Public API endpoints (no authentication required)
 */

import { apiClient } from './client';
import { FleetManagement, Doctrine } from '@/types';

interface FleetTypeWithDoctrines {
  fleet_type_id: number;
  fleet_type_name: string;
  fleet_type_description: string | null;
  fleet_type_order: number;
  doctrines: Doctrine[];
}

interface FleetsResponse {
  success: boolean;
  fleets: FleetManagement[];
}

interface DoctrinesResponse {
  success: boolean;
  fleet_types: FleetTypeWithDoctrines[];
}

interface SRPShipType {
  type_name: string;
  group_name: string;
  base_payout: number;
  polarized_payout: number | null;
  fc_discretion: boolean;
  notes: string | null;
}

interface SRPConfigResponse {
  success: boolean;
  ship_types: SRPShipType[];
}

export const publicApi = {
  // Get upcoming fleets
  getFleets: async (
    params?: { from_date?: string; to_date?: string; limit?: number }
  ): Promise<FleetsResponse> => {
    return await apiClient.get<FleetsResponse>('/api/public/fleets', { params });
  },

  // Get active doctrines grouped by fleet type
  getDoctrines: async (params?: { fleet_type_id?: number }): Promise<DoctrinesResponse> => {
    return await apiClient.get<DoctrinesResponse>('/api/public/doctrines', { params });
  },

  // Get active SRP configuration
  getSRPConfig: async (): Promise<SRPConfigResponse> => {
    return await apiClient.get<SRPConfigResponse>('/api/public/srp-config');
  },
};
