'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Zap, Tag, TrendingUp, ShoppingBag, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import ThemeToggle from './ThemeToggle'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  count?: number
}

export default function AppSidebar({ freshCount, dealCount }: { freshCount: number; dealCount: number }) {
  const pathname = usePathname()

  const analyze: NavItem[] = [
    { href: '/',       label: 'Overview',   icon: LayoutGrid },
    { href: '/fresh',  label: 'Fresh Finds', icon: Zap,       count: freshCount },
    { href: '/deals',  label: 'Deals',       icon: Tag,       count: dealCount },
    { href: '/trends', label: 'Trends',      icon: TrendingUp },
  ]

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="p-4">
          <Link href="/" className="flex items-center gap-3 rounded-xl border bg-background p-3 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold">Product Discovery</span>
              <span className="block text-xs text-muted-foreground">Flipkart weekly picks</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3">
          <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Analyze</p>
          <ul className="space-y-1">
            {analyze.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.count ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.count}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-2 border-t p-3">
          <ThemeToggle />
          <p className="px-3 text-xs text-muted-foreground">Powered by Google Gemini</p>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Product Discovery
          </Link>
          <div className="w-32"><ThemeToggle /></div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {analyze.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                isActive(item.href) ? 'bg-accent text-foreground' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
