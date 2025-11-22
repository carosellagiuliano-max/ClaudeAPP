'use server'

/**
 * Settings Management Server Actions
 * Get and update salon settings
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/rbac'
import type {
  ApiResponse,
  OpeningHours,
  BookingSettings,
  VatSettings,
  NotificationSettings,
  OpeningHoursInput,
  BookingSettingsInput,
  VatSettingsInput,
  NotificationSettingsInput,
} from '../types/settings'
import {
  openingHoursSchema,
  bookingSettingsSchema,
  vatSettingsSchema,
  notificationSettingsSchema,
} from '../types/settings'

// ============================================================
// OPENING HOURS
// ============================================================

/**
 * Get opening hours for a salon
 */
export async function getOpeningHours(salonId: string): Promise<ApiResponse<OpeningHours[]>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('opening_hours')
      .select('*')
      .eq('salon_id', salonId)
      .order('day_of_week', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data: data.map((hours) => ({
        dayOfWeek: hours.day_of_week,
        isOpen: hours.is_open,
        openTime: hours.open_time,
        closeTime: hours.close_time,
        breakStart: hours.break_start,
        breakEnd: hours.break_end,
      })),
    }
  } catch (error) {
    console.error('Error fetching opening hours:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Öffnungszeiten',
    }
  }
}

/**
 * Update opening hours for a specific day
 */
export async function updateOpeningHours(
  salonId: string,
  input: OpeningHoursInput
): Promise<ApiResponse<OpeningHours>> {
  try {
    await requireAdmin(salonId)

    const validated = openingHoursSchema.parse(input)
    const supabase = await createClient()

    // Upsert the opening hours
    const { data, error } = await supabase
      .from('opening_hours')
      .upsert(
        {
          salon_id: salonId,
          day_of_week: validated.dayOfWeek,
          is_open: validated.isOpen,
          open_time: validated.openTime,
          close_time: validated.closeTime,
          break_start: validated.breakStart,
          break_end: validated.breakEnd,
        },
        {
          onConflict: 'salon_id,day_of_week',
        }
      )
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/einstellungen')

    return {
      success: true,
      data: {
        dayOfWeek: data.day_of_week,
        isOpen: data.is_open,
        openTime: data.open_time,
        closeTime: data.close_time,
        breakStart: data.break_start,
        breakEnd: data.break_end,
      },
    }
  } catch (error) {
    console.error('Error updating opening hours:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Öffnungszeiten',
    }
  }
}

// ============================================================
// BOOKING SETTINGS
// ============================================================

/**
 * Get booking settings for a salon
 */
export async function getBookingSettings(
  salonId: string
): Promise<ApiResponse<BookingSettings>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('booking_settings')
      .select('*')
      .eq('salon_id', salonId)
      .single()

    if (error) {
      // If no settings exist, return defaults
      if (error.code === 'PGRST116') {
        return {
          success: true,
          data: {
            id: '',
            salonId,
            minAdvanceBookingHours: 2,
            maxAdvanceBookingDays: 90,
            slotDurationMinutes: 30,
            bufferBetweenAppointments: 0,
            allowOverlappingBookings: false,
            requireDeposit: false,
            depositAmountChf: null,
            depositPercentage: null,
            cancellationPolicyHours: 24,
            requirePhoneVerification: false,
            requireEmailVerification: true,
            autoConfirmBookings: true,
            maxBookingsPerDay: null,
            maxBookingsPerCustomer: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }
      }
      throw error
    }

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        minAdvanceBookingHours: data.min_advance_booking_hours,
        maxAdvanceBookingDays: data.max_advance_booking_days,
        slotDurationMinutes: data.slot_duration_minutes,
        bufferBetweenAppointments: data.buffer_between_appointments,
        allowOverlappingBookings: data.allow_overlapping_bookings,
        requireDeposit: data.require_deposit,
        depositAmountChf: data.deposit_amount_chf,
        depositPercentage: data.deposit_percentage,
        cancellationPolicyHours: data.cancellation_policy_hours,
        requirePhoneVerification: data.require_phone_verification,
        requireEmailVerification: data.require_email_verification,
        autoConfirmBookings: data.auto_confirm_bookings,
        maxBookingsPerDay: data.max_bookings_per_day,
        maxBookingsPerCustomer: data.max_bookings_per_customer,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error fetching booking settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Buchungseinstellungen',
    }
  }
}

/**
 * Update booking settings
 */
export async function updateBookingSettings(
  salonId: string,
  input: BookingSettingsInput
): Promise<ApiResponse<BookingSettings>> {
  try {
    await requireAdmin(salonId)

    const validated = bookingSettingsSchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('booking_settings')
      .upsert(
        {
          salon_id: salonId,
          min_advance_booking_hours: validated.minAdvanceBookingHours,
          max_advance_booking_days: validated.maxAdvanceBookingDays,
          slot_duration_minutes: validated.slotDurationMinutes,
          buffer_between_appointments: validated.bufferBetweenAppointments,
          allow_overlapping_bookings: validated.allowOverlappingBookings,
          require_deposit: validated.requireDeposit,
          deposit_amount_chf: validated.depositAmountChf,
          deposit_percentage: validated.depositPercentage,
          cancellation_policy_hours: validated.cancellationPolicyHours,
          require_phone_verification: validated.requirePhoneVerification,
          require_email_verification: validated.requireEmailVerification,
          auto_confirm_bookings: validated.autoConfirmBookings,
          max_bookings_per_day: validated.maxBookingsPerDay,
          max_bookings_per_customer: validated.maxBookingsPerCustomer,
        },
        {
          onConflict: 'salon_id',
        }
      )
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/einstellungen')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        minAdvanceBookingHours: data.min_advance_booking_hours,
        maxAdvanceBookingDays: data.max_advance_booking_days,
        slotDurationMinutes: data.slot_duration_minutes,
        bufferBetweenAppointments: data.buffer_between_appointments,
        allowOverlappingBookings: data.allow_overlapping_bookings,
        requireDeposit: data.require_deposit,
        depositAmountChf: data.deposit_amount_chf,
        depositPercentage: data.deposit_percentage,
        cancellationPolicyHours: data.cancellation_policy_hours,
        requirePhoneVerification: data.require_phone_verification,
        requireEmailVerification: data.require_email_verification,
        autoConfirmBookings: data.auto_confirm_bookings,
        maxBookingsPerDay: data.max_bookings_per_day,
        maxBookingsPerCustomer: data.max_bookings_per_customer,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error updating booking settings:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Buchungseinstellungen',
    }
  }
}

