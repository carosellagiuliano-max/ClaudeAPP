'use client'

/**
 * Services Table Component
 * Display services in a table with actions
 */

import { useState } from 'react'
import Link from 'next/link'
import { Edit, Trash2, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react'
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
import type { ServiceWithCategory } from '../types/services'
import { deleteService, updateService } from '../actions/services'
import { useRouter } from 'next/navigation'

interface ServicesTableProps {
  services: ServiceWithCategory[]
  salonId: string
}

export function ServicesTable({ services, salonId }: ServicesTableProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (serviceId: string, serviceName: string) => {
    if (
      !confirm(
        `Möchten Sie die Leistung "${serviceName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
      )
    ) {
      return
    }

    setDeleting(serviceId)
    const result = await deleteService(salonId, serviceId)

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Fehler beim Löschen der Leistung')
    }
    setDeleting(null)
  }

  const toggleActive = async (serviceId: string, currentStatus: boolean) => {
    const result = await updateService(salonId, serviceId, {
      isActive: !currentStatus,
    })

    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Fehler beim Aktualisieren der Leistung')
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(price)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}min`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${mins}min`
    }
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Noch keine Leistungen vorhanden.</p>
        <Link href="/admin/leistungen/neu">
          <Button className="mt-4">Erste Leistung erstellen</Button>
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
            <TableHead>Kategorie</TableHead>
            <TableHead>Preis</TableHead>
            <TableHead>Dauer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{service.publicTitle}</div>
                  <div className="text-sm text-muted-foreground">{service.internalName}</div>
                </div>
              </TableCell>
              <TableCell>
                {service.category ? (
                  <Badge variant="outline">{service.category.name}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">Keine Kategorie</span>
                )}
              </TableCell>
              <TableCell>{formatPrice(service.basePriceChf)}</TableCell>
              <TableCell>{formatDuration(service.baseDurationMinutes)}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {service.isActive ? (
                    <Badge variant="default" className="w-fit">
                      Aktiv
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="w-fit">
                      Inaktiv
                    </Badge>
                  )}
                  {service.onlineBookable && service.isActive && (
                    <Badge variant="outline" className="w-fit text-xs">
                      Online
                    </Badge>
                  )}
                  {service.isFeatured && (
                    <Badge variant="outline" className="w-fit text-xs">
                      Featured
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive(service.id, service.isActive)}
                    title={service.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {service.isActive ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Link href={`/admin/leistungen/${service.id}`}>
                    <Button variant="ghost" size="icon" title="Bearbeiten">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(service.id, service.publicTitle)}
                    disabled={deleting === service.id}
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
