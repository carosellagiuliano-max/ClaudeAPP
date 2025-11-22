'use server'

// =====================================================================
// WAITLIST - Server Actions
// =====================================================================

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/rbac'
import { sendEmail } from '@/lib/email'

// =====================================================================
// Types
// =====================================================================

export type WaitlistStatus = 'active' | 'notified' | 'booked' | 'expired' | 'cancelled'

export interface WaitlistEntry {
  id: string
  salon_id: string
  customer_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  desired_service_id: string
  preferred_staff_id: string | null
  desired_date: string | null
  date_range_start: string | null
  date_range_end: string | null
  preferred_time_of_day: string[] | null
  preferred_weekdays: number[] | null
  customer_notes: string | null
  internal_notes: string | null
  status: WaitlistStatus
  notified_at: string | null
  notification_count: number
  last_notification_at: string | null
  expires_at: string | null
  auto_expire_days: number
  priority: number
  created_at: string
}

export interface WaitlistEntryWithDetails extends WaitlistEntry {
  service: {
    id: string
    name: string
  }
  staff?: {
    id: string
    first_name: string
    last_name: string
  }
  customer?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface AddToWaitlistInput {
  salon_id: string
  customer_id?: string
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  desired_service_id: string
  preferred_staff_id?: string
  desired_date?: string
  date_range_start?: string
  date_range_end?: string
  preferred_time_of_day?: string[]
  preferred_weekdays?: number[]
  customer_notes?: string
  auto_expire_days?: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// =====================================================================
// WAITLIST CRUD
// =====================================================================

export async function addToWaitlist(
  input: AddToWaitlistInput
): Promise<ApiResponse<WaitlistEntry>> {
  try {
    const supabase = await createClient()

    // Validation
    if (!input.customer_id && (!input.guest_email || !input.guest_name)) {
      return {
        success: false,
        error: 'Either customer_id or guest_email and guest_name are required',
      }
    }

    const { data, error } = await supabase
      .from('waitlist_entries')
      .insert({
        salon_id: input.salon_id,
        customer_id: input.customer_id,
        guest_name: input.guest_name,
        guest_email: input.guest_email,
        guest_phone: input.guest_phone,
        desired_service_id: input.desired_service_id,
        preferred_staff_id: input.preferred_staff_id,
        desired_date: input.desired_date,
        date_range_start: input.date_range_start,
        date_range_end: input.date_range_end,
        preferred_time_of_day: input.preferred_time_of_day,
        preferred_weekdays: input.preferred_weekdays,
        customer_notes: input.customer_notes,
        auto_expire_days: input.auto_expire_days || 30,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    // Send confirmation email
    const email = input.guest_email || (input.customer_id ? '' : '')
    if (email) {
      await sendEmail({
        to: email,
        subject: 'Sie stehen auf der Warteliste',
        html: `
          <p>Vielen Dank! Sie wurden erfolgreich auf die Warteliste gesetzt.</p>
          <p>Wir werden Sie benachrichtigen, sobald ein passender Termin verfügbar ist.</p>
        `,
        tags: { type: 'waitlist_confirmation' },
      })
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error adding to waitlist:', error)
    return { success: false, error: 'Failed to add to waitlist' }
  }
}

export async function getWaitlistEntries(
  salonId: string,
  status?: WaitlistStatus
): Promise<ApiResponse<WaitlistEntryWithDetails[]>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('waitlist_entries')
      .select(`
        *,
        service:desired_service_id (
          id,
          name
        ),
        staff:preferred_staff_id (
          id,
          first_name,
          last_name
        ),
        customer:customer_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching waitlist entries:', error)
    return { success: false, error: 'Failed to fetch waitlist entries' }
  }
}

export async function getCustomerWaitlistEntries(
  customerId: string
): Promise<ApiResponse<WaitlistEntryWithDetails[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('waitlist_entries')
      .select(`
        *,
        service:desired_service_id (
          id,
          name
        ),
        staff:preferred_staff_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('customer_id', customerId)
      .in('status', ['active', 'notified'])
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching customer waitlist entries:', error)
    return { success: false, error: 'Failed to fetch waitlist entries' }
  }
}

export async function updateWaitlistEntry(
  entryId: string,
  updates: Partial<WaitlistEntry>
): Promise<ApiResponse<WaitlistEntry>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('waitlist_entries')
      .update(updates)
      .eq('id', entryId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating waitlist entry:', error)
    return { success: false, error: 'Failed to update waitlist entry' }
  }
}

export async function cancelWaitlistEntry(
  entryId: string
): Promise<ApiResponse<void>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('waitlist_entries')
      .update({ status: 'cancelled' })
      .eq('id', entryId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error cancelling waitlist entry:', error)
    return { success: false, error: 'Failed to cancel waitlist entry' }
  }
}

export async function deleteWaitlistEntry(
  entryId: string
): Promise<ApiResponse<void>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('waitlist_entries')
      .delete()
      .eq('id', entryId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting waitlist entry:', error)
    return { success: false, error: 'Failed to delete waitlist entry' }
  }
}

// =====================================================================
// NOTIFICATIONS
// =====================================================================

export async function notifyWaitlistCustomer(
  entryId: string,
  availableSlots?: {
    date: string
    time: string
    staff_name: string
  }[]
): Promise<ApiResponse<void>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    // Get entry with details
    const { data: entry, error: entryError } = await supabase
      .from('waitlist_entries')
      .select(`
        *,
        service:desired_service_id (name),
        customer:customer_id (first_name, email)
      `)
      .eq('id', entryId)
      .single()

    if (entryError) throw entryError

    // Determine recipient
    const recipientEmail = entry.customer?.email || entry.guest_email
    const recipientName = entry.customer?.first_name || entry.guest_name

    if (!recipientEmail) {
      return { success: false, error: 'No email address found' }
    }

    // Build email content
    let slotsHtml = ''
    if (availableSlots && availableSlots.length > 0) {
      slotsHtml = '<p><strong>Verfügbare Termine:</strong></p><ul>'
      availableSlots.forEach((slot) => {
        slotsHtml += `<li>${slot.date} um ${slot.time} Uhr bei ${slot.staff_name}</li>`
      })
      slotsHtml += '</ul>'
    }

    // Send email
    await sendEmail({
      to: recipientEmail,
      subject: 'Termin verfügbar - Warteliste',
      html: `
        <p>Hallo ${recipientName},</p>
        <p>Gute Neuigkeiten! Für Ihren gewünschten Service "${entry.service.name}" ist nun ein Termin verfügbar.</p>
        ${slotsHtml}
        <p>Bitte melden Sie sich schnellstmöglich, um den Termin zu buchen.</p>
      `,
      tags: { type: 'waitlist_notification' },
    })

    // Update entry
    await supabase
      .from('waitlist_entries')
      .update({
        status: 'notified',
        notified_at: new Date().toISOString(),
        notification_count: entry.notification_count + 1,
        last_notification_at: new Date().toISOString(),
      })
      .eq('id', entryId)

    return { success: true }
  } catch (error) {
    console.error('Error notifying waitlist customer:', error)
    return { success: false, error: 'Failed to notify customer' }
  }
}

// =====================================================================
// BATCH OPERATIONS
// =====================================================================

export async function expireOldWaitlistEntries(): Promise<ApiResponse<number>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('expire_old_waitlist_entries')

    if (error) throw error

    return { success: true, data: data || 0 }
  } catch (error) {
    console.error('Error expiring old waitlist entries:', error)
    return { success: false, error: 'Failed to expire old entries' }
  }
}
