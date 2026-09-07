import { useEffect, useState } from 'react'
import { getStoredTheme, toggleTheme, type Theme } from '../../libs/theme'

interface ThemeToggleProps {
  className?: string
}

const ThemeToggle = ({ className = '' }: ThemeToggleProps) => {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())

  useEffect(() => {
    const onThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<Theme>
      if (customEvent.detail === 'dark' || customEvent.detail === 'light') {
        setTheme(customEvent.detail)
      } else {
        setTheme(getStoredTheme())
      }
    }
    window.addEventListener('theme-change', onThemeChange)
    return () => window.removeEventListener('theme-change', onThemeChange)
  }, [])

  const onToggle = () => {
    setTheme(toggleTheme())
  }

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-circle ${className}`}
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="material-icons text-xl">
        {theme === 'dark' ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}

export default ThemeToggle