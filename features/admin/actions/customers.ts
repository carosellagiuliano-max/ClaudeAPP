'use server'

/**
 * Customer Management Server Actions
 * CRUD operations for customers and addresses
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin, requireStaff } from '@/lib/auth/rbac'
import type {
  ApiResponse,
  Customer,
  CustomerWithProfile,
  CustomerWithStats,
  CustomerAddress,
  CustomerInput,
  CustomerAddressInput,
  CustomerFilters,
} from '../types/customers'
import { customerSchema, customerAddressSchema } from '../types/customers'

// ============================================================
// CUSTOMERS
// ============================================================

/**
 * Get all customers for a salon with optional filtering
 */
export async function getCustomers(
  salonId: string,
  filters?: CustomerFilters
): Promise<ApiResponse<CustomerWithProfile[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    let query = supabase
      .from('customers')
      .select(
        `
        *,
        profile:profiles!profile_id(
          email,
          first_name,
          last_name,
          phone
        ),
        preferred_staff:staff!preferred_staff_id(
          id,
          display_name
        )
      `
      )
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }
    if (filters?.isVip !== undefined) {
      query = query.eq('is_vip', filters.isVip)
    }
    if (filters?.source) {
      query = query.eq('source', filters.source)
    }

    const { data, error } = await query

    if (error) throw error

    let customers = data.map((customer: any) => ({
      id: customer.id,
      salonId: customer.salon_id,
      profileId: customer.profile_id,
      customerNumber: customer.customer_number,
      birthday: customer.birthday,
      gender: customer.gender,
      preferredStaffId: customer.preferred_staff_id,
      preferredServices: customer.preferred_services || [],
      notes: customer.notes,
      source: customer.source,
      referralCode: customer.referral_code,
      marketingConsent: customer.marketing_consent,
      isActive: customer.is_active,
      isVip: customer.is_vip,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
      lastVisitAt: customer.last_visit_at,
      profile: {
        email: customer.profile.email,
        firstName: customer.profile.first_name,
        lastName: customer.profile.last_name,
        phone: customer.profile.phone,
      },
      preferredStaff: customer.preferred_staff
        ? {
            id: customer.preferred_staff.id,
            displayName: customer.preferred_staff.display_name,
          }
        : null,
    }))

    // Apply search filter (client-side for now)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      customers = customers.filter((c) => {
        const name = `${c.profile.firstName || ''} ${c.profile.lastName || ''}`.toLowerCase()
        const email = c.profile.email.toLowerCase()
        const customerNumber = c.customerNumber?.toLowerCase() || ''
        return (
          name.includes(searchLower) ||
          email.includes(searchLower) ||
          customerNumber.includes(searchLower)
        )
      })
    }

    return {
      success: true,
      data: customers,
    }
  } catch (error) {
    console.error('Error fetching customers:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Kunden',
    }
  }
}

/**
 * Get a single customer by ID with stats
 */
export async function getCustomerById(
  salonId: string,
  customerId: string
): Promise<ApiResponse<CustomerWithStats>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()

    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select(
        `
        *,
        profile:profiles!profile_id(
          email,
          first_name,
          last_name,
          phone
        ),
        preferred_staff:staff!preferred_staff_id(
          id,
          display_name
        )
      `
      )
      .eq('id', customerId)
      .eq('salon_id', salonId)
      .single()

    if (customerError) throw customerError

    // Get appointment stats
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, status, total_price_chf, starts_at')
      .eq('customer_id', customerId)
      .eq('salon_id', salonId)

    const stats = {
      totalAppointments: appointments?.length || 0,
      completedAppointments:
        appointments?.filter((a) => a.status === 'completed').length || 0,
      cancelledAppointments:
        appointments?.filter((a) => a.status === 'cancelled').length || 0,
      noShowAppointments: appointments?.filter((a) => a.status === 'no_show').length || 0,
      totalSpent:
        appointments
          ?.filter((a) => a.status === 'completed')
          .reduce((sum, a) => sum + (parseFloat(a.total_price_chf || '0') || 0), 0) || 0,
      lastAppointmentDate:
        appointments && appointments.length > 0
          ? appointments.sort(
              (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
            )[0].starts_at
          : null,
    }

    return {
      success: true,
      data: {
        id: customer.id,
        salonId: customer.salon_id,
        profileId: customer.profile_id,
        customerNumber: customer.customer_number,
        birthday: customer.birthday,
        gender: customer.gender,
        preferredStaffId: customer.preferred_staff_id,
        preferredServices: customer.preferred_services || [],
        notes: customer.notes,
        source: customer.source,
        referralCode: customer.referral_code,
        marketingConsent: customer.marketing_consent,
        isActive: customer.is_active,
        isVip: customer.is_vip,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
        lastVisitAt: customer.last_visit_at,
        profile: {
          email: customer.profile.email,
          firstName: customer.profile.first_name,
          lastName: customer.profile.last_name,
          phone: customer.profile.phone,
        },
        preferredStaff: customer.preferred_staff
          ? {
              id: customer.preferred_staff.id,
              displayName: customer.preferred_staff.display_name,
            }
          : null,
        stats,
      },
    }
  } catch (error) {
    console.error('Error fetching customer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden des Kunden',
    }
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(
  salonId: string,
  input: CustomerInput
): Promise<ApiResponse<Customer>> {
  try {
    await requireStaff(salonId)

    const validated = customerSchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('customers')
      .insert({
        salon_id: salonId,
        profile_id: validated.profileId,
        customer_number: validated.customerNumber,
        birthday: validated.birthday,
        gender: validated.gender,
        preferred_staff_id: validated.preferredStaffId,
        preferred_services: validated.preferredServices,
        notes: validated.notes,
        source: validated.source,
        referral_code: validated.referralCode,
        marketing_consent: validated.marketingConsent ?? false,
        is_active: validated.isActive ?? true,
        is_vip: validated.isVip ?? false,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/kunden')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        profileId: data.profile_id,
        customerNumber: data.customer_number,
        birthday: data.birthday,
        gender: data.gender,
        preferredStaffId: data.preferred_staff_id,
        preferredServices: data.preferred_services || [],
        notes: data.notes,
        source: data.source,
        referralCode: data.referral_code,
        marketingConsent: data.marketing_consent,
        isActive: data.is_active,
        isVip: data.is_vip,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastVisitAt: data.last_visit_at,
      },
    }
  } catch (error) {
    console.error('Error creating customer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Erstellen des Kunden',
    }
  }
}

/**
 * Update a customer
 */
export async function updateCustomer(
  salonId: string,
  customerId: string,
  input: Partial<CustomerInput>
): Promise<ApiResponse<Customer>> {
  try {
    await requireStaff(salonId)

    const validated = customerSchema.partial().parse(input)
    const supabase = await createClient()

    const updateData: Record<string, any> = {}
    if (validated.customerNumber !== undefined)
      updateData.customer_number = validated.customerNumber
    if (validated.birthday !== undefined) updateData.birthday = validated.birthday
    if (validated.gender !== undefined) updateData.gender = validated.gender
    if (validated.preferredStaffId !== undefined)
      updateData.preferred_staff_id = validated.preferredStaffId
    if (validated.preferredServices !== undefined)
      updateData.preferred_services = validated.preferredServices
    if (validated.notes !== undefined) updateData.notes = validated.notes
    if (validated.source !== undefined) updateData.source = validated.source
    if (validated.referralCode !== undefined) updateData.referral_code = validated.referralCode
    if (validated.marketingConsent !== undefined)
      updateData.marketing_consent = validated.marketingConsent
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive
    if (validated.isVip !== undefined) updateData.is_vip = validated.isVip

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/kunden')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        profileId: data.profile_id,
        customerNumber: data.customer_number,
        birthday: data.birthday,
        gender: data.gender,
        preferredStaffId: data.preferred_staff_id,
        preferredServices: data.preferred_services || [],
        notes: data.notes,
        source: data.source,
        referralCode: data.referral_code,
        marketingConsent: data.marketing_consent,
        isActive: data.is_active,
        isVip: data.is_vip,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastVisitAt: data.last_visit_at,
      },
    }
  } catch (error) {
    console.error('Error updating customer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Kunden',
    }
  }
}

