'use client'

/**
 * Staff Table Component
 * Display staff members in a table with actions
 */

import { useState } from 'react'
import Link from 'next/link'
import { Edit, Trash2, Eye, EyeOff, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { StaffWithProfile } from '../types/staff'
import { deleteStaffMember, updateStaffMember } from '../actions/staff'
import { useRouter } from 'next/navigation'
import { POSITION_LABELS, EMPLOYMENT_TYPE_LABELS } from '../types/staff'

interface StaffTableProps {
  staff: StaffWithProfile[]
  salonId: string
}

export function StaffTable({ staff, salonId }: StaffTableProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (staffId: string, staffName: string) => {
    if (
      !confirm(
        `Möchten Sie ${staffName} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
      )
    ) {
      return
    }

    setDeleting(staffId)
    const result = await deleteStaffMember(salonId, staffId)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Fehler beim Löschen des Mitarbeiters')
    }
    setDeleting(null)
  }

  const toggleActive = async (staffId: string, currentStatus: boolean) => {
    const result = await updateStaffMember(salonId, staffId, {
      isActive: !currentStatus,
    })

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Fehler beim Aktualisieren des Mitarbeiters')
    }
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'ST'
  }

  if (staff.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Noch keine Mitarbeiter vorhanden.</p>
        <Link href="/admin/mitarbeiter/neu">
          <Button className="mt-4">Ersten Mitarbeiter hinzufügen</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Anstellung</TableHead>
            <TableHead>Kontakt</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.photoUrl || undefined} />
                    <AvatarFallback>
                      {getInitials(member.profile.firstName, member.profile.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{member.displayName}</div>
                    {member.staffNumber && (
                      <div className="text-sm text-muted-foreground">#{member.staffNumber}</div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {member.position ? (
                  <Badge variant="outline">{POSITION_LABELS[member.position]}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                {member.employmentType ? (
                  <span className="text-sm">{EMPLOYMENT_TYPE_LABELS[member.employmentType]}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{member.profile.email}</div>
                  {member.profile.phone && (
                    <div className="text-muted-foreground">{member.profile.phone}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {member.isActive ? (
                    <Badge variant="default" className="w-fit">
                      Aktiv
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="w-fit">
                      Inaktiv
                    </Badge>
                  )}
                  {member.acceptsOnlineBookings && member.isActive && (
                    <Badge variant="outline" className="w-fit text-xs">
                      Buchbar
                    </Badge>
                  )}
                  {member.showInTeamPage && member.isActive && (
                    <Badge variant="outline" className="w-fit text-xs">
                      Sichtbar
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive(member.id, member.isActive)}
                    title={member.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {member.isActive ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Link href={`/admin/mitarbeiter/${member.id}`}>
                    <Button variant="ghost" size="icon" title="Bearbeiten">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(member.id, member.displayName || 'Mitarbeiter')}
                    disabled={deleting === member.id}
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
