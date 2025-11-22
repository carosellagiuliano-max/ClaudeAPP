/**
 * Slot Engine - Core booking availability calculation
 *
 * This module calculates available appointment slots based on:
 * - Salon opening hours
 * - Staff working hours and absences
 * - Existing appointments
 * - Blocked times
 * - Booking rules (lead time, horizon, granularity)
 *
 * All times are stored as minutes since midnight (DST-safe)
 */

import { addDays, startOfDay, isSameDay, parseISO } from 'date-fns'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

// ============================================================================
// Types
// ============================================================================

export interface TimeRange {
  startMinutes: number  // Minutes since midnight (0-1439)
  endMinutes: number    // Minutes since midnight
}

export interface DaySchedule {
  date: Date
  openingHours: TimeRange[]
  staffSchedules: Map<string, TimeRange[]>  // staffId -> working hours
  appointments: AppointmentBlock[]
  blockedTimes: TimeRange[]
}

export interface AppointmentBlock {
  staffId: string
  startMinutes: number
  durationMinutes: number
}

export interface BookingRequest {
  salonId: string
  serviceIds: string[]
  staffId?: string  // undefined = "no preference"
  preferredDate?: Date
  totalDurationMinutes: number
}

export interface BookingRules {
  minLeadTimeMinutes: number     // e.g., 120 = 2 hours ahead
  maxBookingHorizonDays: number  // e.g., 60 days
  slotGranularityMinutes: number // e.g., 15 = slots every 15 min
}

