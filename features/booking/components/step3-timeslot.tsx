'use client'

/**
 * Step 3: Time Slot Selection
 * Shows a calendar and available time slots for the selected date
 */

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar, Clock, Loader2 } from 'lucide-react'
import { format, addDays, startOfDay, isSameDay } from 'date-fns'
import { de } from 'date-fns/locale'
import { type TimeSlot, type Step3Data, type SelectedService } from '../types'
import { getAvailableSlots } from '../actions'

interface Step3Props {
  salonId: string
  services: SelectedService[]
  staffId: string | null
  staffMembers: Array<{ id: string; displayName: string }>
  initialSelection?: Step3Data
  onNext: (data: Step3Data) => void
  onBack: () => void
}

export function Step3TimeSlot({
  salonId,
  services,
  staffId,
  staffMembers,
  initialSelection,
  onNext,
  onBack,
}: Step3Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(
    initialSelection ? new Date(initialSelection.date) : startOfDay(new Date())
  )
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [slots, setSlots] = useState<Record<string, TimeSlot[]>>({})
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState<Date>(startOfDay(new Date()))

  // Load available slots
  useEffect(() => {
    loadSlots()
  }, [weekStart, staffId])

  const loadSlots = async () => {
    setLoading(true)
    try {
      const serviceIds = services.map(s => s.serviceId)
      const response = await getAvailableSlots(salonId, serviceIds, staffId, weekStart, 14)

      if (response.success) {
        // Add staff names to slots
        const slotsWithNames = Object.entries(response.slots).reduce((acc, [date, dateSlots]) => {
          acc[date] = dateSlots.map(slot => ({
            ...slot,
            staffName: staffMembers.find(s => s.id === slot.staffId)?.displayName || '',
          }))
          return acc
        }, {} as Record<string, TimeSlot[]>)

        setSlots(slotsWithNames)
      }
    } catch (error) {
      console.error('Error loading slots:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreviousWeek = () => {
    setWeekStart(addDays(weekStart, -7))
  }

  const handleNextWeek = () => {
    setWeekStart(addDays(weekStart, 7))
  }

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot)
  }

  const handleNext = () => {
    if (!selectedSlot) return

    onNext({
      date: selectedSlot.date,
      startMinutes: selectedSlot.startMinutes,
      endMinutes: selectedSlot.endMinutes,
      staffId: selectedSlot.staffId,
      datetime: selectedSlot.datetime,
    })
  }

  // Generate days to show (next 14 days)
  const daysToShow = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i))

  const getDateKey = (date: Date) => format(date, 'yyyy-MM-dd')

  const getSlotsForDate = (date: Date): TimeSlot[] => {
    return slots[getDateKey(date)] || []
  }

  const hasSlots = (date: Date): boolean => {
    return getSlotsForDate(date).length > 0
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Datum & Uhrzeit wählen</h2>
        <p className="text-muted-foreground">
          Wählen Sie einen verfügbaren Termin für Ihre Behandlung.
        </p>
      </div>

      {/* Date Selector */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-5 w-5" />
            Datum wählen
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {daysToShow.map(day => {
              const isSelected = isSameDay(day, selectedDate)
              const hasSlotsForDay = hasSlots(day)
              const isPast = day < startOfDay(new Date())

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => hasSlotsForDay && setSelectedDate(day)}
                  disabled={!hasSlotsForDay || isPast}
                  className={`
                    flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all
                    ${isSelected ? 'border-primary bg-primary text-primary-foreground ring-2 ring-primary' : ''}
                    ${hasSlotsForDay && !isPast ? 'hover:border-primary/50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                  `}
                >
                  <span className="text-xs font-medium uppercase">
                    {format(day, 'EEE', { locale: de })}
                  </span>
                  <span className="text-2xl font-bold">
                    {format(day, 'd')}
                  </span>
                  <span className="text-xs">
                    {format(day, 'MMM', { locale: de })}
                  </span>
                  {hasSlotsForDay && !isPast && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {getSlotsForDate(day).length}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Time Slots */}
      {!loading && selectedDate && getSlotsForDate(selectedDate).length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5" />
            Verfügbare Zeiten für {format(selectedDate, 'dd. MMMM yyyy', { locale: de })}
          </h3>

          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
            {getSlotsForDate(selectedDate).map((slot, index) => {
              const isSelected = selectedSlot?.datetime === slot.datetime

              return (
                <Button
                  key={`${slot.datetime}-${index}`}
                  variant={isSelected ? 'default' : 'outline'}
                  className="flex flex-col items-start gap-1 h-auto py-3"
                  onClick={() => handleSelectSlot(slot)}
                >
                  <span className="text-lg font-bold">{slot.startTime}</span>
                  {staffId === null && (
                    <span className="text-xs opacity-80">{slot.staffName}</span>
                  )}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {!loading && selectedDate && getSlotsForDate(selectedDate).length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine verfügbaren Termine</h3>
            <p className="text-sm text-muted-foreground">
              Für dieses Datum sind leider keine Termine verfügbar. Bitte wählen Sie ein anderes Datum.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button size="lg" onClick={handleNext} disabled={!selectedSlot}>
          Weiter
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
