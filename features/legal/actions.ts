'use server'

// =====================================================================
// LEGAL DOCUMENTS - Server Actions
// =====================================================================

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/rbac'

// =====================================================================
// Types
// =====================================================================

export type DocumentType =
  | 'privacy_policy'
  | 'terms_conditions'
  | 'cancellation_policy'
  | 'cookie_policy'
  | 'data_processing'
  | 'consent_marketing'
  | 'consent_photos'
  | 'other'

export type ConsentStatus = 'accepted' | 'rejected' | 'withdrawn' | 'expired'

export interface LegalDocument {
  id: string
  salon_id: string
  type: DocumentType
  title: string
  slug: string
  version: string
  version_number: number
  content: string
  summary: string | null
  changes: string[] | null
  effective_from: string
  effective_until: string | null
  is_current: boolean
  requires_acceptance: boolean
  acceptance_label: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CustomerConsent {
  id: string
  salon_id: string
  customer_id: string
  document_id: string
  document_type: DocumentType
  document_version: string
  status: ConsentStatus
  accepted_at: string | null
  rejected_at: string | null
  withdrawn_at: string | null
  ip_address: string | null
  user_agent: string | null
  consent_method: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateLegalDocumentInput {
  type: DocumentType
  title: string
  slug: string
  version: string
  content: string
  summary?: string
  changes?: string[]
  effective_from: string
  is_current?: boolean
  requires_acceptance?: boolean
  acceptance_label?: string
}

export interface RecordConsentInput {
  customer_id: string
  document_id: string
  status: 'accepted' | 'rejected'
  ip_address?: string
  user_agent?: string
  consent_method?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// =====================================================================
// LEGAL DOCUMENTS
// =====================================================================

export async function getCurrentLegalDocuments(
  salonId: string
): Promise<ApiResponse<LegalDocument[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('salon_id', salonId)
      .eq('is_current', true)
      .order('type', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching current legal documents:', error)
    return { success: false, error: 'Failed to fetch legal documents' }
  }
}

export async function getLegalDocument(
  documentId: string
): Promise<ApiResponse<LegalDocument>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching legal document:', error)
    return { success: false, error: 'Failed to fetch legal document' }
  }
}

export async function getLegalDocumentBySlug(
  salonId: string,
  slug: string
): Promise<ApiResponse<LegalDocument>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('salon_id', salonId)
      .eq('slug', slug)
      .eq('is_current', true)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching legal document by slug:', error)
    return { success: false, error: 'Failed to fetch legal document' }
  }
}

export async function getLegalDocumentVersions(
  salonId: string,
  type: DocumentType
): Promise<ApiResponse<LegalDocument[]>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('salon_id', salonId)
      .eq('type', type)
      .order('version_number', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching legal document versions:', error)
    return { success: false, error: 'Failed to fetch document versions' }
  }
}

export async function createLegalDocument(
  salonId: string,
  input: CreateLegalDocumentInput
): Promise<ApiResponse<LegalDocument>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error} = await supabase
      .from('legal_documents')
      .insert({
        salon_id: salonId,
        created_by: user.id,
        ...input,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error creating legal document:', error)
    return { success: false, error: 'Failed to create legal document' }
  }
}

export async function updateLegalDocument(
  documentId: string,
  updates: Partial<CreateLegalDocumentInput>
): Promise<ApiResponse<LegalDocument>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('legal_documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating legal document:', error)
    return { success: false, error: 'Failed to update legal document' }
  }
}

export async function deleteLegalDocument(
  documentId: string
): Promise<ApiResponse<void>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('legal_documents')
      .delete()
      .eq('id', documentId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting legal document:', error)
    return { success: false, error: 'Failed to delete legal document' }
  }
}

// =====================================================================
// CUSTOMER CONSENTS
// =====================================================================

export async function recordConsent(
  salonId: string,
  input: RecordConsentInput
): Promise<ApiResponse<CustomerConsent>> {
  try {
    const supabase = await createClient()

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('legal_documents')
      .select('type, version')
      .eq('id', input.document_id)
      .single()

    if (docError) throw docError

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('customer_consents')
      .insert({
        salon_id: salonId,
        customer_id: input.customer_id,
        document_id: input.document_id,
        document_type: document.type,
        document_version: document.version,
        status: input.status,
        accepted_at: input.status === 'accepted' ? now : null,
        rejected_at: input.status === 'rejected' ? now : null,
        ip_address: input.ip_address,
        user_agent: input.user_agent,
        consent_method: input.consent_method || 'web_form',
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error recording consent:', error)
    return { success: false, error: 'Failed to record consent' }
  }
}

export async function withdrawConsent(
  consentId: string
): Promise<ApiResponse<CustomerConsent>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('customer_consents')
      .update({
        status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
      })
      .eq('id', consentId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error withdrawing consent:', error)
    return { success: false, error: 'Failed to withdraw consent' }
  }
}

export async function getCustomerConsents(
  customerId: string
): Promise<ApiResponse<CustomerConsent[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('customer_consents')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching customer consents:', error)
    return { success: false, error: 'Failed to fetch consents' }
  }
}

export async function checkCustomerConsent(
  customerId: string,
  documentType: DocumentType
): Promise<ApiResponse<boolean>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('customer_consents')
      .select('status')
      .eq('customer_id', customerId)
      .eq('document_type', documentType)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return { success: true, data: !!data }
  } catch (error) {
    console.error('Error checking customer consent:', error)
    return { success: false, error: 'Failed to check consent' }
  }
}

// =====================================================================
// BATCH OPERATIONS
// =====================================================================

export async function expireOldConsents(): Promise<ApiResponse<number>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('expire_old_consents')

    if (error) throw error

    return { success: true, data: data || 0 }
  } catch (error) {
    console.error('Error expiring old consents:', error)
    return { success: false, error: 'Failed to expire old consents' }
  }
}

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

export async function getRequiredConsents(
  salonId: string
): Promise<ApiResponse<LegalDocument[]>> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('salon_id', salonId)
      .eq('is_current', true)
      .eq('requires_acceptance', true)
      .order('type', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching required consents:', error)
    return { success: false, error: 'Failed to fetch required consents' }
  }
}

export async function checkAllRequiredConsents(
  salonId: string,
  customerId: string
): Promise<ApiResponse<{
  allAccepted: boolean
  missing: LegalDocument[]
}>> {
  try {
    const supabase = await createClient()

    // Get all required documents
    const requiredDocsRes = await getRequiredConsents(salonId)
    if (!requiredDocsRes.success || !requiredDocsRes.data) {
      return { success: false, error: 'Failed to fetch required consents' }
    }

    const requiredDocs = requiredDocsRes.data

    // Get customer's consents
    const { data: consents, error } = await supabase
      .from('customer_consents')
      .select('document_type, status')
      .eq('customer_id', customerId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Check which are missing
    const acceptedTypes = new Set(consents?.map((c) => c.document_type) || [])
    const missing = requiredDocs.filter((doc) => !acceptedTypes.has(doc.type))

    return {
      success: true,
      data: {
        allAccepted: missing.length === 0,
        missing,
      },
    }
  } catch (error) {
    console.error('Error checking all required consents:', error)
    return { success: false, error: 'Failed to check required consents' }
  }
}
