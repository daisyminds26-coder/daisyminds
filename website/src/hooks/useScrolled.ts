import { useEffect, useState } from 'react'

/** True once the page has scrolled past `threshold` px — drives the navbar's background/elevation transition. */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(() => window.scrollY > threshold)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > threshold)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [threshold])

  return scrolled
}
