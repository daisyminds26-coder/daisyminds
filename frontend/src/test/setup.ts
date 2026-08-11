import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from '@/test/msw/server'

// jsdom doesn't implement ResizeObserver — Radix's Select/Popover primitives
// (used throughout the shared UI kit) construct one via `new` to measure
// content size, so the stub must be a real constructable class, not a
// `vi.fn()` mock (which floating-ui's internals reject as "not a
// constructor"). Test-only setup, never shipped.
class ResizeObserverStub implements ResizeObserver {
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- no-op stub; jsdom never actually needs to measure anything
  observe(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- no-op stub
  unobserve(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- no-op stub
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub

// jsdom doesn't implement the Pointer Events capture API or `scrollIntoView`
// — Radix's Select primitive calls `hasPointerCapture`/`scrollIntoView`
// during open/close and option-highlight handling, which throws in jsdom
// without these no-op stubs (the DOM lib types declare them as always
// present, but jsdom's runtime doesn't actually implement them — hence
// unconditional overwrite, not a feature-detection guard). Same class of
// gap as the ResizeObserver stub above; test-only, never shipped.
Element.prototype.hasPointerCapture = () => false
// eslint-disable-next-line @typescript-eslint/no-empty-function -- no-op stub; jsdom never actually captures a pointer
Element.prototype.setPointerCapture = () => {}
// eslint-disable-next-line @typescript-eslint/no-empty-function -- no-op stub
Element.prototype.releasePointerCapture = () => {}
// eslint-disable-next-line @typescript-eslint/no-empty-function -- no-op stub; jsdom has no layout engine to scroll
Element.prototype.scrollIntoView = () => {}

// jsdom has no layout engine, so `Range` never implements `getClientRects`/
// `getBoundingClientRect` — Tiptap/ProseMirror (the lesson-content rich-text
// editor) calls these on every keystroke to scroll the caret into view,
// which throws in jsdom without these no-op stubs. Same class of gap as the
// stubs above; test-only, never shipped.
Range.prototype.getClientRects = () => [] as unknown as DOMRectList
Range.prototype.getBoundingClientRect = () =>
  ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 }) as DOMRect
// Same ProseMirror/jsdom gap — `posAtCoords` calls this on click to resolve the caret position.
document.elementFromPoint = () => null

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
