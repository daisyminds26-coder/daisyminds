import { Router } from 'express'

import { getHealth, getLive, getReady } from '../controllers/health.controller'

export const healthRouter = Router()

healthRouter.get('/live', getLive)
healthRouter.get('/ready', getReady)
healthRouter.get('/', getHealth)
