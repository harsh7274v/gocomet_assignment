export type UserRole = 'BUYER' | 'SUPPLIER';

export interface SupplierProfile {
  id: string;
  carrier_name: string;
  contact_number?: string | null;
  address?: string | null;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  supplier_profile?: SupplierProfile | null;
}

export type RFQStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED' | 'FORCE_CLOSED' | 'CANCELLED';

export type ExtensionTrigger = 'bid_received' | 'any_rank_change' | 'l1_change';

export interface AuctionConfig {
  id?: string;
  rfq_id?: string;
  trigger_window_minutes: number;
  extension_duration_minutes: number;
  extension_trigger: ExtensionTrigger;
}

export interface RFQInvitation {
  id: string;
  supplier_id: string;
  carrier_name?: string;
  supplier_email?: string;
  invitation_status: 'INVITED' | 'ACCEPTED' | 'DECLINED';
  invited_at: string;
}

export interface RFQListItem {
  id: string;
  reference_id: string;
  name: string;
  service_type: string;
  pickup_location: string;
  destination: string;
  pickup_at: string;
  target_budget?: number;
  bid_start_at: string;
  current_close_at: string;
  forced_close_at: string;
  status: RFQStatus;
  current_lowest_bid?: number;
  total_bids_count: number;
  total_suppliers_count: number;
  created_at: string;
}

export interface RFQDetail {
  id: string;
  reference_id: string;
  buyer_id: string;
  buyer_name?: string;
  name: string;
  description?: string;
  service_type: string;
  pickup_location: string;
  destination: string;
  pickup_at: string;
  target_budget?: number;
  bid_start_at: string;
  initial_close_at: string;
  current_close_at: string;
  forced_close_at: string;
  status: RFQStatus;
  created_at: string;
  auction_config?: AuctionConfig;
  invitations: RFQInvitation[];
  current_lowest_bid?: number;
  my_rank?: string;
  my_latest_bid?: number;
}

export interface Bid {
  id: string;
  rfq_id: string;
  supplier_id: string;
  carrier_name?: string;
  freight_charges: number;
  origin_charges: number;
  destination_charges: number;
  total_amount: number;
  transit_days: number;
  validity_days: number;
  submitted_at: string;
}

export interface LeaderboardEntry {
  rank: string;
  rank_number: number;
  supplier_id: string;
  carrier_name: string;
  total_amount: number;
  freight_charges: number;
  origin_charges: number;
  destination_charges: number;
  transit_days: number;
  validity_days: number;
  submitted_at: string;
  is_own_bid?: boolean;
}

export interface LeaderboardResponse {
  rfq_id: string;
  current_close_at: string;
  forced_close_at: string;
  total_suppliers_participating: number;
  total_bids_placed: number;
  lowest_bid_amount?: number;
  winning_supplier?: string;
  entries: LeaderboardEntry[];
}

export type EventType =
  | 'BID_SUBMITTED'
  | 'RANKING_CHANGED'
  | 'AUCTION_EXTENDED'
  | 'AUCTION_CLOSED'
  | 'AUCTION_FORCE_CLOSED'
  | 'AUCTION_SCHEDULED'
  | 'AUCTION_ACTIVATED';

export interface ActivityLog {
  id: string;
  rfq_id: string;
  actor_id?: string;
  actor_name?: string;
  event_type: EventType;
  description: string;
  details?: any;
  created_at: string;
}

