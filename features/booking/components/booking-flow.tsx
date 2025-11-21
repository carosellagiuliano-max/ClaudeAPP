'use client'

/**
 * Booking Flow - Main orchestrator for the 4-step booking process
 * Manages state and navigation between steps
 */

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { Step1Services } from './step1-services'
import { Step2Staff } from './step2-staff'
import { Step3TimeSlot } from './step3-timeslot'
import { Step4Confirmation } from './step4-confirmation'
import { BookingSuccess } from './booking-success'
import {
  type BookingState,
  type Step1Data,
  type Step2Data,
  type Step3Data,
  type ServiceWithCategory,
  type StaffMember,
} from '../types'

interface BookingFlowProps {
  salonId: string
  services: ServiceWithCategory[]
  allStaff: StaffMember[]
}

export function BookingFlow({ salonId, services, allStaff }: BookingFlowProps) {
  const [state, setState] = useState<BookingState>({
    currentStep: 1,
    salonId,
  })
  const [completedAppointmentId, setCompletedAppointmentId] = useState<string | null>(null)

  // Progress indicator steps
  const steps = [
    { number: 1, label: 'Leistungen' },
    { number: 2, label: 'Mitarbeiter' },
    { number: 3, label: 'Datum & Zeit' },
    { number: 4, label: 'Bestätigung' },
  ]

  const handleStep1Next = (data: Step1Data) => {
    setState({ ...state, step1: data, currentStep: 2 })
  }

  const handleStep2Next = async (data: Step2Data) => {
    setState({ ...state, step2: data, currentStep: 3 })
  }

  const handleStep2Back = () => {
    setState({ ...state, currentStep: 1 })
  }

  const handleStep3Next = (data: Step3Data) => {
    setState({ ...state, step3: data, currentStep: 4 })
  }

  const handleStep3Back = () => {
    setState({ ...state, currentStep: 2 })
  }

  const handleStep4Back = () => {
    setState({ ...state, currentStep: 3 })
  }

  const handleStep4Success = (appointmentId: string) => {
    setCompletedAppointmentId(appointmentId)
  }

  // Get filtered staff for selected services
  const getAvailableStaff = (): StaffMember[] => {
    if (!state.step1) return []

    const serviceIds = state.step1.services.map(s => s.serviceId)
    return allStaff.filter(staff =>
      serviceIds.every(id => staff.serviceIds.includes(id))
    )
  }

  // If booking is complete, show success page
  if (completedAppointmentId && state.step1 && state.step3) {
    const staffMember = allStaff.find(s => s.id === state.step3!.staffId)

    return (
      <BookingSuccess
        confirmationNumber={completedAppointmentId.substring(0, 8).toUpperCase()}
        date={state.step3.date}
        startTime={state.step3.startMinutes.toString()}
        endTime={state.step3.endMinutes.toString()}
        staffName={staffMember?.displayName || 'Team'}
        services={state.step1.services.map(s => ({
          name: s.name,
          durationMinutes: s.durationMinutes,
        }))}
        customerEmail="customer@example.com" // TODO: Get from form
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-1 items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`
                      flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold
                      ${
                        state.currentStep === step.number
                          ? 'border-primary bg-primary text-primary-foreground'
                          : state.currentStep > step.number
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30 text-muted-foreground'
                      }
                    `}
                  >
                    {state.currentStep > step.number ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <div
                    className={`
                      mt-2 text-xs font-medium
                      ${state.currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'}
                    `}
                  >
                    {step.label}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`
                      h-0.5 flex-1 mx-2
                      ${state.currentStep > step.number ? 'bg-primary' : 'bg-muted-foreground/30'}
                    `}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div>
        {state.currentStep === 1 && (
          <Step1Services
            services={services}
            initialSelection={state.step1}
            onNext={handleStep1Next}
          />
        )}

        {state.currentStep === 2 && state.step1 && (
          <Step2Staff
            staff={getAvailableStaff()}
            initialSelection={state.step2}
            onNext={handleStep2Next}
            onBack={handleStep2Back}
          />
        )}

        {state.currentStep === 3 && state.step1 && state.step2 && (
          <Step3TimeSlot
            salonId={salonId}
            services={state.step1.services}
            staffId={state.step2.staffId}
            staffMembers={getAvailableStaff()}
            initialSelection={state.step3}
            onNext={handleStep3Next}
            onBack={handleStep3Back}
          />
        )}

        {state.currentStep === 4 && state.step1 && state.step2 && state.step3 && (
          <Step4Confirmation
            salonId={salonId}
            services={state.step1.services}
            staffName={
              state.step2.staffName ||
              allStaff.find(s => s.id === state.step3!.staffId)?.displayName ||
              'Team'
            }
            date={state.step3.date}
            startTime={`${Math.floor(state.step3.startMinutes / 60).toString().padStart(2, '0')}:${(state.step3.startMinutes % 60).toString().padStart(2, '0')}`}
            endTime={`${Math.floor(state.step3.endMinutes / 60).toString().padStart(2, '0')}:${(state.step3.endMinutes % 60).toString().padStart(2, '0')}`}
            datetime={state.step3.datetime}
            onBack={handleStep4Back}
            onSuccess={handleStep4Success}
          />
        )}
      </div>
    </div>
  )
}
