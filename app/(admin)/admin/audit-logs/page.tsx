'use client'

/**
 * Audit Logs Page
 * View system activity and changes
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, FileText, AlertCircle, Eye } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  getAuditLogs,
  getAuditActions,
  getAuditEntityTypes,
} from '@/features/admin/actions/roles'
import type { AuditLogWithUser, AuditLogFilters } from '@/features/admin/types/roles'
import { formatUserName } from '@/features/admin/types/roles'

export default function AuditLogsPage() {
  const [salonId, setSalonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<AuditLogWithUser[]>([])

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [availableActions, setAvailableActions] = useState<string[]>([])
  const [availableEntityTypes, setAvailableEntityTypes] = useState<string[]>([])

  // Detail view
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLogWithUser | null>(null)

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

  // Fetch filter options when salon ID is available
  useEffect(() => {
    if (!salonId) return

    const fetchFilterOptions = async () => {
      const [actionsRes, typesRes] = await Promise.all([
        getAuditActions(salonId),
        getAuditEntityTypes(salonId),
      ])

      if (actionsRes.success && actionsRes.data) {
        setAvailableActions(actionsRes.data)
      }
      if (typesRes.success && typesRes.data) {
        setAvailableEntityTypes(typesRes.data)
      }
    }

    fetchFilterOptions()
  }, [salonId])

  // Fetch logs when filters change
  useEffect(() => {
    if (!salonId) return

    const fetchLogs = async () => {
      setLoading(true)
      setError(null)

      const filters: AuditLogFilters = {
        search: searchTerm || undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
      }

      const result = await getAuditLogs(salonId, filters)
      if (result.success && result.data) {
        setLogs(result.data)
      } else {
        setError(result.error || 'Fehler beim Laden der Logs')
      }

      setLoading(false)
    }

    // Debounce search
    const timer = setTimeout(fetchLogs, 300)
    return () => clearTimeout(timer)
  }, [salonId, searchTerm, actionFilter, entityTypeFilter])

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('create')) return 'default'
    if (action.includes('update')) return 'secondary'
    if (action.includes('delete') || action.includes('remove')) return 'destructive'
    return 'outline'
  }

  const formatAction = (action: string) => {
    const parts = action.split('.')
    if (parts.length === 2) {
      const [entity, verb] = parts
      const verbs: Record<string, string> = {
        create: 'Erstellt',
        update: 'Aktualisiert',
        delete: 'Gelöscht',
        remove: 'Entfernt',
        assign: 'Zugewiesen',
      }
      return `${entity}: ${verbs[verb] || verb}`
    }
    return action
  }

  const formatEntityType = (type: string) => {
    const types: Record<string, string> = {
      user: 'Benutzer',
      staff: 'Mitarbeiter',
      customer: 'Kunde',
      appointment: 'Termin',
      service: 'Service',
      product: 'Produkt',
      order: 'Bestellung',
      salon: 'Salon',
    }
    return types[type] || type
  }

  const handleViewDetails = (log: AuditLogWithUser) => {
    setSelectedLog(log)
    setDetailDialogOpen(true)
  }

  if (error && !logs.length) {
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
          <h1 className="text-3xl font-bold">Audit-Logs</h1>
          <p className="text-muted-foreground">
            Systemaktivitäten und Änderungen nachverfolgen
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suchen nach Benutzer, Aktion, Entität..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Aktion filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Aktionen</SelectItem>
                {availableActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {formatAction(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Typ filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                {availableEntityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatEntityType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aktivitäten
          </CardTitle>
          <CardDescription>
            Die letzten 100 Systemaktivitäten (neueste zuerst)
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
          ) : logs.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Keine Aktivitäten gefunden
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zeitpunkt</TableHead>
                    <TableHead>Benutzer</TableHead>
                    <TableHead>Aktion</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Entität ID</TableHead>
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(parseISO(log.createdAt), 'dd.MM.yyyy HH:mm:ss', {
                          locale: de,
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatUserName(log.user)}</div>
                          <div className="text-xs text-muted-foreground">{log.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {formatAction(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatEntityType(log.entityType)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.entityId ? log.entityId.substring(0, 8) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="text-primary hover:underline text-sm"
                        >
                          <Eye className="h-4 w-4 inline" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {logs.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              {logs.length} Einträge angezeigt
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit-Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog && format(parseISO(selectedLog.createdAt), 'dd.MM.yyyy HH:mm:ss', {
                locale: de,
              })}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Benutzer</p>
                  <p className="text-sm">{formatUserName(selectedLog.user)}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aktion</p>
                  <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                    {formatAction(selectedLog.action)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Entitätstyp</p>
                  <Badge variant="outline">{formatEntityType(selectedLog.entityType)}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Entität ID</p>
                  <p className="font-mono text-xs">{selectedLog.entityId || 'N/A'}</p>
                </div>
              </div>

              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Änderungen</p>
                  <div className="rounded-md bg-muted p-4">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Metadaten</p>
                  <div className="rounded-md bg-muted p-4">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {(selectedLog.ipAddress || selectedLog.userAgent) && (
                <div className="space-y-2">
                  {selectedLog.ipAddress && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">IP-Adresse</p>
                      <p className="font-mono text-xs">{selectedLog.ipAddress}</p>
                    </div>
                  )}
                  {selectedLog.userAgent && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">User Agent</p>
                      <p className="font-mono text-xs break-all">{selectedLog.userAgent}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
