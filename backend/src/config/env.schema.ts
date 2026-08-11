import { z } from 'zod'

const commaSeparatedList = (defaultValue: string) =>
  z
    .string()
    .min(1)
    .default(defaultValue)
    .transform((value) =>
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    )

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional()

const jwtDuration = z
  .string()
  .regex(/^\d+[smhd]$/, 'Must be a number followed by s, m, h, or d (e.g. "15m")')

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    API_PREFIX: z.string().min(1).default('/api/v1'),
    APP_NAME: z.string().min(1).default('Daisy Minds LMS API'),

    FRONTEND_URL: z.url().default('http://localhost:5173'),
    CORS_ORIGINS: commaSeparatedList('http://localhost:5173'),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    REDIS_URL: z.url().default('redis://127.0.0.1:6379'),

    CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
    CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
    CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

    TRUST_PROXY: z.string().min(1).default('1'),

    SWAGGER_ENABLED: booleanFromString,

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRES_IN: jwtDuration.default('15m'),
    JWT_REFRESH_EXPIRES_IN: jwtDuration.default('7d'),
    REFRESH_COOKIE_NAME: z.string().min(1).default('refresh_token'),

    EMAIL_VERIFICATION_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(1440),
    PASSWORD_RESET_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(60),

    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    LOGIN_LOCKOUT_MIN: z.coerce.number().int().positive().default(15),

    /** Direct-to-Cloudinary uploads only — Express never proxies file bytes (ARCHITECTURE.md §21). */
    MAX_VIDEO_UPLOAD_MB: z.coerce.number().int().positive().default(500),
    MAX_DOCUMENT_UPLOAD_MB: z.coerce.number().int().positive().default(25),
    MAX_RESOURCE_UPLOAD_MB: z.coerce.number().int().positive().default(25),
    MAX_RESOURCES_PER_LESSON: z.coerce.number().int().positive().default(20),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return

    if (/localhost|127\.0\.0\.1/i.test(value.MONGODB_URI)) {
      ctx.addIssue({
        code: 'custom',
        path: ['MONGODB_URI'],
        message: 'MONGODB_URI must not point at localhost in production (expected MongoDB Atlas)',
      })
    }

    if (value.JWT_ACCESS_SECRET === 'dev-only-insecure-secret-change-me-please-32chars') {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'JWT_ACCESS_SECRET must not use the development placeholder value in production',
      })
    }
  })

export type Env = z.infer<typeof envSchema>
