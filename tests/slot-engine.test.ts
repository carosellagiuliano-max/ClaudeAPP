/**
 * Unit Tests for Slot Engine
 * Tests core booking availability calculation logic
 */

import { describe, it, expect } from 'vitest'
import {
  dateToMinutes,
  minutesToTime,
  rangesOverlap,
  mergeRanges,
  subtractRanges,
  calculateStaffDaySlots,
  validateSlotAvailable,
  type TimeRange,
  type DaySchedule,
  type AvailableSlot,
} from '@/features/booking/slot-engine'

describe('Slot Engine - Utility Functions', () => {
  describe('minutesToTime', () => {
    it('should convert minutes to HH:MM format', () => {
      expect(minutesToTime(0)).toBe('00:00')
      expect(minutesToTime(60)).toBe('01:00')
      expect(minutesToTime(540)).toBe('09:00')
      expect(minutesToTime(615)).toBe('10:15')
      expect(minutesToTime(1439)).toBe('23:59')
    })

    it('should pad single digits', () => {
      expect(minutesToTime(5)).toBe('00:05')
      expect(minutesToTime(125)).toBe('02:05')
    })
  })

  describe('rangesOverlap', () => {
    it('should detect overlapping ranges', () => {
      const rangeA: TimeRange = { startMinutes: 100, endMinutes: 200 }
      const rangeB: TimeRange = { startMinutes: 150, endMinutes: 250 }
      expect(rangesOverlap(rangeA, rangeB)).toBe(true)
    })

    it('should detect non-overlapping ranges', () => {
      const rangeA: TimeRange = { startMinutes: 100, endMinutes: 200 }
      const rangeB: TimeRange = { startMinutes: 200, endMinutes: 300 }
      expect(rangesOverlap(rangeA, rangeB)).toBe(false)
    })

    it('should detect contained ranges', () => {
      const rangeA: TimeRange = { startMinutes: 100, endMinutes: 300 }
      const rangeB: TimeRange = { startMinutes: 150, endMinutes: 200 }
      expect(rangesOverlap(rangeA, rangeB)).toBe(true)
    })

    it('should handle edge case: exactly adjacent ranges', () => {
      const rangeA: TimeRange = { startMinutes: 100, endMinutes: 200 }
      const rangeB: TimeRange = { startMinutes: 200, endMinutes: 300 }
      expect(rangesOverlap(rangeA, rangeB)).toBe(false)
    })
  })

  describe('mergeRanges', () => {
    it('should merge overlapping ranges', () => {
      const ranges: TimeRange[] = [
        { startMinutes: 100, endMinutes: 200 },
        { startMinutes: 150, endMinutes: 250 },
        { startMinutes: 240, endMinutes: 300 },
      ]
      const merged = mergeRanges(ranges)
      expect(merged).toHaveLength(1)
      expect(merged[0]).toEqual({ startMinutes: 100, endMinutes: 300 })
    })

    it('should keep non-overlapping ranges separate', () => {
      const ranges: TimeRange[] = [
        { startMinutes: 100, endMinutes: 200 },
        { startMinutes: 300, endMinutes: 400 },
      ]
      const merged = mergeRanges(ranges)
      expect(merged).toHaveLength(2)
      expect(merged[0]).toEqual({ startMinutes: 100, endMinutes: 200 })
      expect(merged[1]).toEqual({ startMinutes: 300, endMinutes: 400 })
    })

    it('should handle empty array', () => {
      const merged = mergeRanges([])
      expect(merged).toHaveLength(0)
    })

    it('should handle single range', () => {
      const ranges: TimeRange[] = [{ startMinutes: 100, endMinutes: 200 }]
      const merged = mergeRanges(ranges)
      expect(merged).toHaveLength(1)
      expect(merged[0]).toEqual({ startMinutes: 100, endMinutes: 200 })
    })

    it('should sort and merge unsorted ranges', () => {
      const ranges: TimeRange[] = [
        { startMinutes: 300, endMinutes: 400 },
        { startMinutes: 100, endMinutes: 200 },
        { startMinutes: 180, endMinutes: 320 },
      ]
      const merged = mergeRanges(ranges)
      expect(merged).toHaveLength(1)
      expect(merged[0]).toEqual({ startMinutes: 100, endMinutes: 400 })
    })
  })

  describe('subtractRanges', () => {
    it('should subtract non-overlapping range (no change)', () => {
      const available: TimeRange[] = [{ startMinutes: 100, endMinutes: 200 }]
      const unavailable: TimeRange[] = [{ startMinutes: 300, endMinutes: 400 }]
      const result = subtractRanges(available, unavailable)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ startMinutes: 100, endMinutes: 200 })
    })

    it('should subtract overlapping range at start', () => {
      const available: TimeRange[] = [{ startMinutes: 100, endMinutes: 200 }]
      const unavailable: TimeRange[] = [{ startMinutes: 50, endMinutes: 150 }]
      const result = subtractRanges(available, unavailable)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ startMinutes: 150, endMinutes: 200 })
    })

    it('should subtract overlapping range at end', () => {
      const available: TimeRange[] = [{ startMinutes: 100, endMinutes: 200 }]
      const unavailable: TimeRange[] = [{ startMinutes: 150, endMinutes: 250 }]
      const result = subtractRanges(available, unavailable)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ startMinutes: 100, endMinutes: 150 })
    })

    it('should split range when unavailable is in middle', () => {
      const available: TimeRange[] = [{ startMinutes: 100, endMinutes: 300 }]
      const unavailable: TimeRange[] = [{ startMinutes: 150, endMinutes: 250 }]
      const result = subtractRanges(available, unavailable)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ startMinutes: 100, endMinutes: 150 })
      expect(result[1]).toEqual({ startMinutes: 250, endMinutes: 300 })
    })

    it('should remove completely covered range', () => {
      const available: TimeRange[] = [{ startMinutes: 100, endMinutes: 200 }]
      const unavailable: TimeRange[] = [{ startMinutes: 50, endMinutes: 250 }]
      const result = subtractRanges(available, unavailable)
      expect(result).toHaveLength(0)
    })

    it('should handle multiple unavailable ranges', () => {
      const available: TimeRange[] = [{ startMinutes: 100, endMinutes: 500 }]
      const unavailable: TimeRange[] = [
        { startMinutes: 150, endMinutes: 200 },
        { startMinutes: 300, endMinutes: 350 },
      ]
      const result = subtractRanges(available, unavailable)
      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ startMinutes: 100, endMinutes: 150 })
      expect(result[1]).toEqual({ startMinutes: 200, endMinutes: 300 })
      expect(result[2]).toEqual({ startMinutes: 350, endMinutes: 500 })
    })
  })
})

