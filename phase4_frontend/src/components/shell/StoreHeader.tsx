'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  BellRing,
  Compass,
  Layers,
  LayoutGrid,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  Tag,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { categoryMeta } from '@/lib/categories'

interface NavItem {
  href: string
  code: string
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { href: '/overview',      code: '01', label: 'Executive Overview',    icon: LayoutGrid },
  { href: '/',              code: '02', label: 'Fresh Finds',           icon: Zap },
  { href: '/trends',        code: '03', label: 'Price Intelligence',    icon: TrendingUp },
  { href: '/categories',    code: '04', label: 'Category Intelligence', icon: Layers },
  { href: '/deals',         code: '05', label: 'Product & Sentiment',   icon: Tag },
  { href: '/opportunities', code: '06', label: 'Market Opportunities',  icon: Compass },
  { href: '/alerts',        code: '07', label: 'Alerts & Actions',      icon: BellRing },
  { href: '/health',        code: '08', label: 'Data & Scrape Health',  icon: Activity },
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
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      /* storage unavailable */
    }
  }

  return (
    <header className="sticky top-0 z-40 shadow-sm">
      {/* Blue bar: brand, search, theme toggle */}
      <div className="bg-[#2874f0] text-white dark:bg-[#1c4fa8]">
        <div className="site-container flex flex-wrap items-center gap-x-6 gap-y-2 py-2.5">
          <Link href="/overview" className="flex shrink-0 items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            <span className="leading-none">
              <span className="block text-base font-bold italic tracking-tight sm:text-lg">
                Flipkart Product Intelligence
              </span>
              <span className="block text-[11px] text-white/85">
                Market Research &amp; <span className="font-semibold text-[#ffe500]">Category Suite</span>
              </span>
            </span>
          </Link>

          <form onSubmit={submit} className="order-3 flex w-full min-w-0 flex-1 sm:order-none sm:w-auto sm:max-w-xl">
            <div className="flex w-full items-center rounded-sm bg-white text-foreground shadow-sm">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search tracked SKUs, categories, or keywords..."
                aria-label="Search products"
                className="h-9 min-w-0 flex-1 bg-transparent px-4 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex h-9 w-10 items-center justify-center text-[#2874f0]"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-sm bg-white/15 px-2.5 py-1 text-[11px] font-medium lg:inline-block">
              PM &amp; BA Intelligence View
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="flex h-9 w-9 items-center justify-center rounded-sm hover:bg-white/10"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 8-Module Intelligence Navigation Strip */}
        <div className="border-t border-white/15 bg-[#1e5ec9] dark:bg-[#153e85]">
          <nav className="site-container flex items-center gap-1 overflow-x-auto py-1">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-white text-[#2874f0] font-semibold shadow-sm'
                    : 'text-white/90 hover:bg-white/15'
                )}
              >
                <span className="text-[10px] opacity-70">{item.code}.</span>
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Category quick filter strip */}
      {categories.length > 0 && (
        <div className="border-b bg-card">
          <ul className="site-container flex gap-1 overflow-x-auto">
            {categories.map(c => {
              const meta = categoryMeta(c)
              return (
                <li key={c} className="shrink-0">
                  <Link
                    href={`/categories?category=${encodeURIComponent(c)}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:text-[#2874f0]"
                  >
                    <meta.icon className="h-4 w-4" style={{ color: meta.color }} />
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
