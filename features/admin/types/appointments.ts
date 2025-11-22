/**
 * Appointments Management Types
 * Type definitions for admin appointments management
 */

import { z } from 'zod'

// ============================================================
// DATABASE TYPES
// ============================================================

export type AppointmentStatus =
  | 'reserved'
  | 'requested'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface Appointment {
  id: string
  salonId: string
  customerId: string
  staffId: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  reservedUntil: string | null
  totalPriceChf: number | null
  totalTaxChf: number | null
  totalDurationMinutes: number | null
  depositRequired: boolean
  depositAmountChf: number | null
  depositPaid: boolean
  depositPaymentId: string | null
  bookedVia: 'online' | 'phone' | 'walk_in' | 'admin'
  bookedByProfileId: string | null
  customerNotes: string | null
  staffNotes: string | null
  cancelledAt: string | null
  cancelledByProfileId: string | null
  cancellationReason: string | null
  completedAt: string | null
  noShowCharged: boolean
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface AppointmentService {
  id: string
  salonId: string
  appointmentId: string
  serviceId: string
  snapshotPriceChf: number
  snapshotTaxRatePercent: number | null
  snapshotTaxChf: number | null
  snapshotDurationMinutes: number
  snapshotServiceName: string
  sortOrder: number
  createdAt: string
}

export interface AppointmentWithDetails extends Appointment {
  customer: {
    id: string
    profile: {
      firstName: string | null
      lastName: string | null
      email: string
      phone: string | null
    }
  }
  staff: {
    id: string
    displayName: string | null
    photoUrl: string | null
  }
  services: AppointmentService[]
}

export interface BookingRules {
  id: string
  salonId: string
  minLeadTimeMinutes: number
  maxBookingHorizonDays: number
  cancellationCutoffHours: number
  allowCustomerCancellation: boolean
  allowCustomerReschedule: boolean
  slotGranularityMinutes: number
  defaultVisitBufferMinutes: number
  depositRequiredPercent: number
  noShowPolicy: 'none' | 'charge_deposit' | 'charge_full'
  reservationTimeoutMinutes: number
  maxServicesPerAppointment: number
  maxConcurrentReservationsPerCustomer: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// ZOD SCHEMAS
// ============================================================

export const appointmentServiceSchema = z.object({
  serviceId: z.string().uuid(),
  snapshotPriceChf: z.number().min(0),
  snapshotTaxRatePercent: z.number().min(0).max(100).optional(),
  snapshotTaxChf: z.number().min(0).optional(),
  snapshotDurationMinutes: z.number().int().min(1),
  snapshotServiceName: z.string().min(1),
  sortOrder: z.number().int().min(0).optional(),
})

export const appointmentSchema = z.object({
  customerId: z.string().uuid(),
  staffId: z.string().uuid(),
  startsAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ungültiges Datum'),
  endsAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ungültiges Datum'),
  status: z.enum([
    'reserved',
    'requested',
    'confirmed',
    'checked_in',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
  ]).optional(),
  bookedVia: z.enum(['online', 'phone', 'walk_in', 'admin']).optional(),
  customerNotes: z.string().optional(),
  staffNotes: z.string().optional(),
  services: z.array(appointmentServiceSchema).min(1, 'Mindestens eine Leistung erforderlich'),
})

export const appointmentUpdateSchema = z.object({
  customerId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  startsAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ungültiges Datum').optional(),
  endsAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ungültiges Datum').optional(),
  status: z
    .enum([
      'reserved',
      'requested',
      'confirmed',
      'checked_in',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
    ])
    .optional(),
  customerNotes: z.string().optional(),
  staffNotes: z.string().optional(),
  cancellationReason: z.string().optional(),
})

export type AppointmentInput = z.infer<typeof appointmentSchema>
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>
export type AppointmentServiceInput = z.infer<typeof appointmentServiceSchema>

// ============================================================
// UTILITY TYPES
// ============================================================

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  reserved: 'Reserviert',
  requested: 'Angefragt',
  confirmed: 'Bestätigt',
  checked_in: 'Eingecheckt',
  in_progress: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
  no_show: 'Nicht erschienen',
}

export const APPOINTMENT_STATUS_COLORS: Record<
  AppointmentStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  reserved: 'outline',
  requested: 'secondary',
  confirmed: 'default',
  checked_in: 'default',
  in_progress: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
  no_show: 'destructive',
}

export const BOOKED_VIA_LABELS: Record<string, string> = {
  online: 'Online',
  phone: 'Telefon',
  walk_in: 'Walk-in',
  admin: 'Admin',
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface CalendarSlot {
  time: string
  staffId: string
  available: boolean
  appointment?: AppointmentWithDetails
}

export interface DaySchedule {
  date: string
  slots: CalendarSlot[]
}
