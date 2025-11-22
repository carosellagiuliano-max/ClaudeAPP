'use client'

/**
 * Staff Absences Manager Component
 * Manage absences for a staff member
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Plus, Trash2, Calendar, Edit, Save, X } from 'lucide-react'
import {
  getStaffAbsences,
  addStaffAbsence,
  updateStaffAbsence,
  deleteStaffAbsence,
} from '../actions/staff'
import { ABSENCE_REASON_LABELS } from '../types/staff'
import type { StaffAbsence } from '../types/staff'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

interface StaffAbsencesManagerProps {
  salonId: string
  staffId: string
}

export function StaffAbsencesManager({ salonId, staffId }: StaffAbsencesManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [absences, setAbsences] = useState<StaffAbsence[]>([])

  // New absence form
  const [newAbsence, setNewAbsence] = useState({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    reason: 'vacation' as const,
    notes: '',
  })

  // Edit absence form
  const [editAbsence, setEditAbsence] = useState({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    reason: 'vacation' as const,
    notes: '',
  })

  // Load absences
  useEffect(() => {
    const loadAbsences = async () => {
      const result = await getStaffAbsences(salonId, staffId)
      if (result.success && result.data) {
        setAbsences(result.data)
      }
    }
    loadAbsences()
  }, [salonId, staffId])

  const timeToMinutes = (time: string): number | undefined => {
    if (!time) return undefined
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number | null): string => {
    if (minutes === null || minutes === undefined) return ''
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const handleAddAbsence = async () => {
    if (!newAbsence.startDate || !newAbsence.endDate) {
      setError('Bitte geben Sie Start- und Enddatum ein')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await addStaffAbsence(salonId, {
        staffId,
        startDate: newAbsence.startDate,
        endDate: newAbsence.endDate,
        startTimeMinutes: timeToMinutes(newAbsence.startTime),
        endTimeMinutes: timeToMinutes(newAbsence.endTime),
        reason: newAbsence.reason,
        notes: newAbsence.notes || undefined,
      })

      if (result.success) {
        setAdding(false)
        setNewAbsence({
          startDate: '',
          endDate: '',
          startTime: '',
          endTime: '',
          reason: 'vacation',
          notes: '',
        })
        // Reload absences
        const reloadResult = await getStaffAbsences(salonId, staffId)
        if (reloadResult.success && reloadResult.data) {
          setAbsences(reloadResult.data)
        }
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Hinzufügen der Abwesenheit')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAbsence = async (absenceId: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await updateStaffAbsence(salonId, absenceId, {
        startDate: editAbsence.startDate,
        endDate: editAbsence.endDate,
        startTimeMinutes: timeToMinutes(editAbsence.startTime),
        endTimeMinutes: timeToMinutes(editAbsence.endTime),
        reason: editAbsence.reason,
        notes: editAbsence.notes || undefined,
      })

      if (result.success) {
        setEditing(null)
        // Reload absences
        const reloadResult = await getStaffAbsences(salonId, staffId)
        if (reloadResult.success && reloadResult.data) {
          setAbsences(reloadResult.data)
        }
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Aktualisieren der Abwesenheit')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAbsence = async (absenceId: string, reason: string) => {
    if (!confirm(`Möchten Sie diese Abwesenheit (${reason}) wirklich löschen?`)) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await deleteStaffAbsence(salonId, absenceId)

      if (result.success) {
        // Reload absences
        const reloadResult = await getStaffAbsences(salonId, staffId)
        if (reloadResult.success && reloadResult.data) {
          setAbsences(reloadResult.data)
        }
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Löschen der Abwesenheit')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (absence: StaffAbsence) => {
    setEditing(absence.id)
    setEditAbsence({
      startDate: absence.startDate,
      endDate: absence.endDate,
      startTime: minutesToTime(absence.startTimeMinutes),
      endTime: minutesToTime(absence.endTimeMinutes),
      reason: absence.reason as any,
      notes: absence.notes || '',
    })
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd.MM.yyyy', { locale: de })
    } catch {
      return dateStr
    }
  }

  const getAbsenceVariant = (reason: string): 'default' | 'secondary' | 'destructive' => {
    switch (reason) {
      case 'sick':
        return 'destructive'
      case 'vacation':
        return 'default'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Absences List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Abwesenheiten</CardTitle>
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
                      <Label htmlFor="startDate">Startdatum *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={newAbsence.startDate}
                        onChange={(e) =>
                          setNewAbsence((prev) => ({ ...prev, startDate: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">Enddatum *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={newAbsence.endDate}
                        onChange={(e) =>
                          setNewAbsence((prev) => ({ ...prev, endDate: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Startzeit (optional)</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={newAbsence.startTime}
                        onChange={(e) =>
                          setNewAbsence((prev) => ({ ...prev, startTime: e.target.value }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Leer lassen für ganztägige Abwesenheit
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endTime">Endzeit (optional)</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={newAbsence.endTime}
                        onChange={(e) =>
                          setNewAbsence((prev) => ({ ...prev, endTime: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Grund *</Label>
                    <Select
                      value={newAbsence.reason}
                      onValueChange={(value: any) =>
                        setNewAbsence((prev) => ({ ...prev, reason: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ABSENCE_REASON_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notizen</Label>
                    <Textarea
                      id="notes"
                      value={newAbsence.notes}
                      onChange={(e) =>
                        setNewAbsence((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      rows={3}
                      placeholder="Zusätzliche Informationen..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleAddAbsence} disabled={loading}>
                      Speichern
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAdding(false)
                        setNewAbsence({
                          startDate: '',
                          endDate: '',
                          startTime: '',
                          endTime: '',
                          reason: 'vacation',
                          notes: '',
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

          {absences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Keine Abwesenheiten erfasst.</p>
              <p className="text-sm">Erfassen Sie Urlaub, Krankheit und andere Abwesenheiten.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zeitraum</TableHead>
                    <TableHead>Zeit</TableHead>
                    <TableHead>Grund</TableHead>
                    <TableHead>Notizen</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absences.map((absence) => (
                    <TableRow key={absence.id}>
                      <TableCell>
                        {editing === absence.id ? (
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={editAbsence.startDate}
                              onChange={(e) =>
                                setEditAbsence((prev) => ({
                                  ...prev,
                                  startDate: e.target.value,
                                }))
                              }
                              className="w-[150px]"
                            />
                            <span className="self-center">-</span>
                            <Input
                              type="date"
                              value={editAbsence.endDate}
                              onChange={(e) =>
                                setEditAbsence((prev) => ({
                                  ...prev,
                                  endDate: e.target.value,
                                }))
                              }
                              className="w-[150px]"
                            />
                          </div>
                        ) : (
                          <>
                            {formatDate(absence.startDate)} - {formatDate(absence.endDate)}
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        {editing === absence.id ? (
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={editAbsence.startTime}
                              onChange={(e) =>
                                setEditAbsence((prev) => ({
                                  ...prev,
                                  startTime: e.target.value,
                                }))
                              }
                              className="w-[100px]"
                            />
                            <Input
                              type="time"
                              value={editAbsence.endTime}
                              onChange={(e) =>
                                setEditAbsence((prev) => ({
                                  ...prev,
                                  endTime: e.target.value,
                                }))
                              }
                              className="w-[100px]"
                            />
                          </div>
                        ) : absence.startTimeMinutes && absence.endTimeMinutes ? (
                          <>
                            {minutesToTime(absence.startTimeMinutes)} -{' '}
                            {minutesToTime(absence.endTimeMinutes)}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">Ganztägig</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editing === absence.id ? (
                          <Select
                            value={editAbsence.reason}
                            onValueChange={(value: any) =>
                              setEditAbsence((prev) => ({ ...prev, reason: value }))
                            }
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ABSENCE_REASON_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={getAbsenceVariant(absence.reason)}>
                            {ABSENCE_REASON_LABELS[absence.reason]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editing === absence.id ? (
                          <Textarea
                            value={editAbsence.notes}
                            onChange={(e) =>
                              setEditAbsence((prev) => ({ ...prev, notes: e.target.value }))
                            }
                            rows={2}
                            className="max-w-xs"
                          />
                        ) : absence.notes ? (
                          <span className="text-sm">{absence.notes}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editing === absence.id ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleUpdateAbsence(absence.id)}
                              disabled={loading}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditing(null)}
                              disabled={loading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEditing(absence)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                handleDeleteAbsence(
                                  absence.id,
                                  ABSENCE_REASON_LABELS[absence.reason]
                                )
                              }
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
