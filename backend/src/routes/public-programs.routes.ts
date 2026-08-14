import { Router } from 'express'

import * as publicProgramsController from '../controllers/public-programs.controller'
import { validate } from '../middlewares/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  listPublicProgramsQuerySchema,
  publicProgramSlugParamSchema,
} from '../validators/public-programs.validator'

/**
 * The public program catalog — no `requireAuth`, matching `health.routes.ts`
 * (the only other unauthenticated router in this codebase). Every other
 * router in `src/routes/` gates on `requireAuth`; this one deliberately
 * doesn't, so it must never accept `status`/`visibility` from the client
 * (see the validator) and the service layer, not this router, is what
 * guarantees only `PUBLISHED`/`PUBLIC` courses are ever reachable here.
 */
export const publicProgramsRouter = Router()

publicProgramsRouter.get(
  '/',
  validate({ query: listPublicProgramsQuerySchema }),
  asyncHandler(publicProgramsController.listPrograms),
)

publicProgramsRouter.get(
  '/:slug',
  validate({ params: publicProgramSlugParamSchema }),
  asyncHandler(publicProgramsController.getProgramBySlug),
)
