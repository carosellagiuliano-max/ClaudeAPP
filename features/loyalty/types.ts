// =====================================================================
// LOYALTY SYSTEM - TypeScript Types
// =====================================================================

export type LoyaltyTransactionType =
  | 'earned'
  | 'redeemed'
  | 'expired'
  | 'adjusted'
  | 'bonus'
  | 'reverted'

export type LoyaltyTransactionSource =
  | 'appointment'
  | 'order'
  | 'reward'
  | 'referral'
  | 'birthday'
  | 'manual'
  | 'signup'

export type RewardType =
  | 'discount_percent'
  | 'discount_fixed'
  | 'free_service'
  | 'free_product'
  | 'voucher'

export type RedemptionStatus = 'active' | 'used' | 'expired' | 'revoked'

// =====================================================================
// Database Types
// =====================================================================

export interface LoyaltyTier {
  id: string
  salon_id: string
  name: string
  slug: string
  description: string | null
  min_points: number
  points_multiplier: number
  discount_percent: number | null
  color_hex: string | null
  icon_name: string | null
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface LoyaltyAccount {
  id: string
  salon_id: string
  customer_id: string
  points_balance: number
  lifetime_points: number
  current_tier_id: string | null
  total_visits: number
  total_spent: number
  active: boolean
  enrolled_at: string
  last_activity_at: string | null
  created_at: string
  updated_at: string
}

export interface LoyaltyTransaction {
  id: string
  salon_id: string
  account_id: string
  type: LoyaltyTransactionType
  source: LoyaltyTransactionSource
  points: number
  balance_after: number
  order_id: string | null
  appointment_id: string | null
  reward_id: string | null
  description: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface LoyaltyReward {
  id: string
  salon_id: string
  name: string
  description: string | null
  type: RewardType
  points_cost: number
  discount_percent: number | null
  discount_fixed: number | null
  service_id: string | null
  product_id: string | null
  voucher_code: string | null
  requires_tier_id: string | null
  max_redemptions_per_customer: number | null
  max_redemptions_total: number | null
  current_redemptions: number
  valid_from: string | null
  valid_until: string | null
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface LoyaltyRewardRedemption {
  id: string
  salon_id: string
  reward_id: string
  account_id: string
  transaction_id: string
  order_id: string | null
  appointment_id: string | null
  status: RedemptionStatus
  expires_at: string | null
  used_at: string | null
  created_at: string
}

// =====================================================================
// Extended Types (mit Relationen)
// =====================================================================

export interface LoyaltyAccountWithTier extends LoyaltyAccount {
  tier: LoyaltyTier | null
  customer: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface LoyaltyTransactionWithDetails extends LoyaltyTransaction {
  reward?: {
    id: string
    name: string
  }
  order?: {
    id: string
    order_number: string
  }
  appointment?: {
    id: string
    starts_at: string
  }
}

export interface LoyaltyRewardWithTier extends LoyaltyReward {
  tier: LoyaltyTier | null
  service?: {
    id: string
    name: string
  }
  product?: {
    id: string
    name: string
  }
}

// =====================================================================
// Form Types
// =====================================================================

export interface CreateLoyaltyTierInput {
  name: string
  slug: string
  description?: string
  min_points: number
  points_multiplier: number
  discount_percent?: number
  color_hex?: string
  icon_name?: string
  sort_order?: number
}

export interface UpdateLoyaltyTierInput extends Partial<CreateLoyaltyTierInput> {
  active?: boolean
}

export interface CreateLoyaltyRewardInput {
  name: string
  description?: string
  type: RewardType
  points_cost: number
  discount_percent?: number
  discount_fixed?: number
  service_id?: string
  product_id?: string
  voucher_code?: string
  requires_tier_id?: string
  max_redemptions_per_customer?: number
  max_redemptions_total?: number
  valid_from?: string
  valid_until?: string
  sort_order?: number
}

export interface UpdateLoyaltyRewardInput extends Partial<CreateLoyaltyRewardInput> {
  active?: boolean
}

export interface AddLoyaltyPointsInput {
  account_id: string
  points: number
  source: LoyaltyTransactionSource
  description?: string
  order_id?: string
  appointment_id?: string
}

export interface RedeemRewardInput {
  account_id: string
  reward_id: string
  order_id?: string
  appointment_id?: string
}

// =====================================================================
// View Models
// =====================================================================

export interface LoyaltyDashboard {
  account: LoyaltyAccountWithTier
  availableRewards: LoyaltyRewardWithTier[]
  recentTransactions: LoyaltyTransactionWithDetails[]
  nextTier: {
    tier: LoyaltyTier
    points_needed: number
    progress_percent: number
  } | null
}

export interface LoyaltyAnalytics {
  total_accounts: number
  active_accounts: number
  total_points_issued: number
  total_points_redeemed: number
  average_points_per_customer: number
  tier_distribution: {
    tier_name: string
    customer_count: number
  }[]
  top_earners: {
    customer_name: string
    lifetime_points: number
  }[]
}

// =====================================================================
// API Response Types
// =====================================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}
