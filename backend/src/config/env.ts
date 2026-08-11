import { existsSync } from 'node:fs'

import { envSchema } from './env.schema'

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

function parseTrustProxy(raw: string): boolean | number | string {
  if (raw === 'true') return true
  if (raw === 'false') return false

  const asNumber = Number(raw)
  if (Number.isInteger(asNumber)) return asNumber

  return raw
}

function loadEnv() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('Invalid environment configuration:')
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }

  const parsed = result.data

  return {
    ...parsed,
    isProduction: parsed.NODE_ENV === 'production',
    isTest: parsed.NODE_ENV === 'test',
    isDevelopment: parsed.NODE_ENV === 'development',
    trustProxy: parseTrustProxy(parsed.TRUST_PROXY),
    swaggerEnabled: parsed.SWAGGER_ENABLED ?? parsed.NODE_ENV !== 'production',
  }
}

export const env = loadEnv()
export type AppEnv = ReturnType<typeof loadEnv>
