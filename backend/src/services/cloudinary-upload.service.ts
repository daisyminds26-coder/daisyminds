import { cloudinary } from '../config/cloudinary'
import { env } from '../config/env'
import { ApiError } from '../utils/api-error'
import { logger } from '../config/logger'

export const ALLOWED_PHOTO_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export const ALLOWED_VIDEO_FORMATS = ['mp4', 'webm', 'mov'] as const
export const ALLOWED_DOCUMENT_FORMATS = ['pdf'] as const
export const ALLOWED_RESOURCE_FORMATS = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'zip',
  'jpg',
  'jpeg',
  'png',
  'webp',
] as const

/** Cloudinary's own resource-type taxonomy — `raw` covers non-image/video files (PDFs, office docs, zips). */
export type CloudinaryResourceType = 'image' | 'video' | 'raw'

/**
 * `upload` = publicly readable at its `secure_url` forever (existing photo/
 * thumbnail/banner behavior — unaffected). `authenticated` = Cloudinary
 * refuses delivery without a valid signed+expiring token; every Phase 9C
 * lesson video/document/resource upload uses this so no permanent public
 * URL for course content ever exists (SECURITY.md §Secure Media Delivery) —
 * delivery only ever happens through `media-delivery.service.ts`'s
 * short-lived signed URLs.
 */
export type CloudinaryDeliveryType = 'upload' | 'authenticated'

export interface SignedUploadParams {
  timestamp: number
  signature: string
  apiKey: string
  cloudName: string
  folder: string
  publicId: string
  resourceType: CloudinaryResourceType
  type: CloudinaryDeliveryType
  allowedFormats: readonly string[]
  maxFileSize: number
}

export interface GenerateSignedUploadOptions {
  resourceType?: CloudinaryResourceType
  type?: CloudinaryDeliveryType
  allowedFormats?: readonly string[]
  maxFileSize?: number
}

/**
 * SECURITY.md §6: the frontend never holds Cloudinary API secrets, and
 * never uploads unsigned content. This generates a signature (Cloudinary
 * enforces its own short validity window against the embedded `timestamp`,
 * typically a few minutes) over a server-chosen `folder`/`publicId`/format
 * allowlist/size cap — the client can only complete an upload matching
 * exactly those parameters, not an arbitrary one, because Cloudinary
 * itself verifies the signature against the params the client actually
 * sends.
 *
 * Defaults to the original image/photo behavior (existing course thumbnail/
 * banner and student/trainer photo callers pass no options and are
 * unaffected); Phase 9C's video/document/resource callers pass explicit
 * `resourceType`/`allowedFormats`/`maxFileSize`.
 */
export function generateSignedUploadParams(
  folder: string,
  publicId: string,
  options: GenerateSignedUploadOptions = {},
): SignedUploadParams {
  const resourceType = options.resourceType ?? 'image'
  const type = options.type ?? 'upload'
  const allowedFormats = options.allowedFormats ?? ALLOWED_PHOTO_FORMATS
  const maxFileSize = options.maxFileSize ?? MAX_PHOTO_BYTES

  const timestamp = Math.floor(Date.now() / 1000)
  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder,
    public_id: publicId,
    allowed_formats: allowedFormats.join(','),
  }
  if (type !== 'upload') paramsToSign.type = type

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET)

  return {
    timestamp,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder,
    publicId,
    resourceType,
    type,
    allowedFormats,
    maxFileSize,
  }
}

export interface VerifyUploadedAssetOptions {
  resourceType?: CloudinaryResourceType
  type?: CloudinaryDeliveryType
  maxFileSize?: number
  /** Required duration bound in seconds — video only; `undefined` skips the check. */
  maxDurationSeconds?: number
}

export interface VerifiedCloudinaryAsset {
  secureUrl: string
  assetId: string
  format: string
  bytes: number
  version: number
  durationSeconds: number | null
  width: number | null
  height: number | null
}

/**
 * A signature only constrains what the client is *permitted* to upload —
 * it does not confirm anything was actually uploaded. Before trusting a
 * client-reported `publicId` (SECURITY.md §6: "do not trust a
 * client-supplied Cloudinary URL"), this calls the Cloudinary Admin API to
 * confirm the asset genuinely exists, is the expected resource type, landed
 * in the exact folder the signature was scoped to, and satisfies size/
 * duration limits. Never accepts a bare `{secureUrl}` reported by the
 * client as authoritative — every field returned here comes from
 * Cloudinary's own API response.
 */
export async function verifyUploadedAsset(
  publicId: string,
  expectedFolder: string,
  options: VerifyUploadedAssetOptions = {},
): Promise<VerifiedCloudinaryAsset> {
  const resourceType = options.resourceType ?? 'image'
  const type = options.type ?? 'upload'

  let resource: {
    secure_url: string
    resource_type: string
    asset_id: string
    format: string
    bytes: number
    version: number
    duration?: number
    width?: number
    height?: number
  }

  try {
    resource = (await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
      ...(type !== 'upload' ? { type } : {}),
    })) as typeof resource
  } catch {
    throw ApiError.badRequest('Uploaded asset could not be verified')
  }

  if (resource.resource_type !== resourceType || !publicId.startsWith(`${expectedFolder}/`)) {
    throw ApiError.badRequest('Uploaded asset does not match the expected upload target')
  }

  if (options.maxFileSize !== undefined && resource.bytes > options.maxFileSize) {
    throw ApiError.badRequest('Uploaded asset exceeds the maximum allowed size')
  }

  if (
    options.maxDurationSeconds !== undefined &&
    resource.duration !== undefined &&
    resource.duration > options.maxDurationSeconds
  ) {
    throw ApiError.badRequest('Uploaded video exceeds the maximum allowed duration')
  }

  return {
    secureUrl: resource.secure_url,
    assetId: resource.asset_id,
    format: resource.format,
    bytes: resource.bytes,
    version: resource.version,
    durationSeconds: resource.duration ?? null,
    width: resource.width ?? null,
    height: resource.height ?? null,
  }
}

/** Best-effort — a failed/already-deleted cleanup must never fail the caller's request. */
export async function deleteAsset(
  publicId: string,
  resourceType: CloudinaryResourceType = 'image',
  type: CloudinaryDeliveryType = 'upload',
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      ...(type !== 'upload' ? { type } : {}),
    })
  } catch (error) {
    logger.warn({ err: error, publicId }, 'Failed to delete Cloudinary asset')
  }
}
