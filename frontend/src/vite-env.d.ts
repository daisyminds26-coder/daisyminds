/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional at the type level — no `.env` exists by default in this repo; `api-client.ts` falls back to a local-dev default when unset. */
  readonly VITE_API_BASE_URL?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_SUPPORT_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
