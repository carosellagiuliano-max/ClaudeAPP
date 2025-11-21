'use server'

/**
 * Staff Management Server Actions
 * CRUD operations for staff, skills, working hours, and absences
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/rbac'
import type {
  ApiResponse,
  StaffMember,
  StaffWithProfile,
  StaffWithSkills,
  StaffMemberInput,
  StaffServiceSkill,
  StaffServiceSkillInput,
  StaffWorkingHours,
  StaffWorkingHoursInput,
  StaffAbsence,
  StaffAbsenceInput,
} from '../types/staff'
import {
  staffMemberSchema,
  staffServiceSkillSchema,
  staffWorkingHoursSchema,
  staffAbsenceSchema,
} from '../types/staff'

// ============================================================
// STAFF MEMBERS
// ============================================================

/**
 * Get all staff members for a salon
 */
export async function getStaffMembers(salonId: string): Promise<ApiResponse<StaffWithProfile[]>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('staff')
      .select(
        `
        *,
        profile:profiles(
          email,
          first_name,
          last_name,
          phone
        )
      `
      )
      .eq('salon_id', salonId)
      .order('display_order')

    if (error) throw error

    return {
      success: true,
      data: data.map((staff) => ({
        id: staff.id,
        salonId: staff.salon_id,
        profileId: staff.profile_id,
        staffNumber: staff.staff_number,
        position: staff.position,
        bio: staff.bio,
        employmentType: staff.employment_type,
        defaultWorkingHours: staff.default_working_hours || {},
        displayName: staff.display_name,
        displayOrder: staff.display_order,
        photoUrl: staff.photo_url,
        acceptsOnlineBookings: staff.accepts_online_bookings,
        showInTeamPage: staff.show_in_team_page,
        commissionRate: staff.commission_rate ? parseFloat(staff.commission_rate) : null,
        isActive: staff.is_active,
        hiredAt: staff.hired_at,
        terminatedAt: staff.terminated_at,
        createdAt: staff.created_at,
        updatedAt: staff.updated_at,
        profile: {
          email: staff.profile.email,
          firstName: staff.profile.first_name,
          lastName: staff.profile.last_name,
          phone: staff.profile.phone,
        },
      })),
    }
  } catch (error) {
    console.error('Error fetching staff members:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Mitarbeiter',
    }
  }
}

/**
 * Get a single staff member with skills
 */
export async function getStaffMemberById(
  salonId: string,
  staffId: string
): Promise<ApiResponse<StaffWithSkills>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('staff')
      .select(
        `
        *,
        profile:profiles(
          email,
          first_name,
          last_name,
          phone
        ),
        skills:staff_service_skills(
          *,
          service:services(
            id,
            internal_name,
            public_title
          )
        )
      `
      )
      .eq('id', staffId)
      .eq('salon_id', salonId)
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        profileId: data.profile_id,
        staffNumber: data.staff_number,
        position: data.position,
        bio: data.bio,
        employmentType: data.employment_type,
        defaultWorkingHours: data.default_working_hours || {},
        displayName: data.display_name,
        displayOrder: data.display_order,
        photoUrl: data.photo_url,
        acceptsOnlineBookings: data.accepts_online_bookings,
        showInTeamPage: data.show_in_team_page,
        commissionRate: data.commission_rate ? parseFloat(data.commission_rate) : null,
        isActive: data.is_active,
        hiredAt: data.hired_at,
        terminatedAt: data.terminated_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        profile: {
          email: data.profile.email,
          firstName: data.profile.first_name,
          lastName: data.profile.last_name,
          phone: data.profile.phone,
        },
        skills: data.skills.map((skill: any) => ({
          id: skill.id,
          salonId: skill.salon_id,
          staffId: skill.staff_id,
          serviceId: skill.service_id,
          proficiencyLevel: skill.proficiency_level,
          customDurationMinutes: skill.custom_duration_minutes,
          isActive: skill.is_active,
          createdAt: skill.created_at,
          updatedAt: skill.updated_at,
          service: {
            id: skill.service.id,
            internalName: skill.service.internal_name,
            publicTitle: skill.service.public_title,
          },
        })),
      },
    }
  } catch (error) {
    console.error('Error fetching staff member:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden des Mitarbeiters',
    }
  }
}

/**
 * Create a new staff member
 */
