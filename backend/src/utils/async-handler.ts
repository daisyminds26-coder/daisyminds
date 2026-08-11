import type { NextFunction, Request, Response } from 'express'

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

/**
 * Express 5 already forwards a rejected promise from an async handler to the
 * error middleware automatically. This wrapper is kept for explicitness at
 * call sites and as defense-in-depth, and is what CODING-STANDARDS.md §4
 * documents controllers as using.
 */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res, next).catch(next)
  }
}
