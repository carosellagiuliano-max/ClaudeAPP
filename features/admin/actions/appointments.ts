'use server'

/**
 * Appointments Management Server Actions
 * CRUD operations for appointments and booking
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requireStaff } from '@/lib/auth/rbac'
import type {
  ApiResponse,
  Appointment,
  AppointmentWithDetails,
  AppointmentInput,
  AppointmentUpdateInput,
  BookingRules,
} from '../types/appointments'
import { appointmentSchema, appointmentUpdateSchema } from '../types/appointments'

// ============================================================
// APPOINTMENTS
// ============================================================

/**
 * Get all appointments for a salon with optional date filtering
 */
export async function getAppointments(
  salonId: string,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<AppointmentWithDetails[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    let query = supabase
      .from('appointments')
      .select(
        `
        *,
        customer:customers!customer_id(
          id,
          profile:profiles!profile_id(
            first_name,
            last_name,
            email,
            phone
          )
        ),
        staff:staff!staff_id(
          id,
          display_name,
          photo_url
        ),
        services:appointment_services(
          id,
          salon_id,
          appointment_id,
          service_id,
          snapshot_price_chf,
          snapshot_tax_rate_percent,
          snapshot_tax_chf,
          snapshot_duration_minutes,
          snapshot_service_name,
          sort_order,
          created_at
        )
      `
      )
      .eq('salon_id', salonId)
      .order('starts_at', { ascending: true })

    if (startDate) {
      query = query.gte('starts_at', startDate)
    }
    if (endDate) {
      query = query.lte('starts_at', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: data.map((apt: any) => ({
        id: apt.id,
        salonId: apt.salon_id,
        customerId: apt.customer_id,
        staffId: apt.staff_id,
        startsAt: apt.starts_at,
        endsAt: apt.ends_at,
        status: apt.status,
        reservedUntil: apt.reserved_until,
        totalPriceChf: apt.total_price_chf ? parseFloat(apt.total_price_chf) : null,
        totalTaxChf: apt.total_tax_chf ? parseFloat(apt.total_tax_chf) : null,
        totalDurationMinutes: apt.total_duration_minutes,
        depositRequired: apt.deposit_required,
        depositAmountChf: apt.deposit_amount_chf ? parseFloat(apt.deposit_amount_chf) : null,
        depositPaid: apt.deposit_paid,
        depositPaymentId: apt.deposit_payment_id,
        bookedVia: apt.booked_via,
        bookedByProfileId: apt.booked_by_profile_id,
        customerNotes: apt.customer_notes,
        staffNotes: apt.staff_notes,
        cancelledAt: apt.cancelled_at,
        cancelledByProfileId: apt.cancelled_by_profile_id,
        cancellationReason: apt.cancellation_reason,
        completedAt: apt.completed_at,
        noShowCharged: apt.no_show_charged,
        metadata: apt.metadata || {},
        createdAt: apt.created_at,
        updatedAt: apt.updated_at,
        customer: {
          id: apt.customer.id,
          profile: {
            firstName: apt.customer.profile.first_name,
            lastName: apt.customer.profile.last_name,
            email: apt.customer.profile.email,
            phone: apt.customer.profile.phone,
          },
        },
        staff: {
          id: apt.staff.id,
          displayName: apt.staff.display_name,
          photoUrl: apt.staff.photo_url,
        },
        services: apt.services.map((svc: any) => ({
          id: svc.id,
          salonId: svc.salon_id,
          appointmentId: svc.appointment_id,
          serviceId: svc.service_id,
          snapshotPriceChf: parseFloat(svc.snapshot_price_chf),
          snapshotTaxRatePercent: svc.snapshot_tax_rate_percent
            ? parseFloat(svc.snapshot_tax_rate_percent)
            : null,
          snapshotTaxChf: svc.snapshot_tax_chf ? parseFloat(svc.snapshot_tax_chf) : null,
          snapshotDurationMinutes: svc.snapshot_duration_minutes,
          snapshotServiceName: svc.snapshot_service_name,
          sortOrder: svc.sort_order,
          createdAt: svc.created_at,
        })),
      })),
    }
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Termine',
    }
  }
}

/**
 * Get a single appointment by ID
 */