export async function createStaffMember(
  salonId: string,
  input: StaffMemberInput
): Promise<ApiResponse<StaffMember>> {
  try {
    await requireAdmin(salonId)

    const validated = staffMemberSchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('staff')
      .insert({
        salon_id: salonId,
        profile_id: validated.profileId,
        staff_number: validated.staffNumber,
        position: validated.position,
        bio: validated.bio,
        employment_type: validated.employmentType,
        display_name: validated.displayName,
        display_order: validated.displayOrder ?? 0,
        photo_url: validated.photoUrl,
        accepts_online_bookings: validated.acceptsOnlineBookings ?? true,
        show_in_team_page: validated.showInTeamPage ?? true,
        commission_rate: validated.commissionRate,
        is_active: validated.isActive ?? true,
        hired_at: validated.hiredAt,
        terminated_at: validated.terminatedAt,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/mitarbeiter')
    revalidatePath('/team')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        profileId: data.profile_id,
        staffNumber: data.staff_number,
        position: data.position,
        bio: data.bio,
        employmentType: data.employment_type,
        defaultWorkingHours: data.default_working_hours || {},
        displayName: data.display_name,
        displayOrder: data.display_order,
        photoUrl: data.photo_url,
        acceptsOnlineBookings: data.accepts_online_bookings,
        showInTeamPage: data.show_in_team_page,
        commissionRate: data.commission_rate ? parseFloat(data.commission_rate) : null,
        isActive: data.is_active,
        hiredAt: data.hired_at,
        terminatedAt: data.terminated_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error creating staff member:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Erstellen des Mitarbeiters',
    }
  }
}

/**
 * Update a staff member
 */
export async function updateStaffMember(
  salonId: string,
  staffId: string,
  input: Partial<StaffMemberInput>
): Promise<ApiResponse<StaffMember>> {
  try {
    await requireAdmin(salonId)

    const validated = staffMemberSchema.partial().parse(input)
    const supabase = await createClient()

    const updateData: Record<string, any> = {}
    if (validated.profileId !== undefined) updateData.profile_id = validated.profileId
    if (validated.staffNumber !== undefined) updateData.staff_number = validated.staffNumber
    if (validated.position !== undefined) updateData.position = validated.position
    if (validated.bio !== undefined) updateData.bio = validated.bio
    if (validated.employmentType !== undefined)
      updateData.employment_type = validated.employmentType
    if (validated.displayName !== undefined) updateData.display_name = validated.displayName
    if (validated.displayOrder !== undefined) updateData.display_order = validated.displayOrder
    if (validated.photoUrl !== undefined) updateData.photo_url = validated.photoUrl
    if (validated.acceptsOnlineBookings !== undefined)
      updateData.accepts_online_bookings = validated.acceptsOnlineBookings
    if (validated.showInTeamPage !== undefined)
      updateData.show_in_team_page = validated.showInTeamPage
    if (validated.commissionRate !== undefined)
      updateData.commission_rate = validated.commissionRate
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive
    if (validated.hiredAt !== undefined) updateData.hired_at = validated.hiredAt
    if (validated.terminatedAt !== undefined) updateData.terminated_at = validated.terminatedAt

    const { data, error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', staffId)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/mitarbeiter')
    revalidatePath('/team')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        profileId: data.profile_id,
        staffNumber: data.staff_number,
        position: data.position,
        bio: data.bio,
        employmentType: data.employment_type,
        defaultWorkingHours: data.default_working_hours || {},
        displayName: data.display_name,
        displayOrder: data.display_order,
        photoUrl: data.photo_url,
        acceptsOnlineBookings: data.accepts_online_bookings,
        showInTeamPage: data.show_in_team_page,
        commissionRate: data.commission_rate ? parseFloat(data.commission_rate) : null,
        isActive: data.is_active,
        hiredAt: data.hired_at,
        terminatedAt: data.terminated_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error updating staff member:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Mitarbeiters',
    }
  }
}

/**
 * Delete a staff member
 */
export async function deleteStaffMember(
  salonId: string,
  staffId: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId)
      .eq('salon_id', salonId)

    if (error) throw error

    revalidatePath('/admin/mitarbeiter')
    revalidatePath('/team')

    return { success: true }
  } catch (error) {
    console.error('Error deleting staff member:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Löschen des Mitarbeiters',
    }
  }
}

// ============================================================
// STAFF SERVICE SKILLS
// ============================================================

/**
 * Add a service skill to a staff member
 */
