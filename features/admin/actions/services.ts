'use server'

/**
 * Services Management Server Actions
 * CRUD operations for services, categories, and pricing
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/rbac'
import type {
  ApiResponse,
  Service,
  ServiceWithCategory,
  ServiceCategory,
  ServiceCategoryInput,
  ServiceInput,
  ServicePrice,
  ServicePriceInput,
  TaxRate,
} from '../types/services'
import {
  serviceCategorySchema,
  serviceSchema,
  servicePriceSchema,
} from '../types/services'

// ============================================================
// SERVICE CATEGORIES
// ============================================================

/**
 * Get all service categories for a salon
 */
export async function getServiceCategories(
  salonId: string
): Promise<ApiResponse<ServiceCategory[]>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('salon_id', salonId)
      .order('display_order')

    if (error) throw error

    return {
      success: true,
      data: data.map((cat) => ({
        id: cat.id,
        salonId: cat.salon_id,
        parentId: cat.parent_id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        imageUrl: cat.image_url,
        displayOrder: cat.display_order,
        seoTitle: cat.seo_title,
        seoDescription: cat.seo_description,
        isActive: cat.is_active,
        showOnline: cat.show_online,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at,
      })),
    }
  } catch (error) {
    console.error('Error fetching service categories:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Kategorien',
    }
  }
}

/**
 * Create a new service category
 */
export async function createServiceCategory(
  salonId: string,
  input: ServiceCategoryInput
): Promise<ApiResponse<ServiceCategory>> {
  try {
    await requireAdmin(salonId)

    const validated = serviceCategorySchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('service_categories')
      .insert({
        salon_id: salonId,
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        parent_id: validated.parentId,
        icon: validated.icon,
        color: validated.color,
        image_url: validated.imageUrl,
        display_order: validated.displayOrder ?? 0,
        seo_title: validated.seoTitle,
        seo_description: validated.seoDescription,
        is_active: validated.isActive ?? true,
        show_online: validated.showOnline ?? true,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/leistungen')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        parentId: data.parent_id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        color: data.color,
        imageUrl: data.image_url,
        displayOrder: data.display_order,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        isActive: data.is_active,
        showOnline: data.show_online,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error creating service category:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Erstellen der Kategorie',
    }
  }
}

/**
 * Update a service category
 */
export async function updateServiceCategory(
  salonId: string,
  categoryId: string,
  input: Partial<ServiceCategoryInput>
): Promise<ApiResponse<ServiceCategory>> {
  try {
    await requireAdmin(salonId)

    const validated = serviceCategorySchema.partial().parse(input)
    const supabase = await createClient()

    const updateData: Record<string, any> = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.slug !== undefined) updateData.slug = validated.slug
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.parentId !== undefined) updateData.parent_id = validated.parentId
    if (validated.icon !== undefined) updateData.icon = validated.icon
    if (validated.color !== undefined) updateData.color = validated.color
    if (validated.imageUrl !== undefined) updateData.image_url = validated.imageUrl
    if (validated.displayOrder !== undefined) updateData.display_order = validated.displayOrder
    if (validated.seoTitle !== undefined) updateData.seo_title = validated.seoTitle
    if (validated.seoDescription !== undefined)
      updateData.seo_description = validated.seoDescription
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive
    if (validated.showOnline !== undefined) updateData.show_online = validated.showOnline

    const { data, error } = await supabase
      .from('service_categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/leistungen')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        parentId: data.parent_id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        color: data.color,
        imageUrl: data.image_url,
        displayOrder: data.display_order,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        isActive: data.is_active,
        showOnline: data.show_online,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error updating service category:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Kategorie',
    }
  }
}

/**
 * Delete a service category
 */
export async function deleteServiceCategory(
  salonId: string,
  categoryId: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { error } = await supabase
      .from('service_categories')
      .delete()
      .eq('id', categoryId)
      .eq('salon_id', salonId)

    if (error) throw error

    revalidatePath('/admin/leistungen')

    return { success: true }
  } catch (error) {
    console.error('Error deleting service category:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Löschen der Kategorie',
    }
  }
}

// ============================================================
// SERVICES
// ============================================================

/**
 * Get all services for a salon
 */
