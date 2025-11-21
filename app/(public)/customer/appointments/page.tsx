import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, User } from 'lucide-react'

export const metadata: Metadata = { title: 'Meine Termine' }

export default function CustomerAppointmentsPage() {
  // TODO: Implement authentication and fetch real appointments
  // For now, this is a placeholder that will be implemented in Phase 6

  return (
    <div className="container py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Badge variant="secondary" className="mb-4">Meine Termine</Badge>
          <h1 className="mb-4 text-4xl font-bold">Ihre Termine</h1>
          <p className="text-muted-foreground">
            Hier können Sie Ihre gebuchten Termine einsehen und verwalten.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Kommende Termine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">Keine Termine gefunden</p>
              <p className="text-sm">
                Die Authentifizierung wird in Phase 6 implementiert.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Example of what appointments will look like */}
        {/*
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge>Bestätigt</Badge>
                    <span className="text-xs text-muted-foreground">
                      Bestätigungsnummer: ABC12345
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-semibold">Montag, 15. Januar 2024</div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        10:00 - 11:00
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-semibold">Vanessa Carosella</div>
                      <div className="text-sm text-muted-foreground">Haarschnitt</div>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        */}
      </div>
    </div>
  )
}