export async function addStaffServiceSkill(
  salonId: string,
  input: StaffServiceSkillInput
): Promise<ApiResponse<StaffServiceSkill>> {
  try {
    await requireAdmin(salonId)

    const validated = staffServiceSkillSchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('staff_service_skills')
      .insert({
        salon_id: salonId,
        staff_id: validated.staffId,
        service_id: validated.serviceId,
        proficiency_level: validated.proficiencyLevel,
        custom_duration_minutes: validated.customDurationMinutes,
        is_active: validated.isActive ?? true,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/mitarbeiter')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        staffId: data.staff_id,
        serviceId: data.service_id,
        proficiencyLevel: data.proficiency_level,
        customDurationMinutes: data.custom_duration_minutes,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error adding staff service skill:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Fehler beim Hinzufügen der Mitarbeiter-Fähigkeit',
    }
  }
}

/**
 * Update a staff service skill
 */
export async function updateStaffServiceSkill(
  salonId: string,
  skillId: string,
  input: Partial<StaffServiceSkillInput>
): Promise<ApiResponse<StaffServiceSkill>> {
  try {
    await requireAdmin(salonId)

    const validated = staffServiceSkillSchema.partial().parse(input)
    const supabase = await createClient()

    const updateData: Record<string, any> = {}
    if (validated.proficiencyLevel !== undefined)
      updateData.proficiency_level = validated.proficiencyLevel
    if (validated.customDurationMinutes !== undefined)
      updateData.custom_duration_minutes = validated.customDurationMinutes
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive

    const { data, error } = await supabase
      .from('staff_service_skills')
      .update(updateData)
      .eq('id', skillId)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/mitarbeiter')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        staffId: data.staff_id,
        serviceId: data.service_id,
        proficiencyLevel: data.proficiency_level,
        customDurationMinutes: data.custom_duration_minutes,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error updating staff service skill:', error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Fehler beim Aktualisieren der Mitarbeiter-Fähigkeit',
    }
  }
}

/**
 * Remove a staff service skill
 */
export async function removeStaffServiceSkill(
  salonId: string,
  skillId: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { error } = await supabase
      .from('staff_service_skills')
      .delete()
      .eq('id', skillId)
      .eq('salon_id', salonId)

    if (error) throw error

    revalidatePath('/admin/mitarbeiter')

    return { success: true }
  } catch (error) {
    console.error('Error removing staff service skill:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Fehler beim Entfernen der Mitarbeiter-Fähigkeit',
    }
  }
}

// ============================================================
// STAFF WORKING HOURS
// ============================================================

/**
 * Get working hours for a staff member
 */
export async function getStaffWorkingHours(
  salonId: string,
  staffId: string
): Promise<ApiResponse<StaffWorkingHours[]>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('staff_working_hours')
      .select('*')
      .eq('salon_id', salonId)
      .eq('staff_id', staffId)
      .eq('is_active', true)
      .order('day_of_week')

    if (error) throw error

    return {
      success: true,
      data: data.map((hours) => ({
        id: hours.id,
        salonId: hours.salon_id,
        staffId: hours.staff_id,
        dayOfWeek: hours.day_of_week,
        startTimeMinutes: hours.start_time_minutes,
        endTimeMinutes: hours.end_time_minutes,
        breakStartMinutes: hours.break_start_minutes,
        breakEndMinutes: hours.break_end_minutes,
        label: hours.label,
        validFrom: hours.valid_from,
        validTo: hours.valid_to,
        isActive: hours.is_active,
        createdAt: hours.created_at,
        updatedAt: hours.updated_at,
      })),
    }
  } catch (error) {
    console.error('Error fetching staff working hours:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Arbeitszeiten',
    }
  }
}

/**
 * Add working hours for a staff member
 */
export async function addStaffWorkingHours(
  salonId: string,
  input: StaffWorkingHoursInput
): Promise<ApiResponse<StaffWorkingHours>> {
  try {
    await requireAdmin(salonId)

    const validated = staffWorkingHoursSchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('staff_working_hours')
      .insert({
        salon_id: salonId,
        staff_id: validated.staffId,
        day_of_week: validated.dayOfWeek,
        start_time_minutes: validated.startTimeMinutes,
        end_time_minutes: validated.endTimeMinutes,
        break_start_minutes: validated.breakStartMinutes,
        break_end_minutes: validated.breakEndMinutes,
        label: validated.label,
        valid_from: validated.validFrom,
        valid_to: validated.validTo,
        is_active: validated.isActive ?? true,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/mitarbeiter')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        staffId: data.staff_id,
        dayOfWeek: data.day_of_week,
        startTimeMinutes: data.start_time_minutes,
        endTimeMinutes: data.end_time_minutes,
        breakStartMinutes: data.break_start_minutes,
        breakEndMinutes: data.break_end_minutes,
        label: data.label,
        validFrom: data.valid_from,
        validTo: data.valid_to,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error adding staff working hours:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Hinzufügen der Arbeitszeiten',
    }
  }
}

/**
 * Delete working hours for a staff member
 */
export async function deleteStaffWorkingHours(
  salonId: string,
  workingHoursId: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { error } = await supabase
      .from('staff_working_hours')
      .delete()
      .eq('id', workingHoursId)
      .eq('salon_id', salonId)

    if (error) throw error

    revalidatePath('/admin/mitarbeiter')

    return { success: true }
  } catch (error) {
    console.error('Error deleting staff working hours:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Löschen der Arbeitszeiten',
    }
  }
}