export async function getAppointmentById(
  salonId: string,
  appointmentId: string
): Promise<ApiResponse<AppointmentWithDetails>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('appointments')
      .select(
        `
        *,
        customer:customers!customer_id(
          id,
          profile:profiles!profile_id(
            first_name,
            last_name,
            email,
            phone
          )
        ),
        staff:staff!staff_id(
          id,
          display_name,
          photo_url
        ),
        services:appointment_services(
          id,
          salon_id,
          appointment_id,
          service_id,
          snapshot_price_chf,
          snapshot_tax_rate_percent,
          snapshot_tax_chf,
          snapshot_duration_minutes,
          snapshot_service_name,
          sort_order,
          created_at
        )
      `
      )
      .eq('id', appointmentId)
      .eq('salon_id', salonId)
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        customerId: data.customer_id,
        staffId: data.staff_id,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        status: data.status,
        reservedUntil: data.reserved_until,
        totalPriceChf: data.total_price_chf ? parseFloat(data.total_price_chf) : null,
        totalTaxChf: data.total_tax_chf ? parseFloat(data.total_tax_chf) : null,
        totalDurationMinutes: data.total_duration_minutes,
        depositRequired: data.deposit_required,
        depositAmountChf: data.deposit_amount_chf ? parseFloat(data.deposit_amount_chf) : null,
        depositPaid: data.deposit_paid,
        depositPaymentId: data.deposit_payment_id,
        bookedVia: data.booked_via,
        bookedByProfileId: data.booked_by_profile_id,
        customerNotes: data.customer_notes,
        staffNotes: data.staff_notes,
        cancelledAt: data.cancelled_at,
        cancelledByProfileId: data.cancelled_by_profile_id,
        cancellationReason: data.cancellation_reason,
        completedAt: data.completed_at,
        noShowCharged: data.no_show_charged,
        metadata: data.metadata || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        customer: {
          id: data.customer.id,
          profile: {
            firstName: data.customer.profile.first_name,
            lastName: data.customer.profile.last_name,
            email: data.customer.profile.email,
            phone: data.customer.profile.phone,
          },
        },
        staff: {
          id: data.staff.id,
          displayName: data.staff.display_name,
          photoUrl: data.staff.photo_url,
        },
        services: data.services.map((svc: any) => ({
          id: svc.id,
          salonId: svc.salon_id,
          appointmentId: svc.appointment_id,
          serviceId: svc.service_id,
          snapshotPriceChf: parseFloat(svc.snapshot_price_chf),
          snapshotTaxRatePercent: svc.snapshot_tax_rate_percent
            ? parseFloat(svc.snapshot_tax_rate_percent)
            : null,
          snapshotTaxChf: svc.snapshot_tax_chf ? parseFloat(svc.snapshot_tax_chf) : null,
          snapshotDurationMinutes: svc.snapshot_duration_minutes,
          snapshotServiceName: svc.snapshot_service_name,
          sortOrder: svc.sort_order,
          createdAt: svc.created_at,
        })),
      },
    }
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden des Termins',
    }
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(
  salonId: string,
  input: AppointmentInput
): Promise<ApiResponse<Appointment>> {
  try {
    await requireStaff(salonId)

    const validated = appointmentSchema.parse(input)
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Start transaction: Create appointment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        salon_id: salonId,
        customer_id: validated.customerId,
        staff_id: validated.staffId,
        starts_at: validated.startsAt,
        ends_at: validated.endsAt,
        status: validated.status || 'confirmed',
        booked_via: validated.bookedVia || 'admin',
        booked_by_profile_id: user?.id,
        customer_notes: validated.customerNotes,
        staff_notes: validated.staffNotes,
      })
      .select()
      .single()

    if (aptError) throw aptError

    // Add services
    const servicesData = validated.services.map((svc, index) => ({
      salon_id: salonId,
      appointment_id: appointment.id,
      service_id: svc.serviceId,
      snapshot_price_chf: svc.snapshotPriceChf,
      snapshot_tax_rate_percent: svc.snapshotTaxRatePercent,
      snapshot_tax_chf: svc.snapshotTaxChf,
      snapshot_duration_minutes: svc.snapshotDurationMinutes,
      snapshot_service_name: svc.snapshotServiceName,
      sort_order: svc.sortOrder ?? index,
    }))

    const { error: servicesError } = await supabase
      .from('appointment_services')
      .insert(servicesData)

    if (servicesError) throw servicesError

    revalidatePath('/admin/termine')

    return {
      success: true,
      data: {
        id: appointment.id,
        salonId: appointment.salon_id,
        customerId: appointment.customer_id,
        staffId: appointment.staff_id,
        startsAt: appointment.starts_at,
        endsAt: appointment.ends_at,
        status: appointment.status,
        reservedUntil: appointment.reserved_until,
        totalPriceChf: appointment.total_price_chf
          ? parseFloat(appointment.total_price_chf)
          : null,
        totalTaxChf: appointment.total_tax_chf ? parseFloat(appointment.total_tax_chf) : null,
        totalDurationMinutes: appointment.total_duration_minutes,
        depositRequired: appointment.deposit_required,
        depositAmountChf: appointment.deposit_amount_chf
          ? parseFloat(appointment.deposit_amount_chf)
          : null,
        depositPaid: appointment.deposit_paid,
        depositPaymentId: appointment.deposit_payment_id,
        bookedVia: appointment.booked_via,
        bookedByProfileId: appointment.booked_by_profile_id,
        customerNotes: appointment.customer_notes,
        staffNotes: appointment.staff_notes,
        cancelledAt: appointment.cancelled_at,
        cancelledByProfileId: appointment.cancelled_by_profile_id,
        cancellationReason: appointment.cancellation_reason,
        completedAt: appointment.completed_at,
        noShowCharged: appointment.no_show_charged,
        metadata: appointment.metadata || {},
        createdAt: appointment.created_at,
        updatedAt: appointment.updated_at,
      },
    }
  } catch (error) {
    console.error('Error creating appointment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Erstellen des Termins',
    }
  }
}

