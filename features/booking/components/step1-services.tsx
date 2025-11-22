'use client'

/**
 * Step 1: Service Selection
 * Allows customers to select one or more services for their appointment
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Clock, ChevronRight } from 'lucide-react'
import { type ServiceWithCategory, type SelectedService, type Step1Data } from '../types'
import { formatCurrency } from '@/lib/utils'

interface Step1Props {
  services: ServiceWithCategory[]
  initialSelection?: Step1Data
  onNext: (data: Step1Data) => void
}

export function Step1Services({ services, initialSelection, onNext }: Step1Props) {
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    initialSelection?.services || []
  )

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const category = service.categoryName
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(service)
    return acc
  }, {} as Record<string, ServiceWithCategory[]>)

  const categories = Object.keys(servicesByCategory).sort((a, b) => {
    const catA = services.find(s => s.categoryName === a)
    const catB = services.find(s => s.categoryName === b)
    return (catA?.categoryDisplayOrder || 0) - (catB?.categoryDisplayOrder || 0)
  })

  const isServiceSelected = (serviceId: string) => {
    return selectedServices.some(s => s.serviceId === serviceId)
  }

  const toggleService = (service: ServiceWithCategory) => {
    if (isServiceSelected(service.id)) {
      setSelectedServices(selectedServices.filter(s => s.serviceId !== service.id))
    } else {
      setSelectedServices([
        ...selectedServices,
        {
          serviceId: service.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          priceChf: service.priceChf,
          categoryName: service.categoryName,
        },
      ])
    }
  }

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0)
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.priceChf, 0)

  const handleNext = () => {
    if (selectedServices.length === 0) return

    onNext({ services: selectedServices })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Leistungen wählen</h2>
        <p className="text-muted-foreground">
          Wählen Sie eine oder mehrere Leistungen für Ihren Termin aus.
        </p>
      </div>

      {/* Service Categories */}
      <div className="space-y-6">
        {categories.map(categoryName => (
          <div key={categoryName}>
            <h3 className="mb-3 text-lg font-semibold">{categoryName}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {servicesByCategory[categoryName].map(service => {
                const selected = isServiceSelected(service.id)

                return (
                  <Card
                    key={service.id}
                    className={`cursor-pointer transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => toggleService(service)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        {selected && (
                          <Badge variant="default" className="ml-2">
                            <Check className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                      {service.description && (
                        <CardDescription className="text-sm">
                          {service.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{service.durationMinutes} Min.</span>
                        </div>
                        <div className="font-semibold">
                          {formatCurrency(service.priceChf)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary and Next Button */}
      {selectedServices.length > 0 && (
        <Card className="sticky bottom-4 border-2 bg-background/95 shadow-lg backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">
                  {selectedServices.length} {selectedServices.length === 1 ? 'Leistung' : 'Leistungen'} gewählt
                </div>
                <div className="mt-1 flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{totalDuration} Min.</span>
                  </div>
                  <div className="text-xl font-bold">
                    {formatCurrency(totalPrice)}
                  </div>
                </div>
              </div>
              <Button size="lg" onClick={handleNext}>
                Weiter
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
