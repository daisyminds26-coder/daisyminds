import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../utils/api-error'

export interface OwnableResource {
  userId: { toString(): string }
}

/**
 * Generic owner-or-404 check. Must run after `requireAuth` (and after any
 * `validate()` call the loader depends on). Returns 404, not 403, for a
 * resource that belongs to someone else — confirming a resource ID exists
 * to a non-owner is itself an information leak (SECURITY.md §5's
 * enumeration-resistance principle applied to session IDs).
 */
export function requireOwnership<T extends OwnableResource>(
  loadResource: (req: Request) => Promise<T | null>,
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const resource = await loadResource(req)

    if (!resource || resource.userId.toString() !== req.user?.id) {
      throw ApiError.notFound()
    }

    req.ownedResource = resource
    next()
  }
}