/**
 * Update an appointment
 */
export async function updateAppointment(
  salonId: string,
  appointmentId: string,
  input: Partial<AppointmentUpdateInput>
): Promise<ApiResponse<Appointment>> {
  try {
    await requireStaff(salonId)

    const validated = appointmentUpdateSchema.partial().parse(input)
    const supabase = await createClient()

    const updateData: Record<string, any> = {}
    if (validated.customerId !== undefined) updateData.customer_id = validated.customerId
    if (validated.staffId !== undefined) updateData.staff_id = validated.staffId
    if (validated.startsAt !== undefined) updateData.starts_at = validated.startsAt
    if (validated.endsAt !== undefined) updateData.ends_at = validated.endsAt
    if (validated.status !== undefined) updateData.status = validated.status
    if (validated.customerNotes !== undefined) updateData.customer_notes = validated.customerNotes
    if (validated.staffNotes !== undefined) updateData.staff_notes = validated.staffNotes

    // Handle cancellation
    if (validated.status === 'cancelled') {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      updateData.cancelled_at = new Date().toISOString()
      updateData.cancelled_by_profile_id = user?.id
      if (validated.cancellationReason) {
        updateData.cancellation_reason = validated.cancellationReason
      }
    }

    // Handle completion
    if (validated.status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/termine')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        customerId: data.customer_id,
        staffId: data.staff_id,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        status: data.status,
        reservedUntil: data.reserved_until,
        totalPriceChf: data.total_price_chf ? parseFloat(data.total_price_chf) : null,
        totalTaxChf: data.total_tax_chf ? parseFloat(data.total_tax_chf) : null,
        totalDurationMinutes: data.total_duration_minutes,
        depositRequired: data.deposit_required,
        depositAmountChf: data.deposit_amount_chf ? parseFloat(data.deposit_amount_chf) : null,
        depositPaid: data.deposit_paid,
        depositPaymentId: data.deposit_payment_id,
        bookedVia: data.booked_via,
        bookedByProfileId: data.booked_by_profile_id,
        customerNotes: data.customer_notes,
        staffNotes: data.staff_notes,
        cancelledAt: data.cancelled_at,
        cancelledByProfileId: data.cancelled_by_profile_id,
        cancellationReason: data.cancellation_reason,
        completedAt: data.completed_at,
        noShowCharged: data.no_show_charged,
        metadata: data.metadata || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error updating appointment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Termins',
    }
  }
}

/**
 * Delete an appointment
 */
export async function deleteAppointment(
  salonId: string,
  appointmentId: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId)
      .eq('salon_id', salonId)

    if (error) throw error

    revalidatePath('/admin/termine')

    return { success: true }
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Löschen des Termins',
    }
  }
}

// ============================================================
// BOOKING RULES
// ============================================================

/**
 * Get booking rules for a salon
 */
export async function getBookingRules(salonId: string): Promise<ApiResponse<BookingRules>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('booking_rules')
      .select('*')
      .eq('salon_id', salonId)
      .eq('is_active', true)
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        minLeadTimeMinutes: data.min_lead_time_minutes,
        maxBookingHorizonDays: data.max_booking_horizon_days,
        cancellationCutoffHours: data.cancellation_cutoff_hours,
        allowCustomerCancellation: data.allow_customer_cancellation,
        allowCustomerReschedule: data.allow_customer_reschedule,
        slotGranularityMinutes: data.slot_granularity_minutes,
        defaultVisitBufferMinutes: data.default_visit_buffer_minutes,
        depositRequiredPercent: parseFloat(data.deposit_required_percent),
        noShowPolicy: data.no_show_policy,
        reservationTimeoutMinutes: data.reservation_timeout_minutes,
        maxServicesPerAppointment: data.max_services_per_appointment,
        maxConcurrentReservationsPerCustomer: data.max_concurrent_reservations_per_customer,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error fetching booking rules:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Buchungsregeln',
    }
  }
}