export async function getServices(salonId: string): Promise<ApiResponse<ServiceWithCategory[]>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('services')
      .select(
        `
        *,
        category:service_categories(*)
      `
      )
      .eq('salon_id', salonId)
      .order('display_order')

    if (error) throw error

    return {
      success: true,
      data: data.map((service) => ({
        id: service.id,
        salonId: service.salon_id,
        categoryId: service.category_id,
        internalName: service.internal_name,
        publicTitle: service.public_title,
        slug: service.slug,
        description: service.description,
        basePriceChf: parseFloat(service.base_price_chf),
        baseDurationMinutes: service.base_duration_minutes,
        bufferBeforeMinutes: service.buffer_before_minutes,
        bufferAfterMinutes: service.buffer_after_minutes,
        taxRateId: service.tax_rate_id,
        onlineBookable: service.online_bookable,
        requiresDeposit: service.requires_deposit,
        depositAmountChf: service.deposit_amount_chf
          ? parseFloat(service.deposit_amount_chf)
          : null,
        imageUrl: service.image_url,
        displayOrder: service.display_order,
        seoTitle: service.seo_title,
        seoDescription: service.seo_description,
        tags: service.tags || [],
        metadata: service.metadata || {},
        isActive: service.is_active,
        isFeatured: service.is_featured,
        createdAt: service.created_at,
        updatedAt: service.updated_at,
        category: service.category
          ? {
              id: service.category.id,
              salonId: service.category.salon_id,
              parentId: service.category.parent_id,
              name: service.category.name,
              slug: service.category.slug,
              description: service.category.description,
              icon: service.category.icon,
              color: service.category.color,
              imageUrl: service.category.image_url,
              displayOrder: service.category.display_order,
              seoTitle: service.category.seo_title,
              seoDescription: service.category.seo_description,
              isActive: service.category.is_active,
              showOnline: service.category.show_online,
              createdAt: service.category.created_at,
              updatedAt: service.category.updated_at,
            }
          : null,
      })),
    }
  } catch (error) {
    console.error('Error fetching services:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Leistungen',
    }
  }
}

/**
 * Get a single service by ID
 */
export async function getServiceById(
  salonId: string,
  serviceId: string
): Promise<ApiResponse<ServiceWithCategory>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('services')
      .select(
        `
        *,
        category:service_categories(*)
      `
      )
      .eq('id', serviceId)
      .eq('salon_id', salonId)
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        categoryId: data.category_id,
        internalName: data.internal_name,
        publicTitle: data.public_title,
        slug: data.slug,
        description: data.description,
        basePriceChf: parseFloat(data.base_price_chf),
        baseDurationMinutes: data.base_duration_minutes,
        bufferBeforeMinutes: data.buffer_before_minutes,
        bufferAfterMinutes: data.buffer_after_minutes,
        taxRateId: data.tax_rate_id,
        onlineBookable: data.online_bookable,
        requiresDeposit: data.requires_deposit,
        depositAmountChf: data.deposit_amount_chf ? parseFloat(data.deposit_amount_chf) : null,
        imageUrl: data.image_url,
        displayOrder: data.display_order,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        tags: data.tags || [],
        metadata: data.metadata || {},
        isActive: data.is_active,
        isFeatured: data.is_featured,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        category: data.category
          ? {
              id: data.category.id,
              salonId: data.category.salon_id,
              parentId: data.category.parent_id,
              name: data.category.name,
              slug: data.category.slug,
              description: data.category.description,
              icon: data.category.icon,
              color: data.category.color,
              imageUrl: data.category.image_url,
              displayOrder: data.category.display_order,
              seoTitle: data.category.seo_title,
              seoDescription: data.category.seo_description,
              isActive: data.category.is_active,
              showOnline: data.category.show_online,
              createdAt: data.category.created_at,
              updatedAt: data.category.updated_at,
            }
          : null,
      },
    }
  } catch (error) {
    console.error('Error fetching service:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Leistung',
    }
  }
}

/**
 * Create a new service
 */
