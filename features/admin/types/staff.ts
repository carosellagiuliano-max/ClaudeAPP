/**
 * Staff Management Types
 * Type definitions for admin staff management
 */

import { z } from 'zod'

// ============================================================
// DATABASE TYPES
// ============================================================

export interface StaffMember {
  id: string
  salonId: string
  profileId: string
  staffNumber: string | null
  position: string | null
  bio: string | null
  employmentType: string | null
  defaultWorkingHours: Record<string, any>
  displayName: string | null
  displayOrder: number
  photoUrl: string | null
  acceptsOnlineBookings: boolean
  showInTeamPage: boolean
  commissionRate: number | null
  isActive: boolean
  hiredAt: string | null
  terminatedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StaffWithProfile extends StaffMember {
  profile: {
    email: string
    firstName: string | null
    lastName: string | null
    phone: string | null
  }
}

export interface StaffServiceSkill {
  id: string
  salonId: string
  staffId: string
  serviceId: string
  proficiencyLevel: string | null
  customDurationMinutes: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StaffWithSkills extends StaffWithProfile {
  skills: (StaffServiceSkill & {
    service: {
      id: string
      internalName: string
      publicTitle: string
    }
  })[]
}

export interface StaffWorkingHours {
  id: string
  salonId: string
  staffId: string
  dayOfWeek: number
  startTimeMinutes: number
  endTimeMinutes: number
  breakStartMinutes: number | null
  breakEndMinutes: number | null
  label: string | null
  validFrom: string
  validTo: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StaffAbsence {
  id: string
  salonId: string
  staffId: string
  startDate: string
  endDate: string
  startTimeMinutes: number | null
  endTimeMinutes: number | null
  reason: string
  notes: string | null
  createdByProfileId: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================
// ZOD SCHEMAS
// ============================================================

export const staffMemberSchema = z.object({
  profileId: z.string().uuid('Ungültige Profil-ID'),
  staffNumber: z.string().optional(),
  position: z.enum(['stylist', 'senior_stylist', 'assistant', 'manager', 'other']).optional(),
  bio: z.string().max(1000).optional(),
  employmentType: z.enum(['full_time', 'part_time', 'freelance']).optional(),
  displayName: z.string().min(1, 'Anzeigename ist erforderlich').max(100),
  displayOrder: z.number().int().min(0).optional(),
  photoUrl: z.string().url('Ungültige URL').optional(),
  acceptsOnlineBookings: z.boolean().optional(),
  showInTeamPage: z.boolean().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  hiredAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ungültiges Datum').optional(),
  terminatedAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Ungültiges Datum')
    .nullable()
    .optional(),
})

export const staffServiceSkillSchema = z.object({
  staffId: z.string().uuid(),
  serviceId: z.string().uuid(),
  proficiencyLevel: z.enum(['junior', 'regular', 'senior', 'master']).optional(),
  customDurationMinutes: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
})

export const staffWorkingHoursSchema = z.object({
  staffId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTimeMinutes: z.number().int().min(0).max(1440),
  endTimeMinutes: z.number().int().min(0).max(1440),
  breakStartMinutes: z.number().int().min(0).max(1440).optional(),
  breakEndMinutes: z.number().int().min(0).max(1440).optional(),
  label: z.string().optional(),
  validFrom: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ungültiges Datum').optional(),
  validTo: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Ungültiges Datum')
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
})

export const staffAbsenceSchema = z.object({
  staffId: z.string().uuid(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ungültiges Datum'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ungültiges Datum'),
  startTimeMinutes: z.number().int().min(0).max(1440).optional(),
  endTimeMinutes: z.number().int().min(0).max(1440).optional(),
  reason: z.enum(['vacation', 'sick', 'training', 'personal', 'other']),
  notes: z.string().max(500).optional(),
})

export type StaffMemberInput = z.infer<typeof staffMemberSchema>
export type StaffServiceSkillInput = z.infer<typeof staffServiceSkillSchema>
export type StaffWorkingHoursInput = z.infer<typeof staffWorkingHoursSchema>
export type StaffAbsenceInput = z.infer<typeof staffAbsenceSchema>

// ============================================================
// UTILITY TYPES
// ============================================================

export const POSITION_LABELS: Record<string, string> = {
  stylist: 'Friseur/in',
  senior_stylist: 'Senior Friseur/in',
  assistant: 'Assistent/in',
  manager: 'Manager/in',
  other: 'Andere',
}

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Vollzeit',
  part_time: 'Teilzeit',
  freelance: 'Freiberuflich',
}

export const PROFICIENCY_LABELS: Record<string, string> = {
  junior: 'Junior',
  regular: 'Regular',
  senior: 'Senior',
  master: 'Meister',
}

export const ABSENCE_REASON_LABELS: Record<string, string> = {
  vacation: 'Urlaub',
  sick: 'Krank',
  training: 'Schulung',
  personal: 'Persönlich',
  other: 'Andere',
}

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: 'Sonntag',
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag',
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
