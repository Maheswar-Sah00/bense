// Colour theme. Dark is the default; the choice is a per-device convenience in localStorage.
export const THEMES = ['dark', 'light', 'system'] as const
export type Theme = (typeof THEMES)[number]

const KEY = 'bense.theme'

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    return (THEMES as readonly string[]).includes(saved ?? '') ? (saved as Theme) : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121511' : '#ffffff')
}

export function saveTheme(theme: Theme) {
  applyTheme(theme)
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Private mode: the theme applies for this visit only.
  }
}
