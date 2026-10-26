'use client'

import { useMemo, useState } from 'react'
import type { FreshFind } from '@/types/product'
import { cn } from '@/lib/cn'
import { categoryMeta } from '@/lib/categories'
import FreshFindCard from './FreshFindCard'

export default function FreshGrid({ products }: { products: FreshFind[] }) {
  const [category, setCategory] = useState('all')

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products])
  const visible = category === 'all' ? products : products.filter(p => p.category === category)

  const tab = (value: string, label: string, Icon?: ReturnType<typeof categoryMeta>['icon']) => (
    <button
      key={value}
      onClick={() => setCategory(value)}
      className={cn(
        'flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm transition-colors',
        category === value ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </button>
  )

  return (
    <div className="bg-card shadow-sm">
      <div className="flex overflow-x-auto border-b px-2">
        {tab('all', `All (${products.length})`)}
        {categories.map(c => { const m = categoryMeta(c); return tab(c, m.label, m.icon) })}
      </div>
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 [&>*]:bg-card">
        {visible.map(p => <FreshFindCard key={p.flipkart_url} product={p} />)}
      </div>
    </div>
  )
}
