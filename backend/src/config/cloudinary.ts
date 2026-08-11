import { v2 as cloudinary } from 'cloudinary'

import { env } from './env'
import { logger } from './logger'

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
})

/**
 * Confirms the SDK holds well-formed credentials — does not call the
 * Cloudinary API. Upload/delete/signed-delivery are added by the media
 * module later (ARCHITECTURE.md §8); this is configuration only.
 */
export function isCloudinaryConfigured(): boolean {
  const config = cloudinary.config()
  return Boolean(config.cloud_name && config.api_key && config.api_secret)
}

export function verifyCloudinaryConfig(): void {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary configuration is incomplete')
  }
  logger.info({ cloudName: env.CLOUDINARY_CLOUD_NAME }, 'Cloudinary configuration verified')
}

export { cloudinary }
