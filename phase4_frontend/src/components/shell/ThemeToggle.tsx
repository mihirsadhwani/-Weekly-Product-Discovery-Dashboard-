'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch { /* storage unavailable */ }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <span className="flex items-center gap-3">
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        Dark mode
      </span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${dark ? 'bg-primary' : 'bg-input'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-all ${dark ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}
