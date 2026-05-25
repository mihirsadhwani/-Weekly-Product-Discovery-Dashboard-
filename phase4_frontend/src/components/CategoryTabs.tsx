'use client'

import { CATEGORY_CONFIG } from '@/types/product'

interface Props {
  categories: string[]
  selected: string
  onChange: (cat: string) => void
}

export default function CategoryTabs({ categories, selected, onChange }: Props) {
  const all = ['All', 'vfm', ...categories]

  return (
    <div className="flex gap-2.5 overflow-x-auto pills-scroll pb-1">
      {all.map(cat => {
        const cfg   = CATEGORY_CONFIG[cat]
        const label = cfg
          ? `${cfg.emoji} ${cfg.label}`
          : cat === 'All' ? 'All Products' : cat
        const active = selected === cat

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`
              shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full
              text-xs font-bold transition-all duration-200 whitespace-nowrap tracking-wide
              ${active
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/40'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm'
              }
            `}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
