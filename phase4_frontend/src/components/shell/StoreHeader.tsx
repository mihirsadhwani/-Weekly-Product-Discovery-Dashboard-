'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, Moon, Search, ShoppingBag, Sun, Tag, TrendingUp, Zap, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { categoryMeta } from '@/lib/categories'

interface NavItem { href: string; label: string; icon: LucideIcon }

const NAV: NavItem[] = [
  { href: '/',       label: 'Overview',    icon: LayoutGrid },
  { href: '/fresh',  label: 'Fresh Finds', icon: Zap },
  { href: '/deals',  label: 'Deals',       icon: Tag },
  { href: '/trends', label: 'Trends',      icon: TrendingUp },
]

export default function StoreHeader({ categories }: { categories: string[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [dark, setDark] = useState(false)

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/deals?q=${encodeURIComponent(q)}` : '/deals')
  }

  function toggleTheme() {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    setDark(next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch { /* storage unavailable */ }
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      <div className="site-container flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShoppingBag className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Product Discovery</span>
        </Link>

        <form onSubmit={submit} className="order-3 w-full min-w-0 flex-1 sm:order-none sm:w-auto sm:max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive(item.href) ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>
      </div>

      {categories.length > 0 && (
        <ul className="site-container flex gap-1 overflow-x-auto border-t py-1.5">
          {categories.map(c => (
            <li key={c} className="shrink-0">
              <Link
                href={`/deals?category=${encodeURIComponent(c)}`}
                className="block rounded-md px-3 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {categoryMeta(c).label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}
