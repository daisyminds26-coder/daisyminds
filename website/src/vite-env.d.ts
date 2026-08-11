/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the authenticated LMS app — e.g. `https://lms.daisyminds.com`. Never points inside `website/`. */
  readonly VITE_LMS_URL: string
  readonly VITE_SITE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
