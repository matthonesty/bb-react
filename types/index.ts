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

export type SRPStatus = 'pending' | 'approved' | 'denied' | 'paid' | 'cancelled';

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
  id: number;
  status: FCStatus;
  rank: FCRank;
  main_character_id: number;
  main_character_name: string;
  bb_corp_alt_id: number | null;
  bb_corp_alt_name: string | null;
  additional_alts: Array<{ character_id: number; character_name: string }>;
  notes: string | null;
  access_level: FCAccessLevel | null;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type FCRank = 'SFC' | 'JFC' | 'FC' | 'Support';
export type FCStatus = 'Active' | 'Inactive' | 'Banned' | 'Deleted';
export type FCAccessLevel = 'FC' | 'OBomberCare' | 'Accountant' | 'Council' | 'Election Officer';

// Fleet Type (Doctrine Category) Types
export interface FleetType {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  doctrine_count?: number;
  active_doctrine_count?: number;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

// Module Item (for fitting slots)
export interface ModuleItem {
  type_id: number;
  type_name: string; // Primary name property
  name?: string; // Alternative name property (used by ESI parser)
  quantity: number;
}

// Doctrine (Ship Fitting) Types
export interface Doctrine {
  id: number;
  fleet_type_id: number;
  fleet_type_name?: string;
  name: string;
  ship_type_id: number;
  ship_name: string;
  ship_group_id: number | null;
  ship_group_name: string | null;
  high_slots: number;
  mid_slots: number;
  low_slots: number;
  rig_slots: number;
  high_slot_modules: ModuleItem[] | string;
  mid_slot_modules: ModuleItem[] | string;
  low_slot_modules: ModuleItem[] | string;
  rig_modules: ModuleItem[] | string;
  cargo_items: ModuleItem[] | string;
  notes: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

// Fitting Import Response
export interface FittingImport {
  ship_type_id: number;
  ship_name: string;
  ship_group_id: number;
  ship_group_name: string;
  name: string;
  high_slots: number;
  mid_slots: number;
  low_slots: number;
  rig_slots: number;
  launcher_hardpoints: number;
  turret_hardpoints: number;
  cargo_capacity: number;
  high_slot_modules: ModuleItem[];
  mid_slot_modules: ModuleItem[];
  low_slot_modules: ModuleItem[];
  rig_modules: ModuleItem[];
  cargo_items: ModuleItem[];
  module_counts: {
    high: number;
    mid: number;
    low: number;
    rig: number;
    cargo: number;
  };
}

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

export interface WalletJournalEntry {
  id: number;
  division: number;
  date: string;
  ref_type: string;
  amount: number;
  balance: number;
  first_party_id: number | null;
  first_party_name: string | null;
  second_party_id: number | null;
  second_party_name: string | null;
  context_id: number | null;
  context_id_name: string | null;
  reason: string | null;
  description: string | null;
  tax: number | null;
  tax_receiver_id: number | null;
  tax_receiver_name: string | null;
}

// Ban Types
export interface Ban {
  id: number;
  name: string;
  esi_id: number | null;
  type: 'Character' | 'Corp' | 'Alliance';
  bb_banned: boolean;
  xup_banned: boolean;
  hk_banned: boolean;
  banned_by: string | null;
  reason: string | null;
  ban_date: string;
  created_at?: string;
  updated_at?: string;
}

// SRP Ship Types
export interface ShipType {
  id: number;
  type_id: number;
  type_name: string;
  group_id: number;
  group_name: string;
  base_payout: number;
  polarized_payout: number | null;
  fc_discretion: boolean;
  is_active: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
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

// Fleet Management Types
export interface FleetManagement {
  id: number;
  scheduled_at: string;
  timezone: string;
  duration_minutes: number;
  fleet_type_id: number;
  fleet_type_name?: string;
  fleet_type_description?: string;
  fc_id: number;
  fc_name?: string;
  fc_rank?: string;
  fc_character_id?: number;
  title: string | null;
  description: string | null;
  staging_system: string | null;
  comms_channel: string | null;
  status: FleetStatus;
  actual_start_time: string | null;
  actual_end_time: string | null;
  participant_count: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number | null;
}

export type FleetStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface FleetParticipant {
  id: number;
  fleet_id: number;
  character_id: number;
  character_name: string;
  role: string | null;
  added_at: string;
  added_by: number;
  kill_count?: number;
}

export interface FleetKill {
  id: number;
  fleet_id: number;
  killmail_id: number;
  zkill_url: string;
  killmail_hash: string | null;
  hunter_id: number | null;
  hunter_name?: string;
  hunter_role?: string;
  drop_number: number;
  zkb_location_id: number | null;
  zkb_total_value: number | null;
  zkb_fitted_value: number | null;
  zkb_dropped_value: number | null;
  zkb_destroyed_value: number | null;
  kill_time: string | null;
  solar_system_id: number | null;
  victim_character_id: number | null;
  victim_character_name: string | null;
  victim_corporation_id: number | null;
  victim_corporation_name: string | null;
  victim_alliance_id: number | null;
  victim_alliance_name: string | null;
  victim_ship_type_id: number | null;
  victim_ship_name: string | null;
  dropped_items: any | null;
  enriched_at: string | null;
  enrichment_error: string | null;
  added_at: string;
  added_by: number;
}