describe('Slot Engine - Core Functions', () => {
  describe('calculateStaffDaySlots', () => {
    it('should generate slots for available time', () => {
      const schedule: DaySchedule = {
        date: new Date('2024-01-15'),
        openingHours: [{ startMinutes: 540, endMinutes: 1020 }], // 9:00-17:00
        staffSchedules: new Map([
          ['staff-1', [{ startMinutes: 540, endMinutes: 1020 }]], // 9:00-17:00
        ]),
        appointments: [],
        blockedTimes: [],
      }

      const slots = calculateStaffDaySlots(
        schedule,
        'staff-1',
        60, // 1 hour duration
        15, // 15 min granularity
        'Europe/Zurich'
      )

      // 9:00-17:00 = 8 hours = 16 slots (every 15 min)
      // But last slot must fit duration: 16:00 is last start time for 60min appointment
      expect(slots.length).toBeGreaterThan(0)
      expect(slots[0].startMinutes).toBe(540) // 9:00
      expect(slots[0].endMinutes).toBe(600) // 10:00
      expect(slots[0].staffId).toBe('staff-1')
    })

    it('should respect existing appointments', () => {
      const schedule: DaySchedule = {
        date: new Date('2024-01-15'),
        openingHours: [{ startMinutes: 540, endMinutes: 720 }], // 9:00-12:00
        staffSchedules: new Map([
          ['staff-1', [{ startMinutes: 540, endMinutes: 720 }]], // 9:00-12:00
        ]),
        appointments: [
          {
            staffId: 'staff-1',
            startMinutes: 600, // 10:00
            durationMinutes: 60, // Until 11:00
          },
        ],
        blockedTimes: [],
      }

      const slots = calculateStaffDaySlots(
        schedule,
        'staff-1',
        30, // 30 min duration
        15,
        'Europe/Zurich'
      )

      // Should have slots 9:00-10:00 and 11:00-12:00, but not 10:00-11:00
      const slotTimes = slots.map(s => s.startTime)
      expect(slotTimes).toContain('09:00')
      expect(slotTimes).toContain('09:15')
      expect(slotTimes).toContain('09:30')
      expect(slotTimes).not.toContain('10:00') // Blocked by appointment
      expect(slotTimes).not.toContain('10:30') // Blocked by appointment
      expect(slotTimes).toContain('11:00') // After appointment
    })

    it('should respect blocked times', () => {
      const schedule: DaySchedule = {
        date: new Date('2024-01-15'),
        openingHours: [{ startMinutes: 540, endMinutes: 720 }], // 9:00-12:00
        staffSchedules: new Map([
          ['staff-1', [{ startMinutes: 540, endMinutes: 720 }]], // 9:00-12:00
        ]),
        appointments: [],
        blockedTimes: [{ startMinutes: 600, endMinutes: 660 }], // 10:00-11:00
      }

      const slots = calculateStaffDaySlots(
        schedule,
        'staff-1',
        30, // 30 min duration
        15,
        'Europe/Zurich'
      )

      const slotTimes = slots.map(s => s.startTime)
      expect(slotTimes).toContain('09:00')
      expect(slotTimes).not.toContain('10:00') // Blocked time
      expect(slotTimes).not.toContain('10:30') // Blocked time
      expect(slotTimes).toContain('11:00') // After blocked time
    })

    it('should return empty array if staff has no hours', () => {
      const schedule: DaySchedule = {
        date: new Date('2024-01-15'),
        openingHours: [{ startMinutes: 540, endMinutes: 1020 }],
        staffSchedules: new Map([]),
        appointments: [],
        blockedTimes: [],
      }

      const slots = calculateStaffDaySlots(
        schedule,
        'staff-1',
        60,
        15,
        'Europe/Zurich'
      )

      expect(slots).toHaveLength(0)
    })

    it('should handle lunch breaks (split working hours)', () => {
      const schedule: DaySchedule = {
        date: new Date('2024-01-15'),
        openingHours: [{ startMinutes: 540, endMinutes: 1020 }], // 9:00-17:00
        staffSchedules: new Map([
          [
            'staff-1',
            [
              { startMinutes: 540, endMinutes: 720 }, // 9:00-12:00
              { startMinutes: 780, endMinutes: 1020 }, // 13:00-17:00 (1h lunch)
            ],
          ],
        ]),
        appointments: [],
        blockedTimes: [],
      }

      const slots = calculateStaffDaySlots(
        schedule,
        'staff-1',
        60,
        15,
        'Europe/Zurich'
      )

      const slotTimes = slots.map(s => s.startTime)
      expect(slotTimes).toContain('09:00') // Morning slots
      expect(slotTimes).toContain('11:00')
      expect(slotTimes).not.toContain('12:00') // Lunch break
      expect(slotTimes).not.toContain('12:30')
      expect(slotTimes).toContain('13:00') // Afternoon slots
    })
  })

  describe('validateSlotAvailable', () => {
    it('should validate available slot', () => {
      const schedule: DaySchedule = {
        date: new Date('2024-01-15'),
        openingHours: [{ startMinutes: 540, endMinutes: 1020 }],
        staffSchedules: new Map([
          ['staff-1', [{ startMinutes: 540, endMinutes: 1020 }]],
        ]),
        appointments: [],
        blockedTimes: [],
      }

      const slot: AvailableSlot = {
        date: new Date('2024-01-15'),
        startMinutes: 600, // 10:00
        endMinutes: 660, // 11:00
        staffId: 'staff-1',
        startTime: '10:00',
        endTime: '11:00',
        datetime: new Date('2024-01-15T10:00:00'),
      }

      expect(validateSlotAvailable(schedule, slot, 60)).toBe(true)
    })

    it('should reject slot outside working hours', () => {
      const schedule: DaySchedule = {
        date: new Date('2024-01-15'),
        openingHours: [{ startMinutes: 540, endMinutes: 1020 }],
        staffSchedules: new Map([
          ['staff-1', [{ startMinutes: 540, endMinutes: 720 }]], // Until 12:00
        ]),
        appointments: [],
        blockedTimes: [],
      }

      const slot: AvailableSlot = {
        date: new Date('2024-01-15'),
        startMinutes: 780, // 13:00 (after working hours)
        endMinutes: 840, // 14:00
        staffId: 'staff-1',
        startTime: '13:00',
        endTime: '14:00',
        datetime: new Date('2024-01-15T13:00:00'),
      }

      expect(validateSlotAvailable(schedule, slot, 60)).toBe(false)
    })

    it('should reject slot conflicting with appointment', () => {
      const schedule: DaySchedule = {
        date: new Date('2024-01-15'),
        openingHours: [{ startMinutes: 540, endMinutes: 1020 }],
        staffSchedules: new Map([
          ['staff-1', [{ startMinutes: 540, endMinutes: 1020 }]],
        ]),
        appointments: [
          {
            staffId: 'staff-1',
            startMinutes: 600, // 10:00
            durationMinutes: 60, // Until 11:00
          },
        ],
        blockedTimes: [],
      }

      const slot: AvailableSlot = {
        date: new Date('2024-01-15'),
        startMinutes: 630, // 10:30 (overlaps with 10:00-11:00 appointment)
        endMinutes: 690, // 11:30
        staffId: 'staff-1',
        startTime: '10:30',
        endTime: '11:30',
        datetime: new Date('2024-01-15T10:30:00'),
      }

      expect(validateSlotAvailable(schedule, slot, 60)).toBe(false)
    })

    it('should reject slot conflicting with blocked time', () => {
      const schedule: DaySchedule = {
        date: new Date('2024-01-15'),
        openingHours: [{ startMinutes: 540, endMinutes: 1020 }],
        staffSchedules: new Map([
          ['staff-1', [{ startMinutes: 540, endMinutes: 1020 }]],
        ]),
        appointments: [],
        blockedTimes: [{ startMinutes: 600, endMinutes: 660 }], // 10:00-11:00
      }

      const slot: AvailableSlot = {
        date: new Date('2024-01-15'),
        startMinutes: 630, // 10:30 (overlaps with blocked time)
        endMinutes: 690, // 11:30
        staffId: 'staff-1',
        startTime: '10:30',
        endTime: '11:30',
        datetime: new Date('2024-01-15T10:30:00'),
      }

      expect(validateSlotAvailable(schedule, slot, 60)).toBe(false)
    })

    it('should handle staff with no hours', () => {
      const schedule: DaySchedule = {
        date: new Date('2024-01-15'),
        openingHours: [{ startMinutes: 540, endMinutes: 1020 }],
        staffSchedules: new Map([]),
        appointments: [],
        blockedTimes: [],
      }

      const slot: AvailableSlot = {
        date: new Date('2024-01-15'),
        startMinutes: 600,
        endMinutes: 660,
        staffId: 'staff-1',
        startTime: '10:00',
        endTime: '11:00',
        datetime: new Date('2024-01-15T10:00:00'),
      }

      expect(validateSlotAvailable(schedule, slot, 60)).toBe(false)
    })
  })
})

