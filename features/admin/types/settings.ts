/**
 * Settings Management Types
 * Type definitions for admin settings
 */

import { z } from 'zod'

// ============================================================
// DATABASE TYPES
// ============================================================

export interface OpeningHours {
  dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
  isOpen: boolean
  openTime: string // HH:MM format
  closeTime: string // HH:MM format
  breakStart?: string | null
  breakEnd?: string | null
}

export interface BookingSettings {
  id: string
  salonId: string
  minAdvanceBookingHours: number
  maxAdvanceBookingDays: number
  slotDurationMinutes: number
  bufferBetweenAppointments: number
  allowOverlappingBookings: boolean
  requireDeposit: boolean
  depositAmountChf: string | null
  depositPercentage: number | null
  cancellationPolicyHours: number
  requirePhoneVerification: boolean
  requireEmailVerification: boolean
  autoConfirmBookings: boolean
  maxBookingsPerDay: number | null
  maxBookingsPerCustomer: number | null
  createdAt: string
  updatedAt: string
}

export interface VatSettings {
  id: string
  salonId: string
  defaultServiceVatRate: string
  defaultProductVatRate: string
  vatIncludedInPrices: boolean
  vatNumber: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationSettings {
  id: string
  salonId: string
  sendBookingConfirmation: boolean
  sendBookingReminder: boolean
  reminderHoursBefore: number
  sendCancellationNotification: boolean
  sendRescheduleNotification: boolean
  sendMarketingEmails: boolean
  smsNotificationsEnabled: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// ZOD SCHEMAS
// ============================================================

export const openingHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  openTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format muss HH:MM sein'),
  closeTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format muss HH:MM sein'),
  breakStart: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format muss HH:MM sein')
    .optional(),
  breakEnd: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format muss HH:MM sein')
    .optional(),
})

export const bookingSettingsSchema = z.object({
  minAdvanceBookingHours: z.number().int().min(0).max(168),
  maxAdvanceBookingDays: z.number().int().min(1).max(365),
  slotDurationMinutes: z.number().int().min(5).max(240),
  bufferBetweenAppointments: z.number().int().min(0).max(60),
  allowOverlappingBookings: z.boolean(),
  requireDeposit: z.boolean(),
  depositAmountChf: z
    .string()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      'Ungültiger Betrag'
    )
    .optional(),
  depositPercentage: z.number().int().min(0).max(100).optional(),
  cancellationPolicyHours: z.number().int().min(0).max(168),
  requirePhoneVerification: z.boolean(),
  requireEmailVerification: z.boolean(),
  autoConfirmBookings: z.boolean(),
  maxBookingsPerDay: z.number().int().min(1).optional(),
  maxBookingsPerCustomer: z.number().int().min(1).optional(),
})

export const vatSettingsSchema = z.object({
  defaultServiceVatRate: z
    .string()
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100,
      'MwSt.-Satz muss zwischen 0 und 100 sein'
    ),
  defaultProductVatRate: z
    .string()
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100,
      'MwSt.-Satz muss zwischen 0 und 100 sein'
    ),
  vatIncludedInPrices: z.boolean(),
  vatNumber: z.string().max(50).optional(),
})

export const notificationSettingsSchema = z.object({
  sendBookingConfirmation: z.boolean(),
  sendBookingReminder: z.boolean(),
  reminderHoursBefore: z.number().int().min(1).max(168),
  sendCancellationNotification: z.boolean(),
  sendRescheduleNotification: z.boolean(),
  sendMarketingEmails: z.boolean(),
  smsNotificationsEnabled: z.boolean(),
})

export type OpeningHoursInput = z.infer<typeof openingHoursSchema>
export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>
export type VatSettingsInput = z.infer<typeof vatSettingsSchema>
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>

// ============================================================
// UTILITY TYPES
// ============================================================

export const DAY_NAMES: Record<number, string> = {
  0: 'Sonntag',
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag',
}

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Monday to Sunday

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
