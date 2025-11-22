import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getDefaultSalon, getTeamMembers } from '@/lib/db/queries'
import { getInitials } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Unser Team',
  description: 'Lernen Sie unser erfahrenes Team kennen. Professionelle Friseure mit Leidenschaft für Ihr Wohlbefinden.',
}

export default async function TeamPage() {
  const salon = await getDefaultSalon()
  const team = salon ? await getTeamMembers(salon.id) : []

  return (
    <div className="flex flex-col">
      <section className="bg-gradient-to-b from-background to-muted/20 py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">Unser Team</Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Die Menschen hinter SCHNITTWERK
            </h1>
            <p className="text-lg text-muted-foreground">
              Lernen Sie unser leidenschaftliches Team kennen, das jeden Tag für Ihr Wohlbefinden arbeitet.
            </p>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <Card key={member.id} className="overflow-hidden transition-shadow hover:shadow-lg">
              <CardHeader className="bg-gradient-to-br from-primary/5 to-secondary/5 pb-8 pt-12">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                  {getInitials(member.display_name || 'Team Member')}
                </div>
              </CardHeader>
              <CardContent className="pt-6 text-center">
                <CardTitle className="mb-2">{member.display_name}</CardTitle>
                <Badge variant="secondary" className="mb-4">{member.position || 'Friseur/in'}</Badge>
                {member.bio && <p className="text-sm text-muted-foreground">{member.bio}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