describe('Slot Engine - Edge Cases & Invariants', () => {
  it('should never generate overlapping slots for same staff', () => {
    const schedule: DaySchedule = {
      date: new Date('2024-01-15'),
      openingHours: [{ startMinutes: 540, endMinutes: 1020 }],
      staffSchedules: new Map([
        ['staff-1', [{ startMinutes: 540, endMinutes: 1020 }]],
      ]),
      appointments: [],
      blockedTimes: [],
    }

    const slots = calculateStaffDaySlots(schedule, 'staff-1', 60, 15, 'Europe/Zurich')

    // Check no overlaps
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const overlap = rangesOverlap(
          { startMinutes: slots[i].startMinutes, endMinutes: slots[i].endMinutes },
          { startMinutes: slots[j].startMinutes, endMinutes: slots[j].endMinutes }
        )
        expect(overlap).toBe(false)
      }
    }
  })

  it('should respect slot granularity', () => {
    const schedule: DaySchedule = {
      date: new Date('2024-01-15'),
      openingHours: [{ startMinutes: 540, endMinutes: 1020 }],
      staffSchedules: new Map([
        ['staff-1', [{ startMinutes: 540, endMinutes: 1020 }]],
      ]),
      appointments: [],
      blockedTimes: [],
    }

    const granularity = 30
    const slots = calculateStaffDaySlots(schedule, 'staff-1', 60, granularity, 'Europe/Zurich')

    // All slot start times should be multiples of granularity
    for (const slot of slots) {
      expect(slot.startMinutes % granularity).toBe(0)
    }
  })

  it('should handle zero duration edge case', () => {
    const schedule: DaySchedule = {
      date: new Date('2024-01-15'),
      openingHours: [{ startMinutes: 540, endMinutes: 1020 }],
      staffSchedules: new Map([
        ['staff-1', [{ startMinutes: 540, endMinutes: 1020 }]],
      ]),
      appointments: [],
      blockedTimes: [],
    }

    // Duration of 0 should return empty array (no valid slots)
    const slots = calculateStaffDaySlots(schedule, 'staff-1', 0, 15, 'Europe/Zurich')
    expect(slots).toHaveLength(0)
  })
})
