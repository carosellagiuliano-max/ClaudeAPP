'use server'

// =====================================================================
// LOYALTY SYSTEM - Server Actions
// =====================================================================

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/rbac'
import type {
  LoyaltyTier,
  LoyaltyAccount,
  LoyaltyAccountWithTier,
  LoyaltyTransaction,
  LoyaltyTransactionWithDetails,
  LoyaltyReward,
  LoyaltyRewardWithTier,
  LoyaltyRewardRedemption,
  CreateLoyaltyTierInput,
  UpdateLoyaltyTierInput,
  CreateLoyaltyRewardInput,
  UpdateLoyaltyRewardInput,
  AddLoyaltyPointsInput,
  RedeemRewardInput,
  LoyaltyDashboard,
  LoyaltyAnalytics,
  ApiResponse,
} from './types'

// =====================================================================
// LOYALTY TIERS
// =====================================================================

export async function getLoyaltyTiers(
  salonId: string
): Promise<ApiResponse<LoyaltyTier[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('loyalty_tiers')
      .select('*')
      .eq('salon_id', salonId)
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching loyalty tiers:', error)
    return { success: false, error: 'Failed to fetch loyalty tiers' }
  }
}

export async function createLoyaltyTier(
  salonId: string,
  input: CreateLoyaltyTierInput
): Promise<ApiResponse<LoyaltyTier>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('loyalty_tiers')
      .insert({
        salon_id: salonId,
        ...input,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error creating loyalty tier:', error)
    return { success: false, error: 'Failed to create loyalty tier' }
  }
}

export async function updateLoyaltyTier(
  tierId: string,
  input: UpdateLoyaltyTierInput
): Promise<ApiResponse<LoyaltyTier>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('loyalty_tiers')
      .update(input)
      .eq('id', tierId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating loyalty tier:', error)
    return { success: false, error: 'Failed to update loyalty tier' }
  }
}

export async function deleteLoyaltyTier(
  tierId: string
): Promise<ApiResponse<void>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('loyalty_tiers')
      .delete()
      .eq('id', tierId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting loyalty tier:', error)
    return { success: false, error: 'Failed to delete loyalty tier' }
  }
}

// =====================================================================
// LOYALTY ACCOUNTS
// =====================================================================