export interface AvailableSlot {
  date: Date
  startMinutes: number
  endMinutes: number
  staffId: string
  startTime: string   // "10:00"
  endTime: string     // "11:00"
  datetime: Date      // Full timestamp
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert Date to minutes since midnight in salon timezone
 */
export function dateToMinutes(date: Date, timezone: string): number {
  const zonedDate = toZonedTime(date, timezone)
  return zonedDate.getHours() * 60 + zonedDate.getMinutes()
}

/**
 * Convert minutes since midnight to time string "HH:MM"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Create Date from date and minutes in timezone
 */
export function minutesToDate(date: Date, minutes: number, timezone: string): Date {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  // Create in local time, then interpret as timezone
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`
  return toZonedTime(dateStr, timezone)
}

/**
 * Check if two time ranges overlap
 */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes
}

/**
 * Merge overlapping time ranges
 */
export function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return []

  const sorted = [...ranges].sort((a, b) => a.startMinutes - b.startMinutes)
  const merged: TimeRange[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]

    if (current.startMinutes <= last.endMinutes) {
      // Overlapping or adjacent - merge
      last.endMinutes = Math.max(last.endMinutes, current.endMinutes)
    } else {
      // No overlap - add as new range
      merged.push(current)
    }
  }

  return merged
}

/**
 * Subtract unavailable ranges from available ranges
 */
export function subtractRanges(available: TimeRange[], unavailable: TimeRange[]): TimeRange[] {
  let result = [...available]

  for (const blocked of unavailable) {
    const newResult: TimeRange[] = []

    for (const range of result) {
      if (!rangesOverlap(range, blocked)) {
        // No overlap - keep entire range
        newResult.push(range)
      } else {
        // Overlap - split the range
        if (range.startMinutes < blocked.startMinutes) {
          // Add part before blocked time
          newResult.push({
            startMinutes: range.startMinutes,
            endMinutes: Math.min(range.endMinutes, blocked.startMinutes),
          })
        }
        if (range.endMinutes > blocked.endMinutes) {
          // Add part after blocked time
          newResult.push({
            startMinutes: Math.max(range.startMinutes, blocked.endMinutes),
            endMinutes: range.endMinutes,
          })
        }
      }
    }

    result = newResult
  }

  return result
}

// ============================================================================
// Core Slot Engine
// ============================================================================

/**
 * Calculate available slots for a staff member on a specific day
 */
export function calculateStaffDaySlots(
  schedule: DaySchedule,
  staffId: string,
  durationMinutes: number,
  granularity: number,
  timezone: string
): AvailableSlot[] {
  // Get staff working hours for this day
  const staffHours = schedule.staffSchedules.get(staffId)
  if (!staffHours || staffHours.length === 0) {
    return []
  }

  // Start with opening hours intersected with staff hours
  let availableRanges = intersectRanges(schedule.openingHours, staffHours)

  // Subtract blocked times
  availableRanges = subtractRanges(availableRanges, schedule.blockedTimes)

  // Subtract existing appointments for this staff
  const staffAppointments = schedule.appointments
    .filter(apt => apt.staffId === staffId)
    .map(apt => ({
      startMinutes: apt.startMinutes,
      endMinutes: apt.startMinutes + apt.durationMinutes,
    }))

  availableRanges = subtractRanges(availableRanges, staffAppointments)

  // Generate slots from available ranges
  const slots: AvailableSlot[] = []

  for (const range of availableRanges) {
    // Round start up to next granularity boundary
    let startMinutes = Math.ceil(range.startMinutes / granularity) * granularity

    while (startMinutes + durationMinutes <= range.endMinutes) {
      const endMinutes = startMinutes + durationMinutes

      slots.push({
        date: schedule.date,
        startMinutes,
        endMinutes,
        staffId,
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(endMinutes),
        datetime: minutesToDate(schedule.date, startMinutes, timezone),
      })

      startMinutes += granularity
    }
  }

  return slots
}

/**
 * Intersect two sets of time ranges
 */
function intersectRanges(rangesA: TimeRange[], rangesB: TimeRange[]): TimeRange[] {
  const result: TimeRange[] = []

  for (const a of rangesA) {
    for (const b of rangesB) {
      if (rangesOverlap(a, b)) {
        result.push({
          startMinutes: Math.max(a.startMinutes, b.startMinutes),
          endMinutes: Math.min(a.endMinutes, b.endMinutes),
        })
      }
    }
  }

  return mergeRanges(result)
}

/**
 * Calculate available slots for multiple days
 */
export function calculateAvailableSlots(
  schedules: DaySchedule[],
  request: BookingRequest,
  rules: BookingRules,
  timezone: string
): Map<string, AvailableSlot[]> {
  // Group slots by date string (YYYY-MM-DD)
  const slotsByDate = new Map<string, AvailableSlot[]>()

  const now = new Date()
  const minStartTime = new Date(now.getTime() + rules.minLeadTimeMinutes * 60 * 1000)

  for (const schedule of schedules) {
    const dateKey = formatInTimeZone(schedule.date, timezone, 'yyyy-MM-dd')
    const daySlots: AvailableSlot[] = []

    // Get staff IDs to check
    const staffIds = request.staffId
      ? [request.staffId]
      : Array.from(schedule.staffSchedules.keys())

    // Calculate slots for each staff member
    for (const staffId of staffIds) {
      const staffSlots = calculateStaffDaySlots(
        schedule,
        staffId,
        request.totalDurationMinutes,
        rules.slotGranularityMinutes,
        timezone
      )

      // Filter out slots that are too soon
      const validSlots = staffSlots.filter(slot => slot.datetime >= minStartTime)

      daySlots.push(...validSlots)
    }

    // Sort by time, then by staff
    daySlots.sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) {
        return a.startMinutes - b.startMinutes
      }
      return a.staffId.localeCompare(b.staffId)
    })

    if (daySlots.length > 0) {
      slotsByDate.set(dateKey, daySlots)
    }
  }

  return slotsByDate
}

/**
 * Find next available slot (used for "Next available" feature)
 */
export function findNextAvailableSlot(
  schedules: DaySchedule[],
  request: BookingRequest,
  rules: BookingRules,
  timezone: string
): AvailableSlot | null {
  const allSlots = calculateAvailableSlots(schedules, request, rules, timezone)

  // Find earliest slot
  let earliest: AvailableSlot | null = null

  for (const daySlots of allSlots.values()) {
    for (const slot of daySlots) {
      if (!earliest || slot.datetime < earliest.datetime) {
        earliest = slot
      }
    }
  }

  return earliest
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that a slot is still available before booking
 * CRITICAL: Must be called in a transaction with locking
 */
export function validateSlotAvailable(
  schedule: DaySchedule,
  slot: AvailableSlot,
  durationMinutes: number
): boolean {
  const staffHours = schedule.staffSchedules.get(slot.staffId)
  if (!staffHours || staffHours.length === 0) {
    return false
  }

  // Check still within working hours
  const withinWorkingHours = staffHours.some(range =>
    slot.startMinutes >= range.startMinutes &&
    slot.endMinutes <= range.endMinutes
  )
  if (!withinWorkingHours) {
    return false
  }

  // Check no conflicts with appointments
  const hasConflict = schedule.appointments.some(apt =>
    apt.staffId === slot.staffId &&
    rangesOverlap(
      { startMinutes: slot.startMinutes, endMinutes: slot.endMinutes },
      { startMinutes: apt.startMinutes, endMinutes: apt.startMinutes + apt.durationMinutes }
    )
  )
  if (hasConflict) {
    return false
  }

  // Check no conflicts with blocked times
  const hasBlockedConflict = schedule.blockedTimes.some(blocked =>
    rangesOverlap(
      { startMinutes: slot.startMinutes, endMinutes: slot.endMinutes },
      blocked
    )
  )
  if (hasBlockedConflict) {
    return false
  }

  return true
}
