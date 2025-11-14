// Core EVE Online Types
export interface Character {
  character_id: number;
  character_name: string;
  corporation_id?: number;
  corporation_name?: string;
  alliance_id?: number;
  alliance_name?: string;
}

export interface User extends Character {
  roles: UserRole[];
}

export type UserRole =
  | 'admin'
  | 'Council'
  | 'Accountant'
  | 'OBomberCare'
  | 'FC'
  | 'Election Officer'
  | 'user';

// SRP Types
export interface SRPRequest {
  id: number;
  character_id: number;
  character_name: string;
  corporation_id: number | null;
  corporation_name: string | null;
  alliance_id: number | null;
  alliance_name: string | null;
  killmail_id: number | null;
  killmail_hash: string;
  killmail_time: string | null;
  ship_type_id: number | null;
  ship_name: string | null;
  is_polarized: boolean;
  fc_name: string | null;
  fleet_description: string | null;
  solar_system_id: number | null;
  solar_system_name: string | null;
  hunter_donations: number;
  base_payout_amount: number;
  final_payout_amount: number;
  payout_adjusted: boolean;
  adjustment_reason: string | null;
  status: SRPStatus;
  requires_fc_approval: boolean;
  denial_reason: string | null;
  processed_by_character_id: number | null;
  processed_by_character_name: string | null;
  processed_at: string | null;
  payment_journal_id: number | null;
  payment_amount: number | null;
  paid_at: string | null;
  mail_id: number | null;
  mail_subject: string | null;
  mail_body: string | null;
  validation_warnings: string[] | null;
  admin_notes: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  // Auto-rejection fields from processed_mails
  is_auto_rejection?: boolean;
  rejection_type?: 'auto' | 'manual';
  proximity_data?: any;
}

export type SRPStatus =
  | 'pending'
  | 'approved'
  | 'denied'
  | 'paid'
  | 'cancelled';

export type PaymentMethod = 'Contract' | 'Direct';

// Fleet Types
export interface Fleet {
  id: number;
  name: string;
  fc_character_id: number;
  fc_character_name: string;
  fleet_time: string;
  doctrine: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FleetCommander {
  character_id: number;
  character_name: string;
  rank: FCRank;
  alt_of: number | null;
  alt_of_name: string | null;
  status: FCStatus;
  added_by: number;
  added_at: string;
  notes: string | null;
}

export type FCRank = 'Trainee' | 'FC' | 'Senior FC' | 'Lead FC';
export type FCStatus = 'Active' | 'Inactive';

// Wallet Types
export interface WalletTransaction {
  id: number;
  transaction_id: number;
  date: string;
  amount: number;
  balance: number;
  description: string;
  first_party_id: number;
  first_party_name: string | null;
  second_party_id: number;
  second_party_name: string | null;
  ref_type: string;
  context_id: number | null;
  context_id_type: string | null;
  matched_srp_id: number | null;
  created_at: string;
}

// UI Component Props Types
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Form Types
export interface FCApplicationForm {
  character_id: number;
  character_name: string;
  rank: FCRank;
  alt_of?: number;
  notes?: string;
}

// Ban Management Types
export interface BanEntry {
  id: number;
  character_id: number;
  character_name: string;
  reason: string;
  banned_by: number;
  banned_by_name: string;
  banned_at: string;
  expires_at: string | null;
  is_active: boolean;
}

// Ship Type Configuration
export interface ShipType {
  type_id: number;
  type_name: string;
  group_id: number;
  group_name: string;
  base_price: number;
  adjusted_price: number;
  srp_eligible: boolean;
  notes: string | null;
}
