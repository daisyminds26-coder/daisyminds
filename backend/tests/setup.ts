/**
 * Populates safe, non-real values before any test imports `src/app` (which
 * transitively imports `config/env.ts` — env validation runs at import time).
 * Tests import `app`, never `server`, so no real Mongo/Redis/Cloudinary
 * connection is ever attempted (server.ts is the only place that calls
 * connectDatabase/connectRedis) — this file exists purely to satisfy schema
 * validation, per CODING-STANDARDS.md §6: tests never touch production infra.
 */
process.env.NODE_ENV = 'test'
process.env.PORT = '3999'
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/daisyminds-test'
process.env.REDIS_URL = 'redis://127.0.0.1:6379'
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud'
process.env.CLOUDINARY_API_KEY = 'test-key'
process.env.CLOUDINARY_API_SECRET = 'test-secret'
process.env.LOG_LEVEL = 'silent'
process.env.SWAGGER_ENABLED = 'false'
process.env.JWT_ACCESS_SECRET = 'test-only-access-secret-not-for-real-use-32chars'
