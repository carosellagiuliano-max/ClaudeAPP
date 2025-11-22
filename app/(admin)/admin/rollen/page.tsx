'use client'

/**
 * Role Management Page
 * Assign and manage user roles
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Shield, UserCog, AlertCircle, Trash2, Check } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { getSalonUsers, assignRole, removeUserFromSalon } from '@/features/admin/actions/roles'
import type { UserWithRole, UserRole } from '@/features/admin/types/roles'
import {
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  PERMISSIONS,
  getUserPermissions,
  formatUserName,
} from '@/features/admin/types/roles'

export default function RolesPage() {
  const [salonId, setSalonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<UserWithRole[]>([])

  // Edit role dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [saving, setSaving] = useState(false)

  // Remove user dialog
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [userToRemove, setUserToRemove] = useState<UserWithRole | null>(null)
  const [removing, setRemoving] = useState(false)

  // Permissions view
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [viewPermissionsRole, setViewPermissionsRole] = useState<UserRole | null>(null)

  // Fetch salon ID on mount
  useEffect(() => {
    const fetchSalonId = async () => {
      try {
        const response = await fetch('/api/salon/default')
        if (!response.ok) throw new Error('Failed to fetch salon')
        const data = await response.json()
        setSalonId(data.id)
      } catch (err) {
        setError('Salon konnte nicht geladen werden')
        console.error(err)
      }
    }
    fetchSalonId()
  }, [])

  // Fetch users when salon ID is available
  useEffect(() => {
    if (!salonId) return

    const fetchUsers = async () => {
      setLoading(true)
      setError(null)

      const result = await getSalonUsers(salonId)
      if (result.success && result.data) {
        setUsers(result.data)
      } else {
        setError(result.error || 'Fehler beim Laden der Benutzer')
      }

      setLoading(false)
    }

    fetchUsers()
  }, [salonId])

  const handleEditRole = (user: UserWithRole) => {
    setSelectedUser(user)
    setSelectedRole(user.role)
    setEditDialogOpen(true)
  }

  const handleSaveRole = async () => {
    if (!salonId || !selectedUser || !selectedRole) return

    setSaving(true)
    setError(null)

    const result = await assignRole(salonId, {
      userId: selectedUser.id,
      role: selectedRole,
    })

    if (result.success) {
      // Update local state
      setUsers(
        users.map((u) => (u.id === selectedUser.id ? { ...u, role: selectedRole } : u))
      )
      setEditDialogOpen(false)
    } else {
      setError(result.error || 'Fehler beim Speichern der Rolle')
    }

    setSaving(false)
  }

  const handleRemoveUser = async () => {
    if (!salonId || !userToRemove) return

    setRemoving(true)
    setError(null)

    const result = await removeUserFromSalon(salonId, userToRemove.id)

    if (result.success) {
      // Remove from local state
      setUsers(users.filter((u) => u.id !== userToRemove.id))
      setRemoveDialogOpen(false)
    } else {
      setError(result.error || 'Fehler beim Entfernen des Benutzers')
    }

    setRemoving(false)
  }

  const getRoleBadgeClass = (role: UserRole) => {
    const baseClasses = 'px-2.5 py-0.5 text-xs font-medium rounded-full'
    switch (role) {
      case 'owner':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`
      case 'admin':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
      case 'manager':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
      case 'staff':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200`
      default:
        return baseClasses
    }
  }

  if (error && !users.length) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Fehler</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rollen & Berechtigungen</h1>
          <p className="text-muted-foreground">Verwalten Sie Benutzerrollen und Zugriffsrechte</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Role Descriptions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
          <Card key={role} className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setViewPermissionsRole(role)
              setPermissionsDialogOpen(true)
            }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {users.filter((u) => u.role === role).length} Benutzer
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Benutzer</CardTitle>
          <CardDescription>
            Alle Benutzer mit Zugriff auf diesen Salon
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                <p className="mt-4 text-sm text-muted-foreground">Laden...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">Keine Benutzer gefunden</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benutzer</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Hinzugefügt</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {formatUserName(user)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <span className={getRoleBadgeClass(user.role)}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(parseISO(user.createdAt), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRole(user)}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                          {user.role !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUserToRemove(user)
                                setRemoveDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rolle ändern</DialogTitle>
            <DialogDescription>
              {selectedUser && `Rolle für ${formatUserName(selectedUser)} ändern`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Neue Rolle</label>
              <Select
                value={selectedRole || undefined}
                onValueChange={(v) => setSelectedRole(v as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex flex-col">
                        <span className="font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">
                          {ROLE_DESCRIPTIONS[role]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveRole} disabled={saving || !selectedRole}>
              {saving ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer entfernen</DialogTitle>
            <DialogDescription>
              {userToRemove &&
                `Möchten Sie ${formatUserName(userToRemove)} wirklich aus dem Salon entfernen?`}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Diese Aktion kann nicht rückgängig gemacht werden. Der Benutzer verliert den Zugriff auf
              diesen Salon.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)} disabled={removing}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleRemoveUser} disabled={removing}>
              {removing ? 'Entfernen...' : 'Entfernen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Berechtigungen: {viewPermissionsRole && ROLE_LABELS[viewPermissionsRole]}
            </DialogTitle>
            <DialogDescription>
              {viewPermissionsRole && ROLE_DESCRIPTIONS[viewPermissionsRole]}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {viewPermissionsRole && (
              <div className="space-y-2">
                {PERMISSIONS.map((permission) => {
                  const hasAccess = permission.roles.includes(viewPermissionsRole)
                  return (
                    <div
                      key={permission.key}
                      className={`flex items-start gap-3 rounded-md border p-3 ${
                        hasAccess ? 'bg-green-50 dark:bg-green-950' : 'opacity-50'
                      }`}
                    >
                      {hasAccess ? (
                        <Check className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <div className="h-5 w-5 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{permission.label}</p>
                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setPermissionsDialogOpen(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
