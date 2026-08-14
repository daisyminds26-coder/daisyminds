import type { Request, Response } from 'express'

import { publicProgramsService } from '../services/public-programs.service'
import { sendSuccess } from '../utils/api-response'
import type {
  ListPublicProgramsQuery,
  PublicProgramSlugParam,
} from '../validators/public-programs.validator'

/** Read-heavy and identical for every visitor until the next publish — a short, shared cache is safe and meaningfully cuts repeat load without a dedicated caching layer. */
const PUBLIC_CACHE_CONTROL = 'public, max-age=60'

export async function listPrograms(req: Request, res: Response): Promise<void> {
  const query = req.validated?.query as ListPublicProgramsQuery
  const { dtos, total } = await publicProgramsService.listPrograms(query)

  res.set('Cache-Control', PUBLIC_CACHE_CONTROL)
  sendSuccess(res, {
    data: dtos,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  })
}

export async function getProgramBySlug(req: Request, res: Response): Promise<void> {
  const { slug } = req.validated?.params as PublicProgramSlugParam
  const dto = await publicProgramsService.getProgramBySlug(slug)

  res.set('Cache-Control', PUBLIC_CACHE_CONTROL)
  sendSuccess(res, { data: dto })
}
