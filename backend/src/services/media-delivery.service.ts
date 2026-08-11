import { cloudinary } from '../config/cloudinary'
import type { CloudinaryResourceType } from './cloudinary-upload.service'

const DEFAULT_EXPIRY_SECONDS = 300

export interface SignedDeliveryOptions {
  resourceType: CloudinaryResourceType
  format?: string
  /** Defaults to 5 minutes — short enough that a leaked URL (browser history, logs) is worthless shortly after issue. */
  expirySeconds?: number
}

/**
 * The single place a short-lived, signed Cloudinary delivery URL is minted
 * for `type: 'authenticated'` assets (lesson videos/documents/resources —
 * see `CloudinaryDeliveryType` in `cloudinary-upload.service.ts`). Never
 * returns a permanent URL, and never stores its own output — every caller
 * requests a fresh one at render time. Deliberately generic (not lesson-
 * specific) so the future Learning Player reuses it unchanged instead of a
 * parallel implementation (task requirement).
 *
 * Pure local computation (HMAC signing with the Cloudinary API secret) —
 * no network call, so this never fails due to Cloudinary being unreachable.
 */
export function generateSignedDeliveryUrl(
  publicId: string,
  options: SignedDeliveryOptions,
): string {
  const expiresAt =
    Math.floor(Date.now() / 1000) + (options.expirySeconds ?? DEFAULT_EXPIRY_SECONDS)

  return cloudinary.url(publicId, {
    resource_type: options.resourceType,
    type: 'authenticated',
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
    format: options.format,
  })
}
