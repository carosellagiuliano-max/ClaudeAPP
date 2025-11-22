'use client'

/**
 * Staff Working Hours Manager Component
 * Manage weekly working hours for a staff member
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Clock } from 'lucide-react'
import {
  getStaffWorkingHours,
  addStaffWorkingHours,
  deleteStaffWorkingHours,
} from '../actions/staff'
import { DAY_OF_WEEK_LABELS } from '../types/staff'
import type { StaffWorkingHours } from '../types/staff'

interface StaffWorkingHoursManagerProps {
  salonId: string
  staffId: string
}

export function StaffWorkingHoursManager({
  salonId,
  staffId,
}: StaffWorkingHoursManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [workingHours, setWorkingHours] = useState<StaffWorkingHours[]>([])

  // New working hours form
  const [newHours, setNewHours] = useState({
    dayOfWeek: 1, // Monday by default
    startTime: '09:00',
    endTime: '17:00',
    breakStart: '',
    breakEnd: '',
    label: '',
  })

  // Load working hours
  useEffect(() => {
    const loadHours = async () => {
      const result = await getStaffWorkingHours(salonId, staffId)
      if (result.success && result.data) {
        setWorkingHours(result.data)
      }
    }
    loadHours()
  }, [salonId, staffId])

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const handleAddHours = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await addStaffWorkingHours(salonId, {
        staffId,
        dayOfWeek: newHours.dayOfWeek,
        startTimeMinutes: timeToMinutes(newHours.startTime),
        endTimeMinutes: timeToMinutes(newHours.endTime),
        breakStartMinutes: newHours.breakStart ? timeToMinutes(newHours.breakStart) : undefined,
        breakEndMinutes: newHours.breakEnd ? timeToMinutes(newHours.breakEnd) : undefined,
        label: newHours.label || undefined,
      })

      if (result.success) {
        setAdding(false)
        setNewHours({
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          breakStart: '',
          breakEnd: '',
          label: '',
        })
        // Reload hours
        const reloadResult = await getStaffWorkingHours(salonId, staffId)
        if (reloadResult.success && reloadResult.data) {
          setWorkingHours(reloadResult.data)
        }
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Hinzufügen der Arbeitszeiten')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteHours = async (hoursId: string, day: number) => {
    if (!confirm(`Möchten Sie die Arbeitszeiten für ${DAY_OF_WEEK_LABELS[day]} wirklich löschen?`)) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await deleteStaffWorkingHours(salonId, hoursId)

      if (result.success) {
        // Reload hours
        const reloadResult = await getStaffWorkingHours(salonId, staffId)
        if (reloadResult.success && reloadResult.data) {
          setWorkingHours(reloadResult.data)
        }
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Löschen der Arbeitszeiten')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  // Group hours by day of week
  const hoursByDay = workingHours.reduce(
    (acc, hours) => {
      if (!acc[hours.dayOfWeek]) {
        acc[hours.dayOfWeek] = []
      }
      acc[hours.dayOfWeek].push(hours)
      return acc
    },
    {} as Record<number, StaffWorkingHours[]>
  )

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Weekly Schedule */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Wochenplan</CardTitle>
          <Button size="sm" onClick={() => setAdding(!adding)}>
            <Plus className="mr-2 h-4 w-4" />
            Hinzufügen
          </Button>
        </CardHeader>
        <CardContent>
          {adding && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dayOfWeek">Wochentag *</Label>
                      <select
                        id="dayOfWeek"
                        value={newHours.dayOfWeek}
                        onChange={(e) =>
                          setNewHours((prev) => ({
                            ...prev,
                            dayOfWeek: parseInt(e.target.value),
                          }))
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="label">Bezeichnung</Label>
                      <Input
                        id="label"
                        value={newHours.label}
                        onChange={(e) =>
                          setNewHours((prev) => ({ ...prev, label: e.target.value }))
                        }
                        placeholder="z.B. Hauptschicht"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Startzeit *</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={newHours.startTime}
                        onChange={(e) =>
                          setNewHours((prev) => ({ ...prev, startTime: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endTime">Endzeit *</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={newHours.endTime}
                        onChange={(e) =>
                          setNewHours((prev) => ({ ...prev, endTime: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="breakStart">Pause Start</Label>
                      <Input
                        id="breakStart"
                        type="time"
                        value={newHours.breakStart}
                        onChange={(e) =>
                          setNewHours((prev) => ({ ...prev, breakStart: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="breakEnd">Pause Ende</Label>
                      <Input
                        id="breakEnd"
                        type="time"
                        value={newHours.breakEnd}
                        onChange={(e) =>
                          setNewHours((prev) => ({ ...prev, breakEnd: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleAddHours} disabled={loading}>
                      Speichern
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAdding(false)
                        setNewHours({
                          dayOfWeek: 1,
                          startTime: '09:00',
                          endTime: '17:00',
                          breakStart: '',
                          breakEnd: '',
                          label: '',
                        })
                      }}
                      disabled={loading}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {workingHours.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Noch keine Arbeitszeiten definiert.</p>
              <p className="text-sm">Legen Sie die wöchentlichen Arbeitszeiten fest.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wochentag</TableHead>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead>Arbeitszeit</TableHead>
                    <TableHead>Pause</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                    const dayHours = hoursByDay[day] || []
                    if (dayHours.length === 0) {
                      return (
                        <TableRow key={day}>
                          <TableCell>
                            <Badge variant="outline">{DAY_OF_WEEK_LABELS[day]}</Badge>
                          </TableCell>
                          <TableCell colSpan={4} className="text-muted-foreground text-sm">
                            Nicht arbeitend
                          </TableCell>
                        </TableRow>
                      )
                    }
                    return dayHours.map((hours, index) => (
                      <TableRow key={hours.id}>
                        {index === 0 && (
                          <TableCell rowSpan={dayHours.length}>
                            <Badge variant="outline">{DAY_OF_WEEK_LABELS[day]}</Badge>
                          </TableCell>
                        )}
                        <TableCell>{hours.label || '-'}</TableCell>
                        <TableCell>
                          {minutesToTime(hours.startTimeMinutes)} -{' '}
                          {minutesToTime(hours.endTimeMinutes)}
                        </TableCell>
                        <TableCell>
                          {hours.breakStartMinutes && hours.breakEndMinutes ? (
                            <>
                              {minutesToTime(hours.breakStartMinutes)} -{' '}
                              {minutesToTime(hours.breakEndMinutes)}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">Keine Pause</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteHours(hours.id, day)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
