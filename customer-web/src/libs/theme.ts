// src/libs/theme.ts
const KEY = 'theme'

export type Theme = 'light' | 'dark'

export function getStoredTheme(): Theme {
  const t = localStorage.getItem(KEY)
  if (t === 'dark' || t === 'light') return t
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  // optional: Tailwind `dark:` variants
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(KEY, theme)
}

export function toggleTheme(): Theme {
  const next = getStoredTheme() === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  return next
}