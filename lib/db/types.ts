/**
 * Database Types
 * Generated from Supabase schema
 * Run: npm run generate:types
 *
 * This file will be auto-generated when you run the command.
 * For now, we define basic types manually based on our migrations.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      salons: {
        Row: {
          id: string
          name: string
          legal_entity_name: string | null
          slug: string
          address_street: string
          address_city: string
          address_postal_code: string
          address_country: string
          phone: string | null
          email: string | null
          website: string | null
          timezone: string
          currency: string
          locale: string
          tax_id: string | null
          accounting_settings: Json
          features: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['salons']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['salons']['Insert']>
      }
      services: {
        Row: {
          id: string
          salon_id: string
          category_id: string | null
          internal_name: string
          public_title: string
          slug: string
          description: string | null
          base_price_chf: number
          base_duration_minutes: number
          buffer_before_minutes: number
          buffer_after_minutes: number
          tax_rate_id: string | null
          online_bookable: boolean
          requires_deposit: boolean
          deposit_amount_chf: number | null
          image_url: string | null
          display_order: number
          tags: string[] | null
          metadata: Json
          is_active: boolean
          is_featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['services']['Insert']>
      }
      service_categories: {
        Row: {
          id: string
          salon_id: string
          parent_id: string | null
          name: string
          slug: string
          description: string | null
          icon: string | null
          color: string | null
          image_url: string | null
          display_order: number
          seo_title: string | null
          seo_description: string | null
          is_active: boolean
          show_online: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['service_categories']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['service_categories']['Insert']>
      }
      staff: {
        Row: {
          id: string
          salon_id: string
          profile_id: string
          staff_number: string | null
          position: string | null
          bio: string | null
          employment_type: string | null
          default_working_hours: Json
          display_name: string | null
          display_order: number
          photo_url: string | null
          accepts_online_bookings: boolean
          show_in_team_page: boolean
          commission_rate: number | null
          is_active: boolean
          hired_at: string | null
          terminated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['staff']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['staff']['Insert']>
      }
      opening_hours: {
        Row: {
          id: string
          salon_id: string
          day_of_week: number
          open_time_minutes: number
          close_time_minutes: number
          label: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['opening_hours']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['opening_hours']['Insert']>
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      role_name: 'admin' | 'manager' | 'mitarbeiter' | 'kunde' | 'hq'
      appointment_status: 'reserved' | 'requested' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
    }
  }
}
