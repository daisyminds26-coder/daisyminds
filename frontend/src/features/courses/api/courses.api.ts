import {
  apiClient,
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
  type ApiMeta,
} from '@/shared/lib/api-client'
import type {
  AdminCourse,
  AdminCourseListItem,
  AuditLogEntry,
  CourseBulkAction,
  CourseBulkActionResult,
  CourseLevel,
  CourseVisibility,
  CurrencyCode,
  DeliveryMode,
  DurationUnit,
  ListCoursesParams,
  PricingType,
  ReadinessResult,
  SignedUploadParams,
} from '@/features/courses/types'

/**
 * Every field/endpoint here mirrors `backend/src/routes/course.routes.ts`
 * and `backend/src/validators/course.validator.ts` exactly. No component
 * calls `apiClient`/`apiGet`/etc. directly.
 *
 * Deliberately separate *input* shapes from the read-side DTOs in
 * `features/courses/types` — see `features/trainers/api/trainers.api.ts`'s
 * comment for why (the read DTOs use `string | null` throughout; a request
 * body naturally omits an empty optional field instead of sending `null`).
 */
export interface PricingInput {
  pricingType: PricingType
  currency: CurrencyCode
  basePrice: number
  discountPrice?: number
  taxInclusive?: boolean
  saleStartsAt?: string
  saleEndsAt?: string
}

export interface CourseProfileFields {
  title: string
  shortDescription?: string
  description?: string
  category: string
  subcategory?: string
  level: CourseLevel
  language?: string
  secondaryLanguages?: string[]
  tags?: string[]
  durationValue?: number
  durationUnit?: DurationUnit
  deliveryMode: DeliveryMode
  learningOutcomes?: string[]
  skills?: string[]
  prerequisites?: string[]
  targetAudience?: string
  eligibilityCriteria?: string
  certificateEnabled?: boolean
  maxStudentCapacity?: number
  pricing: PricingInput
  visibility?: CourseVisibility
  isFeatured?: boolean
  featuredOrder?: number
  metaTitle?: string
  metaDescription?: string
  canonicalUrl?: string
  eligibleTrainerIds?: string[]
  internalNotes?: string
}

export type CreateCoursePayload = CourseProfileFields
export type UpdateCoursePayload = Partial<CourseProfileFields>

export function listCourses(
  params: ListCoursesParams,
): Promise<{ data: AdminCourseListItem[]; meta: ApiMeta }> {
  return apiGetPaginated<AdminCourseListItem>('/courses', { params })
}

export function getCourse(id: string): Promise<AdminCourse> {
  return apiGet<AdminCourse>(`/courses/${id}`)
}

export function createCourse(payload: CreateCoursePayload): Promise<AdminCourse> {
  return apiPost<AdminCourse>('/courses', payload)
}

export function updateCourse(id: string, payload: UpdateCoursePayload): Promise<AdminCourse> {
  return apiPatch<AdminCourse>(`/courses/${id}`, payload)
}

export function checkReadiness(id: string): Promise<ReadinessResult> {
  return apiPost<ReadinessResult>(`/courses/${id}/readiness-check`)
}

export function publishCourse(id: string): Promise<AdminCourse> {
  return apiPost<AdminCourse>(`/courses/${id}/publish`)
}

export function unpublishCourse(id: string): Promise<AdminCourse> {
  return apiPost<AdminCourse>(`/courses/${id}/unpublish`)
}

export function archiveCourse(id: string): Promise<AdminCourse> {
  return apiPost<AdminCourse>(`/courses/${id}/archive`)
}

export function restoreCourse(id: string): Promise<AdminCourse> {
  return apiPost<AdminCourse>(`/courses/${id}/restore`)
}

export function softDeleteCourse(id: string): Promise<null> {
  return apiDelete<null>(`/courses/${id}`)
}

export function bulkAction(
  action: CourseBulkAction,
  courseIds: string[],
): Promise<CourseBulkActionResult> {
  return apiPost<CourseBulkActionResult>(`/courses/bulk/${action}`, { action, courseIds })
}

export function getAuditLog(
  id: string,
  page: number,
  limit = 20,
): Promise<{ data: AuditLogEntry[]; meta: ApiMeta }> {
  return apiGetPaginated<AuditLogEntry>(`/courses/${id}/audit`, { params: { page, limit } })
}

export async function exportCoursesCsv(
  params: Omit<ListCoursesParams, 'page' | 'limit'>,
): Promise<Blob> {
  const response = await apiClient.get<Blob>('/courses/export', {
    params,
    responseType: 'blob',
  })
  return response.data
}

export function getThumbnailUploadSignature(id: string): Promise<SignedUploadParams> {
  return apiPost<SignedUploadParams>(`/courses/${id}/thumbnail/signature`)
}

export function verifyThumbnail(id: string, publicId: string): Promise<AdminCourse> {
  return apiPost<AdminCourse>(`/courses/${id}/thumbnail/verify`, { publicId })
}

export function removeThumbnail(id: string): Promise<AdminCourse> {
  return apiDelete<AdminCourse>(`/courses/${id}/thumbnail`)
}

export function getBannerUploadSignature(id: string): Promise<SignedUploadParams> {
  return apiPost<SignedUploadParams>(`/courses/${id}/banner/signature`)
}

export function verifyBanner(id: string, publicId: string): Promise<AdminCourse> {
  return apiPost<AdminCourse>(`/courses/${id}/banner/verify`, { publicId })
}

export function removeBanner(id: string): Promise<AdminCourse> {
  return apiDelete<AdminCourse>(`/courses/${id}/banner`)
}
