'use client'

/**
 * Staff Skills Manager Component
 * Manage service skills for a staff member
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import { Plus, Trash2, Edit, Save, X } from 'lucide-react'
import type { StaffWithSkills } from '../types/staff'
import {
  addStaffServiceSkill,
  updateStaffServiceSkill,
  removeStaffServiceSkill,
} from '../actions/staff'
import { getServices } from '../actions/services'
import { PROFICIENCY_LABELS } from '../types/staff'

interface StaffSkillsManagerProps {
  salonId: string
  staff: StaffWithSkills
}

export function StaffSkillsManager({ salonId, staff }: StaffSkillsManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [services, setServices] = useState<any[]>([])

  // New skill form
  const [newSkill, setNewSkill] = useState({
    serviceId: '',
    proficiencyLevel: '',
    customDurationMinutes: '',
  })

  // Edit skill form
  const [editSkill, setEditSkill] = useState({
    proficiencyLevel: '',
    customDurationMinutes: '',
  })

  // Load available services
  useEffect(() => {
    const loadServices = async () => {
      const result = await getServices(salonId)
      if (result.success && result.data) {
        setServices(result.data)
      }
    }
    loadServices()
  }, [salonId])

  const handleAddSkill = async () => {
    if (!newSkill.serviceId) {
      setError('Bitte wählen Sie eine Leistung aus')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await addStaffServiceSkill(salonId, {
        staffId: staff.id,
        serviceId: newSkill.serviceId,
        proficiencyLevel: newSkill.proficiencyLevel || undefined,
        customDurationMinutes: newSkill.customDurationMinutes
          ? parseInt(newSkill.customDurationMinutes)
          : undefined,
      })

      if (result.success) {
        setAdding(false)
        setNewSkill({ serviceId: '', proficiencyLevel: '', customDurationMinutes: '' })
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Hinzufügen der Fähigkeit')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSkill = async (skillId: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await updateStaffServiceSkill(salonId, skillId, {
        proficiencyLevel: editSkill.proficiencyLevel || undefined,
        customDurationMinutes: editSkill.customDurationMinutes
          ? parseInt(editSkill.customDurationMinutes)
          : undefined,
      })

      if (result.success) {
        setEditing(null)
        setEditSkill({ proficiencyLevel: '', customDurationMinutes: '' })
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Aktualisieren der Fähigkeit')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveSkill = async (skillId: string, serviceName: string) => {
    if (!confirm(`Möchten Sie die Fähigkeit "${serviceName}" wirklich entfernen?`)) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await removeStaffServiceSkill(salonId, skillId)

      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Entfernen der Fähigkeit')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (skill: any) => {
    setEditing(skill.id)
    setEditSkill({
      proficiencyLevel: skill.proficiencyLevel || '',
      customDurationMinutes: skill.customDurationMinutes?.toString() || '',
    })
  }

  // Available services (not already assigned)
  const assignedServiceIds = staff.skills.map((s) => s.serviceId)
  const availableServices = services.filter((s) => !assignedServiceIds.includes(s.id))

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Current Skills */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Leistungsfähigkeiten</CardTitle>
          <Button
            size="sm"
            onClick={() => setAdding(!adding)}
            disabled={availableServices.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Hinzufügen
          </Button>
        </CardHeader>
        <CardContent>
          {adding && (
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="newServiceId">Leistung *</Label>
                      <Select
                        value={newSkill.serviceId}
                        onValueChange={(value) =>
                          setNewSkill((prev) => ({ ...prev, serviceId: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Leistung wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableServices.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.publicTitle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newProficiency">Kompetenzstufe</Label>
                      <Select
                        value={newSkill.proficiencyLevel}
                        onValueChange={(value) =>
                          setNewSkill((prev) => ({ ...prev, proficiencyLevel: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Stufe wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PROFICIENCY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newDuration">Angepasste Dauer (Min)</Label>
                      <Input
                        id="newDuration"
                        type="number"
                        min="1"
                        value={newSkill.customDurationMinutes}
                        onChange={(e) =>
                          setNewSkill((prev) => ({
                            ...prev,
                            customDurationMinutes: e.target.value,
                          }))
                        }
                        placeholder="Standard verwenden"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleAddSkill} disabled={loading}>
                      <Save className="mr-2 h-4 w-4" />
                      Speichern
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAdding(false)
                        setNewSkill({
                          serviceId: '',
                          proficiencyLevel: '',
                          customDurationMinutes: '',
                        })
                      }}
                      disabled={loading}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Abbrechen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {staff.skills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Noch keine Fähigkeiten zugewiesen.</p>
              <p className="text-sm">Fügen Sie Leistungen hinzu, die dieser Mitarbeiter ausführen kann.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leistung</TableHead>
                    <TableHead>Kompetenzstufe</TableHead>
                    <TableHead>Angepasste Dauer</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.skills.map((skill) => (
                    <TableRow key={skill.id}>
                      <TableCell className="font-medium">
                        {skill.service.publicTitle}
                      </TableCell>
                      <TableCell>
                        {editing === skill.id ? (
                          <Select
                            value={editSkill.proficiencyLevel}
                            onValueChange={(value) =>
                              setEditSkill((prev) => ({ ...prev, proficiencyLevel: value }))
                            }
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PROFICIENCY_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : skill.proficiencyLevel ? (
                          <Badge variant="outline">
                            {PROFICIENCY_LABELS[skill.proficiencyLevel]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editing === skill.id ? (
                          <Input
                            type="number"
                            min="1"
                            value={editSkill.customDurationMinutes}
                            onChange={(e) =>
                              setEditSkill((prev) => ({
                                ...prev,
                                customDurationMinutes: e.target.value,
                              }))
                            }
                            placeholder="Standard"
                            className="w-[120px]"
                          />
                        ) : skill.customDurationMinutes ? (
                          <span>{skill.customDurationMinutes} Min</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Standard</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editing === skill.id ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleUpdateSkill(skill.id)}
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
                              onClick={() => startEditing(skill)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                handleRemoveSkill(skill.id, skill.service.publicTitle)
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
