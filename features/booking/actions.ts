'use server'

/**
 * Booking Server Actions
 *
 * Server-side functions for the booking flow:
 * - Fetching available services and staff
 * - Calculating available time slots
 * - Creating bookings with temporary reservations
 * - Managing customer records
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/db/client'
import {
  calculateAvailableSlots,
  type DaySchedule,
  type AppointmentBlock,
  type TimeRange,
  type BookingRequest,
  type AvailableSlot,
} from './slot-engine'
import {
  type CompleteBooking,
  type AvailableSlotsResponse,
  type CreateBookingResponse,
  type BookingConfirmation,
  type DbBookingRule,
  type ServiceWithCategory,
  type StaffMember,
  completeBookingSchema,
} from './types'
import { addDays, startOfDay, format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

// ============================================================================
// Fetch Services for Booking
// ============================================================================

export async function getBookableServices(salonId: string): Promise<ServiceWithCategory[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('services')
    .select(`
      id,
      name,
      description,
      base_duration_minutes,
      base_price_chf,
      online_bookable,
      is_active,
      display_order,
      category:service_categories (
        id,
        name,
        display_order
      )
    `)
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .eq('online_bookable', true)
    .order('display_order')

  if (error) throw error

  return (data || []).map(service => ({
    id: service.id,
    name: service.name,
    description: service.description,
    durationMinutes: service.base_duration_minutes,
    priceChf: Number(service.base_price_chf),
    categoryId: service.category?.id || '',
    categoryName: service.category?.name || 'Andere',
    categoryDisplayOrder: service.category?.display_order || 999,
    displayOrder: service.display_order,
    onlineBookable: service.online_bookable,
    isActive: service.is_active,
  }))
}

// ============================================================================
// Fetch Staff for Booking
// ============================================================================

export async function getBookableStaff(
  salonId: string,
  serviceIds: string[]
): Promise<StaffMember[]> {
  const supabase = createClient()

  // Get staff who can perform ALL selected services
  const { data, error } = await supabase
    .from('staff')
    .select(`
      id,
      user_id,
      profiles!inner (
        first_name,
        last_name,
        avatar_url
      ),
      is_active,
      can_book_online,
      bio,
      staff_service_skills!inner (
        service_id
      )
    `)
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .eq('can_book_online', true)

  if (error) throw error

  // Filter staff who can perform all selected services
  const staffMembers: StaffMember[] = []

  for (const staff of data || []) {
    const staffServiceIds = staff.staff_service_skills?.map(s => s.service_id) || []
    const canPerformAll = serviceIds.every(id => staffServiceIds.includes(id))

    if (canPerformAll) {
      const profile = Array.isArray(staff.profiles) ? staff.profiles[0] : staff.profiles

      staffMembers.push({
        id: staff.id,
        userId: staff.user_id,
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        displayName: `${profile?.first_name} ${profile?.last_name}`,
        bio: staff.bio,
        avatarUrl: profile?.avatar_url,
        isActive: staff.is_active,
        canBook: staff.can_book_online,
        serviceIds: staffServiceIds,
      })
    }
  }

  return staffMembers
}

// ============================================================================
// Fetch Available Slots
// ============================================================================

export async function getAvailableSlots(
  salonId: string,
  serviceIds: string[],
  staffId: string | null,
  startDate: Date,
  daysToFetch: number = 14
): Promise<AvailableSlotsResponse> {
  try {
    const supabase = createClient()

    // 1. Get salon and booking rules
    const { data: salon } = await supabase
      .from('salons')
      .select('timezone')
      .eq('id', salonId)
      .single()

    if (!salon) {
      return { success: false, slots: {}, error: 'Salon nicht gefunden' }
    }

    const timezone = salon.timezone

    const { data: rules } = await supabase
      .from('booking_rules')
      .select('*')
      .eq('salon_id', salonId)
      .single()

    const bookingRules: DbBookingRule = rules || {
      id: '',
      salon_id: salonId,
      min_lead_time_minutes: 120, // 2 hours
      max_booking_horizon_days: 60,
      slot_granularity_minutes: 15,
      allow_overlapping_services: false,
      require_staff_selection: false,
      auto_confirm_online_bookings: false,
      reservation_hold_minutes: 15,
      send_confirmation_email: true,
      send_reminder_email: true,
      reminder_hours_before: 24,
      created_at: '',
      updated_at: '',
    }

    // 2. Calculate total duration
    const { data: services } = await supabase
      .from('services')
      .select('base_duration_minutes')
      .in('id', serviceIds)

    const totalDuration = (services || []).reduce(
      (sum, s) => sum + s.base_duration_minutes,
      0
    )

    // 3. Get staff IDs to check
    const staffIdsToCheck = staffId ? [staffId] : await getBookableStaffIds(salonId, serviceIds)

    if (staffIdsToCheck.length === 0) {
      return { success: false, slots: {}, error: 'Keine verfügbaren Mitarbeiter' }
    }

    // 4. Build schedules for each day
    const schedules: DaySchedule[] = []

    for (let i = 0; i < daysToFetch; i++) {
      const date = addDays(startOfDay(startDate), i)
      const schedule = await buildDaySchedule(supabase, salonId, date, staffIdsToCheck, timezone)
      schedules.push(schedule)
    }

    // 5. Calculate available slots
    const bookingRequest: BookingRequest = {
      salonId,
      serviceIds,
      staffId: staffId || undefined,
      totalDurationMinutes: totalDuration,
    }

    const slotsByDate = calculateAvailableSlots(schedules, bookingRequest, bookingRules, timezone)

    // 6. Convert to response format
    const responseSlots: Record<string, any[]> = {}

    for (const [dateKey, slots] of slotsByDate) {
      responseSlots[dateKey] = slots.map(slot => ({
        date: dateKey,
        startMinutes: slot.startMinutes,
        endMinutes: slot.endMinutes,
        startTime: slot.startTime,
        endTime: slot.endTime,
        datetime: slot.datetime.toISOString(),
        staffId: slot.staffId,
        staffName: '', // Will be filled by client
        available: true,
      }))
    }

    return { success: true, slots: responseSlots }
  } catch (error) {
    console.error('Error fetching available slots:', error)
    return { success: false, slots: {}, error: 'Fehler beim Laden der verfügbaren Zeiten' }
  }
}

async function getBookableStaffIds(salonId: string, serviceIds: string[]): Promise<string[]> {
  const staff = await getBookableStaff(salonId, serviceIds)
  return staff.map(s => s.id)
}

async function buildDaySchedule(
  supabase: any,
  salonId: string,
  date: Date,
  staffIds: string[],
  timezone: string
): Promise<DaySchedule> {
  const dayOfWeek = date.getDay() // 0=Sunday, 6=Saturday
  const dateStr = format(date, 'yyyy-MM-dd')

  // Get opening hours
  const { data: openingHours } = await supabase
    .from('opening_hours')
    .select('opens_at_minutes, closes_at_minutes')
    .eq('salon_id', salonId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_closed', false)

  const openingRanges: TimeRange[] = (openingHours || []).map(oh => ({
    startMinutes: oh.opens_at_minutes,
    endMinutes: oh.closes_at_minutes,
  }))

  // Get staff schedules
  const staffSchedules = new Map<string, TimeRange[]>()

  for (const staffId of staffIds) {
    const { data: workingHours } = await supabase
      .from('staff_working_hours')
      .select('start_time_minutes, end_time_minutes')
      .eq('staff_id', staffId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)

    staffSchedules.set(
      staffId,
      (workingHours || []).map(wh => ({
        startMinutes: wh.start_time_minutes,
        endMinutes: wh.end_time_minutes,
      }))
    )

    // Check for absences
    const { data: absences } = await supabase
      .from('staff_absences')
      .select('starts_at, ends_at, is_all_day')
      .eq('staff_id', staffId)
      .lte('starts_at', `${dateStr}T23:59:59`)
      .gte('ends_at', `${dateStr}T00:00:00`)

    // Remove time ranges where staff is absent
    // (Implementation would subtract absence times from working hours)
  }

  // Get existing appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select('staff_id, starts_at, ends_at')
    .eq('salon_id', salonId)
    .in('staff_id', staffIds)
    .gte('starts_at', `${dateStr}T00:00:00`)
    .lt('starts_at', `${dateStr}T23:59:59`)
    .in('status', ['reserved', 'confirmed', 'checked_in', 'in_progress'])

  const appointmentBlocks: AppointmentBlock[] = (appointments || []).map(apt => {
    const starts = toZonedTime(apt.starts_at, timezone)
    const ends = toZonedTime(apt.ends_at, timezone)
    const startMinutes = starts.getHours() * 60 + starts.getMinutes()
    const endMinutes = ends.getHours() * 60 + ends.getMinutes()

    return {
      staffId: apt.staff_id,
      startMinutes,
      durationMinutes: endMinutes - startMinutes,
    }
  })

  // Get blocked times
  const { data: blockedTimes } = await supabase
    .from('blocked_times')
    .select('starts_at, ends_at')
    .eq('salon_id', salonId)
    .lte('starts_at', `${dateStr}T23:59:59`)
    .gte('ends_at', `${dateStr}T00:00:00`)

  const blockedRanges: TimeRange[] = (blockedTimes || []).map(bt => {
    const starts = toZonedTime(bt.starts_at, timezone)
    const ends = toZonedTime(bt.ends_at, timezone)
    return {
      startMinutes: starts.getHours() * 60 + starts.getMinutes(),
      endMinutes: ends.getHours() * 60 + ends.getMinutes(),
    }
  })

  return {
    date,
    openingHours: openingRanges,
    staffSchedules,
    appointments: appointmentBlocks,
    blockedTimes: blockedRanges,
  }
}

// ============================================================================
// Create Booking
// ============================================================================

export async function createBooking(
  booking: CompleteBooking
): Promise<CreateBookingResponse> {
  try {
    // Validate input
    const validated = completeBookingSchema.parse(booking)

    const supabase = createClient()

    // Get salon and rules
    const { data: salon } = await supabase
      .from('salons')
      .select('timezone')
      .eq('id', validated.salonId)
      .single()

    if (!salon) {
      return { success: false, error: 'Salon nicht gefunden' }
    }

    const { data: rules } = await supabase
      .from('booking_rules')
      .select('reservation_hold_minutes, auto_confirm_online_bookings')
      .eq('salon_id', validated.salonId)
      .single()

    // Handle customer: find existing or create new
    let customerId = validated.customer.customerId

    if (!customerId) {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          salon_id: validated.salonId,
          first_name: validated.customer.firstName!,
          last_name: validated.customer.lastName!,
          email: validated.customer.email!,
          phone: validated.customer.phone!,
          notes: validated.customer.notes,
          marketing_consent: false,
        })
        .select('id')
        .single()

      if (customerError) {
        return { success: false, error: 'Fehler beim Erstellen des Kunden' }
      }

      customerId = newCustomer.id
    }

    // Create appointment
    const startsAt = parseISO(validated.datetime)
    const endsAt = new Date(startsAt.getTime() + (validated.endMinutes - validated.startMinutes) * 60 * 1000)

    const reservedUntil = rules
      ? new Date(Date.now() + rules.reservation_hold_minutes * 60 * 1000)
      : new Date(Date.now() + 15 * 60 * 1000)

    const status = rules?.auto_confirm_online_bookings ? 'confirmed' : 'reserved'

    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        salon_id: validated.salonId,
        customer_id: customerId,
        staff_id: validated.staffId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status,
        source: 'online',
        reserved_until: status === 'reserved' ? reservedUntil.toISOString() : null,
        customer_notes: validated.customer.notes,
        confirmation_number: generateConfirmationNumber(),
      })
      .select('id, confirmation_number')
      .single()

    if (aptError) {
      console.error('Appointment creation error:', aptError)
      return { success: false, error: 'Fehler beim Erstellen des Termins' }
    }

    // Add appointment services (snapshot prices)
    for (let i = 0; i < validated.services.length; i++) {
      const service = validated.services[i]

      await supabase.from('appointment_services').insert({
        appointment_id: appointment.id,
        service_id: service.serviceId,
        service_name_snapshot: service.name,
        duration_minutes_snapshot: service.durationMinutes,
        price_chf_snapshot: service.priceChf,
        tax_rate_snapshot: 8.1, // TODO: Get from tax_rates table
        display_order: i,
      })
    }

    revalidatePath('/customer/appointments')

    return {
      success: true,
      appointmentId: appointment.id,
      reservedUntil: status === 'reserved' ? reservedUntil.toISOString() : undefined,
    }
  } catch (error) {
    console.error('Create booking error:', error)
    return { success: false, error: 'Fehler beim Erstellen der Buchung' }
  }
}

function generateConfirmationNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ============================================================================
// Cancel Booking
// ============================================================================

export async function cancelBooking(
  appointmentId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        internal_notes: reason ? `Storniert: ${reason}` : 'Vom Kunden storniert',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)

    if (error) throw error

    revalidatePath('/customer/appointments')

    return { success: true }
  } catch (error) {
    console.error('Cancel booking error:', error)
    return { success: false, error: 'Fehler beim Stornieren des Termins' }
  }
}
