'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutGrid, Moon, Search, ShoppingBag, Sun, Tag, TrendingUp, Zap, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { categoryMeta } from '@/lib/categories'

interface NavItem { href: string; label: string; icon: LucideIcon }

const NAV: NavItem[] = [
  { href: '/',         label: 'Fresh Finds', icon: Zap },
  { href: '/deals',    label: 'Deals',       icon: Tag },
  { href: '/overview', label: 'Overview',    icon: LayoutGrid },
  { href: '/trends',   label: 'Trends',      icon: TrendingUp },
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
    <header className="sticky top-0 z-40 shadow-sm">
      {/* Blue bar: brand, search, primary nav */}
      <div className="bg-[#2874f0] text-white dark:bg-[#1c4fa8]">
        <div className="site-container flex flex-wrap items-center gap-x-6 gap-y-2 py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            <span className="leading-none">
              <span className="block text-lg font-bold italic tracking-tight">Product Discovery</span>
              <span className="block text-[11px] text-white/80">Weekly picks <span className="font-semibold text-[#ffe500]">Plus</span></span>
            </span>
          </Link>

          <form onSubmit={submit} className="order-3 flex w-full min-w-0 flex-1 sm:order-none sm:w-auto sm:max-w-xl">
            <div className="flex w-full items-center rounded-sm bg-white text-foreground shadow-sm">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search for products, brands and more"
                aria-label="Search products"
                className="h-10 min-w-0 flex-1 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
              />
              <button type="submit" aria-label="Search" className="flex h-10 w-11 items-center justify-center text-[#2874f0]">
                <Search className="h-5 w-5" />
              </button>
            </div>
          </form>

          <nav className="ml-auto flex items-center gap-1">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href) ? 'bg-white/20' : 'hover:bg-white/10'
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
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-sm hover:bg-white/10"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </nav>
        </div>
      </div>

      {/* Category strip */}
      {categories.length > 0 && (
        <div className="border-b bg-card">
          <ul className="site-container flex gap-1 overflow-x-auto">
            {categories.map(c => {
              const meta = categoryMeta(c)
              return (
                <li key={c} className="shrink-0">
                  <Link
                    href={`/deals?category=${encodeURIComponent(c)}`}
                    className="flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium text-foreground/80 transition-colors hover:text-[#2874f0]"
                  >
                    <meta.icon className="h-6 w-6" style={{ color: meta.color }} />
                    {meta.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </header>
  )
}
