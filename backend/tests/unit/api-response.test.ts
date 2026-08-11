import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

import { sendCreated, sendNoContent, sendSuccess } from '../../src/utils/api-response'

function buildMockResponse(requestId: string): Response {
  const res = {
    req: { requestId } as Request,
    statusCode: 200,
    status: vi.fn().mockImplementation(function (this: Response, code: number) {
      this.statusCode = code
      return this
    }),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  } as unknown as Response

  return res
}

describe('sendSuccess', () => {
  it('builds the standard success envelope with defaults', () => {
    const res = buildMockResponse('req-1')

    sendSuccess(res, { data: { id: 1 } })

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Request completed successfully',
      data: { id: 1 },
      requestId: 'req-1',
    })
  })

  it('includes meta only when provided', () => {
    const res = buildMockResponse('req-2')

    sendSuccess(res, { data: [1, 2], meta: { page: 1, limit: 20, total: 2, totalPages: 1 } })

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { page: 1, limit: 20, total: 2, totalPages: 1 } }),
    )
  })

  it('defaults data to null when omitted', () => {
    const res = buildMockResponse('req-3')

    sendSuccess(res, { message: 'Done' })

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: null }))
  })
})

describe('sendCreated', () => {
  it('sends a 201 status', () => {
    const res = buildMockResponse('req-4')

    sendCreated(res, { data: { id: 'new' } })

    expect(res.status).toHaveBeenCalledWith(201)
  })
})

describe('sendNoContent', () => {
  it('sends a 204 with no body', () => {
    const res = buildMockResponse('req-5')

    sendNoContent(res)

    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.end).toHaveBeenCalled()
  })
})
