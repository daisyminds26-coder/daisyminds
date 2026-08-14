import { z } from 'zod'

const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id')

export const studentSessionIdParamSchema = z.object({ id: objectIdSchema }).strict()
export type StudentSessionIdParam = z.infer<typeof studentSessionIdParamSchema>
