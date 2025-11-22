/**
 * Booking Flow Types and Schemas
 *
 * Defines the data structures and validation for the 4-step booking process:
 * Step 1: Service Selection
 * Step 2: Staff Selection
 * Step 3: Time Slot Selection
 * Step 4: Confirmation & Customer Details
 */

import { z } from 'zod'

// ============================================================================
// Step 1: Service Selection
// ============================================================================

export const selectedServiceSchema = z.object({
  serviceId: z.string().uuid(),
  name: z.string(),
  durationMinutes: z.number().int().positive(),
  priceChf: z.number().positive(),
  categoryName: z.string(),
})

export const step1Schema = z.object({
  services: z.array(selectedServiceSchema).min(1, 'Bitte wählen Sie mindestens eine Leistung'),
})

export type SelectedService = z.infer<typeof selectedServiceSchema>
export type Step1Data = z.infer<typeof step1Schema>

// ============================================================================
// Step 2: Staff Selection
// ============================================================================

export const step2Schema = z.object({
  staffId: z.string().uuid().nullable(), // null = "no preference"
  staffName: z.string().nullable(),
})

export type Step2Data = z.infer<typeof step2Schema>

// ============================================================================
// Step 3: Time Slot Selection
// ============================================================================

export const step3Schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  startMinutes: z.number().int().min(0).max(1439),
  endMinutes: z.number().int().min(0).max(1439),
  staffId: z.string().uuid(), // Assigned staff (may differ from preference)
  datetime: z.string().datetime(), // ISO timestamp
})

export type Step3Data = z.infer<typeof step3Schema>

// ============================================================================
// Step 4: Customer Details & Confirmation
// ============================================================================

export const customerDetailsSchema = z.object({
  // Existing customer (logged in)
  customerId: z.string().uuid().optional(),

  // New customer details
  firstName: z.string().min(1, 'Vorname ist erforderlich').optional(),
  lastName: z.string().min(1, 'Nachname ist erforderlich').optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  phone: z.string().min(7, 'Telefonnummer ist erforderlich').optional(),

  // Optional
  notes: z.string().max(500).optional(),

  // Consent
  acceptedTerms: z.boolean().refine(val => val === true, {
    message: 'Sie müssen die AGB akzeptieren',
  }),
  acceptedPrivacy: z.boolean().refine(val => val === true, {
    message: 'Sie müssen die Datenschutzerklärung akzeptieren',
  }),
})

export const step4Schema = customerDetailsSchema.refine(
  data => {
    // Either customerId OR all new customer fields must be present
    if (data.customerId) return true
    return !!(data.firstName && data.lastName && data.email && data.phone)
  },
  {
    message: 'Bitte füllen Sie alle erforderlichen Felder aus',
  }
)

export type CustomerDetails = z.infer<typeof customerDetailsSchema>
export type Step4Data = z.infer<typeof step4Schema>

// ============================================================================
// Complete Booking Data
// ============================================================================

export const completeBookingSchema = z.object({
  salonId: z.string().uuid(),
  services: z.array(selectedServiceSchema).min(1),
  staffId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMinutes: z.number().int().min(0).max(1439),
  endMinutes: z.number().int().min(0).max(1439),
  datetime: z.string().datetime(),
  customer: step4Schema,
})

export type CompleteBooking = z.infer<typeof completeBookingSchema>

// ============================================================================
// Booking State (for multi-step form)
// ============================================================================

export interface BookingState {
  currentStep: 1 | 2 | 3 | 4
  salonId: string
  step1?: Step1Data
  step2?: Step2Data
  step3?: Step3Data
  step4?: Step4Data
}

// ============================================================================
// Display Types
// ============================================================================

export interface ServiceWithCategory {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  priceChf: number
  categoryId: string
  categoryName: string
  categoryDisplayOrder: number
  displayOrder: number
  onlineBookable: boolean
  isActive: boolean
}

export interface StaffMember {
  id: string
  userId: string
  firstName: string
  lastName: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  isActive: boolean
  canBook: boolean
  serviceIds: string[] // Services this staff can perform
}

export interface TimeSlot {
  date: string // YYYY-MM-DD
  startMinutes: number
  endMinutes: number
  startTime: string // "10:00"
  endTime: string // "11:00"
  datetime: string // ISO timestamp
  staffId: string
  staffName: string
  available: boolean
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AvailableSlotsResponse {
  success: boolean
  slots: Record<string, TimeSlot[]> // date -> slots
  error?: string
}

export interface CreateBookingResponse {
  success: boolean
  appointmentId?: string
  reservedUntil?: string // ISO timestamp
  error?: string
}

export interface BookingConfirmation {
  appointmentId: string
  confirmationNumber: string
  salonName: string
  date: string
  startTime: string
  endTime: string
  services: Array<{
    name: string
    durationMinutes: number
    priceChf: number
  }>
  staffName: string
  totalDuration: number
  totalPrice: number
  customerName: string
  customerEmail: string
  notes: string | null
}

// ============================================================================
// Database Types (matching Supabase schema)
// ============================================================================

export interface DbAppointment {
  id: string
  salon_id: string
  customer_id: string
  staff_id: string
  starts_at: string // ISO timestamp
  ends_at: string // ISO timestamp
  status: 'reserved' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'no_show' | 'cancelled'
  source: 'online' | 'phone' | 'walk_in' | 'admin'
  confirmation_number: string
  reserved_until: string | null
  internal_notes: string | null
  customer_notes: string | null
  created_at: string
  updated_at: string
}

export interface DbAppointmentService {
  id: string
  appointment_id: string
  service_id: string
  service_name_snapshot: string
  duration_minutes_snapshot: number
  price_chf_snapshot: number
  tax_rate_snapshot: number
  display_order: number
}

export interface DbCustomer {
  id: string
  salon_id: string
  user_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string
  date_of_birth: string | null
  notes: string | null
  marketing_consent: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// Booking Rules (from database)
// ============================================================================

export interface DbBookingRule {
  id: string
  salon_id: string
  min_lead_time_minutes: number
  max_booking_horizon_days: number
  slot_granularity_minutes: number
  allow_overlapping_services: boolean
  require_staff_selection: boolean
  auto_confirm_online_bookings: boolean
  reservation_hold_minutes: number
  send_confirmation_email: boolean
  send_reminder_email: boolean
  reminder_hours_before: number
  created_at: string
  updated_at: string
}
