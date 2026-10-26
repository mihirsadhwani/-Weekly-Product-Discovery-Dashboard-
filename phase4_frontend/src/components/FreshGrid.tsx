'use client'

import { useMemo, useState } from 'react'
import type { FreshFind } from '@/types/product'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { categoryMeta } from '@/lib/categories'
import FreshFindCard from './FreshFindCard'

export default function FreshGrid({ products }: { products: FreshFind[] }) {
  const [category, setCategory] = useState('all')

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products])
  const visible = category === 'all' ? products : products.filter(p => p.category === category)

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-1">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList>
            <TabsTrigger value="all">All ({products.length})</TabsTrigger>
            {categories.map(c => {
              const meta = categoryMeta(c)
              return (
                <TabsTrigger key={c} value={c}>
                  <meta.icon />
                  {meta.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map(p => <FreshFindCard key={p.flipkart_url} product={p} />)}
      </div>
    </div>
  )
}
