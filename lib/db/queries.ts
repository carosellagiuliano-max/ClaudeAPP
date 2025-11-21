/**
 * Database Queries
 * SCHNITTWERK - Reusable data fetching functions
 *
 * All queries for public website (Phase 3)
 */

import { createClient } from './client'
import type { Database } from './types'

type Service = Database['public']['Tables']['services']['Row']
type ServiceCategory = Database['public']['Tables']['service_categories']['Row']
type Staff = Database['public']['Tables']['staff']['Row']
type Salon = Database['public']['Tables']['salons']['Row']
type OpeningHours = Database['public']['Tables']['opening_hours']['Row']

/**
 * Get active salon by slug
 */
export async function getSalonBySlug(slug: string): Promise<Salon | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('salons')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Error fetching salon:', error)
    return null
  }

  return data
}

/**
 * Get default salon (SCHNITTWERK)
 * For v1, we only have one salon
 */
export async function getDefaultSalon(): Promise<Salon | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('salons')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching default salon:', error)
    return null
  }

  return data
}

/**
 * Get all service categories for a salon
 */
export async function getServiceCategories(salonId: string): Promise<ServiceCategory[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .eq('show_online', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching service categories:', error)
    return []
  }

  return data || []
}

/**
 * Get all services for a salon, grouped by category
 */
export async function getServices(salonId: string): Promise<Service[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      category:service_categories(*)
    `)
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching services:', error)
    return []
  }

  return data || []
}

/**
 * Get services by category
 */
export async function getServicesByCategory(
  salonId: string,
  categoryId: string
): Promise<Service[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('salon_id', salonId)
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching services by category:', error)
    return []
  }

  return data || []
}

/**
 * Get featured services
 */
export async function getFeaturedServices(salonId: string): Promise<Service[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('display_order', { ascending: true })
    .limit(3)

  if (error) {
    console.error('Error fetching featured services:', error)
    return []
  }

  return data || []
}

/**
 * Get all staff members for team page
 */
export async function getTeamMembers(salonId: string): Promise<Staff[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .eq('show_in_team_page', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching team members:', error)
    return []
  }

  return data || []
}

/**
 * Get opening hours for a salon
 */
export async function getOpeningHours(salonId: string): Promise<OpeningHours[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('opening_hours')
    .select('*')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })

  if (error) {
    console.error('Error fetching opening hours:', error)
    return []
  }

  return data || []
}

/**
 * Helper: Format opening hours for display
 */
export function formatOpeningHours(hours: OpeningHours[]): Map<number, string> {
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
  const formatted = new Map<number, string>()

  hours.forEach((hour) => {
    const openTime = minutesToTime(hour.open_time_minutes)
    const closeTime = minutesToTime(hour.close_time_minutes)
    formatted.set(hour.day_of_week, `${openTime} - ${closeTime}`)
  })

  return formatted
}

/**
 * Helper: Convert minutes since midnight to time string
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}
