import { z } from 'zod'

import { bearerAuth, errorResponseSchema, registry, successResponseSchema } from '../config/swagger'

const roleOptionSchema = z.object({ id: z.string(), name: z.string() })

registry.registerPath({
  method: 'get',
  path: '/roles',
  tags: ['Users'],
  summary: 'List roles (id + name only) — for populating a role picker',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: {
      description: 'Roles',
      content: { 'application/json': { schema: successResponseSchema(z.array(roleOptionSchema)) } },
    },
    401: { description: 'Error', content: { 'application/json': { schema: errorResponseSchema } } },
    403: { description: 'Error', content: { 'application/json': { schema: errorResponseSchema } } },
  },
})
