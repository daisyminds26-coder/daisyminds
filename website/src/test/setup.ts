import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom doesn't implement matchMedia — `usePrefersReducedMotion` and any
// `(prefers-reduced-motion: reduce)` query needs a stub, always reporting
// "no preference" unless a test overrides it.
window.matchMedia = function matchMedia(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: function addListener() {
      /* no-op stub */
    },
    removeListener: function removeListener() {
      /* no-op stub */
    },
    addEventListener: function addEventListener() {
      /* no-op stub */
    },
    removeEventListener: function removeEventListener() {
      /* no-op stub */
    },
    dispatchEvent: function dispatchEvent() {
      return false
    },
  }
}

// jsdom has no layout engine, so `scrollIntoView` is unimplemented — the
// hash-scroll effect calls this. `scrollTo` exists but logs a benign
// "not implemented" warning for the options-object overload SiteChrome uses;
// harmless in tests, left as jsdom's own stub.
Element.prototype.scrollIntoView = function scrollIntoView() {
  /* no-op stub — jsdom has no layout engine to scroll */
}

// jsdom doesn't implement IntersectionObserver — Framer Motion's `whileInView`
// (used throughout `components/motion/`) constructs one via `new`, so the
// stub must be a real constructable class, not a `vi.fn()` mock. Reports
// every observed element as immediately intersecting, which is exactly what
// a test needs — reveal animations should resolve, not hang mid-transition.
class IntersectionObserverStub implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly scrollMargin: string = ''
  readonly thresholds: readonly number[] = []
  private readonly callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  observe(target: Element): void {
    const entry = { isIntersecting: true, target } as IntersectionObserverEntry
    this.callback([entry], this)
  }
  unobserve(): void {
    /* no-op stub */
  }
  disconnect(): void {
    /* no-op stub */
  }
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}
globalThis.IntersectionObserver = IntersectionObserverStub

afterEach(() => {
  cleanup()
})
