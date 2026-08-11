import { toast as sonnerToast } from 'sonner'

/**
 * Thin wrapper over sonner's `toast` so call sites use one consistent API
 * (`toast.success(...)`) instead of importing sonner directly everywhere —
 * keeps the toast library itself swappable later without touching feature
 * code. Rendering is handled by the `<Toaster />` mounted once in
 * `AppProviders`.
 */
export const toast = {
  success: (message: string, description?: string) => sonnerToast.success(message, { description }),
  error: (message: string, description?: string) => sonnerToast.error(message, { description }),
  info: (message: string, description?: string) => sonnerToast.info(message, { description }),
  warning: (message: string, description?: string) => sonnerToast.warning(message, { description }),
}
