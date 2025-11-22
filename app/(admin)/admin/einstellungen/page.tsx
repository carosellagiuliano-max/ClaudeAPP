'use client'

/**
 * Settings Page
 * Manage salon settings (opening hours, booking rules, VAT, notifications)
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Clock, Settings, Receipt, Bell } from 'lucide-react'
import { getDefaultSalon } from '@/lib/db/queries'
import type {
  OpeningHours,
  BookingSettings,
  VatSettings,
  NotificationSettings,
} from '@/features/admin/types/settings'
import { DAY_NAMES, WEEKDAY_ORDER } from '@/features/admin/types/settings'
import {
  getOpeningHours,
  updateOpeningHours,
  getBookingSettings,
  updateBookingSettings,
  getVatSettings,
  updateVatSettings,
  getNotificationSettings,
  updateNotificationSettings,
} from '@/features/admin/actions/settings'

export default function SettingsPage() {
  const router = useRouter()
  const [salonId, setSalonId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Opening hours state
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([])

  // Booking settings state
  const [bookingSettings, setBookingSettings] = useState<BookingSettings | null>(null)

  // VAT settings state
  const [vatSettings, setVatSettings] = useState<VatSettings | null>(null)

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(
    null
  )

  // Load all settings
  useEffect(() => {
    const loadData = async () => {
      const salon = await getDefaultSalon()
      if (!salon) return

      setSalonId(salon.id)

      // Load all settings in parallel
      const [hoursResult, bookingResult, vatResult, notifResult] = await Promise.all([
        getOpeningHours(salon.id),
        getBookingSettings(salon.id),
        getVatSettings(salon.id),
        getNotificationSettings(salon.id),
      ])

      if (hoursResult.success && hoursResult.data) {
        setOpeningHours(hoursResult.data)
      }

      if (bookingResult.success && bookingResult.data) {
        setBookingSettings(bookingResult.data)
      }

      if (vatResult.success && vatResult.data) {
        setVatSettings(vatResult.data)
      }

      if (notifResult.success && notifResult.data) {
        setNotificationSettings(notifResult.data)
      }
    }
    loadData()
  }, [])

  const handleSaveOpeningHours = async (day: OpeningHours) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateOpeningHours(salonId, day)
      if (result.success) {
        setSuccess('Öffnungszeiten gespeichert')
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleSaveBookingSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingSettings) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateBookingSettings(salonId, bookingSettings)
      if (result.success) {
        setSuccess('Buchungseinstellungen gespeichert')
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleSaveVatSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vatSettings) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateVatSettings(salonId, vatSettings)
      if (result.success) {
        setSuccess('MwSt.-Einstellungen gespeichert')
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const handleSaveNotificationSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notificationSettings) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await updateNotificationSettings(salonId, notificationSettings)
      if (result.success) {
        setSuccess('Benachrichtigungseinstellungen gespeichert')
        router.refresh()
      } else {
        setError(result.error || 'Fehler beim Speichern')
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setLoading(false)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihre Salon-Einstellungen</p>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-600">{success}</div>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="hours" className="space-y-6">
        <TabsList>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="h-4 w-4" />
            Öffnungszeiten
          </TabsTrigger>
          <TabsTrigger value="booking" className="gap-2">
            <Settings className="h-4 w-4" />
            Buchungsregeln
          </TabsTrigger>
          <TabsTrigger value="vat" className="gap-2">
            <Receipt className="h-4 w-4" />
            MwSt.
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Benachrichtigungen
          </TabsTrigger>
        </TabsList>

        {/* Opening Hours */}
        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Öffnungszeiten</CardTitle>
              <CardDescription>
                Legen Sie Ihre wöchentlichen Öffnungszeiten fest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {WEEKDAY_ORDER.map((dayOfWeek) => {
                const dayHours = openingHours.find((h) => h.dayOfWeek === dayOfWeek) || {
                  dayOfWeek,
                  isOpen: false,
                  openTime: '09:00',
                  closeTime: '18:00',
                  breakStart: null,
                  breakEnd: null,
                }

                return (
                  <div key={dayOfWeek} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">{DAY_NAMES[dayOfWeek]}</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={dayHours.isOpen}
                          onCheckedChange={(checked) => {
                            const updated = { ...dayHours, isOpen: checked as boolean }
                            setOpeningHours((prev) => {
                              const filtered = prev.filter((h) => h.dayOfWeek !== dayOfWeek)
                              return [...filtered, updated]
                            })
                          }}
                        />
                        <Label className="cursor-pointer">Geöffnet</Label>
                      </div>
                    </div>

                    {dayHours.isOpen && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Öffnungszeit</Label>
                            <Input
                              type="time"
                              value={dayHours.openTime}
                              onChange={(e) => {
                                const updated = { ...dayHours, openTime: e.target.value }
                                setOpeningHours((prev) => {
                                  const filtered = prev.filter((h) => h.dayOfWeek !== dayOfWeek)
                                  return [...filtered, updated]
                                })
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Schließzeit</Label>
                            <Input
                              type="time"
                              value={dayHours.closeTime}
                              onChange={(e) => {
                                const updated = { ...dayHours, closeTime: e.target.value }
                                setOpeningHours((prev) => {
                                  const filtered = prev.filter((h) => h.dayOfWeek !== dayOfWeek)
                                  return [...filtered, updated]
                                })
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Pause Start (optional)</Label>
                            <Input
                              type="time"
                              value={dayHours.breakStart || ''}
                              onChange={(e) => {
                                const updated = {
                                  ...dayHours,
                                  breakStart: e.target.value || null,
                                }
                                setOpeningHours((prev) => {
                                  const filtered = prev.filter((h) => h.dayOfWeek !== dayOfWeek)
                                  return [...filtered, updated]
                                })
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Pause Ende (optional)</Label>
                            <Input
                              type="time"
                              value={dayHours.breakEnd || ''}
                              onChange={(e) => {
                                const updated = { ...dayHours, breakEnd: e.target.value || null }
                                setOpeningHours((prev) => {
                                  const filtered = prev.filter((h) => h.dayOfWeek !== dayOfWeek)
                                  return [...filtered, updated]
                                })
                              }}
                            />
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleSaveOpeningHours(dayHours)}
                          disabled={loading}
                        >
                          {loading ? 'Speichern...' : 'Speichern'}
                        </Button>
                      </>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Settings */}
        <TabsContent value="booking">
          {bookingSettings && (
            <form onSubmit={handleSaveBookingSettings} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Buchungszeiträume</CardTitle>
                  <CardDescription>
                    Konfigurieren Sie Buchungszeiträume und Zeitfenster
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Mindestvorlaufzeit (Stunden)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={bookingSettings.minAdvanceBookingHours}
                        onChange={(e) =>
                          setBookingSettings((prev) =>
                            prev
                              ? { ...prev, minAdvanceBookingHours: parseInt(e.target.value) }
                              : null
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max. Buchungsvorausschau (Tage)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={bookingSettings.maxAdvanceBookingDays}
                        onChange={(e) =>
                          setBookingSettings((prev) =>
                            prev
                              ? { ...prev, maxAdvanceBookingDays: parseInt(e.target.value) }
                              : null
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Zeitfenster (Minuten)</Label>
                      <Input
                        type="number"
                        min="5"
                        step="5"
                        value={bookingSettings.slotDurationMinutes}
                        onChange={(e) =>
                          setBookingSettings((prev) =>
                            prev ? { ...prev, slotDurationMinutes: parseInt(e.target.value) } : null
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Puffer zwischen Terminen (Minuten)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="5"
                        value={bookingSettings.bufferBetweenAppointments}
                        onChange={(e) =>
                          setBookingSettings((prev) =>
                            prev
                              ? { ...prev, bufferBetweenAppointments: parseInt(e.target.value) }
                              : null
                          )
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kaution & Stornierung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={bookingSettings.requireDeposit}
                      onCheckedChange={(checked) =>
                        setBookingSettings((prev) =>
                          prev ? { ...prev, requireDeposit: checked as boolean } : null
                        )
                      }
                    />
                    <Label>Kaution erforderlich</Label>
                  </div>

                  {bookingSettings.requireDeposit && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Kautionsbetrag (CHF)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={bookingSettings.depositAmountChf || ''}
                          onChange={(e) =>
                            setBookingSettings((prev) =>
                              prev ? { ...prev, depositAmountChf: e.target.value } : null
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kaution in Prozent (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={bookingSettings.depositPercentage || ''}
                          onChange={(e) =>
                            setBookingSettings((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    depositPercentage: e.target.value
                                      ? parseInt(e.target.value)
                                      : null,
                                  }
                                : null
                            )
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Stornierungsfrist (Stunden)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={bookingSettings.cancellationPolicyHours}
                      onChange={(e) =>
                        setBookingSettings((prev) =>
                          prev
                            ? { ...prev, cancellationPolicyHours: parseInt(e.target.value) }
                            : null
                        )
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Buchungsoptionen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={bookingSettings.autoConfirmBookings}
                      onCheckedChange={(checked) =>
                        setBookingSettings((prev) =>
                          prev ? { ...prev, autoConfirmBookings: checked as boolean } : null
                        )
                      }
                    />
                    <Label>Buchungen automatisch bestätigen</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={bookingSettings.allowOverlappingBookings}
                      onCheckedChange={(checked) =>
                        setBookingSettings((prev) =>
                          prev ? { ...prev, allowOverlappingBookings: checked as boolean } : null
                        )
                      }
                    />
                    <Label>Überschneidende Buchungen erlauben</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={bookingSettings.requireEmailVerification}
                      onCheckedChange={(checked) =>
                        setBookingSettings((prev) =>
                          prev ? { ...prev, requireEmailVerification: checked as boolean } : null
                        )
                      }
                    />
                    <Label>E-Mail-Verifizierung erforderlich</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={bookingSettings.requirePhoneVerification}
                      onCheckedChange={(checked) =>
                        setBookingSettings((prev) =>
                          prev ? { ...prev, requirePhoneVerification: checked as boolean } : null
                        )
                      }
                    />
                    <Label>Telefon-Verifizierung erforderlich</Label>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" disabled={loading}>
                {loading ? 'Speichern...' : 'Einstellungen speichern'}
              </Button>
            </form>
          )}
        </TabsContent>

        {/* VAT Settings */}
        <TabsContent value="vat">
          {vatSettings && (
            <form onSubmit={handleSaveVatSettings} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mehrwertsteuer-Einstellungen</CardTitle>
                  <CardDescription>
                    Konfigurieren Sie Ihre MwSt.-Sätze und -Nummer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Standard-MwSt. für Dienstleistungen (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={vatSettings.defaultServiceVatRate}
                        onChange={(e) =>
                          setVatSettings((prev) =>
                            prev ? { ...prev, defaultServiceVatRate: e.target.value } : null
                          )
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Standard-MwSt. für Produkte (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={vatSettings.defaultProductVatRate}
                        onChange={(e) =>
                          setVatSettings((prev) =>
                            prev ? { ...prev, defaultProductVatRate: e.target.value } : null
                          )
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>MwSt.-Nummer (optional)</Label>
                    <Input
                      value={vatSettings.vatNumber || ''}
                      onChange={(e) =>
                        setVatSettings((prev) =>
                          prev ? { ...prev, vatNumber: e.target.value || null } : null
                        )
                      }
                      placeholder="CHE-123.456.789 MWST"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={vatSettings.vatIncludedInPrices}
                      onCheckedChange={(checked) =>
                        setVatSettings((prev) =>
                          prev ? { ...prev, vatIncludedInPrices: checked as boolean } : null
                        )
                      }
                    />
                    <Label>MwSt. ist in Preisen enthalten</Label>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" disabled={loading}>
                {loading ? 'Speichern...' : 'Einstellungen speichern'}
              </Button>
            </form>
          )}
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          {notificationSettings && (
            <form onSubmit={handleSaveNotificationSettings} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Benachrichtigungseinstellungen</CardTitle>
                  <CardDescription>
                    Konfigurieren Sie automatische E-Mail-Benachrichtigungen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={notificationSettings.sendBookingConfirmation}
                      onCheckedChange={(checked) =>
                        setNotificationSettings((prev) =>
                          prev ? { ...prev, sendBookingConfirmation: checked as boolean } : null
                        )
                      }
                    />
                    <Label>Buchungsbestätigung senden</Label>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={notificationSettings.sendBookingReminder}
                        onCheckedChange={(checked) =>
                          setNotificationSettings((prev) =>
                            prev ? { ...prev, sendBookingReminder: checked as boolean } : null
                          )
                        }
                      />
                      <Label>Buchungserinnerung senden</Label>
                    </div>
                    {notificationSettings.sendBookingReminder && (
                      <div className="ml-6 space-y-2">
                        <Label>Erinnerung senden (Stunden vorher)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="168"
                          value={notificationSettings.reminderHoursBefore}
                          onChange={(e) =>
                            setNotificationSettings((prev) =>
                              prev
                                ? { ...prev, reminderHoursBefore: parseInt(e.target.value) }
                                : null
                            )
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={notificationSettings.sendCancellationNotification}
                      onCheckedChange={(checked) =>
                        setNotificationSettings((prev) =>
                          prev
                            ? { ...prev, sendCancellationNotification: checked as boolean }
                            : null
                        )
                      }
                    />
                    <Label>Stornierungsbenachrichtigung senden</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={notificationSettings.sendRescheduleNotification}
                      onCheckedChange={(checked) =>
                        setNotificationSettings((prev) =>
                          prev
                            ? { ...prev, sendRescheduleNotification: checked as boolean }
                            : null
                        )
                      }
                    />
                    <Label>Änderungsbenachrichtigung senden</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={notificationSettings.sendMarketingEmails}
                      onCheckedChange={(checked) =>
                        setNotificationSettings((prev) =>
                          prev ? { ...prev, sendMarketingEmails: checked as boolean } : null
                        )
                      }
                    />
                    <Label>Marketing-E-Mails senden (nur an Kunden mit Einwilligung)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={notificationSettings.smsNotificationsEnabled}
                      onCheckedChange={(checked) =>
                        setNotificationSettings((prev) =>
                          prev ? { ...prev, smsNotificationsEnabled: checked as boolean } : null
                        )
                      }
                    />
                    <Label>SMS-Benachrichtigungen aktivieren</Label>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" disabled={loading}>
                {loading ? 'Speichern...' : 'Einstellungen speichern'}
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