export async function createService(
  salonId: string,
  input: ServiceInput
): Promise<ApiResponse<Service>> {
  try {
    await requireAdmin(salonId)

    const validated = serviceSchema.parse(input)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('services')
      .insert({
        salon_id: salonId,
        category_id: validated.categoryId,
        internal_name: validated.internalName,
        public_title: validated.publicTitle,
        slug: validated.slug,
        description: validated.description,
        base_price_chf: validated.basePriceChf,
        base_duration_minutes: validated.baseDurationMinutes,
        buffer_before_minutes: validated.bufferBeforeMinutes ?? 0,
        buffer_after_minutes: validated.bufferAfterMinutes ?? 0,
        tax_rate_id: validated.taxRateId,
        online_bookable: validated.onlineBookable ?? true,
        requires_deposit: validated.requiresDeposit ?? false,
        deposit_amount_chf: validated.depositAmountChf,
        image_url: validated.imageUrl,
        display_order: validated.displayOrder ?? 0,
        seo_title: validated.seoTitle,
        seo_description: validated.seoDescription,
        tags: validated.tags,
        metadata: validated.metadata || {},
        is_active: validated.isActive ?? true,
        is_featured: validated.isFeatured ?? false,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/leistungen')
    revalidatePath('/leistungen')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        categoryId: data.category_id,
        internalName: data.internal_name,
        publicTitle: data.public_title,
        slug: data.slug,
        description: data.description,
        basePriceChf: parseFloat(data.base_price_chf),
        baseDurationMinutes: data.base_duration_minutes,
        bufferBeforeMinutes: data.buffer_before_minutes,
        bufferAfterMinutes: data.buffer_after_minutes,
        taxRateId: data.tax_rate_id,
        onlineBookable: data.online_bookable,
        requiresDeposit: data.requires_deposit,
        depositAmountChf: data.deposit_amount_chf ? parseFloat(data.deposit_amount_chf) : null,
        imageUrl: data.image_url,
        displayOrder: data.display_order,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        tags: data.tags || [],
        metadata: data.metadata || {},
        isActive: data.is_active,
        isFeatured: data.is_featured,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error creating service:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Erstellen der Leistung',
    }
  }
}

/**
 * Update a service
 */
export async function updateService(
  salonId: string,
  serviceId: string,
  input: Partial<ServiceInput>
): Promise<ApiResponse<Service>> {
  try {
    await requireAdmin(salonId)

    const validated = serviceSchema.partial().parse(input)
    const supabase = await createClient()

    const updateData: Record<string, any> = {}
    if (validated.categoryId !== undefined) updateData.category_id = validated.categoryId
    if (validated.internalName !== undefined) updateData.internal_name = validated.internalName
    if (validated.publicTitle !== undefined) updateData.public_title = validated.publicTitle
    if (validated.slug !== undefined) updateData.slug = validated.slug
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.basePriceChf !== undefined) updateData.base_price_chf = validated.basePriceChf
    if (validated.baseDurationMinutes !== undefined)
      updateData.base_duration_minutes = validated.baseDurationMinutes
    if (validated.bufferBeforeMinutes !== undefined)
      updateData.buffer_before_minutes = validated.bufferBeforeMinutes
    if (validated.bufferAfterMinutes !== undefined)
      updateData.buffer_after_minutes = validated.bufferAfterMinutes
    if (validated.taxRateId !== undefined) updateData.tax_rate_id = validated.taxRateId
    if (validated.onlineBookable !== undefined)
      updateData.online_bookable = validated.onlineBookable
    if (validated.requiresDeposit !== undefined)
      updateData.requires_deposit = validated.requiresDeposit
    if (validated.depositAmountChf !== undefined)
      updateData.deposit_amount_chf = validated.depositAmountChf
    if (validated.imageUrl !== undefined) updateData.image_url = validated.imageUrl
    if (validated.displayOrder !== undefined) updateData.display_order = validated.displayOrder
    if (validated.seoTitle !== undefined) updateData.seo_title = validated.seoTitle
    if (validated.seoDescription !== undefined)
      updateData.seo_description = validated.seoDescription
    if (validated.tags !== undefined) updateData.tags = validated.tags
    if (validated.metadata !== undefined) updateData.metadata = validated.metadata
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive
    if (validated.isFeatured !== undefined) updateData.is_featured = validated.isFeatured

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', serviceId)
      .eq('salon_id', salonId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/leistungen')
    revalidatePath('/leistungen')

    return {
      success: true,
      data: {
        id: data.id,
        salonId: data.salon_id,
        categoryId: data.category_id,
        internalName: data.internal_name,
        publicTitle: data.public_title,
        slug: data.slug,
        description: data.description,
        basePriceChf: parseFloat(data.base_price_chf),
        baseDurationMinutes: data.base_duration_minutes,
        bufferBeforeMinutes: data.buffer_before_minutes,
        bufferAfterMinutes: data.buffer_after_minutes,
        taxRateId: data.tax_rate_id,
        onlineBookable: data.online_bookable,
        requiresDeposit: data.requires_deposit,
        depositAmountChf: data.deposit_amount_chf ? parseFloat(data.deposit_amount_chf) : null,
        imageUrl: data.image_url,
        displayOrder: data.display_order,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        tags: data.tags || [],
        metadata: data.metadata || {},
        isActive: data.is_active,
        isFeatured: data.is_featured,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    }
  } catch (error) {
    console.error('Error updating service:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Leistung',
    }
  }
}

/**
 * Delete a service
 */
export async function deleteService(
  salonId: string,
  serviceId: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)
      .eq('salon_id', salonId)

    if (error) throw error

    revalidatePath('/admin/leistungen')
    revalidatePath('/leistungen')

    return { success: true }
  } catch (error) {
    console.error('Error deleting service:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Löschen der Leistung',
    }
  }
}

// ============================================================
// TAX RATES
// ============================================================

/**
 * Get all tax rates for a salon
 */
export async function getTaxRates(salonId: string): Promise<ApiResponse<TaxRate[]>> {
  try {
    await requireAdmin(salonId)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tax_rates')
      .select('*')
      .eq('salon_id', salonId)
      .order('code')

    if (error) throw error

    return {
      success: true,
      data: data.map((rate) => ({
        id: rate.id,
        salonId: rate.salon_id,
        code: rate.code,
        description: rate.description,
        ratePercent: parseFloat(rate.rate_percent),
        validFrom: rate.valid_from,
        validTo: rate.valid_to,
        appliesTo: rate.applies_to,
        isActive: rate.is_active,
        createdAt: rate.created_at,
        updatedAt: rate.updated_at,
      })),
    }
  } catch (error) {
    console.error('Error fetching tax rates:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Laden der Steuersätze',
    }
  }
}