// ============================================================
// VAT SETTINGS
// ============================================================

/**
 * Get VAT settings for a salon
 */
export async function getVatSettings(salonId: string): Promise<ApiResponse<VatSettings>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('vat_settings')
      .select('*')
      .eq('salon_id', salonId)
      .single()

    if (error) {
      // If no settings exist, return defaults
      if (error.code === 'PGRST116') {
        return {
          success: true,
          data: {
            id: '',
            salonId,
            defaultServiceVatRate: '8.1',
            defaultProductVatRate: '8.1',
            vatIncludedInPrices: true,
            vatNumber: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }
      }
      throw error
    }

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        defaultServiceVatRate: data.default_service_vat_rate,
        defaultProductVatRate: data.default_product_vat_rate,
        vatIncludedInPrices: data.vat_included_in_prices,
        vatNumber: data.vat_number,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error fetching VAT settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der MwSt.-Einstellungen',
    }
  }
}

/**
 * Update VAT settings
 */
export async function updateVatSettings(
  salonId: string,
  input: VatSettingsInput
): Promise<ApiResponse<VatSettings>> {
  try {
    await requireAdmin(salonId)

    const validated = vatSettingsSchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('vat_settings')
      .upsert(
        {
          salon_id: salonId,
          default_service_vat_rate: validated.defaultServiceVatRate,
          default_product_vat_rate: validated.defaultProductVatRate,
          vat_included_in_prices: validated.vatIncludedInPrices,
          vat_number: validated.vatNumber,
        },
        {
          onConflict: 'salon_id',
        }
      )
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/einstellungen')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        defaultServiceVatRate: data.default_service_vat_rate,
        defaultProductVatRate: data.default_product_vat_rate,
        vatIncludedInPrices: data.vat_included_in_prices,
        vatNumber: data.vat_number,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error updating VAT settings:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Fehler beim Aktualisieren der MwSt.-Einstellungen',
    }
  }
}

// ============================================================
// NOTIFICATION SETTINGS
// ============================================================

/**
 * Get notification settings for a salon
 */
export async function getNotificationSettings(
  salonId: string
): Promise<ApiResponse<NotificationSettings>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('salon_id', salonId)
      .single()

    if (error) {
      // If no settings exist, return defaults
      if (error.code === 'PGRST116') {
        return {
          success: true,
          data: {
            id: '',
            salonId,
            sendBookingConfirmation: true,
            sendBookingReminder: true,
            reminderHoursBefore: 24,
            sendCancellationNotification: true,
            sendRescheduleNotification: true,
            sendMarketingEmails: false,
            smsNotificationsEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }
      }
      throw error
    }

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        sendBookingConfirmation: data.send_booking_confirmation,
        sendBookingReminder: data.send_booking_reminder,
        reminderHoursBefore: data.reminder_hours_before,
        sendCancellationNotification: data.send_cancellation_notification,
        sendRescheduleNotification: data.send_reschedule_notification,
        sendMarketingEmails: data.send_marketing_emails,
        smsNotificationsEnabled: data.sms_notifications_enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Fehler beim Laden der Benachrichtigungseinstellungen',
    }
  }
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(
  salonId: string,
  input: NotificationSettingsInput
): Promise<ApiResponse<NotificationSettings>> {
  try {
    await requireAdmin(salonId)

    const validated = notificationSettingsSchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('notification_settings')
      .upsert(
        {
          salon_id: salonId,
          send_booking_confirmation: validated.sendBookingConfirmation,
          send_booking_reminder: validated.sendBookingReminder,
          reminder_hours_before: validated.reminderHoursBefore,
          send_cancellation_notification: validated.sendCancellationNotification,
          send_reschedule_notification: validated.sendRescheduleNotification,
          send_marketing_emails: validated.sendMarketingEmails,
          sms_notifications_enabled: validated.smsNotificationsEnabled,
        },
        {
          onConflict: 'salon_id',
        }
      )
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/einstellungen')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        sendBookingConfirmation: data.send_booking_confirmation,
        sendBookingReminder: data.send_booking_reminder,
        reminderHoursBefore: data.reminder_hours_before,
        sendCancellationNotification: data.send_cancellation_notification,
        sendRescheduleNotification: data.send_reschedule_notification,
        sendMarketingEmails: data.send_marketing_emails,
        smsNotificationsEnabled: data.sms_notifications_enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Fehler beim Aktualisieren der Benachrichtigungseinstellungen',
    }
  }
}