// ============================================================
// STAFF ABSENCES
// ============================================================

/**
 * Get absences for a staff member
 */
export async function getStaffAbsences(
  salonId: string,
  staffId: string,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<StaffAbsence[]>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    let query = supabase
      .from('staff_absences')
      .select('*')
      .eq('salon_id', salonId)
      .eq('staff_id', staffId)
      .order('start_date', { ascending: false })

    if (startDate) {
      query = query.gte('end_date', startDate)
    }
    if (endDate) {
      query = query.lte('start_date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      success: true,
      data: data.map((absence) => ({
        id: absence.id,
        salonId: absence.salon_id,
        staffId: absence.staff_id,
        startDate: absence.start_date,
        endDate: absence.end_date,
        startTimeMinutes: absence.start_time_minutes,
        endTimeMinutes: absence.end_time_minutes,
        reason: absence.reason,
        notes: absence.notes,
        createdByProfileId: absence.created_by_profile_id,
        createdAt: absence.created_at,
        updatedAt: absence.updated_at,
      })),
    }
  } catch (error) {
    console.error('Error fetching staff absences:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Abwesenheiten',
    }
  }
}

/**
 * Add an absence for a staff member
 */
export async function addStaffAbsence(
  salonId: string,
  input: StaffAbsenceInput
): Promise<ApiResponse<StaffAbsence>> {
  try {
    await requireAdmin(salonId)

    const validated = staffAbsenceSchema.parse(input)
    const supabase = await createClient()

    // Get current user profile ID
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('staff_absences')
      .insert({
        salon_id: salonId,
        staff_id: validated.staffId,
        start_date: validated.startDate,
        end_date: validated.endDate,
        start_time_minutes: validated.startTimeMinutes,
        end_time_minutes: validated.endTimeMinutes,
        reason: validated.reason,
        notes: validated.notes,
        created_by_profile_id: user?.id,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/mitarbeiter')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        staffId: data.staff_id,
        startDate: data.start_date,
        endDate: data.end_date,
        startTimeMinutes: data.start_time_minutes,
        endTimeMinutes: data.end_time_minutes,
        reason: data.reason,
        notes: data.notes,
        createdByProfileId: data.created_by_profile_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error adding staff absence:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Hinzufügen der Abwesenheit',
    }
  }
}

/**
 * Update a staff absence
 */
export async function updateStaffAbsence(
  salonId: string,
  absenceId: string,
  input: Partial<StaffAbsenceInput>
): Promise<ApiResponse<StaffAbsence>> {
  try {
    await requireAdmin(salonId)

    const validated = staffAbsenceSchema.partial().parse(input)
    const supabase = await createClient()

    const updateData: Record<string, any> = {}
    if (validated.startDate !== undefined) updateData.start_date = validated.startDate
    if (validated.endDate !== undefined) updateData.end_date = validated.endDate
    if (validated.startTimeMinutes !== undefined)
      updateData.start_time_minutes = validated.startTimeMinutes
    if (validated.endTimeMinutes !== undefined)
      updateData.end_time_minutes = validated.endTimeMinutes
    if (validated.reason !== undefined) updateData.reason = validated.reason
    if (validated.notes !== undefined) updateData.notes = validated.notes

    const { data, error } = await supabase
      .from('staff_absences')
      .update(updateData)
      .eq('id', absenceId)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/mitarbeiter')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        staffId: data.staff_id,
        startDate: data.start_date,
        endDate: data.end_date,
        startTimeMinutes: data.start_time_minutes,
        endTimeMinutes: data.end_time_minutes,
        reason: data.reason,
        notes: data.notes,
        createdByProfileId: data.created_by_profile_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error updating staff absence:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Abwesenheit',
    }
  }
}

/**
 * Delete a staff absence
 */
export async function deleteStaffAbsence(
  salonId: string,
  absenceId: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { error } = await supabase
      .from('staff_absences')
      .delete()
      .eq('id', absenceId)
      .eq('salon_id', salonId)

    if (error) throw error

    revalidatePath('/admin/mitarbeiter')

    return { success: true }
  } catch (error) {
    console.error('Error deleting staff absence:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Löschen der Abwesenheit',
    }
  }
}
