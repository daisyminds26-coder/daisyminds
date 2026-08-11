import { ApiError } from './api-error'
import type { LessonResourceType } from '../models/lesson-resource.model'

/**
 * Executable/installer formats (`.exe`/`.dmg`/`.apk`/shell scripts/etc.) are
 * never in this map and therefore always rejected — the format allowlist
 * enforced at the Cloudinary signature step (`ALLOWED_RESOURCE_FORMATS`) is
 * the primary gate, this is defense-in-depth at verification time
 * (SECURITY.md §Resource Upload).
 */
const FORMAT_TO_RESOURCE_TYPE: Record<string, LessonResourceType> = {
  pdf: 'PDF',
  doc: 'DOCUMENT',
  docx: 'DOCUMENT',
  ppt: 'SLIDES',
  pptx: 'SLIDES',
  xls: 'DOCUMENT',
  xlsx: 'DOCUMENT',
  zip: 'ARCHIVE',
  jpg: 'IMAGE',
  jpeg: 'IMAGE',
  png: 'IMAGE',
  webp: 'IMAGE',
}

const FORMAT_TO_MIME_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export function resolveResourceType(format: string): LessonResourceType {
  const resourceType = FORMAT_TO_RESOURCE_TYPE[format.toLowerCase()]
  if (!resourceType) {
    throw ApiError.badRequest(`Unsupported resource format: ${format}`)
  }
  return resourceType
}

export function resolveMimeType(format: string): string {
  return FORMAT_TO_MIME_TYPE[format.toLowerCase()] ?? 'application/octet-stream'
}