export async function getLoyaltyAccount(
  customerId: string
): Promise<ApiResponse<LoyaltyAccountWithTier | null>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('loyalty_accounts')
      .select(`
        *,
        tier:current_tier_id (
          id,
          name,
          slug,
          description,
          min_points,
          points_multiplier,
          discount_percent,
          color_hex,
          icon_name
        ),
        customer:customer_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('customer_id', customerId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // Ignore "not found"

    return { success: true, data: data || null }
  } catch (error) {
    console.error('Error fetching loyalty account:', error)
    return { success: false, error: 'Failed to fetch loyalty account' }
  }
}

export async function createLoyaltyAccount(
  salonId: string,
  customerId: string
): Promise<ApiResponse<LoyaltyAccount>> {
  try {
    const supabase = await createClient()

    // Check if account already exists
    const { data: existing } = await supabase
      .from('loyalty_accounts')
      .select('id')
      .eq('salon_id', salonId)
      .eq('customer_id', customerId)
      .single()

    if (existing) {
      return { success: false, error: 'Loyalty account already exists' }
    }

    const { data, error } = await supabase
      .from('loyalty_accounts')
      .insert({
        salon_id: salonId,
        customer_id: customerId,
      })
      .select()
      .single()

    if (error) throw error

    // Add signup bonus (if configured)
    await addLoyaltyPoints({
      account_id: data.id,
      points: 100, // TODO: Make configurable per salon
      source: 'signup',
      description: 'Welcome bonus',
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error creating loyalty account:', error)
    return { success: false, error: 'Failed to create loyalty account' }
  }
}

// =====================================================================
// LOYALTY TRANSACTIONS
// =====================================================================

export async function addLoyaltyPoints(
  input: AddLoyaltyPointsInput
): Promise<ApiResponse<LoyaltyTransaction>> {
  try {
    const supabase = await createClient()

    // Get account
    const { data: account, error: accountError } = await supabase
      .from('loyalty_accounts')
      .select('*, tier:current_tier_id(points_multiplier)')
      .eq('id', input.account_id)
      .single()

    if (accountError) throw accountError

    // Apply tier multiplier
    const multiplier = account.tier?.points_multiplier || 1.0
    const points = Math.floor(input.points * multiplier)

    // Calculate new balance
    const newBalance = account.points_balance + points
    const newLifetimePoints = account.lifetime_points + points

    // Create transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('loyalty_transactions')
      .insert({
        salon_id: account.salon_id,
        account_id: input.account_id,
        type: 'earned',
        source: input.source,
        points: points,
        balance_after: newBalance,
        order_id: input.order_id,
        appointment_id: input.appointment_id,
        description: input.description,
      })
      .select()
      .single()

    if (transactionError) throw transactionError

    // Update account
    const { error: updateError } = await supabase
      .from('loyalty_accounts')
      .update({
        points_balance: newBalance,
        lifetime_points: newLifetimePoints,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', input.account_id)

    if (updateError) throw updateError

    return { success: true, data: transaction }
  } catch (error) {
    console.error('Error adding loyalty points:', error)
    return { success: false, error: 'Failed to add loyalty points' }
  }
}

export async function getLoyaltyTransactions(
  accountId: string,
  limit = 20
): Promise<ApiResponse<LoyaltyTransactionWithDetails[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select(`
        *,
        reward:reward_id (
          id,
          name
        ),
        order:order_id (
          id,
          order_number
        ),
        appointment:appointment_id (
          id,
          starts_at
        )
      `)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching loyalty transactions:', error)
    return { success: false, error: 'Failed to fetch loyalty transactions' }
  }
}

// =====================================================================
// LOYALTY REWARDS
// =====================================================================

export async function getLoyaltyRewards(
  salonId: string,
  tierId?: string
): Promise<ApiResponse<LoyaltyRewardWithTier[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('loyalty_rewards')
      .select(`
        *,
        tier:requires_tier_id (
          id,
          name,
          slug
        ),
        service:service_id (
          id,
          name
        ),
        product:product_id (
          id,
          name
        )
      `)
      .eq('salon_id', salonId)
      .eq('active', true)

    if (tierId) {
      query = query.or(`requires_tier_id.eq.${tierId},requires_tier_id.is.null`)
    }

    const { data, error } = await query.order('sort_order', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching loyalty rewards:', error)
    return { success: false, error: 'Failed to fetch loyalty rewards' }
  }
}

export async function createLoyaltyReward(
  salonId: string,
  input: CreateLoyaltyRewardInput
): Promise<ApiResponse<LoyaltyReward>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('loyalty_rewards')
      .insert({
        salon_id: salonId,
        ...input,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error creating loyalty reward:', error)
    return { success: false, error: 'Failed to create loyalty reward' }
  }
}

export async function updateLoyaltyReward(
  rewardId: string,
  input: UpdateLoyaltyRewardInput
): Promise<ApiResponse<LoyaltyReward>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('loyalty_rewards')
      .update(input)
      .eq('id', rewardId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating loyalty reward:', error)
    return { success: false, error: 'Failed to update loyalty reward' }
  }
}

export async function deleteLoyaltyReward(
  rewardId: string
): Promise<ApiResponse<void>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('loyalty_rewards')
      .delete()
      .eq('id', rewardId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting loyalty reward:', error)
    return { success: false, error: 'Failed to delete loyalty reward' }
  }
}

// =====================================================================
// REWARD REDEMPTIONS
// =====================================================================

export async function redeemReward(
  input: RedeemRewardInput
): Promise<ApiResponse<LoyaltyRewardRedemption>> {
  try {
    const supabase = await createClient()

    // Get account and reward
    const [accountRes, rewardRes] = await Promise.all([
      supabase
        .from('loyalty_accounts')
        .select('*')
        .eq('id', input.account_id)
        .single(),
      supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('id', input.reward_id)
        .single(),
    ])

    if (accountRes.error) throw accountRes.error
    if (rewardRes.error) throw rewardRes.error

    const account = accountRes.data
    const reward = rewardRes.data

    // Check if enough points
    if (account.points_balance < reward.points_cost) {
      return { success: false, error: 'Not enough points' }
    }

    // Check redemption limits
    if (reward.max_redemptions_total !== null) {
      if (reward.current_redemptions >= reward.max_redemptions_total) {
        return { success: false, error: 'Reward is fully redeemed' }
      }
    }

    if (reward.max_redemptions_per_customer !== null) {
      const { count } = await supabase
        .from('loyalty_reward_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', input.account_id)
        .eq('reward_id', input.reward_id)

      if ((count || 0) >= reward.max_redemptions_per_customer) {
        return { success: false, error: 'You have reached the redemption limit for this reward' }
      }
    }

    // Deduct points
    const newBalance = account.points_balance - reward.points_cost

    // Create transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('loyalty_transactions')
      .insert({
        salon_id: account.salon_id,
        account_id: input.account_id,
        type: 'redeemed',
        source: 'reward',
        points: -reward.points_cost,
        balance_after: newBalance,
        reward_id: input.reward_id,
        order_id: input.order_id,
        appointment_id: input.appointment_id,
        description: `Redeemed: ${reward.name}`,
      })
      .select()
      .single()

    if (transactionError) throw transactionError

    // Update account balance
    const { error: updateError } = await supabase
      .from('loyalty_accounts')
      .update({
        points_balance: newBalance,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', input.account_id)

    if (updateError) throw updateError

    // Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from('loyalty_reward_redemptions')
      .insert({
        salon_id: account.salon_id,
        reward_id: input.reward_id,
        account_id: input.account_id,
        transaction_id: transaction.id,
        order_id: input.order_id,
        appointment_id: input.appointment_id,
        status: 'active',
        expires_at: reward.valid_until,
      })
      .select()
      .single()

    if (redemptionError) throw redemptionError

    // Increment redemption counter on reward
    await supabase
      .from('loyalty_rewards')
      .update({
        current_redemptions: reward.current_redemptions + 1,
      })
      .eq('id', input.reward_id)

    return { success: true, data: redemption }
  } catch (error) {
    console.error('Error redeeming reward:', error)
    return { success: false, error: 'Failed to redeem reward' }
  }
}

// =====================================================================
// DASHBOARD & ANALYTICS
// =====================================================================

export async function getLoyaltyDashboard(
  customerId: string
): Promise<ApiResponse<LoyaltyDashboard>> {
  try {
    const supabase = await createClient()

    // Get account
    const accountRes = await getLoyaltyAccount(customerId)
    if (!accountRes.success || !accountRes.data) {
      return { success: false, error: 'Loyalty account not found' }
    }

    const account = accountRes.data

    // Get available rewards
    const rewardsRes = await getLoyaltyRewards(
      account.salon_id,
      account.current_tier_id || undefined
    )
    const availableRewards = rewardsRes.data || []

    // Get recent transactions
    const transactionsRes = await getLoyaltyTransactions(account.id, 10)
    const recentTransactions = transactionsRes.data || []

    // Get next tier
    const { data: nextTiers } = await supabase
      .from('loyalty_tiers')
      .select('*')
      .eq('salon_id', account.salon_id)
      .eq('active', true)
      .gt('min_points', account.lifetime_points)
      .order('min_points', { ascending: true })
      .limit(1)

    let nextTier = null
    if (nextTiers && nextTiers.length > 0) {
      const tier = nextTiers[0]
      const pointsNeeded = tier.min_points - account.lifetime_points
      const progressPercent = (account.lifetime_points / tier.min_points) * 100

      nextTier = {
        tier,
        points_needed: pointsNeeded,
        progress_percent: Math.min(progressPercent, 100),
      }
    }

    return {
      success: true,
      data: {
        account,
        availableRewards,
        recentTransactions,
        nextTier,
      },
    }
  } catch (error) {
    console.error('Error fetching loyalty dashboard:', error)
    return { success: false, error: 'Failed to fetch loyalty dashboard' }
  }
}

export async function getLoyaltyAnalytics(
  salonId: string
): Promise<ApiResponse<LoyaltyAnalytics>> {
  try {
    const supabase = await createClient()

    // Total accounts
    const { count: totalAccounts } = await supabase
      .from('loyalty_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('salon_id', salonId)

    // Active accounts (activity in last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { count: activeAccounts } = await supabase
      .from('loyalty_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('salon_id', salonId)
      .gte('last_activity_at', ninetyDaysAgo.toISOString())

    // Points stats
    const { data: accounts } = await supabase
      .from('loyalty_accounts')
      .select('lifetime_points, current_tier_id, tier:current_tier_id(name)')
      .eq('salon_id', salonId)

    const totalPointsIssued = accounts?.reduce((sum, acc) => sum + acc.lifetime_points, 0) || 0
    const avgPointsPerCustomer = totalAccounts ? totalPointsIssued / totalAccounts : 0

    // Tier distribution
    const tierCounts = new Map<string, number>()
    accounts?.forEach((acc) => {
      const tierName = acc.tier?.name || 'No Tier'
      tierCounts.set(tierName, (tierCounts.get(tierName) || 0) + 1)
    })

    const tierDistribution = Array.from(tierCounts.entries()).map(([tier_name, customer_count]) => ({
      tier_name,
      customer_count,
    }))

    // Top earners
    const { data: topEarnersData } = await supabase
      .from('loyalty_accounts')
      .select(`
        lifetime_points,
        customer:customer_id (
          first_name,
          last_name
        )
      `)
      .eq('salon_id', salonId)
      .order('lifetime_points', { ascending: false })
      .limit(10)

    const topEarners = topEarnersData?.map((acc) => ({
      customer_name: `${acc.customer.first_name} ${acc.customer.last_name}`,
      lifetime_points: acc.lifetime_points,
    })) || []

    // Total redeemed points (negative transactions)
    const { data: transactions } = await supabase
      .from('loyalty_transactions')
      .select('points')
      .eq('salon_id', salonId)
      .eq('type', 'redeemed')

    const totalPointsRedeemed = Math.abs(
      transactions?.reduce((sum, t) => sum + t.points, 0) || 0
    )

    return {
      success: true,
      data: {
        total_accounts: totalAccounts || 0,
        active_accounts: activeAccounts || 0,
        total_points_issued: totalPointsIssued,
        total_points_redeemed: totalPointsRedeemed,
        average_points_per_customer: Math.round(avgPointsPerCustomer),
        tier_distribution: tierDistribution,
        top_earners: topEarners,
      },
    }
  } catch (error) {
    console.error('Error fetching loyalty analytics:', error)
    return { success: false, error: 'Failed to fetch loyalty analytics' }
  }
}
