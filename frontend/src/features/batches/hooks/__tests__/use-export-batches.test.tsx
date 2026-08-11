import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useExportBatches } from '@/features/batches/hooks/use-export-batches'
import { createTestQueryClient } from '@/test/test-utils'
import type * as BatchesApi from '@/features/batches/api/batches.api'

/**
 * `exportBatchesCsv` is mocked at the API-function boundary rather than
 * exercised through MSW/XHR here: axios's `responseType: 'blob'` XHR path
 * hits a known incompatibility between jsdom's XHR shim and MSW's node
 * (undici) interceptor when constructing a `Blob` response body ("object
 * .stream is not a function"). This still verifies the hook's real
 * contract — call the API, then hand the resulting Blob to `downloadBlob`
 * — without depending on that unrelated environment gap.
 */
vi.mock('@/features/batches/api/batches.api', async (importOriginal) => {
  const actual = await importOriginal<typeof BatchesApi>()
  return {
    ...actual,
    exportBatchesCsv: vi.fn(() => Promise.resolve(new Blob(['a,b\n1,2'], { type: 'text/csv' }))),
  }
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
}

describe('useExportBatches', () => {
  it('fetches a CSV blob and triggers a browser download', async () => {
    // jsdom doesn't implement `URL.createObjectURL`/`revokeObjectURL` — stub
    // just those two static methods (not the whole `URL` global, which
    // would break `new URL(...)` calls elsewhere).
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    const { result } = renderHook(() => useExportBatches(), { wrapper })
    act(() => {
      result.current.mutate({})
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    clickSpy.mockRestore()
  })
})
