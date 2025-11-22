'use client'

/**
 * Step 2: Staff Selection
 * Allows customers to select a specific staff member or choose "no preference"
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, User, Sparkles } from 'lucide-react'
import { type StaffMember, type Step2Data } from '../types'

interface Step2Props {
  staff: StaffMember[]
  initialSelection?: Step2Data
  onNext: (data: Step2Data) => void
  onBack: () => void
}

export function Step2Staff({ staff, initialSelection, onNext, onBack }: Step2Props) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(
    initialSelection?.staffId || null
  )

  const handleNext = () => {
    const selectedStaff = staff.find(s => s.id === selectedStaffId)

    onNext({
      staffId: selectedStaffId,
      staffName: selectedStaff?.displayName || null,
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Mitarbeiter wählen</h2>
        <p className="text-muted-foreground">
          Wählen Sie einen Mitarbeiter oder lassen Sie uns den besten für Sie auswählen.
        </p>
      </div>

      {/* No Preference Option */}
      <Card
        className={`cursor-pointer transition-all ${
          selectedStaffId === null
            ? 'border-primary bg-primary/5 ring-2 ring-primary'
            : 'hover:border-primary/50'
        }`}
        onClick={() => setSelectedStaffId(null)}
      >
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Keine Präferenz</h3>
              <Badge variant="secondary">Empfohlen</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Wir wählen den nächsten verfügbaren Mitarbeiter für Sie aus.
            </p>
          </div>
          {selectedStaffId === null && (
            <Badge variant="default" className="ml-2">
              Ausgewählt
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Staff Members */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Oder wählen Sie einen bestimmten Mitarbeiter:
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {staff.map(member => {
            const selected = selectedStaffId === member.id
            const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`

            return (
              <Card
                key={member.id}
                className={`cursor-pointer transition-all ${
                  selected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedStaffId(member.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-lg font-semibold">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.displayName}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {member.displayName}
                        </CardTitle>
                        {selected && (
                          <Badge variant="default" className="ml-2">
                            Ausgewählt
                          </Badge>
                        )}
                      </div>
                      {member.bio && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {member.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button size="lg" onClick={handleNext}>
          Weiter
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
