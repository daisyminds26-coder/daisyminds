import { createContext, useContext } from 'react'

export type Theme = 'light'

export interface ThemeContextValue {
  theme: Theme
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