/**
 * Delete a customer
 */
export async function deleteCustomer(
  salonId: string,
  customerId: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)
      .eq('salon_id', salonId)

    if (error) throw error

    revalidatePath('/admin/kunden')

    return { success: true }
  } catch (error) {
    console.error('Error deleting customer:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Löschen des Kunden',
    }
  }
}

// ============================================================
// CUSTOMER ADDRESSES
// ============================================================

/**
 * Get addresses for a customer
 */
export async function getCustomerAddresses(
  salonId: string,
  customerId: string
): Promise<ApiResponse<CustomerAddress[]>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('salon_id', salonId)
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data.map((addr) => ({
        id: addr.id,
        salonId: addr.salon_id,
        customerId: addr.customer_id,
        addressType: addr.address_type,
        label: addr.label,
        firstName: addr.first_name,
        lastName: addr.last_name,
        company: addr.company,
        street: addr.street,
        street2: addr.street2,
        city: addr.city,
        postalCode: addr.postal_code,
        state: addr.state,
        country: addr.country,
        phone: addr.phone,
        isDefault: addr.is_default,
        createdAt: addr.created_at,
        updatedAt: addr.updated_at,
      })),
    }
  } catch (error) {
    console.error('Error fetching customer addresses:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Adressen',
    }
  }
}

/**
 * Add an address to a customer
 */
export async function addCustomerAddress(
  salonId: string,
  input: CustomerAddressInput
): Promise<ApiResponse<CustomerAddress>> {
  try {
    await requireStaff(salonId)

    const validated = customerAddressSchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('customer_addresses')
      .insert({
        salon_id: salonId,
        customer_id: validated.customerId,
        address_type: validated.addressType,
        label: validated.label,
        first_name: validated.firstName,
        last_name: validated.lastName,
        company: validated.company,
        street: validated.street,
        street2: validated.street2,
        city: validated.city,
        postal_code: validated.postalCode,
        state: validated.state,
        country: validated.country,
        phone: validated.phone,
        is_default: validated.isDefault ?? false,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/kunden')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        customerId: data.customer_id,
        addressType: data.address_type,
        label: data.label,
        firstName: data.first_name,
        lastName: data.last_name,
        company: data.company,
        street: data.street,
        street2: data.street2,
        city: data.city,
        postalCode: data.postal_code,
        state: data.state,
        country: data.country,
        phone: data.phone,
        isDefault: data.is_default,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error adding customer address:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Hinzufügen der Adresse',
    }
  }
}

/**
 * Delete a customer address
 */
export async function deleteCustomerAddress(
  salonId: string,
  addressId: string
): Promise<ApiResponse<void>> {
  try {
    await requireStaff(salonId)

    const supabase = await createClient()
    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', addressId)
      .eq('salon_id', salonId)

    if (error) throw error

    revalidatePath('/admin/kunden')

    return { success: true }
  } catch (error) {
    console.error('Error deleting customer address:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Löschen der Adresse',
    }
  }
}
