import { useState } from 'react'
import { getStoredTheme, toggleTheme, type Theme } from '../../libs/theme'

const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())

  const onToggle = () => setTheme(toggleTheme())

  return (
    <button
      type="button"
      className="btn btn-ghost btn-circle"
      onClick={onToggle}
      aria-label="Toggle dark mode"
    >
      <span className="material-symbols-outlined">
        {theme === 'dark' ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}

export default ThemeToggle